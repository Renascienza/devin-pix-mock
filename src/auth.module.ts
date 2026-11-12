import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { Auth } from './core/auth/auth';

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [Auth],
})
export class AuthModule {}
