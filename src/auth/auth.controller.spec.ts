import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import { REFRESH_TOKEN_KEY, BASE_COOKIE_OPTIONS } from './constants/cookie.constants';
import { ReturnUserDto } from '../user/dto/return-user.dto';
import { mockUser } from '../mock/user-tests.mock';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

  // 1. Define Mocks
  const mockAuthService = {
    register: jest.fn(),
    validateUserPassword: jest.fn(),
    refreshLocalToken: jest.fn(),
    logout: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'nodeEnv') return 'development';
      return null;
    }),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  const mockTokens = {
    accessToken: 'access_token_xyz',
    refreshToken: 'refresh_token_abc',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should register a new user and set refresh token cookie', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.register.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.signup(dto, mockResponse);

      expect(authService.register).toHaveBeenCalledWith(dto);

      expect(mockResponse.cookie).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, mockTokens.refreshToken, {
        ...BASE_COOKIE_OPTIONS,
        secure: false,
      });

      expect(result).toEqual({
        user: new ReturnUserDto(mockUser),
        accessToken: mockTokens.accessToken,
      });
    });
  });

  describe('login', () => {
    it('should login user and set refresh token cookie', async () => {
      const dto = { email: 'test@example.com', password: 'password' };

      mockAuthService.validateUserPassword.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const result = await controller.login(dto, mockResponse);

      expect(authService.validateUserPassword).toHaveBeenCalledWith(dto.email, dto.password);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        REFRESH_TOKEN_KEY,
        mockTokens.refreshToken,
        expect.objectContaining({ httpOnly: true }),
      );

      expect(result).toEqual({
        user: new ReturnUserDto(mockUser),
        accessToken: mockTokens.accessToken,
      });
    });
  });

  describe('refresh', () => {
    it('should return new tokens if refresh token exists', async () => {
      const mockRequest = {
        cookies: { [REFRESH_TOKEN_KEY]: 'old_refresh_token' },
      } as unknown as Request;

      const expectedResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      };
      mockAuthService.refreshLocalToken.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(mockRequest);

      expect(authService.refreshLocalToken).toHaveBeenCalledWith('old_refresh_token');
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException if refresh token is missing', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      await expect(controller.refresh(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should call logout service and clear cookie', async () => {
      const userId = 'uuid-123';

      await controller.logout(userId, mockResponse);

      expect(authService.logout).toHaveBeenCalledWith(userId);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, {
        ...BASE_COOKIE_OPTIONS,
        secure: false,
      });
    });
  });
});
