import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../config/configuration';
import { JwtPayloadRequest } from './interfaces/auth-request.interface';
import { User } from '../common/entities/user.entity';
import { INVALID_CREDENTIALS } from './constants/auth.constants';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class AuthService {
  private jwksClient: JwksClient;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration>,
  ) {
    const issuerUrl = this.configService.get('auth0.issuerUrl', { infer: true });

    if (!issuerUrl) {
      throw new Error('Auth0 Issuer URL is not defined in configuration');
    }

    const domain = new URL(issuerUrl).hostname;

    this.jwksClient = new JwksClient({
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }

  async register(data: CreateUserDto) {
    const user = await this.userService.create(data);
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async validateOrCreateUserByEmail(email: string): Promise<User> {
    const user = await this.userService.findOneBy({ email });

    return (
      user ??
      (await this.userService.create({
        email,
        firstName: 'Quizzes',
        lastName: 'Enjoyer',
      }))
    );
  }

  async validateUserPassword(email: string, password: string) {
    const user = await this.userService.findOneBy(
      { email },
      {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: true,
        },
      },
    );

    if (!user) {
      throw new NotFoundException(INVALID_CREDENTIALS);
    }

    if (!user.passwordHash) {
      throw new BadRequestException('User does not have a password set (use OAuth)');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new BadRequestException(INVALID_CREDENTIALS);
    }

    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async refreshLocalToken(refreshToken: string) {
    const decoded: JwtPayloadRequest = this.jwtService.decode(refreshToken);
    const user = await this.userService.findOneBy({ id: decoded.user.sub });
    if (!user) {
      throw new UnauthorizedException();
    }
    const tokens = await this.getTokens(user.id, user.email);
    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);
    return this.getTokens(user.id, user.email);
  }

  async logout(id: string): Promise<void> {
    await this.userService.updateBy({ id }, { refreshToken: null });
  }

  private async updateRefreshTokenHash(id: string, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateBy({ id }, { refreshToken: hashedRefreshToken });
  }

  private async getTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { user: { sub: userId, email } };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.accessTokenSecret', { infer: true })!,
        expiresIn: this.configService.get('jwt.accessTokenExpiresIn', { infer: true })!,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshTokenSecret', { infer: true })!,
        expiresIn: this.configService.get('jwt.refreshTokenExpiresIn', { infer: true })!,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async verifyWebsocketToken(token: string): Promise<string> {
    const decoded = this.jwtService.decode(token, { complete: true });
    if (!decoded || !decoded.header) throw new UnauthorizedException();

    if (decoded.payload.iss?.includes('auth0.com')) {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid as string);
      const publicKey = key.getPublicKey();

      const verified = this.jwtService.verify(token, { publicKey });

      const email = verified.email || verified['https://quizly.com/email'];
      const user = await this.userService.findOneBy({ email });

      if (!user) {
        throw new NotFoundException(INVALID_CREDENTIALS);
      }

      return user.id;
    }

    return this.jwtService.verify(token, {
      secret: this.configService.get('jwt.accessTokenSecret', { infer: true }),
    }).user.sub;
  }
}
