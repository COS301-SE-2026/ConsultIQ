import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class CsrfGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest();

        if (SAFE_METHODS.has(req.method)) return true;

        const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (skip) return true;

        const cookieToken = req.cookies?.['XSRF-TOKEN'];
        const headerToken = req.headers['x-csrf-token'];

        if (
            typeof cookieToken !== 'string' ||
            typeof headerToken !== 'string' ||
            !safeCompare(cookieToken, headerToken)
        ) {
            throw new ForbiddenException('Invalid or missing CSRF token');
        }

        return true;
    }
}