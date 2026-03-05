import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Quiz } from './quiz.entity';
import { Company } from './company.entity';
import { BaseEntity } from './base.entity';
import { QuestionAttemptSnapshot } from '../interfaces/question-attempt-snapshot.interface';

@Entity()
export class QuizAttempt extends BaseEntity {
  @ManyToOne(() => User, (user) => user.attempts, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  company!: Company;

  @ManyToOne(() => Quiz, { onDelete: 'SET NULL', nullable: true })
  quiz!: Quiz | null;

  @Column('varchar', { length: 250 })
  quizTitleSnapshot!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  correctAnswersCount!: number;

  @Column('int')
  totalQuestionsCount!: number;

  @Column('jsonb', { nullable: true })
  userAnswers!: QuestionAttemptSnapshot[];
}
