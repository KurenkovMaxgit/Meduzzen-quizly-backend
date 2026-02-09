import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseQueryPipe implements PipeTransform {
  private readonly jsonKeys = ['where', 'order'];
  transform(value: unknown) {
    if (typeof value !== 'object' || !value) {
      return value;
    }

    const query = { ...value };

    this.jsonKeys.forEach((key) => {
      if (typeof query[key] === 'string') {
        try {
          query[key] = JSON.parse(query[key]) as unknown;
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
