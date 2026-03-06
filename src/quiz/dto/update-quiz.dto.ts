import { OmitType } from '@nestjs/mapped-types';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuizDto } from './create-quiz.dto';
import { UpdateQuestionDto } from '../question/dto/question/update-question.dto';

export class UpdateQuizDto extends OmitType(CreateQuizDto, ['questions'] as const) {
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionDto)
  questions!: UpdateQuestionDto[];
}
