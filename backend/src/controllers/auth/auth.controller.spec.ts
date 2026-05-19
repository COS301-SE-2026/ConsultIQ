/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../auth/services/auth.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Role } from '../../auth/enums/role.enum';
import { RefreshTokenService } from '../../auth/services/auth.refresh-token.service';
import { ForbiddenException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;

  const mockAuthService = {
    createUser: jest.fn(),
    activateAccount: jest.fn(),
    resendVerification: jest.fn(),
    login: jest.fn(),
  };

  const mockRefreshTokenService = {
    refresh: jest.fn(),
    revokeAllForUser: jest.fn(),
  };

  // userId matches JwtPayload shape
  const mockReq = (userId: string, role: Role) => ({
    user: { userId, role },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        {
          provide: APP_GUARD,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  afterEach(() => jest.clearAllMocks());

  //  register 

  describe('register', () => {
    it('should allow ADMIN to register any role', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.CONSULTANT,
      };
      const expected = {
        message: 'Account created successfully. An activation email has been sent.',
        userId: 'user-uuid-123',
      };

      authService.createUser.mockResolvedValue(expected);

      const result = await controller.register(dto as any, mockReq('admin-1', Role.ADMIN) as any);

      expect(authService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should allow CONSULTANT_MANAGER to register a CONSULTANT', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.CONSULTANT,
      };
      const expected = {
        message: 'Account created successfully. An activation email has been sent.',
        userId: 'user-uuid-123',
      };

      mockAuthService.createUser.mockResolvedValue(expected);

      const result = await controller.register(dto as any, mockReq('mgr-1', Role.CONSULTANT_MANAGER) as any);

      expect(result).toEqual(expected);
    });

    it('should throw 403 when CONSULTANT_MANAGER tries to register an ADMIN', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.ADMIN,
      };

      await expect(
        controller.register(dto as any, mockReq('mgr-1', Role.CONSULTANT_MANAGER) as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 403 when CONSULTANT_MANAGER tries to register a PROJECT_MANAGER', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.PROJECT_MANAGER,
      };

      await expect(
        controller.register(dto as any, mockReq('mgr-1', Role.CONSULTANT_MANAGER) as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should propagate errors from authService.createUser', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: Role.CONSULTANT,
      };

      mockAuthService.createUser.mockRejectedValue(new Error('Conflict'));

      await expect(
        controller.register(dto as any, mockReq('admin-1', Role.ADMIN) as any),
      ).rejects.toThrow('Conflict');
    });
  });

  //  activate 

  describe('activate', () => {
    it('should call authService.activateAccount and return the result', async () => {
      const dto = {
        email: 'jane@consultiq.com',
        token: 'raw-token-abc123',
        password: 'Tr0ub4dor@3',
      };
      const expected = {
        message: 'Account activated successfully. You can now log in.',
      };

      authService.activateAccount.mockResolvedValue(expected);

      const result = await controller.activate(dto);

      expect(authService.activateAccount).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from authService.activateAccount', async () => {
      const dto = {
        email: 'jane@consultiq.com',
        token: 'bad-token',
        password: 'Tr0ub4dor@3',
      };

      authService.activateAccount.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(controller.activate(dto)).rejects.toThrow('Invalid token');
    });
  });

  //  resendVerification 

  describe('resendVerification', () => {
    it('should call authService.resendVerification and return the result', async () => {
      const dto = { email: 'jane@consultiq.com' };
      const expected = {
        message: 'If your account is pending verification, a new link has been sent.',
      };

      authService.resendVerification.mockResolvedValue(expected);

      const result = await controller.resendVerification(dto);

      expect(authService.resendVerification).toHaveBeenCalledWith(dto.email);
      expect(result).toEqual(expected);
    });
  });

  //  login 

  describe('login', () => {
    it('should return login result with message', async () => {
      const dto = { email: 'jane@co.com', password: 'Pass@123' };
      const loginResult = {
        userId: 'user-123',
        email: 'jane@co.com',
        role: Role.CONSULTANT,
        dashboardRoute: '/profile',
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(loginResult);

      const result = await controller.login(dto as any, '127.0.0.1', 'Mozilla/5.0');

      expect(authService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'Mozilla/5.0');
      expect(result).toEqual({ message: 'Login successful.', result: loginResult });
    });

    it('should propagate errors from authService.login', async () => {
      const dto = { email: 'jane@co.com', password: 'wrong' };
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials.'));

      await expect(
        controller.login(dto as any, '127.0.0.1', 'Mozilla/5.0'),
      ).rejects.toThrow('Invalid credentials.');
    });
  });

  //  refresh 

  describe('refresh', () => {
    it('should return new accessToken and refreshToken', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      mockRefreshTokenService.refresh.mockResolvedValue({
        accessToken: 'new-jwt',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(dto);

      expect(refreshTokenService.refresh).toHaveBeenCalledWith('old-refresh-token');
      expect(result).toEqual({ accessToken: 'new-jwt', refreshToken: 'new-refresh-token' });
    });

    it('should propagate errors from refreshTokenService.refresh', async () => {
      mockRefreshTokenService.refresh.mockRejectedValue(new Error('Invalid refresh token.'));

      await expect(
        controller.refresh({ refreshToken: 'bad-token' }),
      ).rejects.toThrow('Invalid refresh token.');
    });
  });

  //  logout 

  describe('logout', () => {
    it('should revoke all tokens for the requesting user', async () => {
      mockRefreshTokenService.revokeAllForUser.mockResolvedValue(undefined);

      const result = await controller.logout(mockReq('user-123', Role.CONSULTANT) as any);

      expect(refreshTokenService.revokeAllForUser).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({ message: 'Logged out successfully.' });
    });

    it('should propagate errors from refreshTokenService.revokeAllForUser', async () => {
      mockRefreshTokenService.revokeAllForUser.mockRejectedValue(new Error('DB error'));

      await expect(
        controller.logout(mockReq('user-123', Role.CONSULTANT) as any),
      ).rejects.toThrow('DB error');
    });
  });
});