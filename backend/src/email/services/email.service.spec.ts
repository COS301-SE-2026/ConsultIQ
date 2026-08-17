/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Subject } from 'rxjs';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mockResendSend: jest.Mock;

  beforeEach(() => {
    mockResendSend = jest.fn().mockResolvedValue({ id: 'email-id-123' });

    const mockConfig = {
      get: jest.fn().mockReturnValue('test-api-key'),
    };

    service = new EmailService(mockConfig as any);

    // Replace the internal Resend instance's send method
    (service as any).resend = {
      emails: {
        send: mockResendSend,
      },
    };
  });

  describe('sendActivationEmail', () => {
    it('should call resend with correct parameters', async () => {
      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost:5173/activate?token=abc123',
      );

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@consultiq.com',
          subject: 'Activate your ConsultIQ account',
        }),
      );
    });

    it('should include the activation link in the email body', async () => {
      const activationLink = 'http://localhost:5173/activate?token=abc123';

      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        activationLink,
      );

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain(activationLink);
    });

    it('should include the recipient name in the email body', async () => {
      await service.sendActivationEmail(
        'jane@consultiq.com',
        'Jane Smith',
        'http://localhost:5173/activate?token=abc123',
      );

      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Jane Smith');
    });

    it('should propagate errors from the email provider', async () => {
      mockResendSend.mockRejectedValue(new Error('Provider error'));

      await expect(
        service.sendActivationEmail(
          'jane@consultiq.com',
          'Jane Smith',
          'http://localhost:5173/activate',
        ),
      ).rejects.toThrow('Provider error');
    });
  });

  describe('sendPasswordResetEmail', ()=>{
    it('should call resend with the reset email payload', async()=>{
      await service.sendPasswordResetEmail(
        'botho@consultiq.com',
        'Botho Smith',
        'http://localhost:5173/reset-password?token=abc123&email=botho%40consultiq.com',
      );

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'botho@consultiq.com',
          subject: 'Reset your ConsultIQ password',
        }),
      );
    });

    it('should include the reset link in the body of the email', async()=>{
      const resetLink='http://localhost:5173/reset-password?token=abc123&email=botho%40consultiq.com';
    
      await service.sendPasswordResetEmail(
        'botho@consultiq.com',
        'Botho Smith',
        resetLink,
      );

      const args= mockResendSend.mock.calls[0][0];
      expect(args.html).toContain(resetLink);
    });

    it('should include recipient name in the reset email body', async()=>{
      await service.sendPasswordResetEmail(
        'botho@consultiq.com',
        'Botho Smith',
        'http://localhost:5173/reset-password?token=abc123&email=botho%40consultiq.com',
      );

      const args= mockResendSend.mock.calls[0][0];
      expect(args.html).toContain('Botho Smith');
    });

    it('should propagate errors from the email provider', async()=>{
      mockResendSend.mockRejectedValue(new Error('Provider error'));

      await expect(
        service.sendPasswordResetEmail(
        'botho@consultiq.com',
        'Botho Smith',
        'http://localhost:5173/reset-password?token=abc123&email=botho%40consultiq.com',
      ),
    ).rejects.toThrow('Provider error');
    });   
  })
});