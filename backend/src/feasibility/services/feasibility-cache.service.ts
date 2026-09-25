// feasibility/feasibility-cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';
import { FeasibilityCheckResponse } from '../interface/feasibility-response.interface';

const CACHE_TTL_SECONDS = 20; // short, staleness should be barely perceptible
const CACHE_KEY_PREFIX = 'feasibility';

@Injectable()
export class FeasibilityCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private buildKey(userId: string, spec: FeasibilityCheckRequestDto): string {
    const hash = createHash('sha256').update(JSON.stringify(spec)).digest('hex');
    return `${CACHE_KEY_PREFIX}:${userId}:${hash}`;
  }

  async get(
    userId: string,
    spec: FeasibilityCheckRequestDto,
  ): Promise<FeasibilityCheckResponse | null> {
    const cached = await this.redis.get(this.buildKey(userId, spec));
    return cached ? (JSON.parse(cached) as FeasibilityCheckResponse) : null;
  }

  async set(
    userId: string,
    spec: FeasibilityCheckRequestDto,
    result: FeasibilityCheckResponse,
  ): Promise<void> {
    await this.redis.set(
      this.buildKey(userId, spec),
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS,
    );
  }
}