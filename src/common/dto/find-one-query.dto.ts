import { IsOptional, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindOneQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  relations?: string[];
}
