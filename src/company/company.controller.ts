import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
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

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @ApiOperation({ summary: 'Creates company for authenticated user' })
  @ApiResponse({ status: 201, description: 'Created.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Post()
  async create(@CurrentUser('id') userId: string, @Body() data: CreateCompanyDto) {
    const company = await this.companyService.create(userId, data);
    return new ReturnCompanyDto(company);
  }

  @ApiOperation({ summary: 'Get all companies by query parameters' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  async findAll(@Query() query: FindAllCompaniesDto) {
    return await this.companyService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one company by id' })
  @ApiResponse({ status: 200, description: 'Success.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id')
  async findOneById(@Param('id', ParseUUIDPipe) id: string) {
    const company = await this.companyService.findOneBy({ id });
    return company ? new ReturnCompanyDto(company) : company;
  }

  @ApiOperation({ summary: 'Get one company with all members by id' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get(':id/members')
  async findOneByIdWithMembers(@Param('id', ParseUUIDPipe) id: string) {
    const company = await this.companyService.findOneBy(
      { id },
      { relations: { members: { user: true } } },
    );
    return company ? new ReturnCompanyDto(company) : company;
  }

  @ApiOperation({ summary: 'Updates company by id' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Patch(':id')
  async updateOneById(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateCompanyDto) {
    const updated = await this.companyService.updateBy({ id }, data);
    return new ReturnCompanyDto(updated);
  }

  @ApiOperation({ summary: 'Deletes company by id.' })
  @Delete(':id')
  async deleteOneById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.companyService.deleteBy({ id });
  }
}
