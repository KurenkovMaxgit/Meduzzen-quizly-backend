import { Entity, Column } from 'typeorm';
import { UserRole } from '../../utils/enums';
import { BaseEntity } from './base.entity';

@Entity()
export class User extends BaseEntity {
  @Column('varchar', { length: 250 })
  firstName!: string;

  @Column('varchar', { length: 250 })
  lastName!: string;

  @Column('varchar', { length: 255, unique: true })
  email!: string;

  @Column('varchar', { length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CANDIDATE })
  role!: UserRole;

  @Column('varchar', { length: 255, select: false, default: null, nullable: true })
  refreshToken!: string | null;
}
