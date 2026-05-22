/**
 * TASK-33 / TASK-34 — Auth Layer
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../auth/enums/role.enum';
import { JwtPayload } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// ---------------------------------------------------------------------------
// Metadata key — shared between decorator and guard
// ---------------------------------------------------------------------------
export const ROLES_KEY = 'consultiq_required_roles';

// ---------------------------------------------------------------------------
// @Roles() custom decorator
// ---------------------------------------------------------------------------

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Collect roles from the route handler and controller class.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(
        'Access denied: no authenticated user found on request. ' +
          'Ensure JwtAuthGuard is applied before RolesGuard.',
      );
    }

    const hasPermission = requiredRoles.includes(user.role);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied: role "${user.role}" is not authorised to access this resource. ` +
          `Required role(s): ${requiredRoles.join(', ')}.`,
      );
    }

    return true;
  }
}
