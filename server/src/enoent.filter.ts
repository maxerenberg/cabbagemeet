import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

// Adapted from https://docs.nestjs.com/exception-filters#inheritance
// The ServeStaticModule sends a 404 response which contains the full
// filesystem path. We don't want this.
// This filter creates a custom error response for ENOENT errors.

@Catch()
export default class EnoentFilter extends BaseExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    if (exception.code === 'ENOENT') {
      response.status(HttpStatus.NOT_FOUND).send({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not found',
      });
    } else {
      super.catch(exception, host);
    }
  }
}
