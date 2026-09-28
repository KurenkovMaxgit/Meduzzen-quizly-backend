import { mockCompany } from './company-tests.mock';
import { mockQuiz } from './quiz-tests.mock';
import { mockUser } from './user-tests.mock';

export const mockAttempt = {
  id: '6bc00fef-e599-4a45-8129-2c0a70381f35',
  user: mockUser,
  company: mockCompany,
  quiz: mockQuiz,
  quizTitleSnapshot: 'Test Quiz',
  correctAnswersCount: 1,
  totalQuestionsCount: 1,
  createdAt: new Date('2026-02-25T12:00:00Z'),
};

export const mockAttemptQueryBuilder = {
  alias: 'attempt',
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({ totalCorrect: '1', totalQuestions: '2' }),
  getManyAndCount: jest.fn().mockResolvedValue([[mockAttempt], 1]),
};

export const mockAttemptRepository = {
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(() => mockAttemptQueryBuilder),
};

export const mockAttemptService = {
  submitAttempt: jest.fn().mockResolvedValue({ id: 'attempt-uuid-123', correctAnswersCount: 2 }),
  findAll: jest.fn().mockResolvedValue({ items: [mockAttempt], totalCount: 1 }),
  findOneBy: jest.fn().mockResolvedValue(mockAttempt),
  exportAttemptsToCsv: jest.fn().mockResolvedValue(Buffer.from('header1,header2\nval1,val2')),
};
