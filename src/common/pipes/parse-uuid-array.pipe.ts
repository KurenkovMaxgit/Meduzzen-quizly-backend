import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUUIDArrayPipe implements PipeTransform {
  transform(value: any) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Validation failed (array expected)');
    }

    if (value.some((id) => !isUUID(id))) {
      throw new BadRequestException('Validation failed (all items must be valid UUIDs)');
    }

    return value;
  }
}
