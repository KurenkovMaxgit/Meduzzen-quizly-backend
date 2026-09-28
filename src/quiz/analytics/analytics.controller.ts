import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AllowedCompanyRoles } from '../../common/decorators/company-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CompanyRole } from '../../utils/enums';
import { JwtAuthGuard } from '../../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../../company/guards/company-role.guard';
import { plainToInstance } from 'class-transformer';
import { CompanyScoresDynamicsDto } from './dto/company-scores-dynamics.dto';
import { CompanyUserLastCompletionDto } from './dto/company-user-last-compeletion.dto';
import { QuizLastCompletionDto } from './dto/quiz-last-compeletion.dto';
import { QuizTimeDynamicsDto } from './dto/quiz-time-dynamics.dto';

@ApiTags('Quiz Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get user overall system rating.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('personal/rating')
  async getPersonalRating(@CurrentUser('id') userId: string) {
    const rating = await this.analyticsService.getUserAverageQuestionPerformance(userId);
    return { rating };
  }

  @ApiOperation({ summary: 'Get user overall average score across all quizzes.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('personal/average-score')
  async getPersonalAverageScore(@CurrentUser('id') userId: string) {
    const averageScore = await this.analyticsService.getUserAverageQuizPerformance(userId);
    return { averageScore };
  }

  @ApiOperation({ summary: 'Get user scores with time dynamics.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('personal/scores-dynamics')
  async getPersonalScoresDynamics(@CurrentUser('id') userId: string) {
    const rawData = await this.analyticsService.getUserScoresWithTimeDynamics(userId);
    return plainToInstance(QuizTimeDynamicsDto, rawData);
  }

  @ApiOperation({ summary: 'Get user list of quizzes and last completion times.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @Get('personal/last-completions')
  async getPersonalLastCompletions(@CurrentUser('id') userId: string) {
    const rawData = await this.analyticsService.getUserLastCompletions(userId);
    return plainToInstance(QuizLastCompletionDto, rawData);
  }

  @ApiOperation({ summary: 'Get average scores for all company users with time dynamics.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/scores-dynamics')
  async getCompanyScoresDynamics(@Param('companyId', ParseUUIDPipe) companyId: string) {
    const rawData = await this.analyticsService.getCompanyScoresWithTimeDynamics(companyId);
    return plainToInstance(CompanyScoresDynamicsDto, rawData);
  }

  @ApiOperation({ summary: 'Get average scores for a specific user within a company.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/user/:userId/scores-dynamics')
  async getCompanyUserScoresDynamics(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    const rawData = await this.analyticsService.getUserScoresWithTimeDynamics(userId, companyId);
    return plainToInstance(QuizTimeDynamicsDto, rawData);
  }

  @ApiOperation({ summary: 'Get list of company users and their last completion times.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/users-last-completions')
  async getCompanyUsersLastCompletions(@Param('companyId', ParseUUIDPipe) companyId: string) {
    const rawData = await this.analyticsService.getCompanyUsersLastCompletions(companyId);
    return plainToInstance(CompanyUserLastCompletionDto, rawData);
  }
}
