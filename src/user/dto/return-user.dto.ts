import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../../utils/enums';

@Exclude()
export class ReturnUserDto {
  constructor(partial: Partial<ReturnUserDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  role!: UserRole;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
