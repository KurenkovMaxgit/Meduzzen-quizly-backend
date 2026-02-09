import { DataSource, Logger as TypeOrmLogger } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { Logger as NestLogger } from '@nestjs/common';

config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

class CustomTypeOrmLogger implements TypeOrmLogger {
  private readonly logger = new NestLogger('TypeORM');

  logQuery(query: string, parameters?: any[]) {
    this.logger.log(`QUERY: ${query}`);
    if (parameters?.length) {
      this.logger.log(`PARAMS: ${JSON.stringify(parameters)}`);
    }
  }

  logQueryError(error: string | Error, query: string, parameters?: any) {
    this.logger.error(`${query} -- Parameters: ${JSON.stringify(parameters)} -- Error: ${error}`);
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    this.logger.warn(`Time: ${time} -- Parameters: ${JSON.stringify(parameters)} -- ${query}`);
  }

  logSchemaBuild(message: string) {
    this.logger.log(message);
  }

  logMigration(message: string) {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    if (level === 'log') return this.logger.log(message);
    if (level === 'info') return this.logger.debug(message);
    if (level === 'warn') return this.logger.warn(message);
  }
}

const isNotProd = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [join(__dirname, '../common/entities/!(base.entity).{js,ts}')],
  migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
  migrationsTableName: 'migrations_table',
  dropSchema: isTest,
  synchronize: isNotProd,
  logging: isNotProd ? ['query', 'info', 'error'] : ['error'],
  logger: new CustomTypeOrmLogger(),
});
