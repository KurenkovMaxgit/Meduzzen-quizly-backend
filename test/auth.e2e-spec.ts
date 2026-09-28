import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../src/auth/guards/auth-jwt.guard';
import { REFRESH_TOKEN_KEY } from '../src/auth/constants/cookie.constants';
import { mockUser } from '../src/mock/user-tests.mock';
import { mockAuthService, mockJwtAuthGuard, mockTokens } from '../src/mock/auth-tests.mock';
import { mockConfigService } from '../src/mock/common-tests.mock';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  const baseUrl = `/auth`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    authService = moduleFixture.get<AuthService>(AuthService);
    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should register user and set refresh token cookie', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const res = await request(app.getHttpServer())
        .post(`${baseUrl}/signup`)
        .send(signupDto)
        .expect(201);

      expect(res.body.user.email).toBe(mockUser.email);
      expect(res.body.accessToken).toBe(mockTokens.accessToken);

      const cookies = res.get('Set-Cookie');
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes(REFRESH_TOKEN_KEY))).toBe(true);
      expect(authService.register).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('POST /auth/login', () => {
    it('should login user and set refresh token cookie', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };

      const res = await request(app.getHttpServer())
        .post(`${baseUrl}/login`)
        .send(loginDto)
        .expect(201);

      expect(res.body.accessToken).toBe(mockTokens.accessToken);

      const cookies = res.get('Set-Cookie');
      expect(cookies).toBeDefined();
      expect(cookies?.some((c) => c.includes(REFRESH_TOKEN_KEY))).toBe(true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens if valid refresh cookie is sent', async () => {
      const cookieValue = `${REFRESH_TOKEN_KEY}=${mockTokens.refreshToken}`;

      const res = await request(app.getHttpServer())
        .post(`${baseUrl}/refresh`)
        .set('Cookie', [cookieValue])
        .expect(201);

      expect(res.body).toEqual({ accessToken: 'new_access_token' });

      expect(authService.refreshLocalToken).toHaveBeenCalledWith(mockTokens.refreshToken);
    });

    it('should throw 401 if cookie is missing', () => {
      return request(app.getHttpServer()).post(`${baseUrl}/refresh`).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear the refresh token cookie', async () => {
      const res = await request(app.getHttpServer()).post(`${baseUrl}/logout`).expect(201);

      const cookies = res.get('Set-Cookie');
      const refreshCookie = cookies?.find((c) => c.includes(REFRESH_TOKEN_KEY));

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/Expires=|Max-Age=0|;/);

      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
