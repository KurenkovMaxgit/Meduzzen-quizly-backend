import { EntityManager } from 'typeorm';
import { CompanyUser } from '../common/entities/company-user.entity';
import { Company } from '../common/entities/company.entity';
import { mockCompanyRepository, mockCompanyUserRepository } from './company-tests.mock';

export const mockConfigService = {
  get: jest.fn((key) => {
    if (key === 'nodeEnv') return 'development';
    return null;
  }),
};

export const mockLogger = {
  warn: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
};

export const mockEntityManager = {
  save: jest.fn(),
  getRepository: jest.fn((entity) => {
    if (entity === Company) return mockCompanyRepository;
    if (entity === CompanyUser) return mockCompanyUserRepository;
    return null;
  }),
  findOne: jest.fn(),
  create: jest.fn(),
} as unknown as jest.Mocked<EntityManager>;

export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

export const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockEntityManager)),
};

export const mockEventEmitter = {
  emit: jest.fn(),
};
