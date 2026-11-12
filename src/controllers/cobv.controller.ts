import { TxidPipe, RevisaoPipe } from '../validators/pipes';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Put,
  Query,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { PSP } from '../core/app/psp';
import { HttpInterceptor } from '../http.interceptor';
import {
  CobVGetFilter,
  CobVPatchRequest,
  CobVPutRequest,
} from '../core/app/models/cobv';
import { PixRequest } from '../core/app/models';

@Controller('cobv')
@UseInterceptors(HttpInterceptor)
export class CobVController {
  constructor(private readonly pspService: PSP) {}

  @Put(':txid')
  @HttpCode(201)
  async create(
    @Body() data: CobVPutRequest,
    @Param('txid', new TxidPipe()) txid,
    @Headers() headers,
  ) {
    const IdOwner = headers['IdOwner'];
    const itm: PixRequest<CobVPutRequest> = { IdOwner, txid, data };
    return await this.pspService.addCobV(itm);
  }

  @Get(':txid')
  async read(
    @Param('txid', new TxidPipe()) txid,
    @Headers() headers,
    @Query('revisao', new RevisaoPipe()) revisao?: number,
  ) {
    const IdOwner = headers['IdOwner'];
    const itm = await this.pspService.readCobV({ IdOwner, txid }, revisao);
    return itm;
  }

  @Get()
  list(@Headers() headers, @Query() qry: CobVGetFilter) {
    const IdOwner = headers['IdOwner'];
    return this.pspService.listCobV({ ...qry, IdOwner });
  }

  @Patch(':txid')
  edit(
    @Body() data: CobVPatchRequest,
    @Param('txid', new TxidPipe()) txid,
    @Headers() headers,
  ) {
    const IdOwner = headers['IdOwner'];
    const itm: PixRequest<CobVPatchRequest> = { IdOwner, txid, data };
    return this.pspService.editCobV(itm);
  }
}
