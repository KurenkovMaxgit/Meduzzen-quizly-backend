import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type RedisArgument = string | number | Buffer;

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly isNotProd: boolean;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly configService: ConfigService,
  ) {
    this.isNotProd = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  async get(key: string): Promise<string | null> {
    this.logQuery('GET', [key]);
    return this.redisClient.get(key);
  }

  async set(
    key: string,
    value: string | number | Buffer,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds) {
      this.logQuery('SET', [key, value, 'EX', ttlSeconds]);
      return this.redisClient.set(key, value, 'EX', ttlSeconds);
    }

    this.logQuery('SET', [key, value]);
    return this.redisClient.set(key, value);
  }

  async execute<T>(command: string, ...args: RedisArgument[]): Promise<T> {
    this.logQuery(command, args);
    return this.redisClient.call(command, ...args) as Promise<T>;
  }

  get client(): Redis {
    return this.redisClient;
  }

  private logQuery(command: string, args: any[]) {
    if (!this.isNotProd) return;

    try {
      const commandName = command.toUpperCase();
      const commandArgs = args ? JSON.stringify(args) : '[]';
      this.logger.log(`QUERY: ${commandName} -- PARAMS: ${commandArgs}`);
    } catch (_error) {
      /* empty */
    }
  }
}
