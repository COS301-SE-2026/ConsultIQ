import { SkillGrowthThrottlerGuard } from './skill-growth-throttler.guard';

describe('SkillGrowthThrottlerGuard', () => {
  let guard: SkillGrowthThrottlerGuard;

  beforeEach(() => {
    // getTracker doesn't touch ThrottlerGuard's constructor dependencies,
    // so bypass the constructor to test this one method in isolation.
    guard = Object.create(SkillGrowthThrottlerGuard.prototype);
  });

  it('tracks by the authenticated user id when present', async () => {
    const tracker = await (guard as any).getTracker({ user: { userId: 'user-123' }, ip: '10.0.0.1' });
    expect(tracker).toBe('user-123');
  });

  it('falls back to IP when there is no user on the request', async () => {
    const tracker = await (guard as any).getTracker({ ip: '10.0.0.1' });
    expect(tracker).toBe('10.0.0.1');
  });

  it('falls back to IP when the user has no userId', async () => {
    const tracker = await (guard as any).getTracker({ user: {}, ip: '10.0.0.1' });
    expect(tracker).toBe('10.0.0.1');
  });
});