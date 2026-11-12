import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from '../../src/controllers/location.controller';
import { PSP } from '../../src/core/app/psp';
import { MemoryDB } from '../../src/libs/fakedb';
import {
  ModalidadeDesconto,
  ModalidadeJurosDiasCorridos,
  ModalidadeMulta,
  TipoCob,
  ValidadeVencimento,
} from '../../src/core/app/models';
import { randomUUID } from 'crypto';
import { CobController } from '../../src/controllers/cob.controller';
import { correntistas } from '../../src/data/db.json';
import { CobPutResponse } from '../../src/core/app/models/cob';
import { LocGetFilter, LocPutResponse } from '../../src/core/app/models/loc';
import { addDays, flatDate } from '../../src/libs/utils';
import { CobVController } from '../../src/controllers/cobv.controller';
import { CobVPutResponse, CobVValor } from '../../src/core/app/models/cobv';

describe('LocationController', () => {
  let ctrl: LocationController;
  let ctrlCob: CobController;
  let ctrlCobV: CobVController;

  beforeAll(async () => {
    const cst = MemoryDB.create('CORRENTISTAS', ['chave', 'cpfcnpj']);
    MemoryDB.create('COB', ['txid']);
    MemoryDB.create('COB_HIST', ['id']);
    MemoryDB.create('LOCATIONS', ['id', 'uuid']);
    MemoryDB.create('LOC_COB', ['id', 'txid']);

    await Promise.all(
      correntistas.map(async (c) => {
        await cst.add('DEV', c);
      }),
    );

    const app: TestingModule = await Test.createTestingModule({
      controllers: [LocationController, CobController, CobVController],
      providers: [PSP],
    }).compile();

    ctrl = app.get<LocationController>(LocationController);
    ctrlCob = app.get<CobController>(CobController);
    ctrlCobV = app.get<CobVController>(CobVController);
  });

  let txid: string;
  let IdOwner: string;
  let chave: string;

  beforeEach(async () => {
    txid = randomUUID().replace(/\-/g, '');
    IdOwner = randomUUID();
    chave = correntistas[Math.floor(Math.random() * correntistas.length)].chave;
  });

  describe('POST', () => {
    describe('200', () => {
      it('cob', async () => {
        await expect(
          ctrl.create({ tipoCob: TipoCob.imediato }, { IdOwner }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.imediato });
      });

      it('cobv', async () => {
        await expect(
          ctrl.create({ tipoCob: TipoCob.vencimento }, { IdOwner }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.vencimento });
      });
    });
  });

  describe('GET', () => {
    describe('200', () => {
      it('cob', async () => {
        const itm = await ctrl.create(
          { tipoCob: TipoCob.imediato },
          { IdOwner },
        );
        await expect(
          ctrl.read({ id: itm.id }, { IdOwner }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.imediato });
      });

      it('cobv', async () => {
        const itm = await ctrl.create(
          { tipoCob: TipoCob.vencimento },
          { IdOwner },
        );
        await expect(
          ctrl.read({ id: itm.id }, { IdOwner }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.vencimento });
      });

      it('txid', async () => {
        const cob = await ctrlCob.add(
          { valor: { original: '10.00' }, chave },
          randomUUID().replace(/\-/g, ''),
          { IdOwner },
        );
        await expect(
          ctrl.read({ id: cob.loc.id }, { IdOwner }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.imediato, txid: cob.txid });
      });
    });
  });

  describe('DELETE', () => {
    describe('200', () => {
      it('txid', async () => {
        const cob = await ctrlCob.add(
          { valor: { original: '10.00' }, chave },
          randomUUID().replace(/\-/g, ''),
          { IdOwner },
        );
        await ctrl.remove({ id: cob.loc.id }, { IdOwner });
        const loc = await ctrl.read({ id: cob.loc.id }, { IdOwner });
        expect(loc.txid).toBeUndefined();
      });
    });
  });

  describe('LIST', () => {
    const TOT_PIX = 3;

    const lsCob: CobPutResponse[] = [];
    const lsCobV: CobVPutResponse[] = [];
    const filter: LocGetFilter = {
      inicio: flatDate(addDays(new Date(), -1)).toJSON(),
      fim: flatDate(addDays(new Date(), +1)).toJSON(),
    };
    const IdOwner = randomUUID();
    beforeAll(async () => {
      for (const c of correntistas) {
        for (let i = 0; i < TOT_PIX; i++) {
          lsCob.push(
            await ctrlCob.add(
              { chave: c.chave, valor: { original: '15.00' } },
              randomUUID().replace(/\-/g, ''),
              { IdOwner },
            ),
          );
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
          lsCobV.push(
            await ctrlCobV.create(
              { chave: c.chave, valor, calendario },
              randomUUID().replace(/\-/g, ''),
              { IdOwner },
            ),
          );
        }
      }
    });

    describe('PERIODO', () => {
      it('quantidades', async () => {
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(correntistas.length * TOT_PIX * 2);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 1,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX * 2,
          },
        });
      });
    });

    describe('TIPOCOB', () => {
      it('imediato', async () => {
        filter.tipoCob = TipoCob.imediato;
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(correntistas.length * TOT_PIX);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 1,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX,
          },
        });
      });

      it('vencimento', async () => {
        filter.tipoCob = TipoCob.vencimento;
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(correntistas.length * TOT_PIX);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 1,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX,
          },
        });
      });
    });

    describe('TXID', () => {
      const filter: LocGetFilter = {
        inicio: flatDate(addDays(new Date(), -1)).toJSON(),
        fim: flatDate(addDays(new Date(), +1)).toJSON(),
      };

      beforeAll(async () => {
        ctrl.remove({ id: lsCob[0].loc.id }, { IdOwner });
        ctrl.remove({ id: lsCob[1].loc.id }, { IdOwner });
        ctrl.remove({ id: lsCobV[0].loc.id }, { IdOwner });
        ctrl.remove({ id: lsCobV[1].loc.id }, { IdOwner });
      });

      it('presente', async () => {
        filter.txIdPresente = true;
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(correntistas.length * TOT_PIX * 2 - 4);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 1,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX * 2 - 4,
          },
        });
      });

      it('ausente', async () => {
        filter.txIdPresente = false;
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(4);
        expect(parametros).toMatchObject({
          paginacao: { quantidadeDePaginas: 1, quantidadeTotalDeItens: 4 },
        });
      });
    });

    describe('PAGINAÇÃO', () => {
      const filter: LocGetFilter = {
        inicio: flatDate(addDays(new Date(), -1)).toJSON(),
        fim: flatDate(addDays(new Date(), +1)).toJSON(),
      };

      it('pag:1 | Tam: 7 | 7 itens', async () => {
        filter.paginacao = { itensPorPagina: 7, paginaAtual: 1 };
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(7);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 3,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX * 2,
          },
        });
      });

      it('pag:6 | Tam: 7 | 3 itens', async () => {
        filter.paginacao = { itensPorPagina: 7, paginaAtual: 2 };
        const { parametros, loc: locs } = await ctrl.list({ IdOwner }, filter);
        expect(locs).toHaveLength(4);
        expect(parametros).toMatchObject({
          paginacao: {
            quantidadeDePaginas: 3,
            quantidadeTotalDeItens: correntistas.length * TOT_PIX * 2,
          },
        });
      });
    });
  });
});
