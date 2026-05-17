import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class TokenService {
  constructor(private readonly config: ConfigService) {}

  // Generates a secure random token and its hash
  generateActivationToken(): { rawToken: string; hashedToken: string } {
    // 32 random bytes converted to a hex string = 64 character token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash the token with SHA-256 before storing in the database
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    return { rawToken, hashedToken };
  }

  // Hashes an incoming token so we can compare it against the stored hash
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Calculates when the token should expire
  getTokenExpiry(): Date {
    const hours = this.config.get<number>('ACTIVATION_TOKEN_EXPIRY_HOURS') ?? 24;
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + hours);
    return expiry;
  }

  // Checks whether a token expiry date has passed
  isTokenExpired(expiry: Date): boolean {
    return new Date() > expiry;
  }
}