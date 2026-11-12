import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { MemoryDB } from './libs/fakedb';
import { correntistas } from './data/db.json';

export const COLLECTIONS: { [name: string]: string[] } = {
  CORRENTISTAS: ['chave'],
  COB: ['txid'],
  COBV: ['txid'],
  COB_HIST: ['id'],
  COBR: ['txid'],
  LOCATIONS: ['id', 'uuid'],
  LOC_COB: ['id', 'txid'],
  REC: ['idRec'],
  PIX: ['endToEndId'],
  WEBHOOKS: ['chave'],
  WEBHOOKS_TIPO: ['tipo'],
};

export async function initDatabase(): Promise<void> {
  Object.entries(COLLECTIONS).forEach(([name, keys]) =>
    MemoryDB.ensure(name, keys),
  );
  const cst = MemoryDB.get('CORRENTISTAS');
  for (const c of correntistas) {
    if (!(await cst.read('DEV', { chave: c.chave }))) {
      await cst.add('DEV', c);
    }
  }
}

export const formatValidationErrors = (
  errors: ValidationError[],
  message: { [field: string]: string } = {},
  parentField?: string,
) => {
  errors.forEach((error) => {
    const field = parentField
      ? `${parentField}.${error.property}`
      : error.property;
    if (!error.constraints && error.children?.length) {
      formatValidationErrors(error.children, message, field);
    } else {
      const constraints = Object.values(error.constraints || {});
      message[field] =
        constraints.length > 0
          ? constraints.pop()
          : 'O campo $$ não respeita o schema.';
    }
  });
  return message;
};

@Catch(HttpException)
export class ProblemJsonFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const body: any = exception.getResponse();
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .type(body?.type ? 'application/problem+json' : 'application/json')
      .send(JSON.stringify(body));
  }
}

export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalFilters(new ProblemJsonFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      skipMissingProperties: true,
      exceptionFactory: (errors) =>
        new BadRequestException(formatValidationErrors(errors)),
    }),
  );
  return app;
}
