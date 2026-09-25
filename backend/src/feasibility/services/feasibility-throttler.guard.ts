import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class FeasibilityThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const user = req.user as { userId?: string } | undefined;
    return Promise.resolve(user?.userId ?? (req.ip as string));
  }
}