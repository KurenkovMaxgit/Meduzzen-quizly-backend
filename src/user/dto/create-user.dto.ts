import { Length, IsEmail, IsEnum } from 'class-validator';
import { UserRole } from '../../utils/enums';

export class CreateUserDto {
  @Length(1, 250)
  firstName!: string;

  @Length(1, 250)
  lastName!: string;

  @Length(1, 255)
  @IsEmail()
  email!: string;

  @Length(1, 255)
  password!: string;

  @IsEnum(UserRole)
  role?: UserRole;
}
