import { ExecutionContext } from '@nestjs/common';
import { mockUser } from './user-tests.mock';

export const mockTokens = {
  accessToken: 'mock_access_token',
  refreshToken: 'mock_refresh_token',
};

export const mockJwtService = {
  signAsync: jest.fn(),
  decode: jest.fn(),
  verify: jest.fn(),
};

export const mockAuthService = {
  register: jest.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  validateUserPassword: jest.fn().mockResolvedValue({ user: mockUser, tokens: mockTokens }),
  refreshLocalToken: jest.fn().mockResolvedValue({ accessToken: 'new_access_token' }),
  logout: jest.fn().mockResolvedValue(undefined),
};

export const mockJwtAuthGuard = {
  canActivate: (context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = mockUser;
    return true;
  },
};

export const mockCompanyRolesGuard = {
  canActivate: () => true,
};
