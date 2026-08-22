import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisUtilityService } from './redis-utility.service';
import { EventEmitter } from 'events';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

const mockPipeline = {
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(undefined),
};

class MockStream extends EventEmitter { }
let mockStreamInstance: MockStream;

const mockRedisClient = {
    quit: jest.fn(),
    scanStream: jest.fn().mockImplementation(() => {
        mockStreamInstance = new MockStream();
        return mockStreamInstance;
    }),
    pipeline: jest.fn().mockReturnValue(mockPipeline),
};

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => mockRedisClient);
});

describe('RedisUtilityService', () => {
    let service: RedisUtilityService;
    let configService: ConfigService;

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RedisUtilityService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<RedisUtilityService>(RedisUtilityService);
        configService = module.get<ConfigService>(ConfigService);
        jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    });

    it('should be defined and initialize Redis with correct URL', () => {
        expect(service).toBeDefined();
        expect(Redis).toHaveBeenCalled();
    });

    it('should quit Redis client on module destroy', () => {
        service.onModuleDestroy();
        expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
    });

    describe('invalidateCacheByPattern', () => {
        it('should successfully clear cache when keys are found', async () => {
            const pattern = 'cache:projects:*';

            const invalidatePromise = service.invalidateCacheByPattern(pattern);
            expect(mockRedisClient.scanStream).toHaveBeenCalledWith({
                match: pattern,
                count: 100,
            });

            mockStreamInstance.emit('data', ['cache:projects:1', 'cache:projects:2']);
            mockStreamInstance.emit('end');

            await invalidatePromise;

            expect(mockRedisClient.pipeline).toHaveBeenCalledTimes(1);
            expect(mockPipeline.del).toHaveBeenCalledWith('cache:projects:1');
            expect(mockPipeline.del).toHaveBeenCalledWith('cache:projects:2');
            expect(mockPipeline.exec).toHaveBeenCalledTimes(1);

            expect(Logger.prototype.log).toHaveBeenCalledWith(
                'Cache Invalidated: Cleared 2 stale pages for pattern: cache:projects:*.'
            );
        });

        it('should resolve without executing pipeline if no keys are found', async () => {
            const invalidatePromise = service.invalidateCacheByPattern('cache:empty:*');


            mockStreamInstance.emit('data', []);
            mockStreamInstance.emit('end');

            await invalidatePromise;

            expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
            expect(mockPipeline.exec).not.toHaveBeenCalled();
        });

        it('should reject if the stream encounters an error', async () => {
            const invalidatePromise = service.invalidateCacheByPattern('cache:error:*');

            const streamError = new Error('Stream failed');
            mockStreamInstance.emit('error', streamError);

            await expect(invalidatePromise).rejects.toThrow('Stream failed');
            expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
        });

        it('should reject if pipeline execution fails', async () => {
            mockPipeline.exec.mockRejectedValueOnce(new Error('Redis pipeline error'));

            const invalidatePromise = service.invalidateCacheByPattern('cache:pipeline-error:*');
            mockStreamInstance.emit('data', ['cache:1']);
            mockStreamInstance.emit('end');

            await expect(invalidatePromise).rejects.toThrow('Redis pipeline error');
        });
    });
});