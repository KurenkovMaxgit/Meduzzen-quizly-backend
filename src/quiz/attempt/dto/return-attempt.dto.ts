import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { ReturnUserDto } from '../../../user/dto/return-user.dto';
import { QuestionAttemptSnapshot } from '../../../common/interfaces/question-attempt-snapshot.interface';
import { PublicReturnQuizDto } from '../../dto/return-quiz.dto';

@Exclude()
export class ReturnAttemptDto {
  constructor(partial: Partial<ReturnAttemptDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  @Type(() => ReturnUserDto)
  user?: ReturnUserDto;

  @Expose()
  @Type(() => PublicReturnQuizDto)
  quiz?: PublicReturnQuizDto;

  @Expose()
  @Transform(({ obj }) => obj.quizTitleSnapshot)
  quizTitle!: string;

  @Expose()
  @Transform(({ value }) => Number(value) || 0)
  correctAnswersCount!: number;

  @Expose()
  totalQuestionsCount!: number;

  @Expose()
  userAnswers!: QuestionAttemptSnapshot[];

  @Expose()
  createdAt!: Date;
}
