import { OmitType } from '@nestjs/mapped-types';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuestionDto } from '../question/update-question.dto';
import { CreateQuizDto } from './create-quiz.dto';

export class UpdateQuizDto extends OmitType(CreateQuizDto, ['questions'] as const) {
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionDto)
  questions!: UpdateQuestionDto[];
}
