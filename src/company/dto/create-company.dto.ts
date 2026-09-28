import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { CompanyStatus } from '../../utils/enums';

export class CreateCompanyDto {
  @Length(1, 250)
  @IsString()
  name!: string;

  @Length(1, 3000)
  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
