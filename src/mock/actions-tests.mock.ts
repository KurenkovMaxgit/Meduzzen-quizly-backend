import { ActionType, ActionStatus } from '../utils/enums';
import { mockCompany } from './company-tests.mock';
import { mockUser } from './user-tests.mock';

export const mockInvite = {
  id: '0ea84908-3660-41ba-a91d-1a966e20f018',
  type: ActionType.INVITE,
  status: ActionStatus.PENDING,
  subject: mockUser,
  company: mockCompany,
  createdBy: mockUser,
  createdAt: new Date(),
};

export const mockRequest = {
  id: '581baf38-739d-4391-b4a3-d831acb59300',
  type: ActionType.REQUEST,
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
  getManyAndCount: jest.fn().mockResolvedValue([[mockInvite], 1]),
};

export const mockActionRepository = {
  save: jest.fn(),
  findOne: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

export const mockActionService = {
  create: jest.fn().mockResolvedValue(mockInvite),
  cancelAction: jest.fn().mockResolvedValue({ ...mockInvite, status: 'canceled' }),
  manageInvite: jest.fn().mockResolvedValue({ ...mockInvite, status: 'accepted' }),
  manageRequest: jest.fn().mockResolvedValue({ ...mockInvite, status: 'accepted' }),
  findAll: jest.fn().mockResolvedValue({ items: [mockInvite], totalCount: 1 }),
};
