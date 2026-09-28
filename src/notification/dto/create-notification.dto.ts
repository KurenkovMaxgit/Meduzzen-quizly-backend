import { Length, IsString, IsOptional, IsEnum, IsUUID, IsObject } from 'class-validator';
import { NotificationStatus, NotificationType } from '../../utils/enums';

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  companyId!: string;

  @Length(1, 500)
  @IsString()
  text!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsEnum(NotificationType)
  type!: NotificationType;

  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
