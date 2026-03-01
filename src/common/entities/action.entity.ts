import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Company } from './company.entity';
import { ActionStatus, ActionType } from '../../utils/enums';

@Entity()
export class Action extends BaseEntity {
  @ManyToOne(() => User, (user) => user.sentActions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  createdBy?: User;

  @ManyToOne(() => User, (user) => user.receivedActions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  subject!: User;

  @ManyToOne(() => Company, (company) => company.actions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  company!: Company;

  @Column({ type: 'enum', enum: ActionStatus, default: ActionStatus.PENDING })
  status!: ActionStatus;

  @Column({ type: 'enum', enum: ActionType })
  type!: ActionType;
}
