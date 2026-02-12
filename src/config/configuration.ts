const configuration = () => ({
  port: Number.parseInt(process.env.PORT ?? '8080', 10) || 8080,
  nodeEnv: process.env.NODE_ENV,
  client: process.env.CLIENT_URL,
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
  },
  auth0: {
    issuerUrl: process.env.AUTH0_ISSUER_URL,
    audience: process.env.AUTH0_AUDIENCE,
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;

export default configuration;
