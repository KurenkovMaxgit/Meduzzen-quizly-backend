import { IsString, IsEnum, Length } from 'class-validator';
import { AnswerCorrectness } from '../../../../utils/enums';

export class CreateAnswerDto {
  @Length(1, 250)
  @IsString()
  content!: string;

  @IsEnum(AnswerCorrectness)
  correctness!: AnswerCorrectness;
}
