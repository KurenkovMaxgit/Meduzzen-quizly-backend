import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/response.interface';

const errorMap: { [key: number]: { status: HttpStatus; message: string } } = {
  23505: { status: HttpStatus.CONFLICT, message: 'Database conflict: Duplicate entry' },
  23503: { status: HttpStatus.BAD_REQUEST, message: 'Invalid relation constraint' },
};

@Catch(QueryFailedError, EntityNotFoundError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
    } else if (exception instanceof QueryFailedError) {
      const { code } = exception.driverError;
      const payload = errorMap[code as number];
      if (payload) {
        status = payload.status;
        message = payload.message;
      }
    }

    const errorBody: ApiResponse<null> = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      data: null,
    };
    response.status(status).json(errorBody);
  }
}
