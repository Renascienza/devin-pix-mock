import { COLLECTIONS } from '../../app.factory';
import { locationUrl, pixCopiaECola } from '../../libs/brcode';
import { Injectable } from '@nestjs/common';
import { MemoryDB } from '../../libs/fakedb';
import {
  PixID,
  PixKey,
  PixRequest,
  TipoCob,
  Situacao,
  ModalidadeAlteracao,
  IPaginator,
  Expiracao,
} from './models';
import { getMD5Hash } from '../../libs/utils';
import { randomUUID } from 'crypto';
import { MESSAGES } from '../../libs/messages';
import {
  CobGetResponse,
  CobPatchRequest,
  CobPutRequest,
  CobPutResponse,
  CobGetFilter,
  CobPatchResponse,
} from './models/cob';
import {
  LocGetResponse,
  LocGetFilter,
  LocID,
  LocPutRequest,
  LocPutResponse,
} from './models/loc';
import {
  CobVGetFilter,
  CobVGetResponse,
  CobVPatchRequest,
  CobVPatchResponse,
  CobVPutRequest,
  CobVPutResponse,
  CobVValor,
} from './models/cobv';
import { CobRPutRequest, CobRPutResponse } from './models/cobr';
import { PoliticaRetentativa, RecPostRequest, RecRequest } from './models/rec';
import { owners } from '../../data/db.json';

@Injectable()
export class PSP {
  private cob: MemoryDB;
  private cobR: MemoryDB;
  private cobV: MemoryDB;
  private transHist: MemoryDB;
  private locations: MemoryDB;
  private correntistas: MemoryDB;
  private loccob: MemoryDB;
  private rec: MemoryDB;

  private store(tipoCob: TipoCob): MemoryDB {
    return tipoCob === TipoCob.vencimento ? this.cobV : this.cob;
  }

  constructor() {
    this.cob = MemoryDB.ensure('COB', COLLECTIONS['COB']);
    this.transHist = MemoryDB.ensure('COB_HIST', COLLECTIONS['COB_HIST']);

    this.cobR = MemoryDB.ensure('COBR', COLLECTIONS['COBR']);
    this.cobV = MemoryDB.ensure('COBV', COLLECTIONS['COBV']);

    this.locations = MemoryDB.ensure('LOCATIONS', COLLECTIONS['LOCATIONS']);
    this.correntistas = MemoryDB.ensure(
      'CORRENTISTAS',
      COLLECTIONS['CORRENTISTAS'],
    );
    this.loccob = MemoryDB.ensure('LOC_COB', COLLECTIONS['LOC_COB']);

    this.rec = MemoryDB.ensure('REC', COLLECTIONS['REC']);
  }

  private async joinLocCob(
    IdOwner: string,
    txid: string,
    id: number,
    tipoCob: TipoCob,
  ) {
    const lc2 = await this.loccob.read(IdOwner, { id });

    const loc = await this.locations.read(IdOwner, { id });

    if (lc2) {
      throw new Error('LOCATION JÁ ESTÁ VINCULADO A UMA COBRANÇA');
    }
    // if (lc1) {
    //     throw new Error('COBRANÇA JÁ ESTÁ VINCULADO A UMA LOCATION');
    // }

    // if (!cob) {
    //     throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT(TipoCob[tipoCob]));
    // }

    if (!loc) {
      throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT('location'));
    }

    if (loc.tipoCob != tipoCob) {
      throw new Error(
        MESSAGES.Errors.defaults.UNEXPECTED_VALUE('tipoCob', loc.tipoCob),
      );
    }

