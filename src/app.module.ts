import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuraion';
import { envValidationSchema } from './config/env.schema';

const configModule = ConfigModule.forRoot({
  load: [configuration],
  isGlobal: true,
  validationSchema: envValidationSchema,
});

@Module({
  imports: [configModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
