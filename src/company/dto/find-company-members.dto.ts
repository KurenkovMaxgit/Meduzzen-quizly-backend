import { IsOptional, IsEnum } from 'class-validator';
import { FindUserDto } from '../../user/dto/find-user.dto';
import { CompanyRole } from '../../utils/enums';
import { FindCompanyDto } from './find-company.dto';

export class FindCompanyMembersFilterDto {
  @IsOptional()
  @IsEnum(CompanyRole)
  role?: CompanyRole;

  @IsOptional()
  user?: FindUserDto;

  @IsOptional()
  company?: FindCompanyDto;
}
