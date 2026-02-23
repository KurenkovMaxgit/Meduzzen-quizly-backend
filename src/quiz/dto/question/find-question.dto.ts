import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  Length,
  IsString,
  IsDate,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { QuizQuestionType } from '../../../utils/enums';
import { FindAnswerDto } from '../answer/find-answer.dto';

export class FindQuestionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Length(1, 500)
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsEnum(QuizQuestionType)
  type?: QuizQuestionType;

  @IsOptional()
  @ValidateNested()
  @Type(() => FindAnswerDto)
  answers?: FindAnswerDto;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}
