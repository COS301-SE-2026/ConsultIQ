import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthController', () => {
    let controller: HealthController;
    let healthCheckService: jest.Mocked<HealthCheckService>;
    let prismaHealthIndicator: jest.Mocked<PrismaHealthIndicator>;
    let prismaService: PrismaService;

    const mockHealthResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: HealthCheckService,
                    useValue: {
                        check: jest.fn(),
                    },
                },
                {
                    provide: PrismaHealthIndicator,
                    useValue: {
                        pingCheck: jest.fn(),
                    },
                },
                {
                    provide: PrismaService,
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        healthCheckService = module.get(HealthCheckService) as any;
        prismaHealthIndicator = module.get(PrismaHealthIndicator) as any;
        prismaService = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('check', () => {
        it('should return the overall health check result', async () => {
            healthCheckService.check.mockResolvedValue(mockHealthResult as any);

            const result = await controller.check();

            expect(result).toEqual(mockHealthResult);
            expect(healthCheckService.check).toHaveBeenCalledTimes(1);

            expect(healthCheckService.check.mock.calls[0][0]).toHaveLength(1);
        });

        it('should correctly configure and call the Prisma pingCheck indicator', async () => {
            healthCheckService.check.mockResolvedValue(mockHealthResult as any);
            prismaHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });

            await controller.check();

            const indicatorFunctions = healthCheckService.check.mock.calls[0][0];
            const prismaIndicatorFn = indicatorFunctions[0];

            const indicatorResult = await prismaIndicatorFn();
            expect(prismaHealthIndicator.pingCheck).toHaveBeenCalledWith('database', prismaService);
            expect(indicatorResult).toEqual({ database: { status: 'up' } });
        });
    });
});