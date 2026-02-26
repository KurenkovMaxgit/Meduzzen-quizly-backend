export const localMockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  distinctOn: jest.fn().mockReturnThis(),
  getRawOne: jest.fn(),
  getRawMany: jest.fn(),
};

export const localMockAttemptRepository = {
  createQueryBuilder: jest.fn(() => localMockQueryBuilder),
};

export const mockDynamicsRaw = [{ quizId: '1', averageScore: 80 }];

export const mockLastCompletionsRaw = [
  { quizId: '1', lastCompletionTime: '2026-02-25T00:00:00.000Z' },
];

export const mockCompanyScoresRaw = [{ date: '2026-02-25T00:00:00.000Z', averageScore: 85 }];

export const mockCompanyUsersRaw = [
  { userId: 'u1', lastCompletionTime: '2026-02-25T00:00:00.000Z' },
];

export const mockAnalyticsService = {
  getUserAverageQuestionPerformance: jest.fn().mockResolvedValue(80),
  getUserAverageQuizPerformance: jest.fn().mockResolvedValue(75.5),
  getUserScoresWithTimeDynamics: jest.fn().mockResolvedValue([{ quizId: '1', averageScore: 80 }]),
  getUserLastCompletions: jest
    .fn()
    .mockResolvedValue([{ quizId: '1', lastCompletionTime: '2026-02-25' }]),
  getCompanyScoresWithTimeDynamics: jest
    .fn()
    .mockResolvedValue([{ date: '2026-02-25', averageScore: 85 }]),
  getCompanyUsersLastCompletions: jest
    .fn()
    .mockResolvedValue([{ userId: 'u1', lastCompletionTime: '2026-02-25' }]),
};
