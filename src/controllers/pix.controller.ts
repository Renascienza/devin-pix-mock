import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { DevolucaoPutRequest } from '../core/app/models/pix';
import { PixService } from '../core/app/pix.service';
import { HttpInterceptor } from '../http.interceptor';
import { PatternPipe } from '../validators/pipes';

const e2eid = () => new PatternPipe('e2eid', /^[a-zA-Z0-9]{32}$/);
const devId = () => new PatternPipe('id', /^[a-zA-Z0-9]{1,35}$/);

@Controller('pix')
@UseInterceptors(HttpInterceptor)
export class PixController {
  constructor(private readonly pix: PixService) {}

  @Get(':e2eid')
  read(@Param('e2eid', e2eid()) id: string, @Headers() headers) {
    return this.pix.readPix(headers['IdOwner'], id);
  }

  @Get()
  list(@Query() query: any, @Headers() headers) {
    return this.pix.listPix(headers['IdOwner'], query);
  }

  @Put(':e2eid/devolucao/:id')
  @HttpCode(201)
  devolver(
    @Param('e2eid', e2eid()) e2e: string,
    @Param('id', devId()) id: string,
    @Body() data: DevolucaoPutRequest,
    @Headers() headers,
  ) {
    return this.pix.devolver(headers['IdOwner'], e2e, id, data);
  }

  @Get(':e2eid/devolucao/:id')
  readDevolucao(
    @Param('e2eid', e2eid()) e2e: string,
    @Param('id', devId()) id: string,
    @Headers() headers,
  ) {
    return this.pix.readDevolucao(headers['IdOwner'], e2e, id);
  }
}
