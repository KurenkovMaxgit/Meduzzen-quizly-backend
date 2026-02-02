import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from '../../utils/enums';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CANDIDATE })
  role: UserRole;

  @Column()
  refreshToken: string;
}
