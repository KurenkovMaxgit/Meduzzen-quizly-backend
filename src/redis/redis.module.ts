import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisClient');

        const client = new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD'),
        });

        client.on('connect', () => logger.log('Successfully connected to Redis.'));
        client.on('ready', () => logger.log('Redis client is ready to receive commands.'));
        client.on('error', (err) =>
          logger.error(`Redis connection error: ${err.message}`, err.stack),
        );
        client.on('close', () => logger.warn('Redis connection closed.'));
        client.on('reconnecting', () => logger.warn('Reconnecting to Redis...'));

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
