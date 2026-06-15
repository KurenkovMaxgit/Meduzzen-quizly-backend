import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { passportJwtSecret } from 'jwks-rsa';
import { AuthService } from '../auth.service';
import { User } from '../../common/entities/user.entity';
import { ACCESS_TOKEN_KEY } from '../constants/cookie.constants';
import { Request } from 'express';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(
    private readonly configService: ConfigService<AppConfiguration>,
    private readonly authService: AuthService,
  ) {
    const auth0Config = configService.get('auth0', { infer: true })!;
    const options: StrategyOptions = {
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${auth0Config.issuerUrl!}.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.[ACCESS_TOKEN_KEY] || null;
        },
      ]),
      ignoreExpiration: false,
      audience: auth0Config.audience,
      issuer: auth0Config.issuerUrl,
    };
    super(options);
  }

  validate(payload: { 'https://quizly.com/email': string }): Promise<User> {
    return this.authService.validateOrCreateUserByEmail(payload['https://quizly.com/email']);
  }
}
