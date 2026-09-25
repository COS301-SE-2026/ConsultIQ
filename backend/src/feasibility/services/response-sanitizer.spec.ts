import { ResponseSanitizer } from './response-sanitizer';

describe('ResponseSanitizer', () => {
  let sanitizer: ResponseSanitizer;

  beforeEach(() => {
    sanitizer = new ResponseSanitizer();
  });

  describe('sanitizeCount', () => {
    it('returns counts under 10 unchanged', () => {
      expect(sanitizer.sanitizeCount(0)).toBe(0);
      expect(sanitizer.sanitizeCount(1)).toBe(1);
      expect(sanitizer.sanitizeCount(9)).toBe(9);
    });

    it('rounds counts of 10 or more to the nearest 5', () => {
      expect(sanitizer.sanitizeCount(10)).toBe(10);
      expect(sanitizer.sanitizeCount(12)).toBe(10);
      expect(sanitizer.sanitizeCount(13)).toBe(15);
      expect(sanitizer.sanitizeCount(17)).toBe(15);
      expect(sanitizer.sanitizeCount(18)).toBe(20);
    });

    it('never returns a negative count for zero or positive input', () => {
      expect(sanitizer.sanitizeCount(0)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sanitizeScore', () => {
    it('rounds to the nearest 5%', () => {
      expect(sanitizer.sanitizeScore(0)).toBe(0);
      expect(sanitizer.sanitizeScore(82)).toBe(80);
      expect(sanitizer.sanitizeScore(83)).toBe(85);
      expect(sanitizer.sanitizeScore(100)).toBe(100);
    });

    it('rounds a score under 2.5% down to 0', () => {
      expect(sanitizer.sanitizeScore(2)).toBe(0);
    });
  });
});