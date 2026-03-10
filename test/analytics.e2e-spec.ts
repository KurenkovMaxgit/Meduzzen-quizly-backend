import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { mockUser } from '../src/mock/user-tests.mock';
import { mockCompany } from '../src/mock/company-tests.mock';
import { AnalyticsController } from '../src/quiz/analytics/analytics.controller';
import { AnalyticsService } from '../src/quiz/analytics/analytics.service';
import { mockAnalyticsService } from '../src/mock/analytics-tests.mock';
import { mockJwtAuthGuard, mockCompanyRolesGuard } from '../src/mock/auth-tests.mock';

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let analyticsService: AnalyticsService;
  const baseUrl = `/analytics`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(CompanyRolesGuard)
      .useValue(mockCompanyRolesGuard)
      .compile();

    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /analytics/personal/rating', () => {
    it('should return user overall system rating', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/personal/rating`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ rating: 80 });
          expect(analyticsService.getUserAverageQuestionPerformance).toHaveBeenCalledWith(
            mockUser.id,
          );
        });
    });
  });

  describe('GET /analytics/personal/average-score', () => {
    it('should return user average score', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/personal/average-score`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ averageScore: 75.5 });
          expect(analyticsService.getUserAverageQuizPerformance).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });

  describe('GET /analytics/personal/scores-dynamics', () => {
    it('should return user scores time dynamics', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/personal/scores-dynamics`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].quizId).toEqual('1');
          expect(analyticsService.getUserScoresWithTimeDynamics).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });

  describe('GET /analytics/personal/last-completions', () => {
    it('should return user last completions', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/personal/last-completions`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].quizId).toEqual('1');
          expect(analyticsService.getUserLastCompletions).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });

  describe('GET /analytics/company/:companyId/scores-dynamics', () => {
    it('should return company scores dynamics', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/${mockCompany.id}/scores-dynamics`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(analyticsService.getCompanyScoresWithTimeDynamics).toHaveBeenCalledWith(
            mockCompany.id,
          );
        });
    });

    it('should fail with 400 if company UUID is invalid', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/invalid-uuid/scores-dynamics`)
        .expect(400);
    });
  });

  describe('GET /analytics/company/:companyId/user/:userId/scores-dynamics', () => {
    it('should return specific company user scores dynamics', () => {
      const targetUserId = 'e4567ed4-f5a5-4fba-8e1f-721ceab5d418';
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/${mockCompany.id}/user/${targetUserId}/scores-dynamics`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(analyticsService.getUserScoresWithTimeDynamics).toHaveBeenCalledWith(
            targetUserId,
            mockCompany.id,
          );
        });
    });

    it('should fail with 400 if target user UUID is invalid', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/${mockCompany.id}/user/invalid-uuid/scores-dynamics`)
        .expect(400);
    });
  });

  describe('GET /analytics/company/:companyId/users-last-completions', () => {
    it('should return company users last completions', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/${mockCompany.id}/users-last-completions`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(analyticsService.getCompanyUsersLastCompletions).toHaveBeenCalledWith(
            mockCompany.id,
          );
        });
    });
  });
});
