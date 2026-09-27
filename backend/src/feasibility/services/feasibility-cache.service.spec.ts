import { Test, TestingModule } from '@nestjs/testing';
import { FeasibilityCacheService } from './feasibility-cache.service';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';
import { FeasibilityCheckResponse } from '../interface/feasibility-response.interface';

describe('FeasibilityCacheService', () => {
  let service: FeasibilityCacheService;
  let redisMock: { get: jest.Mock; set: jest.Mock };

  const spec = { budget: 100000, skills: [] } as unknown as FeasibilityCheckRequestDto;
  const response: FeasibilityCheckResponse = {
    eligibleCount: 5,
    topScore: 80,
    variants: [],
  };

  beforeEach(async () => {
    redisMock = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeasibilityCacheService,
        { provide: 'REDIS_CLIENT', useValue: redisMock },
      ],
    }).compile();

    service = module.get(FeasibilityCacheService);
  });

  describe('get', () => {
    it('returns null on a cache miss', async () => {
      redisMock.get.mockResolvedValue(null);
      const result = await service.get('user-1', spec);
      expect(result).toBeNull();
    });

    it('returns the parsed value on a cache hit', async () => {
      redisMock.get.mockResolvedValue(JSON.stringify(response));
      const result = await service.get('user-1', spec);
      expect(result).toEqual(response);
    });

    it('builds a key scoped to the user id', async () => {
      redisMock.get.mockResolvedValue(null);
      await service.get('user-1', spec);
      const calledKey = redisMock.get.mock.calls[0][0];
      expect(calledKey).toContain('user-1');
      expect(calledKey).toMatch(/^feasibility:/);
    });

    it('produces different keys for different users given the same spec', async () => {
      redisMock.get.mockResolvedValue(null);
      await service.get('user-1', spec);
      await service.get('user-2', spec);

      const [keyA] = redisMock.get.mock.calls[0];
      const [keyB] = redisMock.get.mock.calls[1];
      expect(keyA).not.toEqual(keyB);
    });

    it('produces different keys for different specs given the same user', async () => {
      redisMock.get.mockResolvedValue(null);
      const specB = { ...spec, budget: 200000 } as FeasibilityCheckRequestDto;

      await service.get('user-1', spec);
      await service.get('user-1', specB);

      const [keyA] = redisMock.get.mock.calls[0];
      const [keyB] = redisMock.get.mock.calls[1];
      expect(keyA).not.toEqual(keyB);
    });
  });

  describe('set', () => {
    it('stores the value as JSON with a 20 second TTL', async () => {
      await service.set('user-1', spec, response);

      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('feasibility:user-1:'),
        JSON.stringify(response),
        'EX',
        20,
      );
    });
  });
});