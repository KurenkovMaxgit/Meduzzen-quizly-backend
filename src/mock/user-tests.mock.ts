export const mockUserRepository = {
  save: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const mockUser = {
  id: 'uuid-example',
  email: 'example@test.com',
  passwordHash: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  refreshToken: 'some_refresh_token',
  createdAt: new Date(),
  updatedAt: new Date(),
};
