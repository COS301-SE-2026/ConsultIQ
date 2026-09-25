import { FeasibilityThrottlerGuard } from './feasibility-throttler.guard';

describe('FeasibilityThrottlerGuard', () => {
  let guard: FeasibilityThrottlerGuard;

  beforeEach(() => {
    guard = Object.create(FeasibilityThrottlerGuard.prototype);
  });

  it('tracks by the authenticated user id when present', async () => {
    const req = { user: { userId: 'user-123' }, ip: '10.0.0.1' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('user-123');
  });

  it('falls back to IP when no user is present on the request', async () => {
    const req = { ip: '10.0.0.1' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('10.0.0.1');
  });

  it('falls back to IP when user exists but has no userId', async () => {
    const req = { user: {}, ip: '10.0.0.1' };
    const tracker = await (guard as any).getTracker(req);
    expect(tracker).toBe('10.0.0.1');
  });
});