import { ApiProperty } from '@nestjs/swagger';

export class ValidateInput {
  @ApiProperty({
    description: 'Tipo de autenticação',
    example: 'client_credentials',
  })
  grant_type: string;
  @ApiProperty({ description: 'Id do assinante', example: '111' })
  client_id: string;
  @ApiProperty({ description: 'Senha do assinante', example: 'aaa' })
  client_secret: string;
}
