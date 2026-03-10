import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { NotificationController } from '../src/notification/notification.controller';
import { NotificationService } from '../src/notification/notification.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { NotificationStatus } from '../src/utils/enums';
import { mockUser } from '../src/mock/user-tests.mock';
import { mockNotificationService } from '../src/mock/notification-tests.mock';
import { mockJwtAuthGuard } from '../src/mock/auth-tests.mock';

describe('NotificationController (e2e)', () => {
  let app: INestApplication;
  let notificationService: NotificationService;
  const baseUrl = `/notification`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    notificationService = moduleFixture.get<NotificationService>(NotificationService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /notification/list', () => {
    it('should return paginated notifications', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/list`)
        .query({ skip: 0, take: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
          expect(notificationService.findAll).toHaveBeenCalledWith(
            mockUser.id,
            expect.objectContaining({ skip: 0, take: 10 }),
          );
        });
    });
  });

  describe('GET /notification/count', () => {
    it('should return notification count for a specific status', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/count`)
        .query({ status: NotificationStatus.READ })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ count: 5, status: NotificationStatus.READ });
          expect(notificationService.getCountByStatus).toHaveBeenCalledWith(
            mockUser.id,
            NotificationStatus.READ,
          );
        });
    });

    it('should default to UNREAD if status query is missing', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/count`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ count: 5, status: NotificationStatus.UNREAD });
        });
    });

    it('should fail with 400 if status query is an invalid enum', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/count`)
        .query({ status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('PATCH /notification/status/:status', () => {
    const validUuids = [
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ];

    it('should update the status of notifications', () => {
      return request(app.getHttpServer())
        .patch(`/notification/status/${NotificationStatus.READ}`)
        .send({ notificationIds: validUuids })
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ updatedCount: 2 });
          expect(notificationService.updateStatus).toHaveBeenCalledWith(
            validUuids,
            mockUser.id,
            NotificationStatus.READ,
          );
        });
    });

    it('should fail with 400 if status param is an invalid enum', () => {
      return request(app.getHttpServer())
        .patch(`${baseUrl}/status/super_read`)
        .send({ notificationIds: validUuids })
        .expect(400);
    });

    it('should fail with 400 if notificationIds contains invalid UUIDs', () => {
      return request(app.getHttpServer())
        .patch(`/notification/status/${NotificationStatus.READ}`)
        .send({ notificationIds: ['not-a-uuid'] })
        .expect(400);
    });

    it('should fail with 400 if notificationIds is not an array', () => {
      return request(app.getHttpServer())
        .patch(`/notification/status/${NotificationStatus.READ}`)
        .send({ notificationIds: '123e4567-e89b-12d3-a456-426614174001' })
        .expect(400);
    });
  });
});
