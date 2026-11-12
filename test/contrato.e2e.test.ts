import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthModule } from '../src/auth.module';
import { configureApp, initDatabase } from '../src/app.factory';
import { correntistas } from '../src/data/db.json';
import { crc16 } from '../src/libs/brcode';

const txid = () => randomUUID().replace(/-/g, '');
const chave = correntistas[0].chave;
const bearer = { Authorization: 'Bearer 123-abc' };

describe('Contrato Bacen (servidor configurado como em produção)', () => {
  let app: INestApplication;
  let auth: INestApplication;

  beforeAll(async () => {
    process.env.AUTH_DELAY_MS = '0';
    await initDatabase();
    app = configureApp(
      (
        await Test.createTestingModule({ imports: [AppModule] }).compile()
      ).createNestApplication(),
    );
    auth = (
      await Test.createTestingModule({ imports: [AuthModule] }).compile()
    ).createNestApplication();
    await app.init();
    await auth.init();
  });

  afterAll(async () => {
    await app.close();
    await auth.close();
  });

  const http = () => request(app.getHttpServer());

  it('OAuth2 client credentials (form + Basic)', async () => {
    const res = await request(auth.getHttpServer())
      .post('/oauth/token')
      .auth('123', 'abc')
      .type('form')
      .send({ grant_type: 'client_credentials', scope: 'cob.write cob.read' })
      .expect(200);
    expect(res.body).toMatchObject({
      access_token: '123-abc',
      token_type: 'Bearer',
      expires_in: 300,
    });
  });

  it('PUT /cob com Bearer → 201 com campos da spec', async () => {
    const res = await http()
      .put(`/cob/${txid()}`)
      .set(bearer)
      .send({ chave, valor: { original: '10.00' } })
      .expect(201);
    expect(res.body).toMatchObject({ status: 'ATIVA', revisao: 0, pix: [] });
    expect(res.body.calendario.criacao).toBeDefined();
    expect(res.body.loc).toMatchObject({ tipoCob: 'cob' });
    const brcode: string = res.body.pixCopiaECola;
    expect(brcode).toContain(res.body.loc.location);
    expect(brcode.slice(-4)).toBe(crc16(brcode.slice(0, -4)));
  });

  it('erro em application/problem+json com correlationId', async () => {
    const id = txid();
    await http()
      .put(`/cob/${id}`)
      .set(bearer)
      .send({ chave, valor: { original: '1.00' } })
      .expect(201);
    const res = await http()
      .put(`/cob/${id}`)
      .set(bearer)
      .send({ chave, valor: { original: '1.00' } })
      .expect(400);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(JSON.parse(res.text).correlationId).toBeDefined();
  });

  it.each([
    ['txid curto', 'abc', { chave, valor: { original: '1.00' } }, 'cob.txid'],
    [
      'valor sem 2 casas',
      txid(),
      { chave, valor: { original: '10.5' } },
      'cob.valor.original',
    ],
    [
      'solicitacaoPagador > 140',
      txid(),
      {
        chave,
        valor: { original: '1.00' },
        solicitacaoPagador: 'x'.repeat(141),
      },
      'cob.solicitacaoPagador',
    ],
    [
      'infoAdicionais.nome > 50',
      txid(),
      {
        chave,
        valor: { original: '1.00' },
        infoAdicionais: [{ nome: 'x'.repeat(51), valor: 'v' }],
      },
      'cob.infoAdicionais.0.nome',
    ],
  ])('400: %s', async (_t, id, body, propriedade) => {
    const res = await http()
      .put(`/cob/${id}`)
      .set(bearer)
      .send(body)
      .expect(400);
    expect(JSON.parse(res.text).violacoes).toEqual(
      expect.arrayContaining([expect.objectContaining({ propriedade })]),
    );
  });

  it('revisões: revisao=0 após PATCH, revisão inválida → 400', async () => {
    const id = txid();
    await http()
      .put(`/cob/${id}`)
      .set(bearer)
      .send({ chave, valor: { original: '1.00' } })
      .expect(201);
    await http()
      .patch(`/cob/${id}`)
      .set(bearer)
      .send({ valor: { original: '2.00' } })
      .expect(200);
    expect(
      (await http().get(`/cob/${id}?revisao=0`).set(bearer).expect(200)).body
        .valor.original,
    ).toBe('1.00');
    expect(
      (await http().get(`/cob/${id}`).set(bearer).expect(200)).body,
    ).toMatchObject({ revisao: 1, valor: { original: '2.00' } });
    await http().get(`/cob/${id}?revisao=x`).set(bearer).expect(400);
  });

  it('paginação e filtros na listagem', async () => {
    const inicio = new Date().toJSON();
    for (let i = 0; i < 3; i++) {
      await http()
        .put(`/cob/${txid()}`)
        .set(bearer)
        .send({
          chave,
          valor: { original: '1.00' },
          devedor: { nome: 'Fulano', cpf: '12345678909' },
        })
        .expect(201);
    }
    const fim = new Date(Date.now() + 1000).toJSON();
    const res = await http()
      .get('/cob')
      .query({
        inicio,
        fim,
        cpf: '12345678909',
        'paginacao.itensPorPagina': 2,
        'paginacao.paginaAtual': 1,
      })
      .set(bearer)
      .expect(200);
    expect(res.body.cobs).toHaveLength(1);
    expect(res.body.parametros.paginacao).toMatchObject({
      paginaAtual: 1,
      itensPorPagina: 2,
      quantidadeDePaginas: 2,
      quantidadeTotalDeItens: 3,
    });
    await http().get('/cob').set(bearer).expect(400);
  });

  it('CobV em coleção própria, com recebedor', async () => {
    const id = txid();
    const res = await http()
      .put(`/cobv/${id}`)
      .set(bearer)
      .send({
        chave,
        valor: { original: '10.00' },
        calendario: { dataDeVencimento: '2099-12-31' },
        devedor: { nome: 'Fulano', cpf: '12345678909' },
      })
      .expect(201);
    expect(res.body.recebedor).toMatchObject({ nome: correntistas[0].nome });
    await http().get(`/cob/${id}`).set(bearer).expect(404);
  });

  it('POST /loc → 201', async () => {
    const res = await http()
      .post('/loc')
      .set(bearer)
      .send({ tipoCob: 'cob' })
      .expect(201);
    expect(res.body).toMatchObject({ tipoCob: 'cob' });
  });
});
