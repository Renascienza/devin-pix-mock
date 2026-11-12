import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Put,
  Query,
  UseInterceptors,
  Post,
  HttpCode,
} from '@nestjs/common';
import {
  LocGetResponse,
  LocGetFilter,
  LocPutRequest,
} from '../core/app/models/loc';
import { PSP } from '../core/app/psp';
import { HttpInterceptor } from '../http.interceptor';

@Controller('loc')
@UseInterceptors(HttpInterceptor)
export class LocationController {
  constructor(private readonly pspService: PSP) {}

  @Post()
  @HttpCode(201)
  async createPost(
    @Body() data: LocPutRequest,
    @Headers() headers,
  ): Promise<LocGetResponse> {
    return this.create(data, headers);
  }

  /** Mantido por compatibilidade; a spec define POST /loc. */
  @Put()
  @HttpCode(201)
  async create(
    @Body() data: LocPutRequest,
    @Headers() headers,
  ): Promise<LocGetResponse> {
    const IdOwner = headers['IdOwner'];
    return await this.pspService.addLoc({ IdOwner, ...data });
  }

  @Get(':id')
  async read(
    @Param() params: any,
    @Headers() headers,
  ): Promise<LocGetResponse> {
    const IdOwner = headers['IdOwner'];
    const id = params.id && !isNaN(params.id) ? Number.parseInt(params.id) : 0;
    const res = await this.pspService.readLoc({ IdOwner, id });
    return res;
  }

  @Get()
  list(@Headers() headers, @Query() qry: LocGetFilter) {
    const IdOwner = headers['IdOwner'];
    return this.pspService.listLoc({ ...qry, IdOwner });
  }

  @Delete(':id/txid')
  async remove(@Param() params: any, @Headers() headers): Promise<any> {
    const id = params.id && !isNaN(params.id) ? Number.parseInt(params.id) : 0;
    const IdOwner = headers['IdOwner'];
    return await this.pspService.removeLoc({ id, IdOwner });
  }
}
