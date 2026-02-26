import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class QuizTimeDynamicsDto {
  @Expose()
  quizId!: string;

  @Expose()
  quizTitle!: string;

  @Expose()
  @Transform(({ value }) => new Date(value))
  date!: Date;

  @Expose()
  @Transform(({ value }) => parseFloat(value) || 0)
  averageScore!: number;
}
