const configuration = () => ({
  port: Number.parseInt(process.env.PORT ?? '8080', 10) || 8080,
  nodeEnv: process.env.NODE_ENV,
  client: process.env.CLIENT_URL,
  dbHost: process.env.POSTGRES_HOST,
  dbPort: Number.parseInt(process.env.POSTGRES_PORT ?? '6540', 10),
  dbUser: process.env.POSTGRES_USER,
  dbPassword: process.env.POSTGRES_PASSWORD,
  dbName: process.env.POSTGRES_DB,
});

export type AppConfiguration = ReturnType<typeof configuration>;

export default configuration;
