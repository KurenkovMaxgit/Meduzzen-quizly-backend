import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AttemptService } from './attempt.service';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../company/guards/company-role.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAttemptDto } from './dto/attempt/create-attempt.dto';
import { AllowedCompanyRoles } from '../common/decorators/company-roles.decorator';
import { CompanyRole } from '../utils/enums';
import { User } from '../common/entities/user.entity';

@ApiTags('Quiz Attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('attempt')
export class AttemptController {
  constructor(private readonly attemptService: AttemptService) {}

  @ApiOperation({ summary: 'Submit a quiz attempt.' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.MEMBER])
  @Post('company/:companyId/quiz/:quizId')
  async submitAttempt(
    @CurrentUser() user: User,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() data: CreateAttemptDto,
  ) {
    return this.attemptService.submitAttempt(user, companyId, quizId, data);
  }

  @ApiOperation({ summary: 'Get user average rating for a specific company.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.MEMBER])
  @Get('rating/company/:companyId')
  async getCompanyRating(
    @CurrentUser('id') userId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    const rating = await this.attemptService.getUserRating(userId, companyId);

    return { rating };
  }

  @ApiOperation({ summary: 'Get user overall system rating across all companies.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @Get('rating/overall')
  async getOverallRating(@CurrentUser('id') userId: string) {
    const rating = await this.attemptService.getUserRating(userId);

    return { rating };
  }
}
