/**
 *
 * TASK-33 / TASK-34 - Auth Layer
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import * as jwt from 'jsonwebtoken';
import { Role } from '../../auth/enums/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Reflector } from '@nestjs/core';

// ---------------------------------------------------------------------------
// Shape of the decoded JWT payload
// ---------------------------------------------------------------------------
export interface JwtPayload {
  userId: string;
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(
        'Authorization token is missing. Please provide a valid Bearer token.',
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is not set. Cannot verify tokens.',
      );
    }

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;

      // Basic payload shape validation
      if (!payload.userId || !payload.role) {
        throw new UnauthorizedException(
          'Token payload is malformed: missing required fields.',
        );
      }

      if (!Object.values(Role).includes(payload.role)) {
        throw new UnauthorizedException(
          `Token payload contains an unrecognised role: "${payload.role}".`,
        );
      }

      request.user = payload;
      return true;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(
          'Authorization token has expired. Please log in again.',
        );
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(
          'Authorization token is invalid or malformed.',
        );
      }

      throw new UnauthorizedException('Could not authenticate the request.');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Extract the raw token string from the `Authorization: Bearer <token>` header.
   */
  private extractBearerToken(request: {
    headers: Record<string, string | undefined>;
  }): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    const scheme = parts[0];
    const token = parts[1];

    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

    return token ?? null;
  }
}
