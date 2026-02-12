import { BadRequestException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const validationPipeConfig = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  skipMissingProperties: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  exceptionFactory: (errors: ValidationError[]) => {
    throw new BadRequestException({
      message: 'Validation failed',
      error: 'Bad Request',
      statusCode: HttpStatus.BAD_REQUEST,
      details: errors.map(expandValidationError),
    });
  },
};

export interface ValidationErrorDetails {
  property: string;
  messages?: string[];
  children?: ValidationErrorDetails[];
}

/**
 * Recursively maps error messages explicitly to the field name
 * @param error Validation error
 * @returns Mapped messages
 */
function expandValidationError(error: ValidationError): ValidationErrorDetails {
  const errObj: ValidationErrorDetails = { property: error.property };

  if (error.constraints) errObj.messages = Object.values(error.constraints);
  if (error.children && error.children.length) {
    errObj.children = error.children.map(expandValidationError);
  }
  return errObj;
}
