import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDev = configService.get<string>('nodeEnv') !== 'production';
        return {
          type: 'postgres',
          host: configService.get<string>('dbHost'),
          port: configService.get<number>('dbPort'),
          username: configService.get<string>('dbUser'),
          password: configService.get<string>('dbPassword'),
          database: configService.get<string>('dbName'),
          entities: [join(__dirname, '/**/*.entity{.ts,.js}')],
          migrations: [join(__dirname, '..', 'migrations', '*.ts')],
          migrationsTableName: 'migrations_table',
          autoLoadEntities: true, 
          synchronize: isDev,
          logging: isDev ? ['info', 'error'] : ['error'],
        };
      },
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
