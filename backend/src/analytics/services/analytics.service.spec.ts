import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { distinct } from 'rxjs';

const mockPrismaService = {
    consultant: {
        count: jest.fn(),
    },
    skill: {
        findMany: jest.fn(),
    },
    projectPlacement: {
        findMany: jest.fn(),
    },
};

describe('AnalyticsService', () => {
    let service: AnalyticsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);

        jest.clearAllMocks();
    });

    describe('getSkillDistribution', () => {
        it('return an empty array when there are not skill categories', async () => {
            mockPrismaService.consultant.count.mockResolvedValue(10);
            mockPrismaService.skill.findMany.mockResolvedValue([]);

            const result = await service.getSkillDistribution();
            expect(result).toEqual([]);
        });

        it('returns one entry per distinct skill category', async () =>{
            mockPrismaService.consultant.count
                .mockResolvedValueOnce(20) //total pool
                .mockResolvedValueOnce(5) //cloud
                .mockResolvedValueOnce(8) // Data & analytics

            mockPrismaService.skill.findMany.mockResolvedValueOnce([
                { category: 'Cloud' },
                { category: 'Data & Analytics' },
            ]);

            const result = await service.getSkillDistribution();
            
            expect(result).toEqual([
                { category: 'Cloud', consultantCount: 5, percentageOfPool: 25 },
                { category: 'Data & Analytics', consultantCount: 8, percentageOfPool: 40 },
            ]);
        });
        it('queries distinct categories from the skill table', async () => {
            mockPrismaService.consultant.count.mockResolvedValue(0);
            mockPrismaService.skill.findMany.mockResolvedValue([]);

            await service.getSkillDistribution();

            expect(mockPrismaService.skill.findMany).toHaveBeenCalledWith({
                distinct: [ 'category' ],
                select: { category: true },
            });
        });

        it('counts consultants who have at least one skill in the category, via the skill relation', async () => {
            mockPrismaService.consultant.count
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(3)
            mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }]);

            await service.getSkillDistribution();

            expect(mockPrismaService.consultant.count).toHaveBeenNthCalledWith(2, {
                where: {
                    skills: {
                        some: {
                            skill: {category: 'Cloud'},
                        },
                    },
                },
            });
        });

        it('does not double-count a consultant with two skill in the same category (Prisma `some` naturally dedupes)', async () => {
            mockPrismaService.consultant.count
                .mockResolvedValueOnce(10)
                .mockResolvedValueOnce(1)
            mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }]);

            const result = await service.getSkillDistribution();

            expect(result[0].consultantCount).toBe(1);
        });

        it('rounds percentageOfPool to the nearest whole number', async () => {
            mockPrismaService.consultant.count
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(1)
            mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'UX/UI Design' }]);

            const result = await service.getSkillDistribution();

            expect(result[0].percentageOfPool).toBe(33);
        });

        it('returns 0% for every category when the consultant pool is empty', async () => {
            mockPrismaService.consultant.count
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0)
            mockPrismaService.skill.findMany.mockResolvedValue([{ category: 'Cloud' }])

            const result = await service.getSkillDistribution();
            expect(result[0]).toEqual({
                category: 'Cloud',
                consultantCount: 0,
                percentageOfPool: 0
            });
        });
    });
})