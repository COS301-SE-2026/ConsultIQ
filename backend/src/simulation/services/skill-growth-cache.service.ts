import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { SkillGrowthResponse } from '../interfaces/skill-growth-response.interface';

const CACHE_TTL_SECONDS = 120;
const CACHE_KEY_PREFIX = 'skill-growth';

@Injectable()
export class SkillGrowthCacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private buildKey(userId: string): string {
    return `${CACHE_KEY_PREFIX}:${userId}`;
  }

  async get(userId: string): Promise<SkillGrowthResponse | null> {
    const cached = await this.redis.get(this.buildKey(userId));
    return cached ? (JSON.parse(cached) as SkillGrowthResponse) : null;
  }

  async set(userId: string, response: SkillGrowthResponse): Promise<void> {
    await this.redis.set(
      this.buildKey(userId),
      JSON.stringify(response),
      'EX',
      CACHE_TTL_SECONDS,
    );
  }
}