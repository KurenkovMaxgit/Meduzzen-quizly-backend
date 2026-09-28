import { Exclude, Expose, Type } from 'class-transformer';
import { QuizQuestionType } from '../../../../utils/enums';
import { PublicReturnAnswerDto, PrivateReturnAnswerDto } from '../answer/return-answer.dto';

@Exclude()
export class PublicReturnQuestionDto {
  constructor(partial: Partial<PublicReturnQuestionDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  prompt!: string;

  @Expose()
  type!: QuizQuestionType;

  @Expose()
  @Type(() => PublicReturnAnswerDto)
  answers!: PublicReturnAnswerDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class PrivateReturnQuestionDto {
  constructor(partial: Partial<PrivateReturnQuestionDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  prompt!: string;

  @Expose()
  type!: QuizQuestionType;

  @Expose()
  @Type(() => PrivateReturnAnswerDto)
  answers!: PrivateReturnAnswerDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
