import { validarCNPJ, validarCPF } from './documentos';
import { minMaxFromEnum } from './utils';

export const VALIDATORS = {
  required: (name: string, val?: any) =>
    !val ? MESSAGES.Errors.defaults.FIELD_REQUIRED(name) : undefined,

  minLength: (name: string, val: string, min: number) =>
    val.length < min
      ? MESSAGES.Errors.defaults.FIELD_MIN_LENGTH(name, min.toString())
      : undefined,
  maxLength: (name: string, val: string, max: number) =>
    val.length > max
      ? MESSAGES.Errors.defaults.FIELD_MAX_LENGTH(name, max.toString())
      : undefined,
  rangeLength: (name: string, val: string, min: number, max: number) =>
    val.length <= min || val.length >= max
      ? MESSAGES.Errors.defaults.FIELD_RANGE_LENGTH(
          name,
          min.toString(),
          max.toString(),
        )
      : undefined,

  greaterThan: (name: string, value: number, min: number, text?: string) =>
    value <= min
      ? MESSAGES.Errors.defaults.FIELD_GREATER_THAN(
          name,
          text || min.toString(),
        )
      : undefined,
  lessThan: (name: string, value: number, max: number, text?: string) =>
    value >= max
      ? MESSAGES.Errors.defaults.FIELD_LESS_THAN(name, text || max.toString())
      : undefined,
  greaterEqual: (name: string, value: number, min: number, text?: string) =>
    value < min
      ? MESSAGES.Errors.defaults.FIELD_GREATER_EQUAL(
          name,
          text || min.toString(),
        )
      : undefined,
  lessEqual: (name: string, value: number, max: number, text?: string) =>
    value > max
      ? MESSAGES.Errors.defaults.FIELD_LESS_EQUAL(name, text || max.toString())
      : undefined,
  between: (
    name: string,
    value: number,
    min: number,
    max: number,
    _text?: string,
  ) =>
    !(value >= min && value <= max)
      ? MESSAGES.Errors.defaults.FIELD_BETWEEN(
          name,
          min.toString(),
          max.toString(),
        )
      : undefined,
  checkEnum: (name: string, value: number, _enum: any) => {
    const [min, max] = minMaxFromEnum(_enum);
    return VALIDATORS.between(name, value, min, max)
      ? MESSAGES.Errors.defaults.INVALID_FORMAT(name)
      : undefined;
  },

  cpf: (name: string, value: string): string | undefined =>
    !validarCPF(value)
      ? MESSAGES.Errors.defaults.INVALID_FORMAT(name)
      : undefined,
  cnpj: (name: string, value: string): string | undefined =>
    !validarCNPJ(value)
      ? MESSAGES.Errors.defaults.INVALID_FORMAT(name)
      : undefined,

  money: (name: string, value: string) =>
    !/^[0-9]{1,10}\.[0-9]{2}$/.test(value)
      ? MESSAGES.Errors.defaults.INVALID_FORMAT(name)
      : undefined,
  pattern: (name: string, value: string, pattern: RegExp) =>
    !pattern.test(value)
      ? MESSAGES.Errors.defaults.INVALID_FORMAT(name)
      : undefined,

  email: (name: string, value: string) =>
    VALIDATORS.pattern(
      name,
      value,
      /^[a-z0-9._%+-]+\@[a-z0-9.-]+\.[a-z]{2,}$/i,
    ),
  hash: (name: string, value: string): string | undefined =>
    VALIDATORS.pattern(
      name,
      value,
      /^[0-9a-f]{8,8}-[0-9a-f]{4,4}-[0-9a-f]{4,4}-[0-9a-f]{4,4}-[0-9a-f]{12,12}$/i,
    ),
  cel: (name: string, value: string): string | undefined =>
    VALIDATORS.pattern(name, value, /\+[0-9]{13,13}/),

  chaveDICT: (name: string, value: string) =>
    !VALIDATORS.cnpj(name, value) ||
    !VALIDATORS.cpf(name, value) ||
    !VALIDATORS.email(name, value) ||
    !VALIDATORS.cel(name, value) ||
    !VALIDATORS.hash(name, value) //chave aleatória
      ? undefined
      : MESSAGES.Errors.defaults.INVALID_FORMAT(name),

  IDRec: (name: string, value: string) =>
    VALIDATORS.pattern(name, value, /[RC][RN][0-9]{8}[0-9]{8}[a-zA-Z0-9]{11}/), //PIX/OpenFinance|RETENTATIVA|ISPB/CNPJ|YYYYMMDD|Alfanumerico
};

export const MESSAGES = {
  Errors: {
    defaults: {
      INVALID_FORMAT: (name: string) =>
        `O campo ${name} não está no formato correto`,
      INVALID_CONTENT: (name: string) =>
        `O campo ${name} não possui um conteúdo válido`,
      ALL_FIELDS_REQUIREDS: () =>
        'Todos os campos obrigatórios devem ser preenchidos',
      FIELD_GREATER_THAN: (field: string, value: string) =>
        `O campo ${field} deve ser maior que ${value}`,
      FIELD_LESS_THAN: (field: string, value: string) =>
        `O campo ${field} deve ser menor que ${value}`,
      FIELD_GREATER_EQUAL: (field: string, value: string) =>
        `O campo ${field} deve ser maior ou igual a ${value}`,
      FIELD_LESS_EQUAL: (field: string, value: string) =>
        `O campo ${field} deve ser menor ou igual a ${value}`,
      FIELD_BETWEEN: (field: string, min: string, max: string) =>
        `O campo ${field} deve estar entre ${min} e ${max}`,
      FIELD_MIN_LENGTH: (field: string, value: string) =>
        `O campo ${field} deve ter pelo menos ${value} caracteres`,
      FIELD_MAX_LENGTH: (field: string, value: string) =>
        `O campo ${field} deve ter no máximo ${value} caracteres`,
      FIELD_RANGE_LENGTH: (field: string, min: string, max: string) =>
        `O campo ${field} deve ter entre ${min} e ${max} caracteres`,
      FIELD_REQUIRED: (field: string) => `O campo ${field} deve ser preenchido`,
      SORT_FIELD_RANGE: () => 'O campo de ordenação deve ser maior que zero',
      SORT_FIELD_UNIQUE: () => 'O campo de ordenação deve ser único',
      NOT_FOUNT: (name: string) => `${name} não localizado.`,
      UNEXPECTED_OPERATION: (name: string) => `${name} não pode ser realizado.`,
      UNEXPECTED_VALUE: (name: string, v: string) =>
        `O valor esperado para ${name} era ${v}.`,
    },
    transaction: {
      cnpj_cpf: () =>
        'Os objetos data.devedor.cnpj e data.devedor.cpf não podem ser fornecidos simultâneamente.',
    },
    AUTH: {
      DISCONNECT: () =>
        'Solicite a autenticação antes de executar algum serviço',
      CONNECT: () => 'Falha ao obter o token de acesso',
    },
  },
};
