import { Type } from 'class-transformer';
import { IsOptional, IsUUID, Length, IsString, IsDate, ValidateNested } from 'class-validator';
import { FindQuestionDto } from '../question/find-question.dto';
import { FilterDto } from '../../../common/dto/find-all-query.dto';
import { FindCompanyDto } from '../../../company/dto/find-company.dto';

export class FindQuizDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  title?: string;

  @IsOptional()
  @Length(1, 1000)
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FindQuestionDto)
  questions?: FindQuestionDto;

  @ValidateNested({ each: true })
  @Type(() => FindCompanyDto)
  company?: FindCompanyDto;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}

export class FindAllQuizzesDto extends FilterDto(FindQuizDto) {}
