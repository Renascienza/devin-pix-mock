import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { TipoCob } from '../models';

export class LocID {
  @IsNotEmpty({ message: 'O campo $$ não respeita o schema.' })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'O campo $$ não respeita o schema.' },
  )
  id: number;
}
export interface ILocKey {
  uuid: string;
}

export class LocPutRequest {
  @IsNotEmpty({ message: 'O campo $$ não respeita o schema.' })
  @IsEnum(TipoCob, { message: 'O campo $$ não respeita o schema.' })
  tipoCob: TipoCob;
}

export class LocGetRequest extends LocID {
  tipoCob: TipoCob;
}

export class LocGetResponse extends LocID {
  uuid: string;
  tipoCob: TipoCob;
  location: string;
  criacao: string;
  txid: string;
}

export class LocPutResponse extends LocGetResponse {}

export class LocGetFilter {
  inicio: string;
  fim: string;
  paginacao?: { paginaAtual: number; itensPorPagina: number };
  tipoCob?: TipoCob;
  txIdPresente?: boolean;
}
