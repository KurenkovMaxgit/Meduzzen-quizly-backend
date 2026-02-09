import { Type } from '@nestjs/common';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type as ClassTransformerType } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export interface FindAllQuery<T> {
  skip?: number;
  take?: number;
  where?: T;
  search?: string;
  order?: {
    [field in keyof T]?: 'ASC' | 'DESC';
  };
}

/**
 * Creates generic query parameters type referring to passed entity fields
 *
 * Example: for User entity query parameters can get value like: where = {"email": "example@email.com"}
 * @param classRef Entity return dto
 * @returns Class with `FindAllQuery` fields for passed dto
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
    @IsString()
    search?: string;

    @IsOptional()
    @ValidateNested()
    order?: any;
  }

  return GenericFindAllQuery;
}
