import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuestionAnswer } from './answer.entity';
import { QuizQuestionType } from '../../utils/enums';
import { Quiz } from './quiz.entity';

@Entity()
export class QuizQuestion extends BaseEntity {
  @Column('varchar', { length: 500 })
  prompt!: string;

  @Column({ type: 'enum', enum: QuizQuestionType })
  type!: QuizQuestionType;

  @ManyToOne(() => Quiz, (quiz) => quiz.questions, { onDelete: 'CASCADE' })
  quiz!: Quiz;

  @OneToMany(() => QuestionAnswer, (answer) => answer.question, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  answers!: QuestionAnswer[];
}
