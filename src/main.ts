import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const client = configService.getOrThrow<string>('client')

  app.setGlobalPrefix('api'); 

  app.enableCors({ origin: client, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Quizly API')
    .setDescription('The Quizly quiz platform API documentation')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.getOrThrow<string>('port')
  await app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Running app in MODE: ${configService.getOrThrow<string>('nodeEnv')} on PORT: ${port}`);
  });
}

bootstrap().catch(() => {
  process.exit(1);
});
