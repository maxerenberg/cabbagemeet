import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/*
  By default, NestJS' ValidationPipe will create arrays for error messages, e.g.
  {
    "statusCode":400,
    "message":["age must be an integer number","breed must be a string"],
    "error":"Bad Request"
  }

  This interceptor takes the first error message and sets that as the 'message'
  field, e.g.
  {
    "statusCode":400,
    "message":"age must be an integer number",
    "error":"Bad Request"
  }
*/

@Injectable()
export default class NoArrayErrorMessageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof BadRequestException) {
          const errResp = err.getResponse() as any;
          if (
            typeof errResp === 'object' &&
            Array.isArray(errResp.message) &&
            errResp.message.length > 0 &&
            typeof errResp.message[0] === 'string'
          ) {
            err = new BadRequestException(errResp.message[0]);
          }
        }
        return throwError(() => err);
      }),
    );
  }
}
