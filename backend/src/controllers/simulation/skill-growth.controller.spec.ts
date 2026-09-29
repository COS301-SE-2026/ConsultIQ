import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SkillGrowthController } from './skill-growth.controller';
import { SimulationService } from '../../simulation/services/simulation.service';
import { SkillGrowthCacheService } from '../../simulation/services/skill-growth-cache.service';
import { SkillGrowthThrottlerGuard } from '../../simulation/services/skill-growth-throttler.guard';
import { SkillGrowthResponse } from '../../simulation/interfaces/skill-growth-response.interface';

describe('SkillGrowthController', () => {
  let controller: SkillGrowthController;
  let simulationService: { getSkillRecommendationsForUser: jest.Mock };
  let cache: { get: jest.Mock; set: jest.Mock };

  const response: SkillGrowthResponse = {
    eligibleNow: 8,
    pipelineSize: 24,
    recommendations: [
      {
        skillName: 'AWS',
        newlyEligibleProjectCount: 2,
        totalScoreDelta: 30,
        projectsTested: 3,
        projectedEligibleCount: 10,
      },
    ],
  };
  const req = { user: { userId: 'user-1' } };

  beforeEach(async () => {
    simulationService = { getSkillRecommendationsForUser: jest.fn().mockResolvedValue(response) };
    cache = { get: jest.fn().mockResolvedValue(null), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkillGrowthController],
      providers: [
        { provide: SimulationService, useValue: simulationService },
        { provide: SkillGrowthCacheService, useValue: cache },
      ],
    })
      .overrideGuard(SkillGrowthThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SkillGrowthController);
  });

  it('returns the cached response and skips the simulation on a cache hit', async () => {
    const cached: SkillGrowthResponse = { eligibleNow: 0, pipelineSize: 0, recommendations: [] };
    cache.get.mockResolvedValue(cached);

    const result = await controller.getSkillGrowth(req);

    expect(result).toBe(cached);
    expect(simulationService.getSkillRecommendationsForUser).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('computes, caches, and returns the response on a cache miss', async () => {
    const result = await controller.getSkillGrowth(req);

    expect(result).toBe(response);
    expect(simulationService.getSkillRecommendationsForUser).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledWith('user-1', response);
  });

  it('derives identity only from the JWT user id — cache and service both receive it', async () => {
    await controller.getSkillGrowth(req);

    expect(cache.get).toHaveBeenCalledWith('user-1');
    expect(simulationService.getSkillRecommendationsForUser).toHaveBeenCalledWith('user-1');
  });

  it('caches an empty recommendations list too', async () => {
    const empty: SkillGrowthResponse = { eligibleNow: 0, pipelineSize: 0, recommendations: [] };
    simulationService.getSkillRecommendationsForUser.mockResolvedValue(empty);

    await controller.getSkillGrowth(req);

    expect(cache.set).toHaveBeenCalledWith('user-1', empty);
  });

  it('throws UnauthorizedException, touching neither cache nor service, when the request has no user', async () => {
    await expect(controller.getSkillGrowth({})).rejects.toThrow(UnauthorizedException);

    expect(cache.get).not.toHaveBeenCalled();
    expect(simulationService.getSkillRecommendationsForUser).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when the user has no userId', async () => {
    await expect(controller.getSkillGrowth({ user: {} })).rejects.toThrow(UnauthorizedException);
  });

  it('propagates NotFoundException from the service and caches nothing', async () => {
    simulationService.getSkillRecommendationsForUser.mockRejectedValue(new NotFoundException());

    await expect(controller.getSkillGrowth(req)).rejects.toThrow(NotFoundException);
    expect(cache.set).not.toHaveBeenCalled();
  });
});