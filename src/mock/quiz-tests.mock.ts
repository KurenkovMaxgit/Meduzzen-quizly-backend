import { QuizQuestionType, AnswerCorrectness } from '../utils/enums';
import { mockCompany } from './company-tests.mock';

export const mockQuiz = {
  id: '8c2f6b40-4fd5-45d2-a153-324189e7ef6b',
  title: 'Test Quiz',
  description: 'Test Desc',
  company: mockCompany,
  questions: [
    {
      id: 'q1',
      type: QuizQuestionType.SINGLE_CHOICE,
      answers: [
        { id: 'a1', correctness: AnswerCorrectness.CORRECT },
        { id: 'a2', correctness: AnswerCorrectness.INCORRECT },
      ],
    },
    {
      id: 'q2',
      type: QuizQuestionType.SINGLE_CHOICE,
      answers: [
        { id: 'a3', correctness: AnswerCorrectness.CORRECT },
        { id: 'a4', correctness: AnswerCorrectness.INCORRECT },
      ],
    },
  ],
};

export const mockQuizQueryBuilder = {
  alias: 'quiz',
  andWhere: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockQuiz], 1]),
};

export const mockQuizRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQuizQueryBuilder),
};

export const mockQuizService = {
  create: jest.fn().mockResolvedValue(mockQuiz),
  findAll: jest.fn().mockResolvedValue({ items: [mockQuiz], totalCount: 1 }),
  findOneBy: jest.fn().mockResolvedValue(mockQuiz),
  updateBy: jest.fn().mockResolvedValue({ ...mockQuiz, title: 'Updated' }),
  deleteBy: jest.fn().mockResolvedValue({ affected: 1 }),
};
