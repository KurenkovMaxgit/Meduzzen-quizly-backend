import { CompanyRole, CompanyStatus } from '../utils/enums';
import { mockUser } from './user-tests.mock';

export const mockCompany = {
  id: '8624f649-8ab0-4627-b168-1f8f961d4e62',
  name: 'Hubabuba Corp',
  description: 'We make hubabuba',
  status: CompanyStatus.VISIBLE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockCompanyUser = {
  id: 'membership-123',
  company: mockCompany,
  user: mockUser,
  role: CompanyRole.OWNER,
};

export const mockCompanyQueryBuilder = {
  alias: 'company',
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockCompany], 1]),
};

export const mockCompanyRepository = {
  create: jest.fn().mockImplementation((dto) => ({
    ...mockCompany,
    ...dto,
  })),
  save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockCompanyQueryBuilder),
};

export const mockCompanyUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
};

export const mockCompanyService = {
  create: jest.fn().mockResolvedValue(mockCompany),
  findAll: jest.fn().mockResolvedValue({ items: [mockCompany], totalCount: 1 }),
  findOneBy: jest.fn().mockImplementation((where) => {
    if (where.id === mockCompany.id) return Promise.resolve(mockCompany);
    return Promise.resolve(null);
  }),
  updateBy: jest.fn().mockResolvedValue({ ...mockCompany, name: 'Updated Name' }),
  deleteBy: jest.fn().mockResolvedValue({ affected: 1 }),
  updateCompanyUsersRole: jest.fn().mockResolvedValue({ success: true }),
  addNewCompanyOwner: jest.fn().mockResolvedValue({ affected: 1 }),
  deleteCompanyUsers: jest.fn().mockResolvedValue({ affected: 1 }),
  getCompanyUserRole: jest.fn(),
  addMember: jest.fn(),
};
