import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { randomUUID } from 'crypto';
import { MemoryDB } from '../src/libs/fakedb';
import { correntistas } from '../src/data/db.json';
import { gerarCNPJ } from '../src/libs/documentos';

const devedor = { nome: 'Fulano de Tal', cnpj: gerarCNPJ() };
import {
  ModalidadeDesconto,
  ModalidadeJurosDiasCorridos,
  ModalidadeMulta,
  ValidadeVencimento,
} from '../src/core/app/models';
import { addDays } from '../src/libs/utils';
import { CobVValor } from 'src/core/app/models/cobv';
import { owners } from '../src/data/db.json';

describe('COBV', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const cst = MemoryDB.create('CORRENTISTAS', ['chave']);
    MemoryDB.create('COB', ['txid']);
    MemoryDB.create('COB_HIST', ['id']);
    MemoryDB.create('LOCATIONS', ['id', 'uuid']);
    MemoryDB.create('LOC_COB', ['id', 'txid']);

    await Promise.all(correntistas.map((c) => cst.add('DEV', c)));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const errorFormatter = (
      errors: ValidationError[],
      errMessage?: any,
      parentField?: string,
    ): any => {
      const message = errMessage || {};
      let errorField = '';
      let validationsList;

      errors.forEach((error) => {
        errorField = parentField
          ? `${parentField}.${error.property}`
          : error?.property;
        if (!error?.constraints && error?.children?.length) {
          errorFormatter(error.children, message, errorField);
        } else {
          validationsList = Object.values(error?.constraints);
          message[errorField] =
            validationsList.length > 0
              ? validationsList.pop()
              : 'Invalid Value!';
        }
      });

      return message;
    };
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        disableErrorMessages: false,
        transform: true,
        skipMissingProperties: true,
        exceptionFactory: (errors) => {
          throw new BadRequestException(errorFormatter(errors));
        },
      }),
    );
    await app.init();
  });

  let txid: string;
  let chave: string;

  let valor: CobVValor;
  let calendario: ValidadeVencimento;

  beforeEach(() => {
    txid = randomUUID().replace(/\-/g, '');
    chave = correntistas[Math.floor(Math.random() * correntistas.length)].chave;

    valor = {
      original: '10.00',
      desconto: {
        data: new Date().toJSON(),
        valorPerc: '1.00',
        modalidade: ModalidadeDesconto.ValorDiaUtil,
      },
      juros: {
        modalidade: ModalidadeJurosDiasCorridos.Valor,
        valorPerc: '1.00',
      },
      multa: { modalidade: ModalidadeMulta.ValorFixo, valorPerc: '1.00' },
    };
    calendario = {
      dataDeVencimento: new Date().toJSON(),
      validadeAposVencimento: 1,
    };
  });

  describe('/PUT', () => {
    describe('400', () => {
      it('O campo cobv.calendario.dataDeVencimento é anterior à data de criação da cobrança.', async () => {
        calendario.dataDeVencimento = addDays(new Date(), -1).toJSON();
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao:
                    'O campo cobv.calendario.dataDeVencimento é anterior à data de criação da cobrança.',
                  propriedade: 'cobv.calendario.dataDeVencimento',
                },
              ],
            }),
          );
      });

      it('O campo cobv.valor.original não respeita o schema.', async () => {
        valor.original = 'abc123';
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.valor.original não respeita o schema.',
                  propriedade: 'cobv.valor.original',
                },
              ],
            }),
          );
      });

      it('O campo cobv.valor.original é zero.', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({ chave, valor: { original: '0.00' }, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.valor.original é zero.',
                  propriedade: 'cobv.valor.original',
                },
              ],
            }),
          );
      });

      it('O campo cobv.chave não respeita o schema.', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({
            chave: `${chave}a`,
            valor: { original: '1.00' },
            calendario,
            devedor,
          })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 400 }),
          );
      });

      it('O campo cobv.chave corresponde a uma conta que não pertence a este usuário recebedor.', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({
            chave: gerarCNPJ(),
            valor: { original: '1.00' },
            calendario,
            devedor,
          })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao:
                    'O campo cobv.chave corresponde a uma conta que não pertence a este usuário recebedor.',
                  propriedade: 'cobv.chave',
                },
              ],
            }),
          );
      });
    });

    describe('401', () => {
      it('Sem cabeçalho', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID()}`)
          .send({ chave, valor, calendario, devedor })
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });

      it('Cabeçalho inválido', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID()}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', 'xpto')
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });
    });

    describe('200', () => {
      const valor: CobVValor = {
        original: '10.00',
        desconto: {
          data: new Date().toJSON(),
          valorPerc: '1.00',
          modalidade: ModalidadeDesconto.ValorDiaUtil,
        },
        juros: {
          modalidade: ModalidadeJurosDiasCorridos.Valor,
          valorPerc: '1.00',
        },
        multa: { modalidade: ModalidadeMulta.ValorFixo, valorPerc: '1.00' },
      };
      const calendario: ValidadeVencimento = {
        dataDeVencimento: new Date().toJSON(),
        validadeAposVencimento: 1,
      };

      it('Preenchimento válido', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${randomUUID().replace(/\-/g, '')}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(201)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              chave,
              valor,
              calendario,
            }),
          );
      });
    });
  });

  describe('/GET {:txid}', () => {
    describe('401', () => {
      const txId = randomUUID().replace(/\-/g, '');

      it('Sem cabeçalho', async () => {
        await request(app.getHttpServer())
          .get(`/cobv/${txId}`)
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });

      it('Cabeçalho inválido', async () => {
        await request(app.getHttpServer())
          .get(`/cobv/${txId}`)
          .set('mocked-token', 'xpto')
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });
    });

    describe('404', () => {
      const txId = randomUUID().replace(/\-/g, '');

      it('txid inexistente', async () => {
        await request(app.getHttpServer())
          .get(`/cobv/${txId}`)
          .set('mocked-token', '123-abc')
          .expect(404)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 404 }),
          );
      });
    });

    describe('200', () => {
      it('Preenchimento mínimo', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${txid}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(201);

        await request(app.getHttpServer())
          .get(`/cobv/${txid}`)
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              txid: txid,
              chave,
              valor,
              calendario,
            }),
          );
      });

      it('Versões anteriores', async () => {
        await request(app.getHttpServer())
          .put(`/cobv/${txid}`)
          .send({ chave, valor, calendario, devedor })
          .set('mocked-token', '123-abc')
          .expect(201);

        valor.original = '2.00';
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor, calendario })
          .set('mocked-token', '123-abc')
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ solicitacaoPagador: 'Feliz Ano Novo!' })
          .set('mocked-token', '123-abc')
          .expect(200);

        await request(app.getHttpServer())
          .get(`/cobv/${txid}?revisao=0`)
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              txid: txid,
              chave,
              valor: { ...valor, original: '10.00' },
              calendario,
              revisao: 0,
            }),
          );

        await request(app.getHttpServer())
          .get(`/cobv/${txid}?revisao=1`)
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              txid: txid,
              chave,
              valor,
              calendario,
              revisao: 1,
            }),
          );

        await request(app.getHttpServer())
          .get(`/cobv/${txid}?revisao=2`)
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              txid: txid,
              chave,
              valor,
              calendario,
              revisao: 2,
              solicitacaoPagador: 'Feliz Ano Novo!',
            }),
          );
      });
    });
  });

  describe('/PATCH', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .put(`/cobv/${txid}`)
        .send({ chave, valor, calendario, devedor })
        .set('mocked-token', '123-abc')
        .expect(201);
    });

    describe('400', () => {
      it('O campo cobv.calendario.dataDeVencimento é anterior à data de criação da cobrança.', async () => {
        calendario.dataDeVencimento = addDays(new Date(), -1).toJSON();
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor, calendario })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao:
                    'O campo cobv.calendario.dataDeVencimento é anterior à data de criação da cobrança.',
                  propriedade: 'cobv.calendario.dataDeVencimento',
                },
              ],
            }),
          );
      });

      it('O campo cobv.valor.original não respeita o schema.', async () => {
        valor.original = 'abc-123';
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor, calendario })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.valor.original não respeita o schema.',
                  propriedade: 'cobv.valor.original',
                },
              ],
            }),
          );
      });

      it('O campo cobv.valor.original é zero.', async () => {
        valor.original = '0.00';
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor, calendario })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.valor.original é zero.',
                  propriedade: 'cobv.valor.original',
                },
              ],
            }),
          );
      });

      it('O campo cobv.devedor.cpf não respeita o schema.', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ devedor: { cpf: 'abc123' } })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.devedor.cpf não respeita o schema.',
                  propriedade: 'cobv.devedor.cpf',
                },
              ],
            }),
          );
      });

      it('O campo cobv.devedor.cnpj não respeita o schema.', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ devedor: { cnpj: 'abc123' } })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.devedor.cnpj não respeita o schema.',
                  propriedade: 'cobv.devedor.cnpj',
                },
              ],
            }),
          );
      });

      it('O campo cobv.devedor.uf não respeita o schema.', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ devedor: { uf: 'abc123' } })
          .set('mocked-token', '123-abc')
          .expect(400)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({
              status: 400,
              detail: 'A cobrança não respeita o schema.',
              violacoes: [
                {
                  razao: 'O campo cobv.devedor.uf não respeita o schema.',
                  propriedade: 'cobv.devedor.uf',
                },
              ],
            }),
          );
      });
    });

    describe('401', () => {
      it('Sem cabeçalho', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor: { original: 1 } })
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });

      it('Cabeçalho inválido', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ IdOwner: owners[0].id, chave, valor: { original: 1 } })
          .set('mocked-token', 'xpto')
          .expect(401)
          .expect((res) =>
            expect(JSON.parse(res.text)).toMatchObject({ status: 401 }),
          );
      });
    });

    describe('404', () => {
      it('Não cadastrado', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${randomUUID().replace(/-/g, '')}`)
          .send({ valor: { original: '2.00' } })
          .set('mocked-token', '123-abc')
          .expect(404);
      });

      it('Excluído', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor: { original: '2.00' } })
          .set('mocked-token', '123-abc')
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' })
          .set('mocked-token', '123-abc')
          .expect(200);

        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor: { original: '2.00' } })
          .set('mocked-token', '123-abc')
          .expect(404);
      });
    });

    describe('200', () => {
      it('mudança de valor', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ valor: { original: '2.00' } })
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({ chave, calendario }),
          );
      });

      it('mudança de expiração', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ calendario: { expiracao: 3600 } })
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              chave,
              calendario: { expiracao: 3600 },
            }),
          );
      });

      it('exclusao', async () => {
        await request(app.getHttpServer())
          .patch(`/cobv/${txid}`)
          .send({ status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR' })
          .set('mocked-token', '123-abc')
          .expect(200)
          .expect((res: any) =>
            expect(JSON.parse(res.text)).toMatchObject({
              chave,
              status: 'REMOVIDA_PELO_USUARIO_RECEBEDOR',
            }),
          );
      });
    });
  });
});
