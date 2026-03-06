import { Type } from 'class-transformer';
import { IsOptional, IsUUID, Length, IsString, IsEnum, IsDate, IsInt } from 'class-validator';
import { FindUserDto } from '../../../user/dto/find-user.dto';
import { FindCompanyDto } from '../../../company/dto/find-company.dto';
import { FilterDto } from '../../../common/dto/find-all-query.dto';
import { FindQuizDto } from '../../dto/find-quiz.dto';

export class FindAttemptDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Type(() => FindUserDto)
  user?: FindUserDto;

  @IsOptional()
  @Type(() => FindCompanyDto)
  company?: FindCompanyDto;

  @IsOptional()
  @Type(() => FindQuizDto)
  quiz?: FindQuizDto;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  quizTitleSnapshot?: string;

  @IsOptional()
  @IsInt()
  totalQuestionsCount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}

export class FindAllAttemptsDto extends FilterDto(FindAttemptDto) {}
