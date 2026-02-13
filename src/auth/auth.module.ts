import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { PassportModule } from '@nestjs/passport';
import { Auth0Strategy } from './strategies/auth0.strategy';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [UserModule, PassportModule, JwtModule.registerAsync({ useFactory: () => ({}) })],
  controllers: [AuthController],
  providers: [AuthService, Auth0Strategy, JwtStrategy],
})
export class AuthModule {}
