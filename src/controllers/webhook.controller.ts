import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Put,
  Query,
  Type,
  UseInterceptors,
} from '@nestjs/common';
import { WebhookPutRequest } from '../core/app/models/pix';
import {
  PixService,
  TIPOS_WEBHOOK,
  TipoWebhook,
} from '../core/app/pix.service';
import { HttpInterceptor } from '../http.interceptor';

@Controller('webhook')
@UseInterceptors(HttpInterceptor)
export class WebhookController {
  constructor(private readonly pix: PixService) {}

  @Put(':chave')
  @HttpCode(200)
  put(
    @Param('chave') chave: string,
    @Body() data: WebhookPutRequest,
    @Headers() headers,
  ) {
    return this.pix.putWebhook(headers['IdOwner'], chave, data.webhookUrl);
  }

  @Get(':chave')
  read(@Param('chave') chave: string, @Headers() headers) {
    return this.pix.getWebhook(headers['IdOwner'], chave);
  }

  @Delete(':chave')
  @HttpCode(204)
  remove(@Param('chave') chave: string, @Headers() headers) {
    return this.pix.removeWebhook(headers['IdOwner'], chave);
  }

  @Get()
  list(@Query() query: any, @Headers() headers) {
    return this.pix.listWebhooks(headers['IdOwner'], query);
  }
}

function webhookTipoController(tipo: TipoWebhook): Type<any> {
  @Controller(tipo)
  @UseInterceptors(HttpInterceptor)
  class WebhookTipoController {
    constructor(readonly pix: PixService) {}

    @Put()
    @HttpCode(200)
    put(@Body() data: WebhookPutRequest, @Headers() headers) {
      return this.pix.putWebhookTipo(headers['IdOwner'], tipo, data.webhookUrl);
    }

    @Get()
    read(@Headers() headers) {
      return this.pix.getWebhookTipo(headers['IdOwner'], tipo);
    }

    @Delete()
    @HttpCode(204)
    remove(@Headers() headers) {
      return this.pix.removeWebhookTipo(headers['IdOwner'], tipo);
    }
  }
  return WebhookTipoController;
}

export const WebhookTipoControllers = TIPOS_WEBHOOK.map(webhookTipoController);
