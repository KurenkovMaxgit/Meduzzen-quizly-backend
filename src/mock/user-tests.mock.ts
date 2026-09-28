import { UserRole } from '../utils/enums';

export const VALID_UUID = 'f77314d7-8429-49f8-a719-b0cdd54bade4';

export const mockUser = {
  id: 'f77314d7-8429-49f8-a719-b0cdd54bade4',
  email: 'example@test.com',
  passwordHash: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.USER,
  refreshToken: 'some_refresh_token',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockUserRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockUserQueryBuilder),
};

export const mockUserQueryBuilder = {
  alias: 'user',
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
  getOne: jest.fn().mockResolvedValue(mockUser),
};

export const mockUserService = {
  create: jest.fn(),
  findAll: jest.fn().mockResolvedValue({ items: [mockUser], totalCount: 1 }),
  findOneBy: jest.fn().mockImplementation((criteria) => {
    if (criteria.id === VALID_UUID) return Promise.resolve(mockUser);
    return Promise.resolve(null);
  }),
  updateBy: jest.fn().mockResolvedValue({ ...mockUser, firstName: 'Updated' }),
  deleteBy: jest.fn().mockResolvedValue({ affected: 1 }),
};
