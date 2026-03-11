import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class QuizLastCompletionDto {
  @Expose()
  quizId!: string;

  @Expose()
  quizTitle!: string;

  @Expose()
  @Transform(({ value }) => new Date(value as string | number))
  lastCompletionTime!: Date;
}
