import { randomUUID } from 'crypto';
import { PSP } from '../../../src/core/app/psp';
import { MemoryDB } from '../../../src/libs/fakedb';
import { correntistas } from '../../../src/data/db.json';
import {
  ModalidadeAlteracao,
  Situacao,
  TipoCob,
} from '../../../src/core/app/models';
import { MESSAGES } from '../../../src/libs/messages';
describe('PSP', () => {
  let psp: PSP;

  beforeAll(async () => {
    const cst = MemoryDB.create('CORRENTISTAS', ['chave']);
    MemoryDB.create('COB', ['txid']);
    MemoryDB.create('LOCATIONS', ['id', 'uuid']);
    MemoryDB.create('LOC_COB', ['id', 'txid']);

    await Promise.all(
      correntistas.map(async (c) => {
        await cst.add('DEV', c);
      }),
    );

    psp = new PSP();
  });

  let IdOwner: string;
  let txid: string;
  let chave: string;

  beforeEach(() => {
    IdOwner = randomUUID();
    txid = randomUUID().replace(/\-/g, '');
    chave = correntistas[Math.floor(Math.random() * correntistas.length)].chave;
  });

  describe('COB', () => {
    describe('add', () => {
      it('retirada', async () => {
        await expect(
          psp.addCob({
            IdOwner,
            txid,
            data: { chave, valor: { original: '10.00', retirada: {} } },
          }),
        ).rejects.toThrow('NÃO IMPLEMENTADO');
      });
      it('success', async () => {
        await expect(
          psp.addCob({
            IdOwner,
            txid,
            data: { chave, valor: { original: '10.00' } },
          }),
        ).resolves.toMatchObject({
          txid,
          revisao: 0,
          chave,
          valor: {
            original: '10.00',
            modalidadeAlteracao: ModalidadeAlteracao.NaoEditavel,
          },
          status: Situacao.Ativa,
        });
      });
    });

    describe('read', () => {
      it('success', async () => {
        await psp.addCob({
          IdOwner,
          txid,
          data: { chave, valor: { original: '10.00' } },
        });
        await expect(psp.readCob({ IdOwner, txid })).resolves.toMatchObject({
          txid,
          revisao: 0,
          chave,
          valor: {
            original: '10.00',
            modalidadeAlteracao: ModalidadeAlteracao.NaoEditavel,
          },
          status: Situacao.Ativa,
        });
      });
    });

    describe('edit', () => {
      let id: number;
      beforeEach(async () => {
        id = +new Date();
        await psp.addCob({
          IdOwner,
          txid,
          data: { chave, valor: { original: '10.00' } },
        });
        await psp.addLoc({ IdOwner, tipoCob: TipoCob.imediato });
      });

      describe('sem revisão', () => {
        describe('falha', () => {
          it('location não encontrada', async () => {
            await expect(
              psp.editCob({
                IdOwner,
                txid,
                data: { loc: { id: Math.round(Math.random() * 1000) } },
              }),
            ).rejects.toThrow(MESSAGES.Errors.defaults.NOT_FOUNT('location'));
          });
          it('tipo divergente', async () => {
            const loc_div = await psp.addLoc({
              IdOwner,
              tipoCob: TipoCob.vencimento,
            });
            await expect(
              psp.editCob({ IdOwner, txid, data: { loc: { id: loc_div.id } } }),
            ).rejects.toThrow(
              MESSAGES.Errors.defaults.UNEXPECTED_VALUE(
                'tipoCob',
                TipoCob.vencimento,
              ),
            );
          });

          it('location em uso', async () => {
            const cob = await psp.addCob({
              IdOwner,
              txid: randomUUID().replace(/\-/g, ''),
              data: { chave, valor: { original: '10.00' } },
            });
            await expect(
              psp.editCob({ IdOwner, txid, data: { loc: { id: cob.loc.id } } }),
            ).rejects.toThrow('LOCATION JÁ ESTÁ VINCULADO A UMA COBRANÇA');
          });
        });
        it('sucesso', async () => {
          const new_loc = await psp.addLoc({
            IdOwner,
            tipoCob: TipoCob.imediato,
          });
          await expect(
            psp.editCob({ IdOwner, txid, data: { loc: { id: new_loc.id } } }),
          ).resolves.toMatchObject({ txid, revisao: 0 });
        });
      });
    });
  });

  describe('LOC', () => {
    describe('add', () => {
      it('success', async () => {
        expect(
          psp.addLoc({ IdOwner, tipoCob: TipoCob.imediato }),
        ).resolves.toMatchObject({ tipoCob: TipoCob.imediato });
      });
    });

    describe('read', () => {
      it('success', async () => {
        const { id } = await psp.addLoc({ IdOwner, tipoCob: TipoCob.imediato });
        await expect(psp.readLoc({ IdOwner, id })).resolves.toMatchObject({
          id,
          tipoCob: TipoCob.imediato,
        });
        const res = await psp.readLoc({ IdOwner, id });
        await expect(psp.readLocUUID(IdOwner, res.uuid)).resolves.toMatchObject(
          { id, tipoCob: TipoCob.imediato },
        );
      });
    });

    describe('delete', () => {
      it('success', async () => {
        const cob = await psp.addCob({
          IdOwner,
          txid,
          data: { chave, valor: { original: '10.00' } },
        });
        expect(cob.loc?.id).not.toBeUndefined();
        expect(cob).toMatchObject({ txid });

        await expect(
          psp.readLoc({ IdOwner, id: cob.loc.id }),
        ).resolves.toMatchObject({ txid });
        await expect(
          psp.removeLoc({ IdOwner, id: cob.loc.id }),
        ).resolves.toBeTruthy();
        await expect(
          psp.readLoc({ IdOwner, id: cob.loc.id }),
        ).resolves.not.toMatchObject({ txid });
        await expect(psp.readCob({ IdOwner, txid })).resolves.not.toMatchObject(
          { loc: { id: cob.loc.id } },
        );
      });
    });
  });
});
