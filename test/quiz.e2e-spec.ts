import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { QuizController } from '../src/quiz/quiz.controller';
import { QuizService } from '../src/quiz/quiz.service';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../src/company/guards/company-role.guard';
import { QuizQuestionType, AnswerCorrectness } from '../src/utils/enums';
import { mockQuiz, mockQuizService } from '../src/mock/quiz-tests.mock';
import { mockCompany } from '../src/mock/company-tests.mock';
import { mockCompanyRolesGuard, mockJwtAuthGuard } from '../src/mock/auth-tests.mock';

describe('QuizController (e2e)', () => {
  let app: INestApplication;
  let quizService: QuizService;
  const baseUrl = `/quiz`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(CompanyRolesGuard)
      .useValue(mockCompanyRolesGuard)
      .compile();

    quizService = moduleFixture.get<QuizService>(QuizService);
    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /quiz/company/:companyId', () => {
    it('should create a quiz for the company', () => {
      const createDto = {
        title: 'Hubabuba Quiz',
        description: 'A fun quiz about Hubabuba',
        completionFrequency: 0,
        questions: [
          {
            prompt: 'What is the capital of Hubabuba?',
            type: 'single_choice',
            answers: [
              {
                content: 'Hubabuba City',
                correctness: 'correct',
              },
              {
                content: 'Bubububu City',
                correctness: 'incorrect',
              },
            ],
          },
          {
            prompt: 'What is the currency of Hubabuba?',
            type: 'single_choice',
            answers: [
              {
                content: 'Hubabuba Dollar',
                correctness: 'correct',
              },
              {
                content: 'Bubububu Dollar',
                correctness: 'incorrect',
              },
            ],
          },
        ],
      };

      return request(app.getHttpServer())
        .post(`${baseUrl}/company/${mockCompany.id}`)
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toEqual(mockQuiz.id);
          expect(quizService.create).toHaveBeenCalledWith(
            mockCompany.id,
            expect.objectContaining(createDto),
          );
        });
    });

    it('should fail with 400 if companyId is invalid UUID', () => {
      return request(app.getHttpServer())
        .post(`${baseUrl}/company/invalid-uuid`)
        .send({ title: 'New Quiz' })
        .expect(400);
    });
  });

  describe('GET /quiz/company/:companyId/list', () => {
    it('should return paginated quizzes mapped to PrivateReturnQuizDto', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/company/${mockCompany.id}/list`)
        .query({ take: 10, skip: 0 })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(1);
          expect(res.body.totalCount).toBe(1);
          expect(res.body.items[0].id).toEqual(mockQuiz.id);
          expect(quizService.findAll).toHaveBeenCalledWith(mockCompany.id, expect.anything());
        });
    });
  });

  describe('GET /quiz/:id/company/:companyId/private', () => {
    it('should return the quiz for owners/admins', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/${mockQuiz.id}/company/${mockCompany.id}/private`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockQuiz.id);
          expect(quizService.findOneBy).toHaveBeenCalledWith(
            { id: mockQuiz.id, company: { id: mockCompany.id } },
            expect.anything(),
          );
        });
    });

    it('should fail with 400 if UUIDs are invalid', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/invalid-uuid/company/${mockCompany.id}/private`)
        .expect(400);
    });
  });

  describe('GET /quiz/:id/company/:companyId/public', () => {
    it('should return the quiz for general members', () => {
      return request(app.getHttpServer())
        .get(`${baseUrl}/${mockQuiz.id}/company/${mockCompany.id}/public`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(mockQuiz.id);
          expect(quizService.findOneBy).toHaveBeenCalledWith(
            { id: mockQuiz.id, company: { id: mockCompany.id } },
            expect.anything(),
          );
        });
    });
  });

  describe('PUT /quiz/:id/company/:companyId', () => {
    it('should update the quiz', () => {
      const updateDto = {
        title: 'Hubabuba Quiz',
        description: 'A not fun quiz about Hubabuba',
        completionFrequency: 0,
        questions: [
          {
            id: '6190b830-ea15-4ff4-aae7-3fbe1c985215',
            prompt: 'What is the capital of Hubabuba?',
            type: 'single_choice',
            answers: [
              {
                id: 'db70afeb-01c4-4353-94c8-b0cd79679f78',
                content: 'Hubabuba City',
                correctness: 'correct',
              },
              {
                id: '000c56df-cd2d-4635-b88d-00655c91651b',
                content: 'Bubububu City',
                correctness: 'incorrect',
              },
              {
                content: 'Hulumulu Town',
                correctness: 'incorrect',
              },
            ],
          },
          {
            id: 'b8c81ed7-c466-4d25-81ed-914b64061c38',
            prompt: 'What is the currency of Hubabuba?',
            type: 'single_choice',
            answers: [
              {
                id: 'b787137e-53b2-42c5-8d14-f3182b24ec1c',
                content: 'Hubabuba Dollar',
                correctness: 'correct',
              },
              {
                id: '990db2fe-99d2-42eb-a038-336ecd6a9403',
                content: 'Hulumulu Dollar',
                correctness: 'incorrect',
              },
            ],
          },
        ],
      };

      return request(app.getHttpServer())
        .put(`${baseUrl}/${mockQuiz.id}/company/${mockCompany.id}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toEqual('Updated');
          expect(quizService.updateBy).toHaveBeenCalledWith(
            { id: mockQuiz.id, company: { id: mockCompany.id } },
            expect.objectContaining(updateDto),
          );
        });
    });
  });

  describe('DELETE /quiz/:id/company/:companyId', () => {
    it('should delete the quiz', () => {
      return request(app.getHttpServer())
        .delete(`${baseUrl}/${mockQuiz.id}/company/${mockCompany.id}`)
        .expect(200)
        .expect(() => {
          expect(quizService.deleteBy).toHaveBeenCalledWith({
            id: mockQuiz.id,
            company: { id: mockCompany.id },
          });
        });
    });
  });
});
