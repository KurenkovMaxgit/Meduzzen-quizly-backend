import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FilterDto } from '../../common/dto/find-all-query.dto';
import { CompanyStatus } from '../../utils/enums';
import { CompanyUser } from '../../common/entities/company-user.entity';

export class FindCompanyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  members?: Partial<CompanyUser>;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}

export class FindAllCompaniesDto extends FilterDto(FindCompanyDto) {}
