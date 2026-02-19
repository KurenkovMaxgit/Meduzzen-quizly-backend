import { ActionType, ActionStatus } from '../utils/enums';
import { mockCompany } from './company-tests.mock';
import { mockUser } from './user-tests.mock';

export const mockAction = {
  id: 'action-123',
  type: ActionType.INVITE,
  status: ActionStatus.PENDING,
  subject: mockUser,
  company: mockCompany,
  createdBy: mockUser,
  createdAt: new Date(),
};

export const mockQueryBuilder = {
  alias: 'action',
  andWhere: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockAction], 1]),
};

export const mockActionRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

export const mockCompanyService = {
  getCompanyUserRole: jest.fn(),
  addMember: jest.fn(),
};

export const mockEntityManager = {
  save: jest.fn(),
};

export const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockEntityManager)),
};

export const mockLogger = {
  warn: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
};
