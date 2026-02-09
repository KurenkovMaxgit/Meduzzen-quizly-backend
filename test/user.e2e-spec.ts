import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from '../src/common/filters/typeorm-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { Server } from 'node:http';
import { ApiResponse, GetListResponse } from '../src/utils/response.interface';
import { User } from '../src/common/entities/user.entity';

describe('UserController (E2E)', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  const baseUrl = `/api/user`;

  const createTestUser = async (email: string) => {
    return await request(app.getHttpServer())
      .post(baseUrl)
      .send({
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'Password123!',
      })
      .expect(201);
  };

  const correctQueries = [
    { take: 10, skip: 0 },
    { where: { email: 'search@test.com' } },
    { take: 5, skip: 0, where: { firstName: 'Test' } },
    { search: { email: 'sea' } },
    { take: 5, skip: 0, search: { email: 'sear' } },
    { where: { email: 'search@test.com' }, search: { email: 'sea' } },
    { take: 5, skip: 0, where: { email: 'search@test.com' }, search: { email: 'sea' } },
    { order: { firstName: 'ASC' } },
    { take: 5, skip: 0, order: { role: 'ASC' } },
    { where: { email: 'search@test.com' }, order: { email: 'DESC' } },
    { take: 5, skip: 0, where: { email: 'search@test.com' }, order: { creatdAt: 'DESC' } },
    { search: { email: 'ear' }, order: { updatedAt: 'asc' } },
    { take: 5, skip: 0, search: { email: 'ear' }, order: { lastName: 'asc' } },
    { take: 5, skip: 0, where: { firstName: 'Test' }, search: { email: '@' }, order: { email: 1 } },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new TransformInterceptor());

    app.useGlobalFilters(new AllExceptionsFilter(), new TypeOrmExceptionFilter());

    await app.init();

    dataSource = app.get(DataSource);
  });

  afterEach(async () => {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/user (GET)', () => {
    it('should return an empty list initially', async () => {
      const response = await request(app.getHttpServer()).get(baseUrl).expect(200);
      const res = response.body as GetListResponse<User>;

      expect(res.data?.items).toEqual([]);
    });

    it('should return a list of users', async () => {
      await createTestUser('list@test.com');

      const response = await request(app.getHttpServer()).get(baseUrl).expect(200);
      const res = response.body as GetListResponse<User>;
      const users = res.data?.items;
      const totalCont = res.data?.totalCount;

      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(1);
      if (Array.isArray(users)) {
        expect(users[0].email).toBe('list@test.com');
        expect(users[0]).not.toHaveProperty('password');
      }
      expect(totalCont).toBe(1);
    });

    describe('Data Driven Filter Tests', () => {
      beforeEach(async () => {
        await createTestUser('search@test.com');
      });

      it.each(correctQueries)('should work with query: %j', async (query) => {
        const response = await request(app.getHttpServer()).get(baseUrl).query(query).expect(200);
        const res = response.body as GetListResponse<User>;

        expect(res.data?.items).toHaveLength(1);
      });
    });
  });

  describe('/user/:id (GET)', () => {
    it('should return a single user by ID', async () => {
      const created = await createTestUser('single@test.com');
      const createdBody = created.body as ApiResponse<User>;
      const id = createdBody.data?.id;

      const response = await request(app.getHttpServer()).get(`${baseUrl}/${id}`).expect(200);
      const res = response.body as ApiResponse<User>;

      expect(res.data?.id).toBe(id);
      expect(res.data?.email).toBe('single@test.com');
    });

    it('should throw 404 for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer()).get(`${baseUrl}/${fakeId}`).expect(404);
    });

    it('should throw 400 for invalid UUID format', async () => {
      await request(app.getHttpServer()).get(`${baseUrl}/invalid-id-format`).expect(400);
    });
  });

  describe('/user (POST)', () => {
    it('should create a user and return it without password', async () => {
      const dto = {
        email: 'example@test.com',
        password: 'securePassword',
        firstName: 'Docker',
        lastName: 'Fan',
      };

      const response = await request(app.getHttpServer()).post(baseUrl).send(dto).expect(201);

      const res = response.body as ApiResponse<User>;

      expect(res.data?.email).toBe(dto.email);
      expect(res.data?.id).toBeDefined();
      expect(res.data).not.toHaveProperty('password');
      expect(res.data).not.toHaveProperty('passwordHash');
      expect(res.data).not.toHaveProperty('refreshToken');
    });

    it('should fail if email is duplicate', async () => {
      await request(app.getHttpServer())
        .post(baseUrl)
        .send({ email: 'duplicate@test.com', password: '123', firstName: 'A', lastName: 'B' })
        .expect(201);

      await request(app.getHttpServer())
        .post(baseUrl)
        .send({ email: 'duplicate@test.com', password: '123', firstName: 'A', lastName: 'B' })
        .expect(409);
    });
  });

  describe('/user/:id (PATCH)', () => {
    it('should update user details', async () => {
      const created = await createTestUser('update@test.com');
      const createdBody = created.body as ApiResponse<User>;
      const id = createdBody.data?.id;

      const updateData = {
        firstName: 'UpdatedName',
        lastName: 'UpdatedLast',
      };

      const response = await request(app.getHttpServer())
        .patch(`${baseUrl}/${id}`)
        .send(updateData)
        .expect(200);

      const res = response.body as ApiResponse<User>;

      expect(res.data?.firstName).toBe('UpdatedName');
      expect(res.data?.email).toBe('update@test.com');
    });

    it('should throw 404 when updating non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`${baseUrl}/${fakeId}`)
        .send({ firstName: 'Nobody' })
        .expect(404);
    });
  });

  describe('/user/:id (DELETE)', () => {
    it('should delete a user successfully', async () => {
      const created = await createTestUser('delete@test.com');
      const createdBody = created.body as ApiResponse<User>;
      const id = createdBody.data?.id;

      await request(app.getHttpServer()).delete(`${baseUrl}/${id}`).expect(200);

      await request(app.getHttpServer()).get(`${baseUrl}/${id}`).expect(404);
    });

    it('should throw 404 when deleting non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer()).delete(`${baseUrl}/${fakeId}`).expect(404);
    });
  });
});
