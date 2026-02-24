import { Entity, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Quiz } from './quiz.entity';
import { Company } from './company.entity';
import { BaseEntity } from './base.entity';

export interface QuestionAttemptSnapshot {
  questionId: string;
  prompt: string;
  submittedAnswers: {
    answerId: string;
    content: string;
  }[];
}

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

  @Column('int')
  correctAnswersCount!: number;

  @Column('int')
  totalQuestionsCount!: number;

  @Column('jsonb', { nullable: true })
  userAnswers!: QuestionAttemptSnapshot[];
}
