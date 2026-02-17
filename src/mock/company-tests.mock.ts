import { CompanyUser } from '../common/entities/company-user.entity';
import { Company } from '../common/entities/company.entity';
import { CompanyStatus } from '../utils/enums';

export const mockCompany = {
  id: '8624f649-8ab0-4627-b168-1f8f961d4e62',
  name: 'Hubabuba Corp',
  description: 'We make hubabuba',
  status: CompanyStatus.VISIBLE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockQueryBuilder = {
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
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

export const mockEntityManager = {
  getRepository: jest.fn().mockImplementation((entity) => {
    if (entity === Company) return mockCompanyRepository;
    if (entity === CompanyUser) return { create: jest.fn(), save: jest.fn() };
    return mockCompanyRepository;
  }),
  save: jest.fn(),
  create: jest.fn(),
};

export const mockDataSource = {
  transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
};
