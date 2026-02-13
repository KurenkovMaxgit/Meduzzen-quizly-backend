export const mockUserRepository = {
  save: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  findOneBy: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

export const mockUser = {
  id: 'f77314d7-8429-49f8-a719-b0cdd54bade4',
  email: 'example@test.com',
  passwordHash: 'hashed_password',
  firstName: 'John',
  lastName: 'Doe',
  refreshToken: 'some_refresh_token',
  createdAt: new Date(),
  updatedAt: new Date(),
};
