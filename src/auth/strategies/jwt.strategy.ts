import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../config/configuration';
import { UserService } from '../../user/user.service';
import { JwtPayload } from '../interfaces/auth-payload.interface';
import { User } from '../../common/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService<AppConfiguration>,
    private readonly userService: UserService,
  ) {
    const jwtConfig = configService.get('jwt', { infer: true })!;
    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessTokenSecret!,
    };
    super(options);
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userService.findOneBy({ id: payload.sub });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
