import { Type } from 'class-transformer';
import { IsOptional, IsUUID, Length, IsString, IsEnum, IsDate } from 'class-validator';

export class FindAnswerDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Length(1, 250)
  @IsString()
  content?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;
}
