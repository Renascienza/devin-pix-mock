import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createPublicKey, createVerify } from 'crypto';
import { randomUUID } from 'crypto';
import { createServer, Server } from 'http';
import { AddressInfo } from 'net';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp, initDatabase } from '../src/app.factory';
import { correntistas } from '../src/data/db.json';

const txid = () => randomUUID().replace(/-/g, '');
const chave = correntistas[0].chave;
const bearer = { Authorization: 'Bearer 123-abc' };

describe('G3: pagamento, /pix, devolução, webhooks e Payload Location', () => {
  let app: INestApplication;
  let receiver: Server;
  let receiverUrl: string;
  const recebidos: { url: string; body: any }[] = [];
  const inicio = new Date(Date.now() - 1000).toJSON();
  const fim = () => new Date(Date.now() + 1000).toJSON();
  const http = () => request(app.getHttpServer());

  const novaCob = async (body: any = {}) => {
    const id = txid();
    const res = await http()
      .put(`/cob/${id}`)
      .set(bearer)
      .send({ chave, valor: { original: '100.00' }, ...body })
      .expect(201);
    return { id, cob: res.body };
  };

  beforeAll(async () => {
    receiver = createServer((req, res) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => {
        recebidos.push({ url: req.url, body: JSON.parse(data || '{}') });
        res.writeHead(200).end();
      });
    });
    await new Promise<void>((r) => receiver.listen(0, '127.0.0.1', () => r()));
    receiverUrl = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}/hook`;
    await initDatabase();
    app = configureApp(
      (
        await Test.createTestingModule({ imports: [AppModule] }).compile()
      ).createNestApplication(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    receiver.close();
  });

  it('webhook: cadastro, consulta e listagem', async () => {
    await http()
      .put(`/webhook/${chave}`)
      .set(bearer)
      .send({ webhookUrl: receiverUrl })
      .expect(200);
    expect(
      (await http().get(`/webhook/${chave}`).set(bearer).expect(200)).body,
    ).toMatchObject({ webhookUrl: receiverUrl, chave });
    expect(
      (await http().get('/webhook').set(bearer).expect(200)).body.webhooks,
    ).toHaveLength(1);
    await http()
      .put('/webhook/chave-inexistente')
      .set(bearer)
      .send({ webhookUrl: receiverUrl })
      .expect(400);
    await http()
      .put(`/webhook/${chave}`)
      .set(bearer)
      .send({ webhookUrl: 'nao-e-url' })
      .expect(400);
  });

  let e2eid: string;
  let pagoTxid: string;

  it('pagamento simulado conclui a cobrança e notifica o webhook', async () => {
    const { id } = await novaCob({
      devedor: { nome: 'Fulano', cpf: '12345678909' },
    });
    pagoTxid = id;
    const res = await http()
      .post(`/mock/cob/${id}/pagamento`)
      .set(bearer)
      .send({
        infoPagador: 'obrigado',
        pagador: { nome: 'Fulano', cpf: '12345678909' },
      })
      .expect(201);
    e2eid = res.body.endToEndId;
    expect(e2eid).toMatch(/^E[a-zA-Z0-9]{31}$/);
    expect(res.body).toMatchObject({
      txid: id,
      valor: '100.00',
      chave,
      infoPagador: 'obrigado',
      devolucoes: [],
    });
    expect(res.body.pagador).toBeUndefined();

    const cob = (await http().get(`/cob/${id}`).set(bearer).expect(200)).body;
    expect(cob.status).toBe('CONCLUIDA');
    expect(cob.pix).toEqual([expect.objectContaining({ endToEndId: e2eid })]);
    expect(cob.pixCopiaECola).toBeUndefined();

    expect(recebidos.at(-1)).toMatchObject({
      url: '/hook/pix',
      body: { pix: [{ endToEndId: e2eid, txid: id }] },
    });
    expect(
      (
        await http().get('/mock/webhooks/entregas').set(bearer).expect(200)
      ).body.at(-1),
    ).toMatchObject({ status: 200 });

    await http()
      .post(`/mock/cob/${id}/pagamento`)
      .set(bearer)
      .send({})
      .expect(400);
    await http()
      .post(`/mock/cob/${txid()}/pagamento`)
      .set(bearer)
      .send({})
      .expect(404);
  });

  it('valor diferente do original é rejeitado quando não há modalidadeAlteracao', async () => {
    const { id } = await novaCob();
    await http()
      .post(`/mock/cob/${id}/pagamento`)
      .set(bearer)
      .send({ valor: '1.00' })
      .expect(400);
  });

  it('cobrança expirada não pode ser paga', async () => {
    const { id } = await novaCob({ calendario: { expiracao: 1 } });
    await new Promise((r) => setTimeout(r, 1100));
    await http()
      .post(`/mock/cob/${id}/pagamento`)
      .set(bearer)
      .send({})
      .expect(400);
  });

  it('GET /pix/:e2eid e GET /pix com filtros', async () => {
    expect(
      (await http().get(`/pix/${e2eid}`).set(bearer).expect(200)).body,
    ).toMatchObject({ txid: pagoTxid });
    await http()
      .get(`/pix/${'X'.repeat(32)}`)
      .set(bearer)
      .expect(404);
    await http().get('/pix/curto').set(bearer).expect(400);
    const ls = (
      await http()
        .get('/pix')
        .query({ inicio, fim: fim(), cpf: '12345678909' })
        .set(bearer)
        .expect(200)
    ).body;
    expect(ls.pix.map((p: any) => p.endToEndId)).toContain(e2eid);
    expect(ls.parametros.paginacao).toMatchObject({
      paginaAtual: 0,
      itensPorPagina: 100,
    });
    await http().get('/pix').set(bearer).expect(400);
  });

  it('devolução: criação, limite de valor, id duplicado e consulta', async () => {
    const res = await http()
      .put(`/pix/${e2eid}/devolucao/d1`)
      .set(bearer)
      .send({ valor: '60.00', descricao: 'parcial' })
      .expect(201);
    expect(res.body).toMatchObject({
      id: 'd1',
      valor: '60.00',
      natureza: 'ORIGINAL',
      status: 'DEVOLVIDO',
    });
    expect(res.body.rtrId).toMatch(/^D[a-zA-Z0-9]{31}$/);
    await http()
      .put(`/pix/${e2eid}/devolucao/d1`)
      .set(bearer)
      .send({ valor: '1.00' })
      .expect(400);
    await http()
      .put(`/pix/${e2eid}/devolucao/d2`)
      .set(bearer)
      .send({ valor: '40.01' })
      .expect(400);
    await http()
      .put(`/pix/${e2eid}/devolucao/d3`)
      .set(bearer)
      .send({ valor: '1.00', natureza: 'RETIRADA' })
      .expect(400);
    await http()
      .put(`/pix/${e2eid}/devolucao/d4`)
      .set(bearer)
      .send({ valor: '1' })
      .expect(400);
    expect(
      (await http().get(`/pix/${e2eid}/devolucao/d1`).set(bearer).expect(200))
        .body.id,
    ).toBe('d1');
    await http().get(`/pix/${e2eid}/devolucao/zz`).set(bearer).expect(404);
    const ls = (
      await http()
        .get('/pix')
        .query({ inicio, fim: fim(), devolucaoPresente: 'true' })
        .set(bearer)
        .expect(200)
    ).body;
    expect(ls.pix.map((p: any) => p.endToEndId)).toEqual([e2eid]);
    expect(recebidos.at(-1).body.pix[0].devolucoes).toHaveLength(1);
  });

  it('CobV: pagamento simulado', async () => {
    const id = txid();
    await http()
      .put(`/cobv/${id}`)
      .set(bearer)
      .send({
        chave,
        valor: { original: '50.00' },
        calendario: { dataDeVencimento: '2099-12-31' },
        devedor: { nome: 'Fulano', cpf: '12345678909' },
      })
      .expect(201);
    await http()
      .post(`/mock/cobv/${id}/pagamento`)
      .set(bearer)
      .send({ valor: '52.00' })
      .expect(201);
    expect(
      (await http().get(`/cobv/${id}`).set(bearer).expect(200)).body.status,
    ).toBe('CONCLUIDA');
  });

  it('Payload Location: JWS RS256 verificável pelo JWKS', async () => {
    const { id, cob } = await novaCob();
    const uuid = cob.loc.location.split('/').pop();
    const res = await http().get(`/mock/qr/${uuid}`).expect(200);
    expect(res.headers['content-type']).toContain('application/jose');
    const [h, p, s] = res.text.split('.');
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(header).toMatchObject({ alg: 'RS256', typ: 'JOSE' });
    expect(header.jku).toMatch(/\/mock\/jwks$/);
    expect(payload).toMatchObject({
      txid: id,
      status: 'ATIVA',
      valor: { original: '100.00' },
    });
    expect(payload.calendario.apresentacao).toBeDefined();
    const { keys } = (await http().get('/mock/jwks').expect(200)).body;
    const key = createPublicKey({
      key: keys.find((k: any) => k.kid === header.kid),
      format: 'jwk',
    });
    expect(
      createVerify('RSA-SHA256')
        .update(`${h}.${p}`)
        .verify(key, s, 'base64url'),
    ).toBe(true);
    await http().get(`/mock/qr/${randomUUID()}`).expect(404);
  });

  it('webhooks por tipo e remoção', async () => {
    await http()
      .put('/webhookcob')
      .set(bearer)
      .send({ webhookUrl: receiverUrl })
      .expect(200);
    expect(
      (await http().get('/webhookcob').set(bearer).expect(200)).body.webhookUrl,
    ).toBe(receiverUrl);
    await http().delete('/webhookcob').set(bearer).expect(204);
    await http().get('/webhookcob').set(bearer).expect(404);
    await http().delete(`/webhook/${chave}`).set(bearer).expect(204);
    await http().get(`/webhook/${chave}`).set(bearer).expect(404);
    await http().delete(`/webhook/${chave}`).set(bearer).expect(404);
  });
});
