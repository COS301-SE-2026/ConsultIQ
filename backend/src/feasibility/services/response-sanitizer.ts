// scoring/services/feasibility/response-sanitizer.ts
import { Injectable } from '@nestjs/common';

/**
 * Blunts exact-value probing on feasibility results. A PM (or anyone
 * scripting repeated calls) shouldn't be able to binary-search their
 * way to an exact consultant count or score by nudging inputs by tiny
 * amounts and diffing raw responses.
 *
 *  - counts 10 and over: rounded to the nearest 5
 *  - scores: always rounded to the nearest 5%
 */
@Injectable()
export class ResponseSanitizer {
  sanitizeCount(count: number): number {
    return count < 10 ? count : Math.round(count / 5) * 5;
  }

  sanitizeScore(score: number): number {
    return Math.round(score / 5) * 5;
  }
}