import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { COLLECTIONS } from '../../app.factory';
import { MemoryDB } from '../../libs/fakedb';
import { lerPeriodo, paginar } from '../../libs/paginacao';
import { Situacao, TipoCob } from './models';
import { DevolucaoPutRequest, PagamentoRequest, toPixOut } from './models/pix';

const db = (name: string) => MemoryDB.ensure(name, COLLECTIONS[name]);
const ISPB = process.env.PIX_ISPB || '12345678';
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function idTransacao(prefixo: 'E' | 'D') {
  const ts = new Date().toISOString().replace(/\D/g, '').substring(0, 12);
  const rnd = [...randomBytes(11)].map((b) => ALNUM[b % ALNUM.length]).join('');
  return `${prefixo}${ISPB}${ts}${rnd}`;
}

export const TIPOS_WEBHOOK = [
  'webhookcob',
  'webhookcobv',
  'webhookcobr',
  'webhookrec',
] as const;
export type TipoWebhook = (typeof TIPOS_WEBHOOK)[number];

@Injectable()
export class PixService {
  readonly entregas: any[] = [];

  private get pix() {
    return db('PIX');
  }
  private get webhooks() {
    return db('WEBHOOKS');
  }
  private get webhooksTipo() {
    return db('WEBHOOKS_TIPO');
  }
  private store(tipoCob: TipoCob) {
    return db(tipoCob === TipoCob.vencimento ? 'COBV' : 'COB');
  }

  async pagar(
    IdOwner: string,
    txid: string,
    tipoCob: TipoCob,
    req: PagamentoRequest = {},
  ) {
    const store = this.store(tipoCob);
    const cob = await store.read(IdOwner, { txid });
    if (!cob) return undefined;
    if (cob.status !== Situacao.Ativa) {
      throw new Error(
        `A cobrança não está ATIVA (status atual: ${cob.status}).`,
      );
    }
    const agora = Date.now();
    if (tipoCob === TipoCob.imediato) {
      if (
        Date.parse(cob.criacao) + (cob.calendario?.expiracao ?? 86400) * 1000 <
        agora
      ) {
        throw new Error('A cobrança está expirada.');
      }
      if (
        req.valor &&
        req.valor !== cob.valor?.original &&
        cob.valor?.modalidadeAlteracao !== 1
      ) {
        throw new Error(
          'O valor pago difere do valor original e a cobrança não permite alteração.',
        );
      }
    } else {
      const venc = cob.calendario?.dataDeVencimento;
      const limite =
        Date.parse(`${venc}T23:59:59.999Z`) +
        (cob.calendario?.validadeAposVencimento ?? 30) * 86400000;
      if (venc && limite < agora) {
        throw new Error(
          'A cobrança com vencimento ultrapassou a validade após o vencimento.',
        );
      }
    }
    const pix = {
      IdOwner,
      endToEndId: idTransacao('E'),
      txid,
      valor: req.valor || cob.valor?.original,
      componentesValor: { original: { valor: cob.valor?.original } },
      chave: cob.chave,
      horario: new Date(agora).toISOString(),
      infoPagador: req.infoPagador,
      devolucoes: [],
      pagador: req.pagador,
    };
    await this.pix.add(IdOwner, pix);
    await store.patch(
      IdOwner,
      { txid },
      { status: Situacao.Concluida, pix: [...(cob.pix || []), pix.endToEndId] },
    );
    const out = toPixOut(pix);
    await this.notificar(IdOwner, cob.chave, out);
    return out;
  }

