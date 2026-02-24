import { Exclude, Expose, Type } from 'class-transformer';
import { PrivateReturnQuestionDto, PublicReturnQuestionDto } from '../question/return-question.dto';

@Exclude()
export class PublicReturnQuizDto {
  constructor(partial: Partial<PublicReturnQuizDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  title?: string;

  @Expose()
  description?: string;

  @Expose()
  @Type(() => PublicReturnQuestionDto)
  questions?: PublicReturnQuestionDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}

@Exclude()
export class PrivateReturnQuizDto {
  constructor(partial: Partial<PrivateReturnQuizDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  title?: string;

  @Expose()
  description?: string;

  @Expose()
  @Type(() => PrivateReturnQuestionDto)
  questions?: PrivateReturnQuestionDto[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
