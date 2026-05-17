import { TokenService } from './token.service';
import { ConfigService } from '@nestjs/config';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    const mockConfig = {
      get: jest.fn().mockReturnValue(24),
    };
    service = new TokenService(mockConfig as any);
  });

  describe('generateActivationToken', () => {
    it('should generate a raw token and a hashed token', () => {
      const { rawToken, hashedToken } = service.generateActivationToken();

      expect(rawToken).toBeDefined();
      expect(hashedToken).toBeDefined();
      expect(rawToken).not.toBe(hashedToken);
    });

    it('should generate a raw token that is 64 characters long', () => {
      const { rawToken } = service.generateActivationToken();
      expect(rawToken).toHaveLength(64);
    });

    it('should generate different tokens on each call', () => {
      const first = service.generateActivationToken();
      const second = service.generateActivationToken();
      expect(first.rawToken).not.toBe(second.rawToken);
      expect(first.hashedToken).not.toBe(second.hashedToken);
    });
  });

  describe('hashToken', () => {
    it('should return the same hash for the same input', () => {
      const hash1 = service.hashToken('my-token');
      const hash2 = service.hashToken('my-token');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = service.hashToken('token-one');
      const hash2 = service.hashToken('token-two');
      expect(hash1).not.toBe(hash2);
    });

    it('should match the hash stored during generation', () => {
      const { rawToken, hashedToken } = service.generateActivationToken();
      const reHashed = service.hashToken(rawToken);
      expect(reHashed).toBe(hashedToken);
    });
  });

  describe('getTokenExpiry', () => {
    it('should return a date in the future', () => {
      const expiry = service.getTokenExpiry();
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should default to 24 hours if env variable is not set', () => {
      const mockConfig = { get: jest.fn().mockReturnValue(undefined) };
      const serviceWithNoConfig = new TokenService(mockConfig as any);
      const expiry = serviceWithNoConfig.getTokenExpiry();
      const hoursUntilExpiry = (expiry.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursUntilExpiry).toBeCloseTo(24, 0);
    });

    it('should return a date approximately 24 hours from now', () => {
      const expiry = service.getTokenExpiry();
      const hoursUntilExpiry =
        (expiry.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hoursUntilExpiry).toBeCloseTo(24, 0);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for a date in the past', () => {
      const pastDate = new Date(Date.now() - 1000);
      expect(service.isTokenExpired(pastDate)).toBe(true);
    });

    it('should return false for a date in the future', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60);
      expect(service.isTokenExpired(futureDate)).toBe(false);
    });
  });
});