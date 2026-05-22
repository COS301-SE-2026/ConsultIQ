import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformedResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

interface ControllerPayload<T> {
  message?: string;
  result?: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  ControllerPayload<T>,
  TransformedResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<ControllerPayload<T>>,
  ): Observable<TransformedResponse<T>> {
    const { statusCode } = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map(
        (data): TransformedResponse<T> => ({
          statusCode,
          message: data?.message ?? 'Request successful',
          data: (data?.result ?? data) as T,
        }),
      ),
    );
  }
}
