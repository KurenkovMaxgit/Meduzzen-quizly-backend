import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/response.interface';

interface HttpExceptionResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage: string;
    let errorDetails: unknown = null;

    if (exception instanceof HttpException) {
      const errorResponse = exception.getResponse();
      if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      } else {
        const responseObject = errorResponse as HttpExceptionResponse;
        errorMessage = Array.isArray(responseObject.message)
          ? responseObject.message.join(', ')
          : responseObject.message || responseObject.error || 'Unknown Error';

        if (responseObject.details) {
          errorDetails = responseObject.details;
        }
      }
    } else {
      errorMessage = 'Internal server error';
    }

    const errorBody: ApiResponse<null> = {
      success: false,
      statusCode: status,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: errorDetails,
      data: null,
    };

    response.status(status).json(errorBody);
  }
}
