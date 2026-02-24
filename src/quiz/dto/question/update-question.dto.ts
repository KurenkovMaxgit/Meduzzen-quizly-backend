import { OmitType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional, IsUUID, ArrayMinSize, ValidateNested } from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';
import { UpdateAnswerDto } from '../answer/update-answer.dto';

export class UpdateQuestionDto extends OmitType(CreateQuestionDto, ['answers'] as const) {
  @IsOptional()
  @IsUUID()
  id?: string;

  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => UpdateAnswerDto)
  answers!: UpdateAnswerDto[];
}
