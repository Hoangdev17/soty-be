import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsService } from '../modules/permissions/permissions.service';
import type { AuthenticatedRequest } from '../../../core/auth/dto/request-with-auth.dto';

interface RequestWithParams extends AuthenticatedRequest {
  params: any;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<bigint[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest<RequestWithParams>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get guild ID from route parameters
    const guildId = request.params.id || request.params.guildId;

    if (!guildId) {
      throw new ForbiddenException('Guild ID not found in request');
    }

    // Check if user has any of the required permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionService.hasPermission(
        guildId,
        user.id,
        permission,
      );

      if (hasPermission) {
        return true; // User has at least one required permission
      }
    }

    throw new ForbiddenException(
      'You do not have the required permissions to perform this action',
    );
  }
}
