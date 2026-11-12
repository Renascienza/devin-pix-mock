import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerAppConfig = new DocumentBuilder()
  .setTitle('PIX Mocked Server - API Principal')
  .setDescription(
    'API mockada do PIX seguindo as especificações do Banco Central do Brasil',
  )
  .setVersion('1.0')
  .setExternalDoc(
    'Documentação Oficial PIX',
    'https://bacen.github.io/pix-api/',
  )
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    'access-token',
  )
  .addServer('http://localhost:3000', 'Servidor de Desenvolvimento')
  .build();
