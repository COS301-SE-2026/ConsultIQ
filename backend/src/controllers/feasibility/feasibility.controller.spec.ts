import { Test, TestingModule } from '@nestjs/testing';
import { FeasibilityController } from './feasibility.controller';
import { FeasibilityService } from '../../feasibility/services/feasibility.service';
import { ResponseSanitizer } from '../../feasibility/services/response-sanitizer';
import { FeasibilityCacheService } from '../../feasibility/services/feasibility-cache.service';
import { FeasibilityThrottlerGuard } from '../../feasibility/services/feasibility-throttler.guard';

describe('FeasibilityController', () => {
  let controller: FeasibilityController;
  let feasibilityService: { checkFeasibility: jest.Mock };
  let sanitizer: { sanitizeCount: jest.Mock; sanitizeScore: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  const dto = { budget: 100000, skills: [] } as any;
  const req = { user: { userId: 'pm-1' } };

  beforeEach(async () => {
    feasibilityService = {
      checkFeasibility: jest.fn().mockResolvedValue({
        eligibleCount: 7,
        topScore: 82,
        variants: [{ label: 'Budget +15%', eligibleCount: 12, topScore: 88 }],
      }),
    };
    sanitizer = {
      sanitizeCount: jest.fn((n) => n), // identity by default; overridden per-test where the rounding itself matters
      sanitizeScore: jest.fn((n) => n),
    };
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeasibilityController],
      providers: [
        { provide: FeasibilityService, useValue: feasibilityService },
        { provide: ResponseSanitizer, useValue: sanitizer },
        { provide: FeasibilityCacheService, useValue: cache },
      ],
    })
      .overrideGuard(FeasibilityThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(FeasibilityController);
  });

  it('returns the cached response and skips scoring entirely on a cache hit', async () => {
    const cachedResponse = { eligibleCount: 5, topScore: 70, variants: [] };
    cache.get.mockResolvedValue(cachedResponse);

    const result = await controller.checkFeasibility(dto, req);

    expect(result).toBe(cachedResponse);
    expect(feasibilityService.checkFeasibility).not.toHaveBeenCalled();
  });

  it('runs the check, sanitizes, and caches the result on a cache miss', async () => {
    const result = await controller.checkFeasibility(dto, req);

    expect(feasibilityService.checkFeasibility).toHaveBeenCalledWith(dto);
    expect(sanitizer.sanitizeCount).toHaveBeenCalledWith(7);
    expect(sanitizer.sanitizeScore).toHaveBeenCalledWith(82);
    expect(cache.set).toHaveBeenCalledWith('pm-1', dto, result);
  });

  it('sanitizes every variant, not just the base result', async () => {
    await controller.checkFeasibility(dto, req);

    expect(sanitizer.sanitizeCount).toHaveBeenCalledWith(12);
    expect(sanitizer.sanitizeScore).toHaveBeenCalledWith(88);
  });

  it('scopes the cache lookup and write to the requesting user, not a global key', async () => {
    await controller.checkFeasibility(dto, req);

    expect(cache.get).toHaveBeenCalledWith('pm-1', dto);
    expect(cache.set).toHaveBeenCalledWith('pm-1', dto, expect.anything());
  });

  it('caches the sanitized response, not the raw scoring result', async () => {
    sanitizer.sanitizeCount.mockReturnValue(5); // bucketed, different from the raw 7
    sanitizer.sanitizeScore.mockReturnValue(80);

    await controller.checkFeasibility(dto, req);

    const [, , cachedPayload] = cache.set.mock.calls[0];
    expect(cachedPayload.eligibleCount).toBe(5);
    expect(cachedPayload.topScore).toBe(80);
  });

  it('preserves variant order in the response', async () => {
    feasibilityService.checkFeasibility.mockResolvedValue({
      eligibleCount: 1,
      topScore: 50,
      variants: [
        { label: 'Budget +15%', eligibleCount: 2, topScore: 60 },
        { label: 'Minimum competency −1 level', eligibleCount: 3, topScore: 70 },
      ],
    });

    const result = await controller.checkFeasibility(dto, req);

    expect(result.variants.map((v: any) => v.label)).toEqual([
      'Budget +15%',
      'Minimum competency −1 level',
    ]);
  });
});