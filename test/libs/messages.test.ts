import { randomUUID } from 'crypto';
import { MESSAGES, VALIDATORS } from '../../src/libs/messages';
import {
  ModalidadeJurosDiasCorridos,
  TipoCob,
} from '../../src/core/app/models';
import { gerarCNPJ, gerarCPF } from '../../src/libs/documentos';

describe('MESSSAGES', () => {
  describe('REQUIRED', () => {
    const name = 'REQUIRED';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.required(name, undefined)).toBe(
        MESSAGES.Errors.defaults.FIELD_REQUIRED(name),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.required(name, 'ABC1B34')).toBeUndefined());
  });

  describe('MINLENGTH', () => {
    const name = 'MINLENGTH';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.minLength(name, 'ab', 3)).toBe(
        MESSAGES.Errors.defaults.FIELD_MIN_LENGTH(name, '3'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.minLength(name, 'abc', 3)).toBeUndefined());
  });

  describe('MAXLENGTH', () => {
    const name = 'MAXLENGTH';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.maxLength(name, 'abcd', 3)).toBe(
        MESSAGES.Errors.defaults.FIELD_MAX_LENGTH(name, '3'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.maxLength(name, 'abc', 3)).toBeUndefined());
  });

  describe('RANGELENGTH', () => {
    const name = 'RANGELENGTH';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.rangeLength(name, 'abcdefgh', 3, 5)).toBe(
        MESSAGES.Errors.defaults.FIELD_RANGE_LENGTH(name, '3', '5'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.rangeLength(name, 'abcd', 3, 5)).toBeUndefined());
  });

  describe('PATTERN', () => {
    const name = 'PATTERN';
    it(`${name} inválido`, () =>
      expect(
        VALIDATORS.pattern(name, 'ABC1234', /[a-z]{3,3}[0-9][a-z][0-9]{2,2}/),
      ).toBe(MESSAGES.Errors.defaults.INVALID_FORMAT(name)));
    it(`${name} válido`, () =>
      expect(
        VALIDATORS.pattern(name, 'ABC1B34', /[a-z]{3,3}[0-9][a-z][0-9]{2,2}/i),
      ).toBeUndefined());
  });

  describe('GREATERTHAN', () => {
    const name = 'GREATERTHAN';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.greaterThan(name, 1, 2)).toBe(
        MESSAGES.Errors.defaults.FIELD_GREATER_THAN(name, '2'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.greaterThan(name, 3, 2)).toBeUndefined());
  });

  describe('GREATEREQUAL', () => {
    const name = 'GREATEREQUAL';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.greaterEqual(name, 1, 2)).toBe(
        MESSAGES.Errors.defaults.FIELD_GREATER_EQUAL(name, '2'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.greaterEqual(name, 2, 2)).toBeUndefined());
  });

  describe('LESSTHAN', () => {
    const name = 'LESSTHAN';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.lessThan(name, 2, 1)).toBe(
        MESSAGES.Errors.defaults.FIELD_LESS_THAN(name, '1'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.lessThan(name, 2, 3)).toBeUndefined());
  });

  describe('LESSEQUAL', () => {
    const name = 'LESSEQUAL';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.lessEqual(name, 2, 1)).toBe(
        MESSAGES.Errors.defaults.FIELD_LESS_EQUAL(name, '1'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.lessEqual(name, 2, 2)).toBeUndefined());
  });

  describe('BETWEEN', () => {
    const name = 'BETWEEN';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.between(name, 2, 3, 5)).toBe(
        MESSAGES.Errors.defaults.FIELD_BETWEEN(name, '3', '5'),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.between(name, 4, 3, 5)).toBeUndefined());
  });

  describe('HASH', () => {
    const name = 'HASH';
    const uuid = randomUUID();
    it(`${name} inválido`, () =>
      expect(VALIDATORS.hash(name, uuid + '!')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.hash(name, uuid)).toBeUndefined());
  });

  describe('EMAIL', () => {
    const name = 'EMAIL';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.email(name, 'teste$teste.com')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.email(name, 'teste@teste.com')).toBeUndefined());
    it(`${name} válido`, () =>
      expect(VALIDATORS.email(name, 'teste@teste.com.br')).toBeUndefined());
    it(`${name} válido`, () =>
      expect(
        VALIDATORS.email(name, 'teste.testando@teste.com.br'),
      ).toBeUndefined());
  });

  describe('CEL', () => {
    const name = 'CEL';
    it(`${name} inválido`, () =>
      expect(VALIDATORS.cel(name, '+552199999999')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it(`${name} válido`, () =>
      expect(VALIDATORS.cel(name, '+5521999999999')).toBeUndefined());
  });

  describe('CPF', () => {
    const name = 'CPF';
    it('CPF Inválido', () =>
      expect(VALIDATORS.cpf(name, '05486369744')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it('CPF válido', () =>
      expect(VALIDATORS.cpf(name, '05486369743')).toBeUndefined());
  });

  describe('CNPJ', () => {
    const name = 'CNPJ';
    it('CNPJ Inválido', () =>
      expect(VALIDATORS.cnpj(name, '05486369744')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it('CNPJ válido', () =>
      expect(VALIDATORS.cnpj(name, gerarCNPJ())).toBeUndefined());
  });

  describe('DICT', () => {
    const name = 'CHAVE PIX';
    it('CPF Inválido', () =>
      expect(VALIDATORS.chaveDICT(name, '05486369744')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));
    it('Email inválido', () =>
      expect(VALIDATORS.chaveDICT(name, 'teste$teste.com')).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT(name),
      ));

    it('CPF válido', () =>
      expect(VALIDATORS.chaveDICT(name, gerarCPF())).toBeUndefined());
    it('CNPJ válido', () =>
      expect(VALIDATORS.chaveDICT(name, gerarCNPJ())).toBeUndefined());
    it('Email válido', () =>
      expect(VALIDATORS.chaveDICT(name, 'teste@teste.com')).toBeUndefined());
    it('Cel válido', () =>
      expect(VALIDATORS.chaveDICT(name, '+5512999999999')).toBeUndefined());
    it('HASH válido', () =>
      expect(VALIDATORS.chaveDICT(name, randomUUID())).toBeUndefined());
  });

  describe('checkEnum', () => {
    it('ENUM INVÁLIDO', () =>
      expect(
        VALIDATORS.checkEnum(
          'ModalidadeJurosDiasCorridos',
          11,
          ModalidadeJurosDiasCorridos,
        ),
      ).toBe(
        MESSAGES.Errors.defaults.INVALID_FORMAT('ModalidadeJurosDiasCorridos'),
      ));
    it('ENUM VÁLIDO', () =>
      expect(
        VALIDATORS.checkEnum(
          'ModalidadeJurosDiasCorridos',
          ModalidadeJurosDiasCorridos.PercentualAA,
          ModalidadeJurosDiasCorridos,
        ),
      ).toBeUndefined());
  });
});
