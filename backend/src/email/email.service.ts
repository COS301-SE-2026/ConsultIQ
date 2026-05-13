import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendActivationEmail(
    to: string,
    fullName: string,
    activationLink: string,
  ): Promise<void> {
    await this.resend.emails.send({
      from: 'ConsultIQ <onboarding@resend.dev>',
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
}