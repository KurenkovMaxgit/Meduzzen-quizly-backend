import { Exclude, Expose } from 'class-transformer';
import { CompanyUser } from '../../common/entities/company-user.entity';
import { CompanyStatus } from '../../utils/enums';

@Exclude()
export class ReturnCompanyDto {
  constructor(partial: Partial<ReturnCompanyDto>) {
    Object.assign(this, partial);
  }

  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  status!: CompanyStatus;

  @Expose()
  members!: CompanyUser[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
