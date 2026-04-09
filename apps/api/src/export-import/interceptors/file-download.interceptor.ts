import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';

@Injectable()
export class FileDownloadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> {
    return next.handle().pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse<Response>();
        const filename = `${data._metadata.type}-${Date.now()}.json`;
        response.setHeader('Content-Type', 'application/json');
        response.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`,
        );
      }),
    );
  }
}
