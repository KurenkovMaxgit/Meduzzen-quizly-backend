import { Entity, Column, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Company } from './company.entity';
import { CompanyRole } from '../../utils/enums';

@Entity()
@Unique(['user', 'company'])
export class CompanyUser extends BaseEntity {
  @Column({ type: 'enum', enum: CompanyRole, default: CompanyRole.MEMBER })
  role!: CompanyRole;

  @ManyToOne(() => User, (user) => user.memberships, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Company, (company) => company.members, { onDelete: 'CASCADE' })
  company!: Company;
}