  async notificar(IdOwner: string, chave: string, pix: any) {
    const wh = await this.webhooks.read(IdOwner, { chave });
    if (!wh) return;
    const url = `${wh.webhookUrl.replace(/\/$/, '')}/pix`;
    const entrega: any = {
      url,
      chave,
      horario: new Date().toISOString(),
      payload: { pix: [pix] },
    };
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entrega.payload),
        signal: AbortSignal.timeout(
          Number(process.env.WEBHOOK_TIMEOUT_MS ?? 5000),
        ),
      });
      entrega.status = r.status;
    } catch (e: any) {
      entrega.erro = String(e?.message || e);
    }
    this.entregas.push(entrega);
  }

  async readPix(IdOwner: string, endToEndId: string) {
    return toPixOut(await this.pix.read(IdOwner, { endToEndId }));
  }

  async listPix(IdOwner: string, f: any) {
    const { inicio, fim } = lerPeriodo(f);
    const bool = (v: any) =>
      v === undefined ? undefined : String(v) === 'true';
    const [txIdPresente, devolucaoPresente] = [
      bool(f.txIdPresente),
      bool(f.devolucaoPresente),
    ];
    const ls = (await this.pix.list(IdOwner)).filter((p: any) => {
      const h = new Date(p.horario);
      return (
        h >= inicio &&
        h <= fim &&
        (!f.txid || p.txid === f.txid) &&
        (txIdPresente === undefined || !!p.txid === txIdPresente) &&
        (devolucaoPresente === undefined ||
          p.devolucoes.length > 0 === devolucaoPresente) &&
        (!f.cpf || p.pagador?.cpf === f.cpf) &&
        (!f.cnpj || p.pagador?.cnpj === f.cnpj)
      );
    });
    const { parametros, itens } = paginar(f, ls.map(toPixOut));
    return { parametros, pix: itens };
  }

  async devolver(
    IdOwner: string,
    endToEndId: string,
    id: string,
    req: DevolucaoPutRequest,
  ) {
    const pix = await this.pix.read(IdOwner, { endToEndId });
    if (!pix) return undefined;
    if (pix.devolucoes.some((d: any) => d.id === id)) {
      throw new Error('Já existe uma devolução com esse id para este Pix.');
    }
    const natureza = req.natureza || 'ORIGINAL';
    if (
      natureza === 'RETIRADA' &&
      !pix.componentesValor?.saque &&
      !pix.componentesValor?.troco
    ) {
      throw new Error(
        'A natureza RETIRADA só se aplica a Pix Saque ou Pix Troco.',
      );
    }
    const devolvido = pix.devolucoes.reduce(
      (s: number, d: any) => s + Math.round(Number(d.valor) * 100),
      0,
    );
    if (
      devolvido + Math.round(Number(req.valor) * 100) >
      Math.round(Number(pix.valor) * 100)
    ) {
      throw new Error(
        'O valor solicitado ultrapassa o valor disponível para devolução.',
      );
    }
    const agora = new Date().toISOString();
    const devolucao = {
      id,
      rtrId: idTransacao('D'),
      valor: req.valor,
      natureza,
      descricao: req.descricao,
      horario: { solicitacao: agora, liquidacao: agora },
      status: 'DEVOLVIDO',
    };
    const atualizado = await this.pix.patch(
      IdOwner,
      { endToEndId },
      { devolucoes: [...pix.devolucoes, devolucao] },
    );
    await this.notificar(IdOwner, pix.chave, toPixOut(atualizado));
    return devolucao;
  }

  async readDevolucao(IdOwner: string, endToEndId: string, id: string) {
    const pix = await this.pix.read(IdOwner, { endToEndId });
    return pix?.devolucoes.find((d: any) => d.id === id);
  }

  async putWebhook(IdOwner: string, chave: string, webhookUrl: string) {
    if (!(await db('CORRENTISTAS').read('DEV', { chave }))) {
      throw new Error('A chave informada não pertence ao usuário recebedor.');
    }
    const curr = await this.webhooks.read(IdOwner, { chave });
    const itm = {
      chave,
      webhookUrl,
      criacao: curr?.criacao || new Date().toISOString(),
    };
    return curr
      ? await this.webhooks.update(IdOwner, { chave }, itm)
      : await this.webhooks.add(IdOwner, itm);
  }

  getWebhook(IdOwner: string, chave: string) {
    return this.webhooks.read(IdOwner, { chave });
  }

  removeWebhook(IdOwner: string, chave: string) {
    return this.webhooks.remove(IdOwner, { chave });
  }

  async listWebhooks(IdOwner: string, f: any) {
    const periodo = lerPeriodo(f, false);
    const ls = (await this.webhooks.list(IdOwner)).filter(
      (w: any) =>
        !periodo ||
        (new Date(w.criacao) >= periodo.inicio &&
          new Date(w.criacao) <= periodo.fim),
    );
    const { parametros, itens } = paginar(f, ls);
    return { parametros, webhooks: itens };
  }

  async putWebhookTipo(IdOwner: string, tipo: TipoWebhook, webhookUrl: string) {
    const curr = await this.webhooksTipo.read(IdOwner, { tipo });
    const itm = {
      tipo,
      webhookUrl,
      criacao: curr?.criacao || new Date().toISOString(),
    };
    await (curr
      ? this.webhooksTipo.update(IdOwner, { tipo }, itm)
      : this.webhooksTipo.add(IdOwner, itm));
    return { webhookUrl, criacao: itm.criacao };
  }

  async getWebhookTipo(IdOwner: string, tipo: TipoWebhook) {
    const w = await this.webhooksTipo.read(IdOwner, { tipo });
    return w && { webhookUrl: w.webhookUrl, criacao: w.criacao };
  }

  removeWebhookTipo(IdOwner: string, tipo: TipoWebhook) {
    return this.webhooksTipo.remove(IdOwner, { tipo });
  }

  /** Payload JSON da Payload Location (sem assinatura), a partir do uuid. */
  async payloadLocation(uuid: string) {
    const found = await db('LOCATIONS').find((l: any) => l.uuid === uuid);
    if (!found) return undefined;
    const { clusterKey: IdOwner, item: loc } = found;
    const lc = await db('LOC_COB').read(IdOwner, { id: loc.id });
    if (!lc) return undefined;
    const tipoCob =
      loc.tipoCob === TipoCob.vencimento
        ? TipoCob.vencimento
        : TipoCob.imediato;
    const cob = await this.store(tipoCob).read(IdOwner, { txid: lc.txid });
    if (!cob) return undefined;
    const base: any = {
      txid: cob.txid,
      revisao: cob.revisao,
      devedor: cob.devedor,
      chave: cob.chave,
      solicitacaoPagador: cob.solicitacaoPagador,
      infoAdicionais: cob.infoAdicionais,
      status: cob.status,
    };
    const apresentacao = new Date().toISOString();
    if (tipoCob === TipoCob.imediato) {
      return {
        ...base,
        calendario: {
          criacao: cob.criacao,
          apresentacao,
          expiracao: cob.calendario?.expiracao ?? 86400,
        },
        valor: {
          original: cob.valor?.original,
          modalidadeAlteracao: cob.valor?.modalidadeAlteracao ?? 0,
        },
      };
    }
    const c = await db('CORRENTISTAS').read('DEV', { chave: cob.chave });
    const doc = String(c?.cpfcnpj || '');
    return {
      ...base,
      calendario: {
        criacao: cob.criacao,
        apresentacao,
        dataDeVencimento: cob.calendario?.dataDeVencimento,
        validadeAposVencimento: cob.calendario?.validadeAposVencimento ?? 30,
      },
      recebedor: {
        nome: c?.nome,
        ...(doc.length === 11 ? { cpf: doc } : { cnpj: doc }),
        cidade: c?.Cidade,
      },
      valor: {
        original: cob.valor?.original,
        multa: cob.valor?.multa,
        juros: cob.valor?.juros,
        desconto: cob.valor?.desconto,
        abatimento: cob.valor?.abatimento,
        final: cob.valor?.original,
      },
    };
  }
}
