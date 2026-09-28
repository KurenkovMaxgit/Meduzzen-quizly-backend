import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AnswerCorrectness } from '../../utils/enums';
import { QuizQuestion } from './question.entity';

@Entity()
export class QuestionAnswer extends BaseEntity {
  @Column('varchar', { length: 250 })
  content!: string;

  @Column({ type: 'enum', enum: AnswerCorrectness })
  correctness!: AnswerCorrectness;

  @ManyToOne(() => QuizQuestion, (question) => question.answers, { onDelete: 'CASCADE' })
  question!: QuizQuestion;
}
