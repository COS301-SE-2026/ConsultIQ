import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { Role } from '../../auth/enums/role.enum';
import { JwtAuthGuard, JwtPayload } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { RolesGuard, ROLES_KEY } from './roles.guard';

/**
 * @file guards.spec.ts
 * @description Full unit test coverage for JwtAuthGuard and RolesGuard.
 * Run: npx jest guards.spec.ts
 */


// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

const TEST_SECRET = 'test-secret';

/** Builds a valid signed JWT for the given payload */
function signToken(payload: Partial<JwtPayload>, secret = TEST_SECRET): string {
    return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/** Builds a mock ExecutionContext with full control over headers and req.user */
function buildContext(overrides: {
    authHeader?: string;
    user?: JwtPayload | null;
    isPublic?: boolean;
    requiredRoles?: Role[];
}): ExecutionContext {
    const request: Record<string, any> = {
        headers: overrides.authHeader
            ? { authorization: overrides.authHeader }
            : {},
        user: overrides.user ?? undefined,
    };

    const mockReflector = {
        getAllAndOverride: jest.fn((key: string) => {
            if (key === IS_PUBLIC_KEY) return overrides.isPublic ?? false;
            if (key === ROLES_KEY) return overrides.requiredRoles ?? [];
            return undefined;
        }),
    };

    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
        // Expose reflector mock for assertion in RolesGuard tests
        __reflector: mockReflector,
    } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// JwtAuthGuard
// ---------------------------------------------------------------------------

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let reflector: jest.Mocked<Reflector>;

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        } as unknown as jest.Mocked<Reflector>;

        guard = new JwtAuthGuard(reflector);
        process.env.JWT_SECRET = TEST_SECRET;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.JWT_SECRET;
    });

    // -------------------------------------------------------------------------
    // @Public() routes
    // -------------------------------------------------------------------------
    describe('@Public() routes', () => {
        it('should allow access without a token when route is marked @Public()', () => {
            reflector.getAllAndOverride.mockReturnValue(true); // isPublic = true

            const ctx = buildContext({ isPublic: true });
            const result = guard.canActivate(ctx);

            expect(result).toBe(true);
        });

        it('should allow access without a token when controller is marked @Public()', () => {
            reflector.getAllAndOverride.mockReturnValue(true);

            const ctx = buildContext({ isPublic: true });
            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Happy path
    // -------------------------------------------------------------------------
    describe('Happy path (Success) — valid token', () => {
        beforeEach(() => {
            reflector.getAllAndOverride.mockReturnValue(false); // isPublic = false
        });

        it('should return true and attach req.user for a valid ADMIN token', () => {
            const payload: Partial<JwtPayload> = {
                userId: 'uuid-1234',
                role: Role.ADMIN,
            };
            const token = signToken(payload);
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            const result = guard.canActivate(ctx);
            const request = ctx.switchToHttp().getRequest();

            expect(result).toBe(true);
            expect(request.user).toMatchObject({ userId: 'uuid-1234', role: Role.ADMIN });
        });

        it('should return true for a valid PROJECT_MANAGER token', () => {
            const token = signToken({ userId: 'uuid-pm', role: Role.PROJECT_MANAGER });
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(guard.canActivate(ctx)).toBe(true);
            expect(ctx.switchToHttp().getRequest().user.role).toBe(Role.PROJECT_MANAGER);
        });

        it('should return true for a valid CONSULTANT_MANAGER token', () => {
            const token = signToken({ userId: 'uuid-cm', role: Role.CONSULTANT_MANAGER });
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should return true for a valid CONSULTANT token', () => {
            const token = signToken({ userId: 'uuid-c', role: Role.CONSULTANT });
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should attach all payload fields (userId, role, iat, exp) to req.user', () => {
            const token = signToken({ userId: 'uuid-full', role: Role.ADMIN });
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            guard.canActivate(ctx);
            const user = ctx.switchToHttp().getRequest().user;

            expect(user).toHaveProperty('userId', 'uuid-full');
            expect(user).toHaveProperty('role', Role.ADMIN);
            expect(user).toHaveProperty('iat');
            expect(user).toHaveProperty('exp');
        });
    });

    // -------------------------------------------------------------------------
    // Missing / malformed token — 401
    // -------------------------------------------------------------------------
    describe('Error cases — 401 Unauthorized', () => {
        beforeEach(() => {
            reflector.getAllAndOverride.mockReturnValue(false);
        });

        it('should throw 401 when Authorization header is missing entirely', () => {
            const ctx = buildContext({});

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow(
                'Authorization token is missing',
            );
        });

        it('should throw 401 when Authorization header has no token after Bearer', () => {
            const ctx = buildContext({ authHeader: 'Bearer ' });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
        });

        it('should throw 401 when scheme is not Bearer (e.g. Basic)', () => {
            const ctx = buildContext({ authHeader: 'Basic sometoken' });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
        });

        it('should throw 401 when token is completely garbage', () => {
            const ctx = buildContext({ authHeader: 'Bearer not.a.jwt' });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('invalid or malformed');
        });

        it('should throw 401 when token is signed with wrong secret', () => {
            const token = signToken({ userId: 'uuid-x', role: Role.ADMIN }, 'wrong-secret');
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('invalid or malformed');
        });

        it('should throw 401 with expiry message when token is expired', () => {
            const token = jwt.sign(
                { userId: 'uuid-exp', role: Role.ADMIN },
                TEST_SECRET,
                { expiresIn: -1 }, // already expired
            );
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('expired');
        });

        it('should throw 401 when payload is missing userId', () => {
            // Sign a token without userId
            const token = jwt.sign({ role: Role.ADMIN }, TEST_SECRET);
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('malformed');
        });

        it('should throw 401 when payload is missing role', () => {
            const token = jwt.sign({ userId: 'uuid-x' }, TEST_SECRET);
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('malformed');
        });

        it('should throw 401 when role in payload is not a recognised ConsultIQ role', () => {
            const token = jwt.sign(
                { userId: 'uuid-x', role: 'SUPER_ADMIN' },
                TEST_SECRET,
            );
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
            expect(() => guard.canActivate(ctx)).toThrow('unrecognised role');
        });
    });

    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------
    describe('Edge cases', () => {
        beforeEach(() => {
            reflector.getAllAndOverride.mockReturnValue(false);
        });

        it('should throw a hard Error (not 401) when JWT_SECRET env var is missing', () => {
            delete process.env.JWT_SECRET;

            const token = signToken({ userId: 'uuid-x', role: Role.ADMIN }, TEST_SECRET);
            const ctx = buildContext({ authHeader: `Bearer ${token}` });

            expect(() => guard.canActivate(ctx)).toThrow(
                'JWT_SECRET environment variable is not set',
            );
            // Should be a plain Error, not an UnauthorizedException
            expect(() => guard.canActivate(ctx)).not.toThrow(UnauthorizedException);
        });

        it('should handle Authorization header with extra spaces gracefully', () => {
            const token = signToken({ userId: 'uuid-x', role: Role.ADMIN });
            const ctx = buildContext({ authHeader: `Bearer  ${token}` });


            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
        });

        it('should handle completely empty Authorization header string', () => {
            const ctx = buildContext({ authHeader: '' });

            expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
        });
    });
});

// ---------------------------------------------------------------------------
// RolesGuard
// ---------------------------------------------------------------------------

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: jest.Mocked<Reflector>;

    beforeEach(() => {
        reflector = {
            getAllAndOverride: jest.fn(),
        } as unknown as jest.Mocked<Reflector>;

        guard = new RolesGuard(reflector);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    /** Helper: mock reflector for a given guard run */
    function mockReflector(isPublic: boolean, requiredRoles: Role[]) {
        reflector.getAllAndOverride.mockImplementation((key: any) => {
            if (key === IS_PUBLIC_KEY) return isPublic;
            if (key === ROLES_KEY) return requiredRoles;
            return undefined;
        });
    }

    function buildCtxWithUser(user?: JwtPayload): ExecutionContext {
        const request: Record<string, any> = { user };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => jest.fn(),
            getClass: () => jest.fn(),
        } as unknown as ExecutionContext;
    }

    // -------------------------------------------------------------------------
    // @Public() routes
    // -------------------------------------------------------------------------
    describe('@Public() routes', () => {
        it('should allow access regardless of role when route is @Public()', () => {
            mockReflector(true, [Role.ADMIN]);
            const ctx = buildCtxWithUser(undefined); // no user at all

            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // No @Roles() decorator
    // -------------------------------------------------------------------------
    describe('Routes with no @Roles() decorator', () => {
        it('should allow any authenticated user when no roles are required', () => {
            mockReflector(false, []);

            const ctx = buildCtxWithUser({
                userId: 'uuid-1',
                role: Role.CONSULTANT,
            });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should allow access when requiredRoles is undefined', () => {
            reflector.getAllAndOverride.mockImplementation((key: any) => {
                if (key === IS_PUBLIC_KEY) return false;
                if (key === ROLES_KEY) return undefined;
                return undefined;
            });

            const ctx = buildCtxWithUser({ userId: 'uuid-1', role: Role.CONSULTANT });
            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Happy path — correct role
    // -------------------------------------------------------------------------
    describe('Happy path — correct role', () => {
        it('should allow ADMIN when ADMIN is required', () => {
            mockReflector(false, [Role.ADMIN]);
            const ctx = buildCtxWithUser({ userId: 'uuid-a', role: Role.ADMIN });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should allow CONSULTANT_MANAGER when multiple roles are permitted', () => {
            mockReflector(false, [Role.ADMIN, Role.CONSULTANT_MANAGER]);
            const ctx = buildCtxWithUser({ userId: 'uuid-cm', role: Role.CONSULTANT_MANAGER });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should allow PROJECT_MANAGER when PROJECT_MANAGER is in the allowed list', () => {
            mockReflector(false, [Role.PROJECT_MANAGER, Role.ADMIN]);
            const ctx = buildCtxWithUser({ userId: 'uuid-pm', role: Role.PROJECT_MANAGER });

            expect(guard.canActivate(ctx)).toBe(true);
        });

        it('should allow CONSULTANT when CONSULTANT is the only required role', () => {
            mockReflector(false, [Role.CONSULTANT]);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(guard.canActivate(ctx)).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // Error cases — 403 Forbidden
    // -------------------------------------------------------------------------
    describe('Error cases — 403 Forbidden', () => {
        it('should throw 403 when CONSULTANT tries to access ADMIN-only route', () => {
            mockReflector(false, [Role.ADMIN]);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
            expect(() => guard.canActivate(ctx)).toThrow('not authorised');
        });

        it('should throw 403 when PROJECT_MANAGER tries to access CONSULTANT_MANAGER route', () => {
            mockReflector(false, [Role.CONSULTANT_MANAGER]);
            const ctx = buildCtxWithUser({ userId: 'uuid-pm', role: Role.PROJECT_MANAGER });

            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });

        it('should throw 403 with the user role in the error message', () => {
            mockReflector(false, [Role.ADMIN]);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(() => guard.canActivate(ctx)).toThrow(
                `role "${Role.CONSULTANT}" is not authorised`,
            );
        });

        it('should throw 403 with the required roles listed in the error message', () => {
            mockReflector(false, [Role.ADMIN, Role.CONSULTANT_MANAGER]);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(() => guard.canActivate(ctx)).toThrow(
                `Required role(s): ${Role.ADMIN}, ${Role.CONSULTANT_MANAGER}`,
            );
        });

        it('should throw 403 when req.user is missing (JwtAuthGuard not applied first)', () => {
            mockReflector(false, [Role.ADMIN]);
            const ctx = buildCtxWithUser(undefined); // no user on request

            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
            expect(() => guard.canActivate(ctx)).toThrow(
                'no authenticated user found on request',
            );
        });
    });

    // -------------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------------
    describe('Edge cases', () => {
        it('should deny CONSULTANT even if all other roles are permitted', () => {
            mockReflector(false, [Role.ADMIN, Role.PROJECT_MANAGER, Role.CONSULTANT_MANAGER]);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });

        it('should use handler-level @Roles() over controller-level (getAllAndOverride behaviour)', () => {

            reflector.getAllAndOverride.mockImplementation((key: any) => {
                if (key === IS_PUBLIC_KEY) return false;
                if (key === ROLES_KEY) return [Role.ADMIN];
                return undefined;
            });

            const ctx = buildCtxWithUser({ userId: 'uuid-pm', role: Role.PROJECT_MANAGER });
            expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
        });

        it('should allow access when requiredRoles array is empty (no restriction)', () => {
            mockReflector(false, []);
            const ctx = buildCtxWithUser({ userId: 'uuid-c', role: Role.CONSULTANT });

            expect(guard.canActivate(ctx)).toBe(true);
        });
    });
});