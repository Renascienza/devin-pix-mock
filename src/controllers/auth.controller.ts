import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Auth } from '../core/auth/auth';
import { ValidateInput } from './auth.models';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: Auth) {}

  @Post()
  async validate(@Body() credentials: ValidateInput): Promise<any> {
    if (credentials?.grant_type !== 'client_credentials') {
      throw new BadRequestException({
        error: 'unsupported_grant_type',
        error_description: 'grant_type deve ser client_credentials',
      });
    }
    try {
      return {
        accesstoken: await this.authService.validate(
          credentials.client_id,
          credentials.client_secret,
        ),
        expires_in: 300, //5 min
      };
    } catch {
      throw new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'Credenciais inválidas',
      });
    }
  }
}
