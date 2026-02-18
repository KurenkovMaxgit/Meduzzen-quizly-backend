import { Entity, Column, OneToMany } from 'typeorm';
import { CompanyStatus } from '../../utils/enums';
import { BaseEntity } from './base.entity';
import { CompanyUser } from './company-user.entity';
import { Action } from './action.entity';

@Entity()
export class Company extends BaseEntity {
  @Column('varchar', { length: 250 })
  name!: string;

  @Column('varchar', { length: 3000 })
  description!: string;

  @Column({ type: 'enum', enum: CompanyStatus, default: CompanyStatus.VISIBLE })
  status!: CompanyStatus;

  @OneToMany(() => CompanyUser, (member) => member.company)
  members?: CompanyUser[];

  @OneToMany(() => Action, (action) => action.company)
  actions?: Action[];
}
