import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const isDev = process.env.NODE_ENV !== 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [join(__dirname,'../common/entities/*{.js,.ts}')],
  migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
  migrationsTableName: 'migrations_table',
  synchronize: isDev,
  logging: isDev ? ['info', 'error'] : ['error'],
});