import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class FeasibilityThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/require-await -- base class signature mandates Promise<string>; async is structural, not optional
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    return user?.userId ?? (req.ip as string);
  }
}