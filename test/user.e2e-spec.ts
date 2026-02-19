import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { mockUser } from '../src/mock/user-tests.mock';

const VALID_UUID = 'f77314d7-8429-49f8-a719-b0cdd54bade4';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  const mockUserService = {
    findAll: jest.fn().mockResolvedValue({ items: [mockUser], totalCount: 1 }),
    findOneBy: jest.fn().mockImplementation((criteria) => {
      if (criteria.id === VALID_UUID) return Promise.resolve(mockUser);
      return Promise.resolve(null);
    }),
    updateBy: jest.fn().mockResolvedValue({ ...mockUser, firstName: 'Updated' }),
    deleteBy: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    userService = moduleFixture.get<UserService>(UserService);
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /user/me', () => {
    it('should return the authenticated user profile', () => {
      return request(app.getHttpServer())
        .get('/user/me')
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toEqual(mockUser.email);
        });
    });
  });

  describe('GET /user/list (findAll)', () => {
    it('should return paginated users', () => {
      return request(app.getHttpServer())
        .get('/user/list')
        .query({ take: 10, skip: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
        });
    });

    it('should validate query params (e.g. invalid take)', () => {
      return request(app.getHttpServer()).get('/user/list').query({ take: -5 }).expect(400);
    });
  });

  describe('GET /user/:id', () => {
    it('should return a user by valid UUID', () => {
      return request(app.getHttpServer())
        .get(`/user/${VALID_UUID}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(VALID_UUID);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer()).get('/user/not-a-uuid').expect(400);
    });

    it('should handle user not found (returning null or 404)', () => {
      const randomId = '968a7469-77f8-47cd-9f12-86c2eb23f8c4';
      return request(app.getHttpServer())
        .get(`/user/${randomId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({});
        });
    });
  });

  describe('PATCH /user', () => {
    it('should update the current authenticated user', () => {
      const updateDto = { firstName: 'Updated' };

      return request(app.getHttpServer())
        .patch('/user')
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toEqual('Updated');
          expect(userService.updateBy).toHaveBeenCalledWith(
            { id: VALID_UUID },
            expect.objectContaining(updateDto),
          );
        });
    });
  });

  describe('DELETE /user', () => {
    it('should delete the current authenticated user', () => {
      return request(app.getHttpServer())
        .delete('/user')
        .expect(200)
        .expect(() => {
          expect(userService.deleteBy).toHaveBeenCalledWith({ id: VALID_UUID });
        });
    });
  });
});
