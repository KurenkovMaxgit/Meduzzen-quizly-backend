import { ArrayMinSize, IsInt, IsString, Length, Min, ValidateNested } from 'class-validator';
import { CreateQuestionDto } from '../question/create-question.dto';
import { Type } from 'class-transformer';

export class CreateQuizDto {
  @Length(1, 250)
  @IsString()
  title!: string;

  @Length(1, 1000)
  @IsString()
  description!: string;

  @IsInt()
  @Min(0)
  completionFrequency!: number;

  @ArrayMinSize(2, { message: 'A quiz must contain at least 2 questions' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
