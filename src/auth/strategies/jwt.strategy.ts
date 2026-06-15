import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { UserService } from '../../user/user.service';
import { User } from '../../common/entities/user.entity';
import { JwtPayloadRequest } from '../interfaces/auth-request.interface';
import { Request } from 'express';
import { ACCESS_TOKEN_KEY } from '../constants/cookie.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService<AppConfiguration>,
    private readonly userService: UserService,
  ) {
    const jwtConfig = configService.get('jwt', { infer: true })!;
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.[ACCESS_TOKEN_KEY] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessTokenSecret!,
    };
    super(options);
  }

  async validate(payload: JwtPayloadRequest): Promise<User> {
    const user = await this.userService.findOneBy({ id: payload.user.sub });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
