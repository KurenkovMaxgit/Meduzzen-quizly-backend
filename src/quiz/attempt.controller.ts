import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
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
import { ReturnAttemptDto } from './dto/attempt/return-attempt.dto';
import { plainToInstance } from 'class-transformer';
import { FindAllAttemptsDto } from './dto/attempt/find-attempt.dto';
import type { Response } from 'express';

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

  @ApiOperation({ summary: 'Get all attempts by query parameters.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/list')
  async findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: FindAllAttemptsDto,
  ) {
    const { items, totalCount } = await this.attemptService.findAll(companyId, query);

    return {
      items: plainToInstance(ReturnAttemptDto, items),
      totalCount,
    };
  }

  @ApiOperation({ summary: 'Get a specific quiz attempt.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.MEMBER])
  @Get(':attemptId/company/:companyId')
  async getSingleAttempt(
    @CurrentUser('id') userId: string,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return this.attemptService.findOneBy({
      id: attemptId,
      user: { id: userId },
      company: { id: companyId },
    });
  }

  @ApiOperation({ summary: 'Export quiz attempts as a CSV file.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/quiz/:quizId/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="quiz-attempts.csv"')
  async exportAttemptsCsv(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Res() res: Response,
  ) {
    const csvBuffer = await this.attemptService.exportAttemptsToCsv(companyId, quizId);

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="quiz-attempts.csv"',
    });

    res.send(csvBuffer);
  }
}
