import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { validationPipeConfig } from './config/validation-pipe.config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger();

  const configService = app.get(ConfigService);
  const client = configService.getOrThrow<string>('client');

  app.setGlobalPrefix('api');

  app.enableCors({ origin: client, credentials: true });

  app.use(cookieParser());

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(new ValidationPipe(validationPipeConfig));

  app.useGlobalFilters(new AllExceptionsFilter(), new TypeOrmExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Quizly API')
    .setDescription('The Quizly quiz platform API documentation')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.getOrThrow<string>('port');
  await app.listen(port,'0.0.0.0', () => {
    logger.log(
      `Running app in MODE: ${configService.getOrThrow<string>('nodeEnv')} on PORT: 0.0.0.0:${port}`,
    );
  });
}

bootstrap().catch(() => {
  process.exit(1);
});
