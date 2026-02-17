import { Exclude, Expose } from 'class-transformer';
import { UserRole } from '../../utils/enums';
import { CompanyUser } from '../../common/entities/company-user.entity';

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
  memberships!: CompanyUser[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
