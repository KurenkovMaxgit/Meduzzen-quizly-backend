import { Length, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { NotificationStatus, NotificationType } from '../../utils/enums';
import { FindUserDto } from '../../user/dto/find-user.dto';
import { Type } from 'class-transformer';
import { FindCompanyDto } from '../../company/dto/find-company.dto';
import { FilterDto } from '../../common/dto/find-all-query.dto';

export class FindNotificationDto {
  @IsOptional()
  @Type(() => FindUserDto)
  user?: FindUserDto;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Type(() => FindCompanyDto)
  company?: FindCompanyDto;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @Length(1, 500)
  @IsString()
  text?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}

export class FindAllNotificationsDto extends FilterDto(FindNotificationDto) {}
