import { Exclude, Expose } from 'class-transformer';
import { AnswerCorrectness } from '../../../../utils/enums';

@Exclude()
export class PublicReturnAnswerDto {
  constructor(partial: Partial<PublicReturnAnswerDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  content!: string;

  correctness!: AnswerCorrectness;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class PrivateReturnAnswerDto {
  constructor(partial: Partial<PrivateReturnAnswerDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  content!: string;

  @Expose()
  correctness?: AnswerCorrectness;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
