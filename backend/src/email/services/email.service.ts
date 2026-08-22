import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromEmail =
      this.config.get<string>('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
  }

  async sendActivationEmail(
    to: string,
    fullName: string,
    activationLink: string,
  ): Promise<void> {
    await this.resend.emails.send({
      from: `ConsultIQ <${this.fromEmail}>`,
      to,
      subject: 'Activate your ConsultIQ account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to ConsultIQ, ${fullName}</h2>
          <p>Your account has been created. Click the button below to set your password and activate your account.</p>
          <p>This link expires in 24 hours.</p>
          <a href="${activationLink}"
             style="display: inline-block; padding: 12px 24px; background-color: #1F3A8C;
                    color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Activate Account
          </a>
          <p>If you were not expecting this email, ignore it.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    fullName: string, 
    resetLink: string,
  ): Promise<void>{
    await this.resend.emails.send({
      from: `ConsultIQ <${this.fromEmail}>`,
      to,
      subject: 'Reset your ConsultIQ password',
      html:`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${fullName}</h2>
          <p>We received a request to reset your ConsultIQ password. Click the button below to set a new password.</p>
          <p>This link expires in 24 hours.</p>
          <a href="${resetLink}"
             style="display: inline-block; padding: 12px 24px; background-color: #1F3A8C;
                    color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Reset Password
          </a>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `
    })

  }
}
