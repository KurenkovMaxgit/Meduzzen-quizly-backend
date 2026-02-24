import { Test, TestingModule } from '@nestjs/testing';
import { AttemptService } from './attempt.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttempt } from '../common/entities/attempt.entity';
import { QuizService } from './quiz.service';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnswerCorrectness } from '../utils/enums';
import { mockQuiz, mockQuizService } from '../mock/quiz-tests.mock';
import { mockCompany } from '../mock/company-tests.mock';
import { mockUser } from '../mock/user-tests.mock';

describe('AttemptService', () => {
  let service: AttemptService;
  let attemptRepo: Repository<QuizAttempt>;
  let quizService: QuizService;

  let localMockQueryBuilder: any;
  let localMockAttemptRepository: any;

  beforeEach(async () => {
    localMockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ totalCorrect: '1', totalQuestions: '2' }),
    };

    localMockAttemptRepository = {
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => localMockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttemptService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: localMockAttemptRepository,
        },
        {
          provide: QuizService,
          useValue: mockQuizService,
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
    it('should throw NotFoundException if quiz is not found', async () => {
      mockQuizService.findOneBy.mockResolvedValue(null);

      await expect(
        service.submitAttempt(mockUser.id, mockCompany.id, mockQuiz.id, { userAnswers: {} }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if quiz has no questions', async () => {
      mockQuizService.findOneBy.mockResolvedValue({ ...mockQuiz, questions: [] });

      await expect(
        service.submitAttempt(mockUser.id, mockCompany.id, mockQuiz.id, { userAnswers: {} }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate correct answers and save attempt', async () => {
      mockQuizService.findOneBy.mockResolvedValue(mockQuiz);
      localMockAttemptRepository.save.mockResolvedValue({ id: 'attempt-123' });

      const submitDto = {
        userAnswers: {
          q1: ['a1'],
          q2: ['a4'],
        },
      };

      const result = await service.submitAttempt(
        mockUser.id,
        mockCompany.id,
        mockQuiz.id,
        submitDto,
      );

      expect(quizService.findOneBy).toHaveBeenCalledWith(
        { id: mockQuiz.id, company: { id: mockCompany.id } },
        { relations: ['questions', 'questions.answers'] },
      );

      expect(attemptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: mockUser.id },
          company: { id: mockCompany.id },
          quiz: { id: mockQuiz.id },
          correctAnswersCount: 1,
          totalQuestionsCount: 2,
          userAnswers: expect.arrayContaining([
            expect.objectContaining({ questionId: 'q1' }),
            expect.objectContaining({ questionId: 'q2' }),
          ]),
        }),
      );
      expect(result).toEqual({ id: 'attempt-123' });
    });
  });

  describe('getUserRating', () => {
    it('should calculate overall rating across all companies', async () => {
      // getRawOne mock returns 1 correct out of 2 total -> 0.5 rating
      localMockQueryBuilder.getRawOne.mockResolvedValue({ totalCorrect: '1', totalQuestions: '2' });

      const result = await service.getUserRating(mockUser.id);

      expect(attemptRepo.createQueryBuilder).toHaveBeenCalledWith('attempt');
      expect(localMockQueryBuilder.where).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(localMockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(0.5);
    });

    it('should calculate rating for a specific company', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ totalCorrect: '4', totalQuestions: '5' });

      const result = await service.getUserRating(mockUser.id, mockCompany.id);

      expect(localMockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(0.8);
    });

    it('should return 0 if total questions is 0 (to prevent division by zero)', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ totalCorrect: '0', totalQuestions: '0' });

      const result = await service.getUserRating(mockUser.id);
      expect(result).toEqual(0);
    });

    it('should return 0 if no attempts exist (null results from DB)', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: null,
        totalQuestions: null,
      });

      const result = await service.getUserRating(mockUser.id);
      expect(result).toEqual(0);
    });
  });
});
