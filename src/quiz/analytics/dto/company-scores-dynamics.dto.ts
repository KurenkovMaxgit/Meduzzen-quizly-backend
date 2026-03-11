import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class CompanyScoresDynamicsDto {
  @Expose()
  @Transform(({ value }) => new Date(value as string | number))
  date!: Date;

  @Expose()
  @Transform(({ value }) => parseFloat(value as string) || 0)
  averageScore!: number;
}
