import { plainToInstance } from 'class-transformer';
import {
  IsCNPJValid,
  IsCorrentistaExists,
  IsCPFCNPJValid,
  IsCPFValid,
  IsDICTExists,
  IsDICTValid,
  IsIDRec,
  MinStringNumber,
  NotPast,
} from '../../src/validators/custom-validators';
import { Validate, Validator } from 'class-validator';
import { gerarCNPJ, gerarCPF } from '../../src/libs/documentos';
import { randomUUID } from 'crypto';
import { correntistas } from '../../src/data/db.json';
import { MemoryDB } from '../../src/libs/fakedb';
import { addDays } from '../../src/libs/utils';

describe('VALIDATORS', () => {
  const v = new Validator();
  let cst: MemoryDB;
  let cob: MemoryDB;
  beforeAll(async () => {
    cst = MemoryDB.create('CORRENTISTAS', ['chave', 'cpfcnpj']);
    cob = MemoryDB.create('COBR', ['txid', 'idrec']);

    await Promise.all(correntistas.map((c) => cst.add('DEV', c)));
  });

  describe('MinStringNumber', () => {
    class Model {
      @MinStringNumber(3, { message: 'FALHOU' })
      minStringNumber: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { minStringNumber: '1' })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { minStringNumber: '4' })),
      ).resolves.toHaveLength(0));
  });

  describe('IsDICTValid', () => {
    class Model {
      @IsDICTValid({ message: 'FALHOU' })
      dict: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: 'abc123' })),
      ).resolves.toHaveLength(1));
    it('cpf', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: gerarCPF() })),
      ).resolves.toHaveLength(0));
    it('cnpj', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: gerarCNPJ() })),
      ).resolves.toHaveLength(0));
    it('email', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: 'teste@teste.com' })),
      ).resolves.toHaveLength(0));
    it('cel', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: '+5521999999999' })),
      ).resolves.toHaveLength(0));
    it('hash', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: randomUUID() })),
      ).resolves.toHaveLength(0));
  });

  describe('IsDICTExists', () => {
    class Model {
      @IsDICTExists({ message: 'FALHOU' })
      dict: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: gerarCNPJ() })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { dict: correntistas[0].chave })),
      ).resolves.toHaveLength(0));
  });

  describe('IsCPFValid', () => {
    class Model {
      @IsCPFValid({ message: 'FALHOU' })
      cpf: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpf: '99999999900' })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpf: gerarCPF() })),
      ).resolves.toHaveLength(0));
  });

  describe('IsCNPJValid', () => {
    class Model {
      @IsCNPJValid({ message: 'FALHOU' })
      cnpj: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cnpj: '99999999900' })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cnpj: gerarCNPJ() })),
      ).resolves.toHaveLength(0));
  });

  describe('IsCPFCNPJValid', () => {
    class Model {
      @IsCPFCNPJValid({ message: 'FALHOU' })
      cpfcnpj: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpfcnpj: '99999999900' })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpfcnpj: gerarCPF() })),
      ).resolves.toHaveLength(0));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpfcnpj: gerarCNPJ() })),
      ).resolves.toHaveLength(0));
  });

  describe('IsCorrentistaExists', () => {
    class Model {
      @IsCorrentistaExists({ message: 'FALHOU' })
      cpfcnpj: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(plainToInstance(Model, { cpfcnpj: gerarCNPJ() })),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { cpfcnpj: correntistas[0].cpfcnpj }),
        ),
      ).resolves.toHaveLength(0));
  });

  describe('NotPast', () => {
    class Model {
      @NotPast({ message: 'FALHOU' })
      date: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { date: addDays(new Date(), -1).toJSON() }),
        ),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(plainToInstance(Model, { date: new Date() })),
      ).resolves.toHaveLength(0));
  });

  describe('IsIDRec', () => {
    class Model {
      @IsIDRec({ message: 'FALHOU' })
      idRec: string;
    }
    it('falha', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'RRxxxxxxxxyyyyMMddkkkkkkkkkkk' }),
        ),
      ).resolves.toHaveLength(1));
    it('falha', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'AR3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(1));
    it('falha', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'RA3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(1));
    it('sucesso', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'RR3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(0));
    it('sucesso', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'RN3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(0));
    it('sucesso', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'CR3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(0));
    it('sucesso', async () =>
      await expect(
        v.validate(
          plainToInstance(Model, { idRec: 'CN3114167220240926abcdefghijk' }),
        ),
      ).resolves.toHaveLength(0));
  });
});
