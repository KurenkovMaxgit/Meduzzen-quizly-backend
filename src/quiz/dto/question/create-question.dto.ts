import { ArrayMinSize, IsEnum, IsString, Length, ValidateNested } from 'class-validator';
import { QuizQuestionType } from '../../../utils/enums';
import { CreateAnswerDto } from '../answer/create-answer.dto';
import { Type } from 'class-transformer';

export class CreateQuestionDto {
  @Length(1, 500)
  @IsString()
  prompt!: string;

  @IsEnum(QuizQuestionType)
  type!: QuizQuestionType;

  @ArrayMinSize(2, { message: 'Each question must have at least 2 answer options' })
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers!: CreateAnswerDto[];
}
