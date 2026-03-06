import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttempt } from '../../common/entities/attempt.entity';
import { mockUser } from '../../mock/user-tests.mock';
import { mockCompany } from '../../mock/company-tests.mock';
import { localMockAttemptRepository, localMockQueryBuilder } from '../../mock/analytics-tests.mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: localMockAttemptRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserAverageQuestionPerformance', () => {
    it('should calculate overall question performance correctly', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: '8',
        totalQuestions: '10',
      });

      const result = await service.getUserAverageQuestionPerformance(mockUser.id);

      expect(localMockAttemptRepository.createQueryBuilder).toHaveBeenCalledWith('attempt');
      expect(localMockQueryBuilder.select).toHaveBeenCalledWith(
        'SUM(attempt.correctAnswersCount)',
        'totalCorrect',
      );
      expect(localMockQueryBuilder.where).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(localMockQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(80);
    });

    it('should filter by companyId if provided', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: '5',
        totalQuestions: '10',
      });

      const result = await service.getUserAverageQuestionPerformance(mockUser.id, mockCompany.id);

      expect(localMockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(50);
    });

    it('should return 0 if total questions is 0 to avoid division by zero', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ totalCorrect: '0', totalQuestions: '0' });
      const result = await service.getUserAverageQuestionPerformance(mockUser.id);
      expect(result).toEqual(0);
    });

    it('should handle null/undefined results gracefully', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({});
      const result = await service.getUserAverageQuestionPerformance(mockUser.id);
      expect(result).toEqual(0);
    });
  });

  describe('getUserAverageQuizPerformance', () => {
    it('should calculate average quiz performance', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ averageScore: '75.5' });

      const result = await service.getUserAverageQuizPerformance(mockUser.id);

      expect(localMockQueryBuilder.select).toHaveBeenCalledWith(
        'AVG((attempt.correctAnswersCount * 100.0) / NULLIF(attempt.totalQuestionsCount, 0))',
        'averageScore',
      );
      expect(localMockQueryBuilder.where).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(result).toEqual(75.5);
    });

    it('should filter by companyId if provided', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ averageScore: '60' });

      const result = await service.getUserAverageQuizPerformance(mockUser.id, mockCompany.id);

      expect(localMockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(60);
    });

    it('should return 0 if there are no scores', async () => {
      localMockQueryBuilder.getRawOne.mockResolvedValue({ averageScore: null });
      const result = await service.getUserAverageQuizPerformance(mockUser.id);
      expect(result).toEqual(0);
    });
  });

  describe('getUserScoresWithTimeDynamics', () => {
    it('should build query and return raw multiple results', async () => {
      const mockResult = [{ quizId: '1', date: '2026-02-25', averageScore: '80' }];
      localMockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getUserScoresWithTimeDynamics(mockUser.id, mockCompany.id);

      expect(localMockQueryBuilder.groupBy).toHaveBeenCalledWith('attempt.quizId');
      expect(localMockQueryBuilder.addGroupBy).toHaveBeenCalledWith('attempt.quizTitleSnapshot');
      expect(localMockQueryBuilder.addGroupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(localMockQueryBuilder.orderBy).toHaveBeenCalledWith('DATE(attempt.createdAt)', 'ASC');

      expect(localMockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUserLastCompletions', () => {
    it('should return raw results for latest quiz completions', async () => {
      const mockResult = [{ quizId: '1', lastCompletionTime: '2026-02-25T12:00:00Z' }];
      localMockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getUserLastCompletions(mockUser.id);

      expect(localMockQueryBuilder.select).toHaveBeenCalledWith('attempt.quizId', 'quizId');
      expect(localMockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'MAX(attempt.createdAt)',
        'lastCompletionTime',
      );
      expect(localMockQueryBuilder.groupBy).toHaveBeenCalledWith('attempt.quizId');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getCompanyScoresWithTimeDynamics', () => {
    it('should return average scores grouped by date for a company', async () => {
      const mockResult = [{ date: '2026-02-25', averageScore: '85' }];
      localMockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getCompanyScoresWithTimeDynamics(mockCompany.id);

      expect(localMockQueryBuilder.where).toHaveBeenCalledWith('attempt.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(localMockQueryBuilder.groupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(localMockQueryBuilder.orderBy).toHaveBeenCalledWith('DATE(attempt.createdAt)', 'ASC');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getCompanyUsersLastCompletions', () => {
    it('should use distinctOn and leftJoin to get latest user attempts', async () => {
      const mockResult = [{ userId: 'user1', firstName: 'John', lastCompletionTime: '2026-02-25' }];
      localMockQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getCompanyUsersLastCompletions(mockCompany.id);

      expect(localMockQueryBuilder.leftJoin).toHaveBeenCalledWith('attempt.user', 'user');
      expect(localMockQueryBuilder.where).toHaveBeenCalledWith('attempt.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(localMockQueryBuilder.distinctOn).toHaveBeenCalledWith(['user.id']);
      expect(localMockQueryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
      expect(localMockQueryBuilder.addOrderBy).toHaveBeenCalledWith('attempt.createdAt', 'DESC');
      expect(result).toEqual(mockResult);
    });
  });
});
