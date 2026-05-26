import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  code: string;
  errors: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse = {
      code: 'INTERNAL_ERROR',
      errors: 'An unexpected error occurred',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse = {
          code: this.getErrorCode(status),
          errors: exceptionResponse,
        };
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        errorResponse = {
          code:
            (responseObj.code as string) ||
            (responseObj.error as string) ||
            this.getErrorCode(status),
          errors: Array.isArray(responseObj.message)
            ? responseObj.message.join(', ')
            : (responseObj.message as string) || 'Request failed',
        };
      }
    } else if (exception instanceof Error) {
      errorResponse = {
        code: 'INTERNAL_ERROR',
        errors: exception.message,
      };
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      500: 'INTERNAL_ERROR',
    };
    return codes[status] || 'ERROR';
  }
}
