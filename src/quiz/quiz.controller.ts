import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CompanyRolesGuard } from '../company/guards/company-role.guard';
import { QuizService } from './quiz.service';
import { AllowedCompanyRoles } from '../common/decorators/company-roles.decorator';
import { plainToInstance } from 'class-transformer';
import { FindOneQueryDto } from '../common/dto/find-one-query.dto';
import { CompanyRole } from '../utils/enums';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { FindAllQuizzesDto } from './dto/find-quiz.dto';
import { PrivateReturnQuizDto, PublicReturnQuizDto } from './dto/return-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@ApiTags('Quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @ApiOperation({ summary: 'Creates quiz for authenticated company owner/admin.' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Post('company/:companyId')
  async create(@Param('companyId', ParseUUIDPipe) companyId: string, @Body() data: CreateQuizDto) {
    const quiz = await this.quizService.create(companyId, data);
    return new PrivateReturnQuizDto(quiz);
  }

  @ApiOperation({ summary: 'Get all quizzes by query parameters.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get('company/:companyId/list')
  async findAll(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: FindAllQuizzesDto,
  ) {
    const { items, totalCount } = await this.quizService.findAll(companyId, query);

    return {
      items: plainToInstance(PrivateReturnQuizDto, items),
      totalCount,
    };
  }

  @ApiOperation({ summary: 'Get private quiz by id.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Get(':id/company/:companyId/private')
  async findOnePrivateById(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: FindOneQueryDto,
  ) {
    const quiz = await this.quizService.findOneBy(
      { id, company: { id: companyId } },
      { relations: query.relations },
    );
    return quiz ? new PrivateReturnQuizDto(quiz) : null;
  }

  @ApiOperation({ summary: 'Get public quiz by id.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN, CompanyRole.MEMBER])
  @Get(':id/company/:companyId/public')
  async findOnePublicById(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: FindOneQueryDto,
  ) {
    const quiz = await this.quizService.findOneBy(
      { id, company: { id: companyId } },
      { relations: query.relations },
    );
    return quiz ? new PublicReturnQuizDto(quiz) : null;
  }

  @ApiOperation({ summary: 'Updates quiz by id & company.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Put(':id/company/:companyId')
  async updateOneById(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() data: UpdateQuizDto,
  ) {
    const updated = await this.quizService.updateBy({ id, company: { id: companyId } }, data);
    return new PrivateReturnQuizDto(updated);
  }

  @ApiOperation({ summary: 'Deletes quiz by id & company.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles([CompanyRole.OWNER, CompanyRole.ADMIN])
  @Delete(':id/company/:companyId')
  async deleteOneById(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
  ) {
    return await this.quizService.deleteBy({ id, company: { id: companyId } });
  }
}
