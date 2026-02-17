import { Exclude, Expose } from 'class-transformer';
import { CompanyUser } from '../../common/entities/company-user.entity';

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
  status!: string;

  @Expose()
  members!: CompanyUser[];

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
