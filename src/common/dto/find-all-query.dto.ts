import { Type } from '@nestjs/common';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type as ClassTransformerType } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export interface FindAllQuery<T> {
  skip?: number;
  take?: number;
  where?: T;
  search?: T;
  order?: {
    [field in keyof T]?: 'ASC' | 'DESC' | 'asc' | 'desc' | 1 | -1;
  };
}

/**
 * Creates generic query parameters type refering to passed entity fields
 * 
 * Example: for User entity query parameters can get value like: where = {"email": "example@email.com"}
 * @param classRef 
 * @returns
 */
export function FilterDto<T>(classRef: Type<T>): Type<FindAllQuery<T>> {
  class GenericFindAllQuery implements FindAllQuery<T> {
    @IsOptional()
    @IsInt()
    @Min(0)
    skip?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    take?: number;

    @IsOptional()
    @ValidateNested()
    @ClassTransformerType(() => classRef)
    where?: T;

    @IsOptional()
    @ValidateNested()
    @ClassTransformerType(() => classRef)
    search?: T;

    @IsOptional()
    @ValidateNested()
    order?: any;
  }

  return GenericFindAllQuery;
}
