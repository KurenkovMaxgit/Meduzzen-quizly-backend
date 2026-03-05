import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { AttemptController } from '../src/quiz/attempt.controller';
import { AttemptService } from '../src/quiz/attempt.service';
import { mockAttemptService } from '../src/mock/attempts-tests.mock';
import { mockCompany } from '../src/mock/company-tests.mock';
import { mockQuiz } from '../src/mock/quiz-tests.mock';
import { mockUser } from '../src/mock/user-tests.mock';

describe('AttemptController (e2e)', () => {
  let app: INestApplication;
  let attemptService: AttemptService;

  const mockJwtAuthGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockUser;
      return true;
    },
  };

  const mockCompanyRolesGuard = {
    canActivate: () => true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttemptController],
      providers: [
        {
          provide: AttemptService,
          useValue: mockAttemptService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(CompanyRolesGuard)
      .useValue(mockCompanyRolesGuard)
      .compile();

    attemptService = moduleFixture.get<AttemptService>(AttemptService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /attempt/company/:companyId/quiz/:quizId', () => {
    const createAttemptDto = {
      userAnswers: {
        'question-1': ['answer-1'],
      },
    };

    it('should submit an attempt', () => {
      return request(app.getHttpServer())
        .post(`/attempt/company/${mockCompany.id}/quiz/${mockQuiz.id}`)
        .send(createAttemptDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual('attempt-uuid-123');
          expect(attemptService.submitAttempt).toHaveBeenCalledWith(
            mockUser,
            mockCompany.id,
            mockQuiz.id,
            expect.objectContaining(createAttemptDto),
          );
        });
    });

    it('should fail with 400 if UUIDs are invalid', () => {
      return request(app.getHttpServer())
        .post(`/attempt/company/invalid-company/quiz/${mockQuiz.id}`)
        .send(createAttemptDto)
        .expect(400);
    });
  });

  describe('GET /attempt/rating/company/:companyId', () => {
    it('should return user rating for specific company', () => {
      return request(app.getHttpServer())
        .get(`/attempt/rating/company/${mockCompany.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ rating: 0.8 });
          expect(attemptService.getUserRating).toHaveBeenCalledWith(mockUser.id, mockCompany.id);
        });
    });
  });

  describe('GET /attempt/rating/overall', () => {
    it('should return overall user rating', () => {
      return request(app.getHttpServer())
        .get(`/attempt/rating/overall`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ rating: 0.75 });
          expect(attemptService.getUserRating).toHaveBeenCalledWith(mockUser.id);
        });
    });
  });

  describe('GET /attempt/company/:companyId/list', () => {
    it('should return a paginated list of attempts', () => {
      return request(app.getHttpServer())
        .get(`/attempt/company/${mockCompany.id}/list`)
        .query({ skip: 0, take: 10 })
        .expect(200)
        .expect((res) => {
          expect(attemptService.findAll).toHaveBeenCalledWith(
            mockCompany.id,
            expect.objectContaining({ skip: 0, take: 10 }),
          );
        });
    });

    it('should fail with 400 if company UUID is invalid', () => {
      return request(app.getHttpServer()).get(`/attempt/company/invalid-uuid/list`).expect(400);
    });
  });

  describe('GET /attempt/:attemptId/company/:companyId', () => {
    it('should return a specific attempt', () => {
      const attemptId = '7c2f6b40-4fd5-45d2-a153-324189e7ef6c';

      return request(app.getHttpServer())
        .get(`/attempt/${attemptId}/company/${mockCompany.id}`)
        .expect(200)
        .expect(() => {
          expect(attemptService.findOneBy).toHaveBeenCalledWith({
            id: attemptId,
            user: { id: mockUser.id },
            company: { id: mockCompany.id },
          });
        });
    });
  });

  describe('GET /attempt/company/:companyId/quiz/:quizId/export', () => {
    it('should export attempts as a CSV buffer', () => {
      return request(app.getHttpServer())
        .get(`/attempt/company/${mockCompany.id}/quiz/${mockQuiz.id}/export`)
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8')
        .expect('Content-Disposition', 'attachment; filename="quiz-attempts.csv"')
        .expect((res) => {
          expect(attemptService.exportAttemptsToCsv).toHaveBeenCalledWith(
            mockCompany.id,
            mockQuiz.id,
          );
        });
    });
  });
});
