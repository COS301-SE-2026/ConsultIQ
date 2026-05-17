/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../../auth/services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    createUser: jest.fn(),
    activateAccount: jest.fn(),
    resendVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should call authService.createUser and return the result', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: 'CONSULTANT' as any,
      };
      const expected = {
        message: 'Account created successfully. An activation email has been sent.',
        userId: 'user-uuid-123',
      };

      authService.createUser.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.createUser).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('should propagate errors from authService.createUser', async () => {
      const dto = {
        fullName: 'Jane Smith',
        email: 'jane@consultiq.com',
        role: 'CONSULTANT' as any,
      };

      authService.createUser.mockRejectedValue(new Error('Conflict'));

      await expect(controller.register(dto)).rejects.toThrow('Conflict');
    });
  });

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
});