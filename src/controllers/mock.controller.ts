import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { TipoCob } from '../core/app/models';
import { PagamentoRequest } from '../core/app/models/pix';
import { PixService } from '../core/app/pix.service';
import { HttpInterceptor } from '../http.interceptor';
import { jwks, signJws } from '../libs/jws';
import { TxidPipe } from '../validators/pipes';

/** Endpoints de simulação, fora da especificação do Bacen. */
@Controller('mock')
@UseInterceptors(HttpInterceptor)
export class MockController {
  constructor(private readonly pix: PixService) {}

  @Post('cob/:txid/pagamento')
  pagarCob(
    @Param('txid', new TxidPipe()) txid: string,
    @Body() data: PagamentoRequest,
    @Headers() headers,
  ) {
    return this.pix.pagar(headers['IdOwner'], txid, TipoCob.imediato, data);
  }

  @Post('cobv/:txid/pagamento')
  pagarCobV(
    @Param('txid', new TxidPipe()) txid: string,
    @Body() data: PagamentoRequest,
    @Headers() headers,
  ) {
    return this.pix.pagar(headers['IdOwner'], txid, TipoCob.vencimento, data);
  }

  @Get('webhooks/entregas')
  entregas() {
    return this.pix.entregas;
  }
}

/** Payload Location (JWS) e JWKS: públicos, como o QR Code dinâmico. */
@Controller('mock')
export class PayloadLocationController {
  constructor(private readonly pix: PixService) {}

  @Get('qr/:uuid')
  @Header('Content-Type', 'application/jose')
  async payload(@Param('uuid') uuid: string, @Req() req: any): Promise<string> {
    const payload = await this.pix.payloadLocation(uuid);
    if (!payload) {
      throw new NotFoundException();
    }
    return signJws(payload, `${req.protocol}://${req.get('host')}/mock/jwks`);
  }

  @Get('jwks')
  jwks() {
    return jwks();
  }
}
