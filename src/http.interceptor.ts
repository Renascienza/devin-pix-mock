import { randomUUID } from 'crypto';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { owners } from './data/db.json';

@Injectable()
export class HttpInterceptor implements NestInterceptor {
  private handleError = (
    type: string,
    title: string,
    detail: string,
    status: number,
    violacoes: { razao: string; propriedade: string }[],
  ) => ({
    type,
    title,
    status,
    detail,
    correlationId: randomUUID(),
    violacoes,
  });

  private ServerErrorTypes = {
    400: (
      prefix: string,
      detail: string,
      violacoes: { razao: string; propriedade: string }[],
    ) =>
      this.handleError(
        `https://pix.bcb.gov.br/api/v2/error/${prefix}OperacaoInvalida`,
        'Payload Inválido',
        detail,
        400,
        violacoes,
      ),
    401: () =>
      this.handleError(
        'https://pix.bcb.gov.br/api/v2/error/AcessoNegado',
        'Acesso Negado',
        'Access Token inválido.',
        401,
        [],
      ),
    403: (
      detail: string,
      violacoes: { razao: string; propriedade: string }[],
    ) =>
      this.handleError(
        `https://pix.bcb.gov.br/api/v2/error/AcessoNegado`,
        `Acesso Negado`,
        detail,
        403,
        violacoes,
      ),
    404: () =>
      this.handleError(
        `https://pix.bcb.gov.br/api/v2/error/NaoEncontrado`,
        `Não Encontrado`,
        'Entidade não encontrada.',
        404,
        [],
      ),
    503: () =>
      this.handleError(
        `https://pix.bcb.gov.br/api/v2/error/ServicoIndisponivel`,
        'Serviço Indisponível',
        `Serviço não está disponível no momento. Serviço solicitado pode estar em manutenção ou fora da janela de funcionamento.`,
        503,
        [],
      ),
  };

  private static resources: {
    [endpoint: string]: { prefix: string; detail: string };
  } = {
    cob: { prefix: 'Cob', detail: 'A cobrança não respeita o schema.' },
    cobv: { prefix: 'CobV', detail: 'A cobrança não respeita o schema.' },
    loc: {
      prefix: 'PayloadLocation',
      detail: 'O Location não respeita o schema.',
    },
    rec: { prefix: 'Rec', detail: 'A recorrência não respeita o schema.' },
    cobr: { prefix: 'CobR', detail: 'A cobrança não respeita o schema.' },
    pix: { prefix: 'Pix', detail: 'A requisição não respeita o schema.' },
    webhook: { prefix: 'Webhook', detail: 'O webhook não respeita o schema.' },
    webhookcob: {
      prefix: 'Webhook',
      detail: 'O webhook não respeita o schema.',
    },
    webhookcobv: {
      prefix: 'Webhook',
      detail: 'O webhook não respeita o schema.',
    },
    webhookcobr: {
      prefix: 'Webhook',
      detail: 'O webhook não respeita o schema.',
    },
    webhookrec: {
      prefix: 'Webhook',
      detail: 'O webhook não respeita o schema.',
    },
    mock: { prefix: 'Cob', detail: 'A requisição não respeita o schema.' },
  };

  private toViolations(
    endpoint: string,
    response: any,
  ): { razao: string; propriedade: string }[] {
    if (typeof response === 'string') {
      return [{ propriedade: endpoint, razao: response }];
    }
    if (Array.isArray(response?.message)) {
      return response.message.map((m: string) => ({
        propriedade: endpoint,
        razao: String(m),
      }));
    }
    if (typeof response?.message === 'string') {
      return [{ propriedade: endpoint, razao: response.message }];
    }
    return Object.keys(response || {}).map((key: string) => ({
      propriedade: `${endpoint}.${key}`,
      razao: String(response[key]).replace('$$', `${endpoint}.${key}`),
    }));
  }

  private toProblem(err: any, request: any): HttpException {
    const endpoint =
      String(request.url || '')
        .split('?')[0]
        .split('/')[1] || '';
    const resource = HttpInterceptor.resources[endpoint] || {
      prefix: 'Cob',
      detail: 'A requisição não respeita o schema.',
    };
    const badRequest = (violacoes: { razao: string; propriedade: string }[]) =>
      new BadRequestException(
        this.ServerErrorTypes[400](resource.prefix, resource.detail, violacoes),
      );

    if (err instanceof HttpException) {
      const response: any = err.getResponse();
      if (response?.type && response?.status) {
        return err;
      }
      switch (err.getStatus()) {
        case 400:
          return badRequest(this.toViolations(endpoint, response));
        case 401:
          return new UnauthorizedException(this.ServerErrorTypes[401]());
        case 403:
          return new ForbiddenException(
            this.ServerErrorTypes[403](
              'Requisição de participante autenticado que viola alguma regra de autorização.',
              [],
            ),
          );
        case 404:
          return new NotFoundException(this.ServerErrorTypes[404]());
        case 503:
          return new ServiceUnavailableException(this.ServerErrorTypes[503]());
      }
    } else if (
      err instanceof Error &&
      !(
        err instanceof TypeError ||
        err instanceof ReferenceError ||
        err instanceof RangeError ||
        err instanceof SyntaxError
      )
    ) {
      return badRequest([{ propriedade: endpoint, razao: err.message }]);
    }
    console.error(err);
    return new InternalServerErrorException({
      type: 'https://pix.bcb.gov.br/api/v2/error/ErroInternoDoServidor',
      title: 'Erro Interno do Servidor',
      status: 500,
      detail: 'Erro inesperado no servidor.',
      correlationId: randomUUID(),
      violacoes: [],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<void> {
    const request = context.switchToHttp().getRequest();
    const bearer = /^Bearer\s+(.+)$/i.exec(
      String(request.headers['authorization'] || ''),
    );
    const token = request.headers['mocked-token'] || bearer?.[1];
    const response = context.switchToHttp().getResponse();
    const asProblem = () =>
      response.setHeader?.('Content-Type', 'application/problem+json');

    const own = token ? owners.find((f) => f.token === token) : undefined;

    if (own) {
      request.headers['IdOwner'] = own.id;

      return next.handle().pipe(
        tap((res) => {
          if (!res) {
            throw new NotFoundException();
          } else {
            return res;
          }
        }),
        catchError((err: any): Observable<any> => {
          asProblem();
          throw this.toProblem(err, request);
        }),
      );
    } else {
      asProblem();
      return throwError(
        () => new UnauthorizedException(this.ServerErrorTypes[401]()),
      );
    }
  }
}