    await this.loccob.add(IdOwner, { txid, id });
  }

  private async _addCob(
    itm: PixRequest<CobPutRequest | CobVPutRequest>,
    tipoCob: TipoCob,
  ) {
    if (itm.data.valor.retirada) {
      throw new Error('NÃO IMPLEMENTADO');
    }

    if (!itm.data.valor.modalidadeAlteracao) {
      itm.data.valor.modalidadeAlteracao = ModalidadeAlteracao.NaoEditavel;
    }

    if (tipoCob == TipoCob.imediato) {
      if (
        !itm.data.calendario ||
        !(itm.data.calendario as Expiracao)?.expiracao
      ) {
        itm.data.calendario = { expiracao: 86400 };
      }
    }

    const curr = {
      ...itm.data,
      txid: itm.txid,
      revisao: 0,
      status: Situacao.Ativa,
      criacao: new Date().toJSON(),
    };

    if (await this.store(tipoCob).read(itm.IdOwner, { txid: itm.txid })) {
      throw new Error(`O campo txid ${itm.txid} já está em uso.`);
    }

    //INCLUI  LOCATION E TRANSAÇÃO, PARA DEPOIS VINCULÁ-LAS
    const { id } = await this.addLoc({ tipoCob, IdOwner: itm.IdOwner });
    await this.store(tipoCob).add(itm.IdOwner, curr);
    await this.joinLocCob(itm.IdOwner, itm.txid, id, tipoCob);

    return await this._readCob(
      { IdOwner: itm.IdOwner, txid: itm.txid },
      undefined,
      tipoCob,
    );
  }

  async addCob(itm: PixRequest<CobPutRequest>): Promise<CobPutResponse> {
    return (await this._addCob(itm, TipoCob.imediato)) as CobPutResponse;
  }

  async addCobR(_itm: PixRequest<CobRPutRequest>): Promise<CobRPutResponse> {
    return null;
  }

  async addCobV(itm: PixRequest<CobVPutRequest>): Promise<CobVPutResponse> {
    return (await this._addCob(itm, TipoCob.vencimento)) as CobVPutResponse;
  }

  async _readCob<T extends CobGetResponse | CobVGetResponse>(
    key: PixKey,
    revisao?: number | string,
    tipoCob: TipoCob = TipoCob.imediato,
  ): Promise<T> {
    const rev =
      revisao === undefined || revisao === null || revisao === ''
        ? undefined
        : Number(revisao);
    const last = await this.store(tipoCob).read(key.IdOwner, {
      txid: key.txid,
    });
    if (!last) {
      return undefined;
    }
    let curr = last;
    if (rev !== undefined && rev !== last.revisao) {
      curr = await this.transHist.read(key.IdOwner, {
        id: getMD5Hash(`${tipoCob}:${key.txid}`, rev),
      });
      if (!curr) {
        return undefined;
      }
    }

    const c = await this.correntistas.read('DEV', { chave: curr.chave });
    if (!c) {
      throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT('Correntista'));
    }

    const loccob = await this.loccob.read(key.IdOwner, { txid: curr.txid });
    let loc: any = undefined;
    if (loccob) {
      const l = await this.locations.read(key.IdOwner, { id: loccob.id });
      if (!l) {
        throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT('Location'));
      }
      loc = {
        id: l.id,
        location: locationUrl(l.uuid),
        tipoCob: l.tipoCob,
        criacao: l.criacao,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _histId, IdOwner: _owner, ...data } = curr;
    const res: any = {
      ...data,
      calendario: { ...(curr.calendario || {}), criacao: curr.criacao },
      loc,
      location: loc?.location,
      pixCopiaECola:
        loc && curr.status === Situacao.Ativa
          ? pixCopiaECola({
              location: loc.location,
              nome: c.nome,
              cidade: c.Cidade,
            })
          : undefined,
      pix: curr.pix || [],
    };
    if (tipoCob === TipoCob.vencimento) {
      const doc = String(c.cpfcnpj || '');
      res.recebedor = {
        nome: c.nome,
        ...(doc.length === 11 ? { cpf: doc } : { cnpj: doc }),
        cidade: c.Cidade,
      };
    }
    return res;
  }

  async readCob(key: PixKey, revisao?: number): Promise<CobGetResponse> {
    return await this._readCob(key, revisao, TipoCob.imediato);
  }

  async readCobV(key: PixKey, revisao?: number): Promise<CobVGetResponse> {
    return await this._readCob(key, revisao, TipoCob.vencimento);
  }

  async _listCob(
    filter: any,
    tipoCob: TipoCob = TipoCob.imediato,
  ): Promise<IPaginator & { cobs: (CobGetResponse | CobVGetResponse)[] }> {
    const num = (v: any, def: number) =>
      v === undefined || v === '' ? def : Number(v);
    const pag = filter.paginacao || {};
    const paginaAtual = num(
      filter['paginacao.paginaAtual'] ?? pag.paginaAtual,
      0,
    );
    const itensPorPagina = num(
      filter['paginacao.itensPorPagina'] ?? pag.itensPorPagina,
      100,
    );
    if (
      !filter.inicio ||
      !filter.fim ||
      isNaN(Date.parse(filter.inicio)) ||
      isNaN(Date.parse(filter.fim))
    ) {
      throw new Error(
        'Os parâmetros inicio e fim são obrigatórios e devem respeitar o formato RFC 3339.',
      );
    }
    if (
      !Number.isInteger(paginaAtual) ||
      paginaAtual < 0 ||
      !Number.isInteger(itensPorPagina) ||
      itensPorPagina < 1 ||
      itensPorPagina > 1000
    ) {
      throw new Error('Os parâmetros de paginação não respeitam o schema.');
    }
    const [inicio, fim] = [new Date(filter.inicio), new Date(filter.fim)];
    const locationPresente =
      filter.locationPresente === undefined
        ? undefined
        : String(filter.locationPresente) === 'true';

    const ls = await this.store(tipoCob).list(filter.IdOwner);
    let cobs = await Promise.all(
      ls
        .filter((f: any) => {
          const criacao = new Date(f.criacao);
          return (
            criacao >= inicio &&
            criacao <= fim &&
            (!filter.cpf || f.devedor?.cpf === filter.cpf) &&
            (!filter.cnpj || f.devedor?.cnpj === filter.cnpj) &&
            (!filter.status || f.status === filter.status)
          );
        })
        .map((m) =>
          this._readCob(
            { IdOwner: filter.IdOwner, txid: m.txid },
            undefined,
            tipoCob,
          ),
        ),
    );
    if (locationPresente !== undefined) {
      cobs = cobs.filter((f: any) => !!f.loc?.id === locationPresente);
    }
    const ini = paginaAtual * itensPorPagina;
    return {
      parametros: {
        inicio: filter.inicio,
        fim: filter.fim,
        paginacao: {
          paginaAtual,
          itensPorPagina,
          quantidadeDePaginas: Math.ceil(cobs.length / itensPorPagina),
          quantidadeTotalDeItens: cobs.length,
        },
      },
      cobs: cobs.slice(ini, ini + itensPorPagina) as any,
    };
  }

  async listCob(filter: CobGetFilter & { IdOwner: string }) {
    return await this._listCob(filter, TipoCob.imediato);
  }

  async listCobV(filter: CobVGetFilter & { IdOwner: string }) {
    return await this._listCob(filter, TipoCob.vencimento);
  }

  async _editCob(
    itm: PixRequest<CobPatchRequest | CobVPatchRequest>,
    tipoCob: TipoCob,
  ) {
    const curr = await this.store(tipoCob).read(itm.IdOwner, {
      txid: itm.txid,
    });
    let add = false;

    if (!curr || curr.status != Situacao.Ativa) {
      return null;
    } else {
      if (
        !!itm.data.devedor ||
        !!itm.data.solicitacaoPagador ||
        !!itm.data.valor ||
        !!itm.data.calendario ||
        itm.data.status
      ) {
        add = true;
      }

      if (itm.data.loc?.id != null) {
        const lc = await this.loccob.read(itm.IdOwner, { txid: itm.txid });

        if (lc?.id != itm.data.loc.id) {
          if (lc) {
            await this.loccob.remove(itm.IdOwner, { id: lc.id });
          }
          try {
            await this.joinLocCob(
              itm.IdOwner,
              itm.txid,
              itm.data.loc.id,
              tipoCob,
            );
          } catch (ex) {
            if (lc) {
              await this.loccob.add(itm.IdOwner, { id: lc.id, txid: itm.txid });
            } //desfaz a exclusão
            throw ex;
          }
        }
      }

      const histId = getMD5Hash(`${tipoCob}:${curr.txid}`, curr.revisao);
      if (add) {
        await this.transHist.add(itm.IdOwner, { id: histId, ...curr });
        curr.revisao++;

        itm.data.valor = {
          original: itm.data.valor?.original || curr.valor.original,
          modalidadeAlteracao:
            itm.data.valor?.modalidadeAlteracao ||
            curr.valor.modalidadeAlteracao,
        };

        if (tipoCob === TipoCob.vencimento && itm.data.valor) {
          const valor = itm.data.valor as CobVValor;
          const currV = curr.valor as CobVValor;
          const merged = (a?: object, b?: object) =>
            a || b ? { ...(a || {}), ...(b || {}) } : undefined;
          itm.data.valor = {
            ...itm.data.valor,
            desconto: merged(currV?.desconto, valor.desconto),
            juros: merged(currV?.juros, valor.juros),
            multa: merged(currV?.multa, valor.multa),
          } as CobVValor;
        }

        await this.store(tipoCob).update(
          itm.IdOwner,
          { txid: itm.txid },
          { ...curr, ...itm.data },
        );
      }

      return await this._readCob(
        { IdOwner: itm.IdOwner, txid: itm.txid },
        undefined,
        tipoCob,
      );
    }
  }

  async editCob(itm: PixRequest<CobPatchRequest>): Promise<CobPatchResponse> {
    return (await this._editCob(itm, TipoCob.imediato)) as CobPatchResponse;
  }

  async editCobV(
    itm: PixRequest<CobVPatchRequest>,
  ): Promise<CobVPatchResponse> {
    return (await this._editCob(itm, TipoCob.vencimento)) as CobVPatchResponse;
  }

  async _removeCob(
    key: PixID & { IdOwner: string },
    tipoCob: TipoCob = TipoCob.imediato,
  ): Promise<boolean> {
    await this.loccob.remove(key.IdOwner, { txid: key.txid });
    return await this.store(tipoCob).remove(key.IdOwner, { txid: key.txid });
  }
  async removeCob(key: PixID & { IdOwner: string }): Promise<boolean> {
    return this._removeCob(key);
  }
  async removeCobV(key: PixID & { IdOwner: string }): Promise<boolean> {
    return this._removeCob(key, TipoCob.vencimento);
  }

  async readLoc({
    IdOwner,
    id,
  }: LocID & { IdOwner: string }): Promise<LocGetResponse> {
    const itm: any = await this.locations.read(IdOwner, { id });
    if (itm) {
      const lc = await this.loccob.read(IdOwner, { id });
      return {
        ...itm,
        ...(lc?.txid ? { txid: lc?.txid } : {}),
        location: locationUrl(itm.uuid),
      };
    }
  }

  async listLoc(filter: LocGetFilter & { IdOwner: string }) {
    const res = {
      parametros: {
        inicio: filter.inicio,
        fim: filter.fim,
        paginacao: {
          paginaAtual: filter.paginacao?.paginaAtual || 0,
          itensPorPagina: filter.paginacao?.itensPorPagina || 100,
          quantidadeDePaginas: 0,
          quantidadeTotalDeItens: 0,
        },
      },
    };

    //Carrega Locations e correlação entre Location e Cob(x)
    const ls = await Promise.all([
      this.locations.list(filter.IdOwner),
      this.loccob.list(filter.IdOwner),
    ]).then(([_locs, _cobs]) => {
      if (filter.tipoCob !== undefined) {
        _locs = _locs.filter(
          (f: LocGetResponse) => f.tipoCob === filter.tipoCob,
        );
      }

      //Left Join Loc x LocCob
      return _locs.map((m) => {
        const _cob = _cobs.find((f) => f.id === m.id);
        return _cob
          ? { ...m, txid: _cob.txid, location: locationUrl(m.uuid) }
          : m;
      });
    });

    let loc = ls.filter((f: any) => {
      const [criacao, inicio, fim] = [
        new Date(f.criacao),
        new Date(filter.inicio),
        new Date(filter.fim),
      ];
      return criacao >= inicio && criacao <= fim;
    });

    if (filter.txIdPresente !== undefined) {
      loc = loc.filter((f: LocGetResponse & { cob: any }) => {
        const res =
          (!!f.txid && !!filter.txIdPresente) ||
          (!f.txid && !filter.txIdPresente);
        return res;
      });
    }

    const ini =
      res.parametros.paginacao.paginaAtual *
      res.parametros.paginacao.itensPorPagina;
    const fim = ini + res.parametros.paginacao.itensPorPagina;
    res.parametros.paginacao.quantidadeDePaginas = Math.ceil(
      loc.length / res.parametros.paginacao.itensPorPagina,
    );
    res.parametros.paginacao.quantidadeTotalDeItens = loc.length;
    return { ...res, loc: loc.slice(ini, fim) };
  }

  async readLocUUID(IdOwner: string, uuid: string): Promise<LocGetResponse> {
    const itm: any = await this.locations.read(IdOwner, { uuid });
    if (itm) {
      const lc = await this.loccob.read(IdOwner, { id: itm.id });
      return {
        ...itm,
        txid: lc?.txid,
        location: locationUrl(itm.uuid),
      };
    }
  }

  async addLoc({
    tipoCob,
    IdOwner,
  }: LocPutRequest & { IdOwner: string }): Promise<LocPutResponse> {
    await (() => new Promise<void>((res) => setTimeout(() => res(), 100)))(); //delay -- WORKAROUND PRA EVITAR COLISÃO DE ID DURANTE OS TESTES
    const id = +new Date();
    const itm = {
      id,
      tipoCob,
      uuid: randomUUID().replace(/\-/g, ''),
      criacao: new Date().toJSON(),
    };
    await this.locations.add(IdOwner, itm);
    return await this.readLoc({ IdOwner, id });
  }

  async removeLoc({
    id,
    IdOwner,
  }: LocID & { IdOwner: string }): Promise<LocGetResponse> {
    const loc = await this.readLoc({ IdOwner, id });
    if (!loc) {
      return undefined;
    }
    if (loc.txid) {
      await this.loccob.remove(IdOwner, { id });
    }
    const { txid, ...unlinked } = loc;
    return unlinked as LocGetResponse;
  }

  async addRec(mdl: RecRequest<RecPostRequest>) {
    const own = owners.find((f) => f.id === mdl.IdOwner);

    if (!own) {
      throw new Error(MESSAGES.Errors.defaults.NOT_FOUNT('OWNER'));
    }

    const itm = {
      ...mdl.data,
      idRec: `R${mdl.data.politicaRetentativa === PoliticaRetentativa.NaoPermite ? 'N' : 'R'}${own.ISPB}${new Date().toJSON().replace(/\D/g, '').substring(0, 8)} `,
    };
    return await this.rec.add(mdl.IdOwner, itm);
  }
}
