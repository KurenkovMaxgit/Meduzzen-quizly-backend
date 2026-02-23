import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuizQuestion } from './question.entity';
import { Company } from './company.entity';

@Entity()
export class Quiz extends BaseEntity {
  @Column('varchar', { length: 250 })
  title!: string;

  @Column('varchar', { length: 1000 })
  description!: string;

  @Column('int')
  completionFrequency!: number;

  @ManyToOne(() => Company, (company) => company.quizzes, { onDelete: 'CASCADE' })
  company!: Company;

  @OneToMany(() => QuizQuestion, (question) => question.quiz, {
    cascade: true,
    orphanedRowAction: 'delete',
  })
  questions!: QuizQuestion[];
}
