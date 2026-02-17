import {
  Length,
  IsEmail,
  IsEnum,
  IsUUID,
  IsString,
  IsOptional,
  IsDate,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../../utils/enums';
import { Type } from 'class-transformer';
import { FilterDto } from '../../common/dto/find-all-query.dto';
import { FindCompanyMembersFilterDto } from '../../company/dto/find-company-members.dto';

export class FindUserDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  firstName?: string;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  lastName?: string;

  @IsOptional()
  @Length(1, 255)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => FindCompanyMembersFilterDto)
  memberships?: FindCompanyMembersFilterDto;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}

export class FindAllUsersDto extends FilterDto(FindUserDto) {}
