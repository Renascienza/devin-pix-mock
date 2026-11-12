import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, initDatabase } from './app.factory';
import { AuthModule } from './auth.module';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerAppConfig } from './swagger-app.config';
import { swaggerAuthConfig } from './swagger-auth.config';

async function bootstrap() {
  await initDatabase();

  //SERVIÇO PRINCIPAL  
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  
  const appDocument = SwaggerModule.createDocument(app, swaggerAppConfig);
  SwaggerModule.setup('api-docs', app, appDocument);
  
  await app.listen(Number(process.env.PORT || 3000));

  //SERVIÇO DE AUTENTICAÇÃO
  const auth = await NestFactory.create(AuthModule);
  
  const authDocument = SwaggerModule.createDocument(auth, swaggerAuthConfig);
  SwaggerModule.setup('api-docs', auth, authDocument);
  
  await auth.listen(Number(process.env.AUTH_PORT || 3001));
}
bootstrap();
