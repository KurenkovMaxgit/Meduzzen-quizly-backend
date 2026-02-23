import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/auth-jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FindAllCompaniesDto } from './dto/find-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ReturnCompanyDto } from './dto/return-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { AllowedCompanyRoles } from '../common/decorators/company-roles.decorator';
import { CompanyRolesGuard } from './guards/company-role.guard';
import { FindOneQueryDto } from '../common/dto/find-one-query.dto';
import { ParseUUIDArrayPipe } from '../common/pipes/parse-uuid-array.pipe';
import { CompanyRole } from '../utils/enums';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyRolesGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Creates company for authenticated user' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post()
  async create(@CurrentUser('id') userId: string, @Body() data: CreateCompanyDto) {
    const company = await this.companyService.create(userId, data);
    return new ReturnCompanyDto(company);
  }

  @ApiOperation({ summary: 'Get all companies by query parameters' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('list')
  async findAll(@Query() query: FindAllCompaniesDto) {
    return await this.companyService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one company by id' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':companyId')
  async findOneById(
    @Param('companyId', ParseUUIDPipe) id: string,
    @Query() query: FindOneQueryDto,
  ) {
    const company = await this.companyService.findOneBy({ id }, { relations: query.relations });
    return company ? new ReturnCompanyDto(company) : company;
  }

  @ApiOperation({ summary: 'Updates company by id' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @AllowedCompanyRoles(['owner', 'admin'])
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch(':companyId')
  async updateOneById(
    @Param('companyId', ParseUUIDPipe) id: string,
    @Body() data: UpdateCompanyDto,
  ) {
    const updated = await this.companyService.updateBy({ id }, data);
    return new ReturnCompanyDto(updated);
  }

  @ApiOperation({ summary: 'Deletes company by id.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @AllowedCompanyRoles(['owner', 'admin'])
  @Delete(':companyId')
  async deleteOneById(@Param('companyId', ParseUUIDPipe) id: string) {
    return await this.companyService.deleteBy({ id });
  }

  @ApiOperation({ summary: 'Updates users roles from company by their ids.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles(['owner'])
  @Patch(':companyId/users/:newRole')
  async updateRoles(
    @Param('companyId', ParseUUIDPipe) id: string,
    @Param('newRole', new ParseEnumPipe(CompanyRole)) newRole: CompanyRole,
    @Body('userIds', ParseUUIDArrayPipe) userIds: string[],
  ) {
    return this.companyService.updateCompanyUsersRole(id, userIds, newRole);
  }

  @ApiOperation({ summary: 'Updates existing member role to "owner".' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles(['owner'])
  @Patch(':companyId/add/owner/:userId')
  async addNewOwner(
    @Param('companyId', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.companyService.addNewCompanyOwner(id, userId);
  }

  @ApiOperation({ summary: 'Deletes authenticated user from company by its id.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @Delete('leave/:companyId')
  async leaveCompany(
    @Param('companyId', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.companyService.deleteCompanyUsers(id, [userId]);
  }

  @ApiOperation({ summary: 'Deletes user from company by its id.' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @AllowedCompanyRoles(['owner'])
  @Delete(':companyId/users')
  async kickUsers(
    @Param('companyId', ParseUUIDPipe) id: string,
    @Body('userIds', ParseUUIDArrayPipe) userIds: string[],
  ) {
    return this.companyService.deleteCompanyUsers(id, userIds);
  }
}
