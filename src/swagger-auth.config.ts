import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerAuthConfig = new DocumentBuilder()
  .setTitle('PIX Mocked Server - Autenticação')
  .setDescription('Serviço de autenticação OAuth2 para o PIX Mocked Server')
  .setVersion('1.0')
  .addOAuth2(
    {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: '/auth',
          scopes: {},
        },
      },
    },
    'oauth2',
  )
  .addServer('http://localhost:3001', 'Servidor de Autenticação')
  .build();
