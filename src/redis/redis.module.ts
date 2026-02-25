import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisClient');
        const isNotProd = configService.get<string>('NODE_ENV') !== 'production';

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

        if (isNotProd) {
          const originalSendCommand = client.sendCommand.bind(client);

          client.sendCommand = function (command, stream) {
            try {
              const cmdName = command.name ? command.name.toUpperCase() : 'UNKNOWN';
              const cmdArgs = command.args ? JSON.stringify(command.args) : '[]';

              logger.debug(`QUERY: ${cmdName} -- PARAMS: ${cmdArgs}`);
            } catch (error) {}

            return originalSendCommand(command, stream);
          };
        }
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
