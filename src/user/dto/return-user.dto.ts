import { Length, IsEmail, IsEnum, IsUUID, IsDate } from 'class-validator';
import { UserRole } from '../../utils/enums';

export class ReturnUserDto {
  @IsUUID()
  id!: string;

  @Length(1, 250)
  firstName!: string;

  @Length(1, 250)
  lastName!: string;

  @Length(1, 255)
  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsDate()
  createdAt!: Date;

  @IsDate()
  updatedAt!: Date;
}
