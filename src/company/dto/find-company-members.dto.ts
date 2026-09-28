import { IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FindUserDto } from '../../user/dto/find-user.dto';
import { CompanyRole } from '../../utils/enums';
import { FindCompanyDto } from './find-company.dto';
import { FilterDto } from '../../common/dto/find-all-query.dto';

export class FindCompanyMembersDto {
  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => FindUserDto)
  user?: FindUserDto;

  @ValidateNested()
  @Type(() => FindCompanyDto)
  company?: FindCompanyDto;
}

export class FindAllMembersDto extends FilterDto(FindCompanyMembersDto) {}
