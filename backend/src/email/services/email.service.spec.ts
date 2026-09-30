/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import * as fs from 'fs';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

jest.mock('fs');

function createMockConfigService(overrides: Record<string, string> = {}): ConfigService {
  const values: Record<string, string> = {
    RESEND_API_KEY: 'test-api-key',
    RESEND_FROM_EMAIL: 'noreply@consultiq.com',
    ...overrides,
  };
  return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

describe('EmailService', () => {
  let service: EmailService;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    service = new EmailService(createMockConfigService());
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('onModuleInit', () => {
    it('loads and base64-encodes the CV template on success', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake pdf bytes'));

      service.onModuleInit();

      expect(fs.readFileSync).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('logs an error and leaves the template unset if the file cannot be read', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      expect(() => service.onModuleInit()).not.toThrow();
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load CV template for email attachment:',
        expect.any(Error),
      );
    });
  });

  describe('sendActivationEmail', () => {
    it('attaches the CV template and includes the CV paragraph when isConsultant is true and the template loaded', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake pdf bytes'));
      service.onModuleInit();

      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
        { isConsultant: true },
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];

      expect(call.to).toBe('jane@consultiq.com');
      expect(call.html).toContain('please send your CV to');
      expect(call.html).toContain('your consultant manager'); // fallback text — no managerEmail passed
      expect(call.attachments).toEqual([
        { filename: 'ConsultIQ_CV_Template.pdf', content: expect.any(String) },
      ]);
    });

    it('includes the CV paragraph but sends no attachment when isConsultant is true and the template failed to load, and logs a warning', async () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT');
      });
      service.onModuleInit();

      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
        { isConsultant: true },
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('please send your CV to');
      expect(call.attachments).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        'CV template unavailable — sending activation email without attachment.',
      );
    });

    it('links the CV paragraph to the manager email when one is provided', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake pdf bytes'));
      service.onModuleInit();

      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
        { isConsultant: true, managerEmail: 'cm@consultiq.com' },
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('please send your CV to');
      expect(call.html).toContain('<a href="mailto:cm@consultiq.com">cm@consultiq.com</a>');
    });

    it('omits the CV paragraph and attachment entirely for a non-consultant role, even if the template loaded fine', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake pdf bytes'));
      service.onModuleInit();

      await service.sendActivationEmail(
        'pm@consultiq.com',
        'Pat Manager',
        'http://localhost/activate?token=abc',
        { isConsultant: false },
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).not.toContain('please send your CV to');
      expect(call.attachments).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('sets replyTo and includes the contact paragraph when a manager email is provided', async () => {
      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
        { isConsultant: false, managerEmail: 'cm@consultiq.com', managerName: 'CM Person' },
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.replyTo).toBe('cm@consultiq.com');
      expect(call.html).toContain('Contact your consultant manager at');
      expect(call.html).toContain('<a href="mailto:cm@consultiq.com">cm@consultiq.com</a>');
    });

    it('does not render the manager name anywhere, even when provided (managerName is currently unused)', async () => {
      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
        { isConsultant: false, managerEmail: 'cm@consultiq.com', managerName: 'CM Person' },
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.html).not.toContain('CM Person');
    });

    it('omits replyTo and the contact paragraph when no manager email is given', async () => {
      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/activate?token=abc',
      );

      const call = mockSend.mock.calls[0][0];
      expect(call.replyTo).toBeUndefined();
      expect(call.html).not.toContain('Contact your consultant manager');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends a reset email with the expected subject and link', async () => {
      await service.sendPasswordResetEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost/reset-password?token=xyz',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe('jane@consultiq.com');
      expect(call.subject).toBe('Reset your ConsultIQ password');
      expect(call.html).toContain('http://localhost/reset-password?token=xyz');
      expect(call.attachments).toBeUndefined();
    });
  });
});