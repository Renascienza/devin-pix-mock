import { BadRequestException, PipeTransform } from '@nestjs/common';

export class TxidPipe implements PipeTransform<string, string> {
  constructor(
    private readonly min = 26,
    private readonly max = 35,
  ) {}

  transform(value: string): string {
    if (
      !new RegExp(`^[a-zA-Z0-9]{${this.min},${this.max}}$`).test(value || '')
    ) {
      throw new BadRequestException({
        txid: 'O campo $$ não respeita o schema.',
      });
    }
    return value;
  }
}

export class PatternPipe implements PipeTransform<string, string> {
  constructor(
    private readonly campo: string,
    private readonly pattern: RegExp,
  ) {}

  transform(value: string): string {
    if (!this.pattern.test(value || '')) {
      throw new BadRequestException({
        [this.campo]: 'O campo $$ não respeita o schema.',
      });
    }
    return value;
  }
}

export class RevisaoPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (value === undefined || value === '') {
      return undefined;
    }
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException({
        revisao: 'O campo $$ não respeita o schema.',
      });
    }
    return Number(value);
  }
}
