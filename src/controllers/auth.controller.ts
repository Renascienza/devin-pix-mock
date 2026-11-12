import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Auth } from '../core/auth/auth';
import { ValidateInput } from './auth.models';

const EXPIRES_IN = 300; //5 min

async function issueToken(
  authService: Auth,
  credentials: ValidateInput,
  authorization?: string,
) {
  let { client_id, client_secret } = credentials || ({} as ValidateInput);
  const basic = /^Basic\s+(.+)$/i.exec(authorization || '');
  if (basic) {
    [client_id, client_secret] = Buffer.from(basic[1], 'base64')
      .toString()
      .split(':');
  }
  if (credentials?.grant_type !== 'client_credentials') {
    throw new BadRequestException({
      error: 'unsupported_grant_type',
      error_description: 'grant_type deve ser client_credentials',
    });
  }
  try {
    const token = await authService.validate(client_id, client_secret);
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: EXPIRES_IN,
      scope: credentials.scope || '',
      accesstoken: token,
    };
  } catch {
    throw new UnauthorizedException({
      error: 'invalid_client',
      error_description: 'Credenciais inválidas',
    });
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: Auth) {}

  @Post()
  @HttpCode(201)
  async validate(
    @Body() credentials: ValidateInput,
    @Headers('authorization') authorization?: string,
  ): Promise<any> {
    return issueToken(this.authService, credentials, authorization);
  }
}

@Controller('oauth')
export class OAuthController {
  constructor(private readonly authService: Auth) {}

  /** OAuth2 client credentials (RFC 6749 §4.4): JSON ou form-urlencoded, credenciais no corpo ou em Basic. */
  @Post('token')
  @HttpCode(200)
  async token(
    @Body() credentials: ValidateInput,
    @Headers('authorization') authorization?: string,
  ): Promise<any> {
    return issueToken(this.authService, credentials, authorization);
  }
}
