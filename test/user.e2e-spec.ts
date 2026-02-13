import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { mockUser } from '../src/mock/user-tests.mock';

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userService: UserService;

  const mockUserService = {
    findAll: jest.fn().mockResolvedValue({ items: [mockUser], totalCount: 1 }),
    findOneBy: jest.fn().mockImplementation((criteria) => {
      if (criteria.id === mockUser.id) return Promise.resolve(mockUser);
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
          expect(res.body).not.toHaveProperty('passwordHash');
        });
    });
  });

  describe('GET /user (findAll)', () => {
    it('should return paginated users', () => {
      return request(app.getHttpServer())
        .get('/user')
        .query({ take: 10, skip: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
          expect(userService.findAll).toHaveBeenCalled();
        });
    });

    it('should validate query params (e.g. invalid json in where)', () => {
      return request(app.getHttpServer()).get('/user').query({ take: -5 }).expect(400);
    });
  });

  describe('GET /user/:id', () => {
    it('should return a user by valid UUID', () => {
      return request(app.getHttpServer())
        .get(`/user/${mockUser.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockUser.id);
        });
    });

    it('should return 400 for invalid UUID', () => {
      return request(app.getHttpServer()).get('/user/not-a-uuid').expect(400);
    });

    it('should handle user not found (returning null or 404 depending on logic)', () => {
      const randomId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
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
            { id: mockUser.id },
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
          expect(userService.deleteBy).toHaveBeenCalledWith({ id: mockUser.id });
        });
    });
  });
});
