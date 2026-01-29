const configuration = () => ({
  port: Number.parseInt(process.env.PORT ?? '8080', 10) || 8080,
  nodeEnv: process.env.NODE_MODE,
  client: process.env.CLIENT_URL,
});

export type AppConfiguration = ReturnType<typeof configuration>;

export default configuration;
