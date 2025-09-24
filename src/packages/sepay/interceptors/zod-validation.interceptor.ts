import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationInterceptor implements NestInterceptor {
  constructor(private schema: ZodSchema) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    try {
      this.schema.parse(request.body);
    } catch (error) {
      throw new BadRequestException({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
      });
    }

    return next.handle();
  }
}