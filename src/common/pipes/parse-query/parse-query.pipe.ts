/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ILike } from 'typeorm';

@Injectable()
export class ParseQueryPipe implements PipeTransform {
  private readonly jsonKeys = ['where', 'search', 'order'];
  transform(value: any) {
    if (typeof value !== 'object' || !value) {
      return value;
    }

    const query = { ...value };

    this.jsonKeys.forEach((key) => {
      if (typeof query[key] === 'string') {
        try {
          const parsed = JSON.parse(query[key]);

          if (key === 'search') {
            const searchFilters: Record<string, any> = {};
            Object.keys(parsed).forEach((subKey) => {
              const subValue = parsed[subKey];
              searchFilters[subKey] =
                typeof subValue === 'string' ? ILike(`%${subValue}%`) : subValue;
            });
            query[key] = searchFilters;
          } else {
            query[key] = parsed;
          }
        } catch (error) {
          throw new BadRequestException(
            `Invalid JSON in query parameter: "${key}". ${error instanceof Error ? error.message : ''}`,
          );
        }
      }
    });

    return query;
  }
}
