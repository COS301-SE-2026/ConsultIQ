// src/auth/auth.service.ts
//
// Orchestrates: credential validation → lockout tracking → audit logging.
//
import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    // TooManyRequestsException,
} from '@nestjs/common';
import { Request } from 'express';
import { CredentialService } from './auth.credential.service';
import { LockoutService } from './auth.lockout.service';
import { AuditLogService } from './auth.audit-log.service';
import { AuditOutcome, Role } from '@prisma/client';
import { LoginDto } from '../dto/login.dto';

/** Shape returned to the controller on successful login. */
export interface LoginResult {
    userId: string;
    email: string;
    role: Role;
    /** Redirect to dashboard route */
    dashboardRoute: string;
}

/** Map role -> frontend route  */
const ROLE_DASHBOARD_MAP: Record<Role, string> = {
    ADMIN: '/admin',
    PROJECT_MANAGER: '/projects',
    CONSULTANT_MANAGER: '/consultant-profiles',
    CONSULTANT: '/profile',
};

@Injectable()
export class AuthService {
    constructor(
        private readonly credentialService: CredentialService,
        private readonly lockoutService: LockoutService,
        private readonly auditLogService: AuditLogService,
    ) { }

    async login(dto: LoginDto, req: Request): Promise<LoginResult> {
        const ipAddress = this.extractIp(req);
        const userAgent = req.headers['user-agent'];

        //  1: validate credentials 
        const result = await this.credentialService.validateCredentials(
            dto.email,
            dto.password,
        );


    }

    //  Helpers 

    private extractIp(req: Request): string {
        // Extract the original client IP address to ensure accurate audit logging
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return req.socket?.remoteAddress ?? 'unknown';
    }
}