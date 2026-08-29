import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
    providers: [
        {
            provide: 'REDIS_CLIENT',
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

                const client = new Redis(redisUrl, {
                    maxRetriesPerRequest: null,
                });

                client.on('error', (err) => {
                    console.error('Redis Client Error:', err);
                });

                client.on('ready', () => {
                    console.log('Redis Client successfully connected');
                });

                return client;
            },
        },
    ],
    exports: ['REDIS_CLIENT'],
})
export class RedisModule { }