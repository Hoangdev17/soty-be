import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Enhanced error handling with detailed logging
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      const errorDetails = {
        path: request.path,
        method: request.method,
        error: err?.message || info?.message || 'Unauthorized access',
        timestamp: new Date().toISOString(),
      };

      this.logger.warn(
        `Authentication failed: ${JSON.stringify(errorDetails)}`,
      );
      throw new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
