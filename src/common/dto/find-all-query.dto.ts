import { Type } from '@nestjs/common';
import {
  IsOptional,
  IsString,
  ValidateNested,
  IsObject,
  IsInt,
  Min,
  IsArray,
  Max,
} from 'class-validator';
import { Type as ClassTransformerType, plainToInstance, Transform } from 'class-transformer';

/**
 * Recursively removes keys with `undefined` values from an object or class instance.
 * Preserves the Prototype (Class Instance status).
 */
function cleanUndefined(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((v) => cleanUndefined(v));
  }

  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const value = obj[key] as unknown;
      if (value === undefined) {
        delete obj[key];
      } else if (typeof value === 'object' && !(value instanceof Date)) {
        cleanUndefined(value);
      }
    }
  }
  return obj;
}

export interface FindAllQuery<T> {
  skip?: number;
  take?: number;
  where?: T;
  search?: string;
  order?: { [field in keyof T]?: 'ASC' | 'DESC' };
  relations?: string[];
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
    @ClassTransformerType(() => Number)
    skip?: number = 0;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    @ClassTransformerType(() => Number)
    take?: number = 10;

    @IsOptional()
    @Transform(({ value }) => {
      const parsed =
        typeof value === 'string' ? (JSON.parse(value) as unknown) : (value as unknown);

      const instance = plainToInstance(classRef, parsed);

      return cleanUndefined(instance);
    })
    @IsOptional()
    @Transform(({ value }) => {
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        const instance = plainToInstance(classRef, parsed);
        return cleanUndefined(instance);
      } catch (error) {
        return value;
      }
    })
    @IsObject()
    @ValidateNested()
    where?: T;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }) =>
      typeof value === 'string' ? (JSON.parse(value) as unknown) : (value as unknown),
    )
    @IsObject()
    order?: any;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Transform(({ value }) => {
      if (typeof value === 'string') return [value];
      return value;
    })
    relations?: string[] = [];
  }

  return GenericFindAllQuery;
}
