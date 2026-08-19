import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisUtilityService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisUtilityService.name);
    public readonly redisClient: Redis;

    constructor(private readonly configService: ConfigService) {
        const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        this.redisClient = new Redis(redisUrl);
    }
    async onModuleDestroy() {
        await this.redisClient.quit();
    }

    async invalidateCacheByPattern(pattern: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const stream = this.redisClient.scanStream({
                match: pattern,
                count: 100,
            });

            const keysToDelete: string[] = [];

            stream.on('data', (keys: string[]) => {
                if (keys.length > 0) {
                    keysToDelete.push(...keys);
                }
            });

            stream.on('end', () => {

                void (async () => {
                    try {
                        if (keysToDelete.length > 0) {
                            const pipeline = this.redisClient.pipeline();
                            keysToDelete.forEach((key) => pipeline.del(key));
                            await pipeline.exec();
                            this.logger.log(`Cache Invalidated: Cleared ${keysToDelete.length} stale pages for pattern: ${pattern}.`);
                        }
                        resolve();
                    } catch (error) {

                        reject(error instanceof Error ? error : new Error(String(error)));
                    }
                })();
            });

            stream.on('error', (error) => {
                reject(error instanceof Error ? error : new Error(String(error)));
            });
        });
    }
}