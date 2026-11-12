import { Module } from '@nestjs/common';
import { CobController } from './controllers/cob.controller';
import { PSP } from './core/app/psp';
import { CobVController } from './controllers/cobv.controller';
import { LocationController } from './controllers/location.controller';
import { RecController } from './controllers/rec.controller';
import { PixController } from './controllers/pix.controller';
import {
  WebhookController,
  WebhookTipoControllers,
} from './controllers/webhook.controller';
import {
  MockController,
  PayloadLocationController,
} from './controllers/mock.controller';
import { PixService } from './core/app/pix.service';

@Module({
  imports: [],
  controllers: [
    CobController,
    CobVController,
    LocationController,
    RecController,
    PixController,
    WebhookController,
    ...WebhookTipoControllers,
    MockController,
    PayloadLocationController,
  ],
  providers: [PSP, PixService],
})
export class AppModule {}
