import {
  Controller,
  Body,
  Post,
  ClassSerializerInterceptor,
  UseInterceptors,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ReturnUserDto } from '../user/dto/return-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/auth-jwt.guard';
import { ConfigService } from '@nestjs/config';
import { REFRESH_TOKEN_KEY, BASE_COOKIE_OPTIONS } from './constants/cookie.constants';
import { AppConfiguration } from '../config/configuration';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfiguration>,
  ) {
    this.isProduction = this.configService.get('nodeEnv', { infer: true }) === 'production';
  }

  @ApiOperation({
    summary: 'Create new user',
    description:
      'Creates a new user with payload passed in body.\n\
    \n**_NOTE:_** All users must have unique emails.',
  })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 409, description: 'Database conflict: Duplicate entry.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('signup')
  async signup(@Body() data: CreateUserDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.register(data);
    this.setCookie(res, tokens.refreshToken);
    return {
      user: new ReturnUserDto(user),
      accessToken: tokens.accessToken,
    };
  }

  @ApiOperation({ summary: 'Login user' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('login')
  async login(
    @Body() data: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.validateUserPassword(data.email, data.password);
    this.setCookie(res, tokens.refreshToken);
    return { user: new ReturnUserDto(user), accessToken: tokens.accessToken };
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies[REFRESH_TOKEN_KEY] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    return await this.authService.refreshLocalToken(refreshToken);
  }

  @ApiOperation({ summary: 'Logout user' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser('id') id: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(id);
    res.clearCookie(REFRESH_TOKEN_KEY, { ...BASE_COOKIE_OPTIONS, secure: this.isProduction });
    return { message: 'Logged out successfully' };
  }

  /**
   * Centralized place to manage cookie security policies.
   */
  private setCookie(res: Response, token: string) {
    res.cookie(REFRESH_TOKEN_KEY, token, {
      ...BASE_COOKIE_OPTIONS,
      secure: this.isProduction,
    });
  }
}
