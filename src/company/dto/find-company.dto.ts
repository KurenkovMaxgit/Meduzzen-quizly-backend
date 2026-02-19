import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';
import { FilterDto } from '../../common/dto/find-all-query.dto';
import { CompanyStatus } from '../../utils/enums';
import { FindCompanyMembersDto } from './find-company-members.dto';

export class FindCompanyDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  name?: string;

  @IsOptional()
  @Length(1, 3000)
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => FindCompanyMembersDto)
  members?: FindCompanyMembersDto;

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
