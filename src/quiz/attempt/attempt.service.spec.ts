import { Test, TestingModule } from '@nestjs/testing';
import { AttemptService } from './attempt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttempt } from '../../common/entities/attempt.entity';
import { QuizService } from '../quiz.service';
import { Repository } from 'typeorm';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { mockQuiz, mockQuizService } from '../../mock/quiz-tests.mock';
import { mockCompany } from '../../mock/company-tests.mock';
import { mockUser } from '../../mock/user-tests.mock';
import { AnswerCorrectness } from '../../utils/enums';
import {
  mockAttemptRepository,
  mockAttemptQueryBuilder,
  mockAttempt,
} from '../../mock/attempts-tests.mock';
import { mockRedisService, mockLogger } from '../../mock/common-tests.mock';
import { RedisService } from '../../redis/redis.service';

describe('AttemptService', () => {
  let service: AttemptService;
  let attemptRepo: Repository<QuizAttempt>;
  let quizService: QuizService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockAttemptRepository,
        },
        {
          provide: QuizService,
          useValue: mockQuizService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AttemptService>(AttemptService);
    attemptRepo = module.get<Repository<QuizAttempt>>(getRepositoryToken(QuizAttempt));
    quizService = module.get<QuizService>(QuizService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitAttempt', () => {
    it('should throw BadRequestException if quiz is not found or has no questions', async () => {
      mockQuizService.findOneBy.mockResolvedValue(null);

      await expect(
        service.submitAttempt(mockUser, mockCompany.id, mockQuiz.id, { userAnswers: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate correct answers, save attempt, and cache to Redis', async () => {
      const gradableQuiz = {
        ...mockQuiz,
        title: 'Gradable Quiz',
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            answers: [{ id: 'a1', correctness: AnswerCorrectness.CORRECT }],
          },
        ],
      };

      mockQuizService.findOneBy.mockResolvedValue(gradableQuiz);
      mockAttemptRepository.save.mockResolvedValue(mockAttempt);

      const submitDto = { userAnswers: { q1: ['a1'] } };

      const result = await service.submitAttempt(mockUser, mockCompany.id, mockQuiz.id, submitDto);

      expect(attemptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          company: { id: mockCompany.id },
          quizTitleSnapshot: 'Gradable Quiz',
          correctAnswersCount: 1,
        }),
      );

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `attempt:${mockAttempt.id}`,
        expect.stringContaining(mockAttempt.id),
        172800,
      );

      expect(result).toEqual(mockAttempt);
    });

    it('should throw BadRequestException if single_choice question has multiple answers submitted', async () => {
      const badQuiz = {
        ...mockQuiz,
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            answers: [{ id: 'a1', correctness: AnswerCorrectness.CORRECT }],
          },
        ],
      };
      mockQuizService.findOneBy.mockResolvedValue(badQuiz);

      const submitDto = { userAnswers: { q1: ['a1', 'a2'] } };

      await expect(
        service.submitAttempt(mockUser, mockCompany.id, mockQuiz.id, submitDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated attempts with query filters', async () => {
      const query = { skip: 0, take: 10 };

      const result = await service.findAll(mockCompany.id, query as any, mockUser.id);

      expect(mockAttemptQueryBuilder.where).toHaveBeenCalledWith('attempt.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(mockAttemptQueryBuilder.andWhere).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(mockAttemptQueryBuilder.orderBy).toHaveBeenCalledWith('attempt.createdAt', 'DESC');

      expect(result.items.length).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe('findOneBy', () => {
    it('should return from Redis cache if available and valid', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockAttempt));

      const result = await service.findOneBy({
        id: mockAttempt.id,
        company: { id: mockCompany.id },
      });

      expect(mockRedisService.get).toHaveBeenCalledWith(`attempt:${mockAttempt.id}`);
      expect(attemptRepo.findOne).not.toHaveBeenCalled();
      expect(result?.id).toEqual(mockAttempt.id);
    });

    it('should return null if Redis cache company validation fails', async () => {
      mockRedisService.get.mockResolvedValue(JSON.stringify(mockAttempt));

      const result = await service.findOneBy({
        id: mockAttempt.id,
        company: { id: 'different-company' },
      });

      expect(result).toBeNull();
      expect(attemptRepo.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in Redis', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockAttemptRepository.findOne.mockResolvedValue(mockAttempt);

      const result = await service.findOneBy({ id: mockAttempt.id });

      expect(attemptRepo.findOne).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalledWith(
        `attempt:${mockAttempt.id}`,
        expect.any(String),
        172800,
      );
      expect(result).toEqual(mockAttempt);
    });
  });

  describe('exportAttemptsToCsv', () => {
    it('should throw NotFoundException if no attempts exist', async () => {
      mockAttemptRepository.find.mockResolvedValue([]);

      await expect(service.exportAttemptsToCsv(mockCompany.id, mockQuiz.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return a valid CSV Buffer if attempts exist', async () => {
      mockAttemptRepository.find.mockResolvedValue([mockAttempt]);

      const result = await service.exportAttemptsToCsv(mockCompany.id, mockQuiz.id);

      expect(attemptRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { company: { id: mockCompany.id }, quiz: { id: mockQuiz.id } },
        }),
      );

      expect(Buffer.isBuffer(result)).toBe(true);

      const csvString = result.toString('utf-8');
      expect(csvString).toContain('Attempt ID,User ID,First Name');
      expect(csvString).toContain(mockAttempt.id);
      expect(csvString).toContain(mockUser.firstName);
    });
  });
});
