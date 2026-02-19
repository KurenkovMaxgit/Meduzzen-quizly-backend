import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { FilterDto } from '../../common/dto/find-all-query.dto';
import { ActionStatus, ActionType } from '../../utils/enums';
import { FindUserDto } from '../../user/dto/find-user.dto';
import { FindCompanyDto } from '../../company/dto/find-company.dto';

export class FindActionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  createdBy?: FindUserDto;

  @IsOptional()
  subject?: FindUserDto;

  @IsOptional()
  company?: FindCompanyDto;

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsEnum(ActionType)
  type?: ActionType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}

export class FindAllActionsDto extends FilterDto(FindActionDto) {}
