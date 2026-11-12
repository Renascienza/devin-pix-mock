import {
  Body,
  Controller,
  Headers,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { RecPostRequest, RecRequest } from '../core/app/models/rec';
import { PSP } from '../core/app/psp';
import { HttpInterceptor } from '../http.interceptor';

@Controller('rec')
@UseInterceptors(HttpInterceptor)
export class RecController {
  constructor(private readonly pspService: PSP) {}

  @Post()
  async create(@Body() data: RecPostRequest, @Headers() headers) {
    const IdOwner = headers['IdOwner'];
    const itm: RecRequest<RecPostRequest> = { IdOwner, data };
    return await this.pspService.addRec(itm);
  }
}
