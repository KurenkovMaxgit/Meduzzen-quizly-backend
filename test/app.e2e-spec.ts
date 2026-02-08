import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('App Controller (e2e)', () => {
  let app: INestApplication<App>;
  const baseUrl = `/api`;
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get(`${baseUrl}/health`)
      .expect(200)
      .expect({ detail: 'ok', result: 'working' });
  });
});
