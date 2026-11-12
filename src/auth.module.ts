import { Module } from '@nestjs/common';
import { AuthController, OAuthController } from './controllers/auth.controller';
import { Auth } from './core/auth/auth';

@Module({
  imports: [],
  controllers: [AuthController, OAuthController],
  providers: [Auth],
})
export class AuthModule {}
