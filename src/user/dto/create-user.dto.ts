import { Length, IsEmail, IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @Length(1, 250)
  @IsString()
  firstName!: string;

  @Length(1, 250)
  @IsString()
  lastName!: string;

  @Length(1, 255)
  @IsEmail()
  email!: string;

  @IsOptional()
  @Length(8, 255)
  @IsString()
  password?: string;
}
