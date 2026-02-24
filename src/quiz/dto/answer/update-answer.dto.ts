import { IsOptional, IsUUID } from 'class-validator';
import { CreateAnswerDto } from './create-answer.dto';

export class UpdateAnswerDto extends CreateAnswerDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}
