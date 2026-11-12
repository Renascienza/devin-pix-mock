import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Pessoa } from '../models';

const schema = { message: 'O campo $$ não respeita o schema.' };
const VALOR = /^\d{1,10}\.\d{2}$/;

export class DevolucaoPutRequest {
  @IsNotEmpty(schema)
  @Matches(VALOR, schema)
  valor: string;
  @IsOptional()
  @IsIn(['ORIGINAL', 'RETIRADA'], schema)
  natureza?: 'ORIGINAL' | 'RETIRADA';
  @IsOptional()
  @IsString(schema)
  @MaxLength(140, schema)
  descricao?: string;
}

export class WebhookPutRequest {
  @IsNotEmpty(schema)
  @IsUrl(
    {
      require_tld: false,
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    schema,
  )
  webhookUrl: string;
}

export class PagamentoRequest {
  @IsOptional()
  @Matches(VALOR, schema)
  valor?: string;
  @IsOptional()
  @IsString(schema)
  @MaxLength(140, schema)
  infoPagador?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => Pessoa)
  pagador?: Pessoa;
}

export { toPixOut } from './pix-out';
