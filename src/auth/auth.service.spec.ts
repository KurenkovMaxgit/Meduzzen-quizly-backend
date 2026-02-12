import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../common/entities/user.entity';
import { mockUser } from '../mock/user-tests.mock';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_token_string'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUserService = {
    create: jest.fn(),
    findOneBy: jest.fn(),
    updateBy: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key.includes('Secret')) return 'test_secret';
      if (key.includes('ExpiresIn')) return '1h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a user, generate tokens, and hash the refresh token', async () => {
      const dto = { email: 'new@example.com', password: 'pass', firstName: 'A', lastName: 'B' };
      const tokens = { accessToken: 'access', refreshToken: 'refresh' };

      mockUserService.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokens.accessToken)
        .mockResolvedValueOnce(tokens.refreshToken);
      mockUserService.updateBy.mockResolvedValue(undefined);

      const result = await service.register(dto);

      expect(userService.create).toHaveBeenCalledWith(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(tokens.refreshToken, 10);

      expect(userService.updateBy).toHaveBeenCalledWith(
        { id: mockUser.id },
        { refreshToken: 'hashed_token_string' },
      );

      expect(result).toEqual({ user: mockUser, tokens });
    });
  });

  describe('validateUserPassword', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUserService.findOneBy.mockResolvedValue(null);

      await expect(service.validateUserPassword('wrong@email.com', 'pass')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if password does not match', async () => {
      mockUserService.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(service.validateUserPassword(mockUser.email, 'wrongPass')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return user and tokens if password matches', async () => {
      mockUserService.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      mockJwtService.signAsync.mockResolvedValue('token');

      const result = await service.validateUserPassword(mockUser.email, 'correctPass');

      expect(userService.updateBy).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toBeDefined();
    });
  });

  describe('refreshLocalToken', () => {
    it('should throw UnauthorizedException if user from token not found', async () => {
      mockJwtService.decode.mockReturnValue({ user: { sub: 'unknown-id' } });
      mockUserService.findOneBy.mockResolvedValue(null);

      await expect(service.refreshLocalToken('refresh_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should rotate tokens and return new access token', async () => {
      mockJwtService.decode.mockReturnValue({ user: { sub: mockUser.id } });
      mockUserService.findOneBy.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      const result = await service.refreshLocalToken('refresh_token');

      expect(bcrypt.hash).toHaveBeenCalled();

      expect(userService.updateBy).toHaveBeenCalledWith(
        { id: mockUser.id },
        expect.objectContaining({ refreshToken: 'hashed_token_string' }),
      );

      expect(result).toEqual('new_access_token');
    });
  });

  describe('logout', () => {
    it('should set refresh token to null', async () => {
      await service.logout(mockUser.id);

      expect(userService.updateBy).toHaveBeenCalledWith(
        { id: mockUser.id },
        { refreshToken: null },
      );
    });
  });

  describe('validateOrCreateUserByEmail', () => {
    it('should return existing user if found', async () => {
      mockUserService.findOneBy.mockResolvedValue(mockUser);

      const result = await service.validateOrCreateUserByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      mockUserService.findOneBy.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await service.validateOrCreateUserByEmail('new@email.com');

      expect(userService.create).toHaveBeenCalledWith({
        email: 'new@email.com',
        firstName: 'Quizzes',
        lastName: 'Enjoyer',
      });
      expect(result).toEqual(mockUser);
    });
  });
});
