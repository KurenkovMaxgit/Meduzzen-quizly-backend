import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttempt } from '../../common/entities/attempt.entity';
import { mockUser } from '../../mock/user-tests.mock';
import { mockCompany } from '../../mock/company-tests.mock';
import { mockAttemptRepository, mockAnalyticsQueryBuilder } from '../../mock/analytics-tests.mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockAttemptRepository,
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
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: '8',
        totalQuestions: '10',
      });

      const result = await service.getUserAverageQuestionPerformance(mockUser.id);

      expect(mockAttemptRepository.createQueryBuilder).toHaveBeenCalledWith('attempt');
      expect(mockAnalyticsQueryBuilder.select).toHaveBeenCalledWith(
        'SUM(attempt.correctAnswersCount)',
        'totalCorrect',
      );
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(mockAnalyticsQueryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(80);
    });

    it('should filter by companyId if provided', async () => {
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: '5',
        totalQuestions: '10',
      });

      const result = await service.getUserAverageQuestionPerformance(mockUser.id, mockCompany.id);

      expect(mockAnalyticsQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(50);
    });

    it('should return 0 if total questions is 0 to avoid division by zero', async () => {
<<<<<<< BE-22-add-CodePipeline
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({
        totalCorrect: '0',
        totalQuestions: '0',
      });
=======
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({ totalCorrect: '0', totalQuestions: '0' });
>>>>>>> dev
      const result = await service.getUserAverageQuestionPerformance(mockUser.id);
      expect(result).toEqual(0);
    });

    it('should handle null/undefined results gracefully', async () => {
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({});
      const result = await service.getUserAverageQuestionPerformance(mockUser.id);
      expect(result).toEqual(0);
    });
  });

  describe('getUserAverageQuizPerformance', () => {
    it('should calculate average quiz performance', async () => {
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({ averageScore: '75.5' });

      const result = await service.getUserAverageQuizPerformance(mockUser.id);

      expect(mockAnalyticsQueryBuilder.select).toHaveBeenCalledWith(
        'AVG((attempt.correctAnswersCount * 100.0) / NULLIF(attempt.totalQuestionsCount, 0))',
        'averageScore',
      );
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith('attempt.userId = :userId', {
        userId: mockUser.id,
      });
      expect(result).toEqual(75.5);
    });

    it('should filter by companyId if provided', async () => {
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({ averageScore: '60' });

      const result = await service.getUserAverageQuizPerformance(mockUser.id, mockCompany.id);

      expect(mockAnalyticsQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(result).toEqual(60);
    });

    it('should return 0 if there are no scores', async () => {
      mockAnalyticsQueryBuilder.getRawOne.mockResolvedValue({ averageScore: null });
      const result = await service.getUserAverageQuizPerformance(mockUser.id);
      expect(result).toEqual(0);
    });
  });

  describe('getUserScoresWithTimeDynamics', () => {
    it('should build query and return raw multiple results', async () => {
      const mockResult = [{ quizId: '1', date: '2026-02-25', averageScore: '80' }];
      mockAnalyticsQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getUserScoresWithTimeDynamics(mockUser.id, mockCompany.id);

      expect(mockAnalyticsQueryBuilder.groupBy).toHaveBeenCalledWith('attempt.quizId');
<<<<<<< BE-22-add-CodePipeline
      expect(mockAnalyticsQueryBuilder.addGroupBy).toHaveBeenCalledWith(
        'attempt.quizTitleSnapshot',
      );
      expect(mockAnalyticsQueryBuilder.addGroupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith(
        'DATE(attempt.createdAt)',
        'ASC',
      );
=======
      expect(mockAnalyticsQueryBuilder.addGroupBy).toHaveBeenCalledWith('attempt.quizTitleSnapshot');
      expect(mockAnalyticsQueryBuilder.addGroupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith('DATE(attempt.createdAt)', 'ASC');
>>>>>>> dev

      expect(mockAnalyticsQueryBuilder.andWhere).toHaveBeenCalledWith(
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
      mockAnalyticsQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getUserLastCompletions(mockUser.id);

      expect(mockAnalyticsQueryBuilder.select).toHaveBeenCalledWith('attempt.quizId', 'quizId');
      expect(mockAnalyticsQueryBuilder.addSelect).toHaveBeenCalledWith(
        'MAX(attempt.createdAt)',
        'lastCompletionTime',
      );
      expect(mockAnalyticsQueryBuilder.groupBy).toHaveBeenCalledWith('attempt.quizId');
      expect(result).toEqual(mockResult);
    });
  });

  describe('getCompanyScoresWithTimeDynamics', () => {
    it('should return average scores grouped by date for a company', async () => {
      const mockResult = [{ date: '2026-02-25', averageScore: '85' }];
      mockAnalyticsQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getCompanyScoresWithTimeDynamics(mockCompany.id);

<<<<<<< BE-22-add-CodePipeline
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(mockAnalyticsQueryBuilder.groupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith(
        'DATE(attempt.createdAt)',
        'ASC',
      );
=======
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith('attempt.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(mockAnalyticsQueryBuilder.groupBy).toHaveBeenCalledWith('DATE(attempt.createdAt)');
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith('DATE(attempt.createdAt)', 'ASC');
>>>>>>> dev
      expect(result).toEqual(mockResult);
    });
  });

  describe('getCompanyUsersLastCompletions', () => {
    it('should use distinctOn and leftJoin to get latest user attempts', async () => {
      const mockResult = [{ userId: 'user1', firstName: 'John', lastCompletionTime: '2026-02-25' }];
      mockAnalyticsQueryBuilder.getRawMany.mockResolvedValue(mockResult);

      const result = await service.getCompanyUsersLastCompletions(mockCompany.id);

      expect(mockAnalyticsQueryBuilder.leftJoin).toHaveBeenCalledWith('attempt.user', 'user');
<<<<<<< BE-22-add-CodePipeline
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith(
        'attempt.companyId = :companyId',
        {
          companyId: mockCompany.id,
        },
      );
      expect(mockAnalyticsQueryBuilder.distinctOn).toHaveBeenCalledWith(['user.id']);
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
      expect(mockAnalyticsQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'attempt.createdAt',
        'DESC',
      );
=======
      expect(mockAnalyticsQueryBuilder.where).toHaveBeenCalledWith('attempt.companyId = :companyId', {
        companyId: mockCompany.id,
      });
      expect(mockAnalyticsQueryBuilder.distinctOn).toHaveBeenCalledWith(['user.id']);
      expect(mockAnalyticsQueryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
      expect(mockAnalyticsQueryBuilder.addOrderBy).toHaveBeenCalledWith('attempt.createdAt', 'DESC');
>>>>>>> dev
      expect(result).toEqual(mockResult);
    });
  });
});
