import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class CompanyUserLastCompletionDto {
  @Expose()
  userId!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  quizId!: string;

  @Expose()
  quizTitle!: string;

  @Expose()
  @Transform(({ value }) => new Date(value))
  lastCompletionTime!: Date;
}
