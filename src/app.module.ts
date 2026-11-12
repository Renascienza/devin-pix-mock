import { Module } from '@nestjs/common';
import { CobController } from './controllers/cob.controller';
import { PSP } from './core/app/psp';
import { CobVController } from './controllers/cobv.controller';
import { LocationController } from './controllers/location.controller';
import { RecController } from './controllers/rec.controller';

@Module({
  imports: [],
  controllers: [
    CobController,
    CobVController,
    LocationController,
    RecController,
  ],
  providers: [PSP],
})
export class AppModule {}
