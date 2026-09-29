import { Test, TestingModule } from '@nestjs/testing';
import { SkillGrowthCacheService } from './skill-growth-cache.service';
import { SkillGrowthResponse } from '../interfaces/skill-growth-response.interface';

describe('SkillGrowthCacheService', () => {
  let service: SkillGrowthCacheService;
  let redisMock: { get: jest.Mock; set: jest.Mock };

  const response: SkillGrowthResponse = {
    eligibleNow: 8,
    pipelineSize: 24,
    recommendations: [
      { skillName: 'AWS', newlyEligibleProjectCount: 2, totalScoreDelta: 30, projectsTested: 3, projectedEligibleCount: 10 },
    ],
  };

  beforeEach(async () => {
    redisMock = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SkillGrowthCacheService, { provide: 'REDIS_CLIENT', useValue: redisMock }],
    }).compile();

    service = module.get(SkillGrowthCacheService);
  });

  it('returns null on a cache miss', async () => {
    redisMock.get.mockResolvedValue(null);
    expect(await service.get('user-1')).toBeNull();
  });

  it('returns the parsed response on a cache hit', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify(response));
    expect(await service.get('user-1')).toEqual(response);
  });

  it('keys the cache by user id under the skill-growth prefix', async () => {
    redisMock.get.mockResolvedValue(null);
    await service.get('user-1');
    expect(redisMock.get).toHaveBeenCalledWith('skill-growth:user-1');
  });

  it('uses different keys for different users', async () => {
    redisMock.get.mockResolvedValue(null);
    await service.get('user-1');
    await service.get('user-2');
    expect(redisMock.get.mock.calls[0][0]).not.toEqual(redisMock.get.mock.calls[1][0]);
  });

  it('stores the response as JSON with a 120 second TTL', async () => {
    await service.set('user-1', response);
    expect(redisMock.set).toHaveBeenCalledWith(
      'skill-growth:user-1',
      JSON.stringify(response),
      'EX',
      120,
    );
  });

  it('round-trips an empty recommendations list as a valid cached value', async () => {
    const empty: SkillGrowthResponse = { eligibleNow: 0, pipelineSize: 0, recommendations: [] };
    redisMock.get.mockResolvedValue(JSON.stringify(empty));
    expect(await service.get('user-1')).toEqual(empty);
  });
});