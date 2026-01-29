import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  //allowed for all domains for now
  const app = await NestFactory.create(AppModule, {cors: true}); // TODO: Set origin domains when deploying
  const PORT = process.env.PORT || 8080
  await app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Running app in MODE: ${process.env.NODE_MODE} on PORT: ${PORT}`);
  });
}
void bootstrap();
