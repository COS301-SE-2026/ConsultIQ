import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { CsrfGuard } from './csrf.guard';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';

describe('CsrfGuard', () => {
    let guard: CsrfGuard;
    let reflector: Reflector;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CsrfGuard,
                {
                    provide: Reflector,
                    useValue: {
                        getAllAndOverride: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<CsrfGuard>(CsrfGuard);
        reflector = module.get<Reflector>(Reflector);
    });

    const createMockContext = (req: Partial<Request & { cookies: any; headers: any }>): ExecutionContext => {
        return {
            switchToHttp: () => ({
                getRequest: () => req,
            }),
            getHandler: jest.fn(),
            getClass: jest.fn(),
        } as unknown as ExecutionContext;
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    describe('Safe Methods', () => {
        it.each(['GET', 'HEAD', 'OPTIONS'])('should allow %s request without checking tokens', (method) => {
            const context = createMockContext({ method });
            expect(guard.canActivate(context)).toBe(true);

            expect(reflector.getAllAndOverride).not.toHaveBeenCalled();
        });
    });

    describe('Skip Decorator', () => {
        it('should allow request if @SkipCsrf decorator is present', () => {
            const context = createMockContext({ method: 'POST' });

            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

            expect(guard.canActivate(context)).toBe(true);
            expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_CSRF_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
        });
    });

    describe('Token Validation (State-Changing Methods)', () => {
        beforeEach(() => {

            jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        });

        it('should throw ForbiddenException if cookies object is undefined', () => {
            const context = createMockContext({
                method: 'POST',
                headers: { 'x-csrf-token': 'valid-token' },
                // cookies is undefined
            });

            expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
            expect(() => guard.canActivate(context)).toThrow('Invalid or missing CSRF token');
        });

        it('should throw ForbiddenException if XSRF-TOKEN cookie is missing', () => {
            const context = createMockContext({
                method: 'POST',
                headers: { 'x-csrf-token': 'valid-token' },
                cookies: {},
            });

            expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if x-csrf-token header is missing', () => {
            const context = createMockContext({
                method: 'POST',
                headers: {},
                cookies: { 'XSRF-TOKEN': 'valid-token' },
            });

            expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if tokens do not match (different values)', () => {
            const context = createMockContext({
                method: 'POST',
                headers: { 'x-csrf-token': 'tokenA' },
                cookies: { 'XSRF-TOKEN': 'tokenB' },
            });

            expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if tokens do not match (different lengths)', () => {
            const context = createMockContext({
                method: 'POST',
                headers: { 'x-csrf-token': 'token-short' },
                cookies: { 'XSRF-TOKEN': 'token-much-longer' },
            });

            expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        });

        it('should allow request if tokens match perfectly', () => {
            const validToken = 'super-secure-random-token-123';
            const context = createMockContext({
                method: 'POST',
                headers: { 'x-csrf-token': validToken },
                cookies: { 'XSRF-TOKEN': validToken },
            });

            expect(guard.canActivate(context)).toBe(true);
        });
    });
});