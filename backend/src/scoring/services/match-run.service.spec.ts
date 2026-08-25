import { Test, TestingModule } from '@nestjs/testing';
import { MatchRunService } from './match-run.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchRunStatus } from '@prisma/client';
import { ScoringPipelineService } from './scoring-pipeline.service';
import { MatchRunAggregationService } from './match-run-aggregation.service';
import { ScoringFactor } from '../enums/scoring-factor.enum';
import { getQueueToken } from '@nestjs/bullmq';


describe('MatchRunService', () => {
    let service: MatchRunService;
    let mockPrisma: any;
    let mockScoringPipeline: any;
    let mockAggregation: any;
    let mockDataIngestion: any;
    let mockQueue: any;

    beforeEach(async () => {
        mockPrisma = {
            project: { findUnique: jest.fn(), },
            consultant: { findMany: jest.fn() },
            projectPlacement: {
                findMany: jest.fn().mockResolvedValue([]),
                groupBy: jest.fn().mockResolvedValue([]),
            },
            matchRun: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
            matchRunResult: { createMany: jest.fn(), deleteMany: jest.fn() },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        }

        mockScoringPipeline = {
            scoreConsultant: jest.fn(),
        }

        mockAggregation = {
            buildResults: jest.fn(),
        }

        mockDataIngestion = {
            getProjectScoringContext: jest.fn(),
        }

        mockQueue = {
            add: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchRunService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ScoringPipelineService, useValue: mockScoringPipeline },
                { provide: MatchRunAggregationService, useValue: mockAggregation },
                { provide: DataIngestionService, useValue: mockDataIngestion },
                { provide: getQueueToken('match-run'), useValue: mockQueue },
            ],
        }).compile();

        service = module.get<MatchRunService>(MatchRunService);
    })


    afterEach(() => {
        jest.clearAllMocks();
    })

    describe('executeMatchRun', () => {

        it('successfully ran match run', async () => {
            const mockProject = {
                id: 'project-01',
                status: 'OPEN',
                budget: 150,
                city: 'Pretoria',
                province: 'Gauteng',
                startDate: new Date('2026-08-01T00:00:00Z'),
                endDate: new Date('2026-12-01T00:00:00Z'),
                allocation: 100,
                skills: [{ skill: { name: 'Java' }, competency: 3, mandatory: true }]
            };

            const mockConsultants = [
                {
                    id: 'consultant-01',
                    costToCompany: 100,
                    city: 'Pretoria',
                    province: 'Gauteng',
                    user: { fullName: 'Benjamin Franklin' },
                    skills: [{ skill: { name: 'React' }, competencyLevel: 4 }],
                },
            ];

            const mockWeights = { [ScoringFactor.SKILL_ALIGNMENT]: 0.5 };
            const mockScoringOutcome = { excluded: false, factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 }, redistributedWeights: mockWeights };
            const mockAggregatedResults = [{ consultantId: 'consultant-01', finalScore: 80, rank: 1, factorBreakdown: [] }];

            mockPrisma.project.findUnique.mockResolvedValue(mockProject);
            mockPrisma.consultant.findMany.mockResolvedValue(mockConsultants);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: mockWeights });
            mockScoringPipeline.scoreConsultant.mockResolvedValue(mockScoringOutcome);
            mockAggregation.buildResults.mockReturnValue(mockAggregatedResults);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-01' });

            const result = await service.executeMatchRun('project-01', 'user-01');

            expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({ where: { id: 'project-01' }, include: expect.any(Object) });
            expect(mockPrisma.consultant.findMany).toHaveBeenCalled();
            expect(mockPrisma.projectPlacement.groupBy).toHaveBeenCalledTimes(1);
            expect(mockDataIngestion.getProjectScoringContext).toHaveBeenCalledTimes(1);
            expect(mockScoringPipeline.scoreConsultant).toHaveBeenCalledTimes(1);
            expect(mockAggregation.buildResults).toHaveBeenCalledTimes(1);
            expect(mockPrisma.matchRun.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    status: MatchRunStatus.COMPLETED,
                    totalConsultantsScored: 1,
                })
            })
            expect(mockPrisma.matchRunResult.createMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual({ runId: 'run-01', results: mockAggregatedResults });
        })

        it('evaluates the complete active consultant pool', async () => {
            const mockProject = {
                id: 'project-01',
                status: 'OPEN',
                budget: 150,
                city: 'Pretoria',
                province: 'Gauteng',
                startDate: new Date('2026-08-01T00:00:00Z'),
                endDate: new Date('2026-12-01T00:00:00Z'),
                allocation: 100,
                skills: [
                    { skillId: 'skill-java', skill: { name: 'Java' }, competency: 3, mandatory: true },
                    { skillId: 'skill-react', skill: { name: 'React' }, competency: 3, mandatory: true },
                ],
            };
            const matchingConsultant = {
                id: 'consultant-01',
                costToCompany: 100,
                city: 'Pretoria',
                province: 'Gauteng',
                user: { fullName: 'Consultant', email: 'consultant@example.com' },
                skills: [],
                placements: [],
            };
            const mockWeights = { [ScoringFactor.SKILL_ALIGNMENT]: 1 };

            mockPrisma.project.findUnique.mockResolvedValue(mockProject);
            mockPrisma.consultant.findMany.mockResolvedValue([matchingConsultant]);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: mockWeights });
            mockScoringPipeline.scoreConsultant.mockResolvedValue({
                excluded: false,
                factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 1 },
                redistributedWeights: mockWeights,
            });
            mockAggregation.buildResults.mockReturnValue([]);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-01' });

            await service.executeMatchRun('project-01', 'user-01');

            expect(mockPrisma.consultant.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: { user: { status: 'ACTIVE' } } }),
            );
            expect(mockScoringPipeline.scoreConsultant).toHaveBeenCalledTimes(1);
        });

        it('throws NotFoundException if project does not exist', async () => {
            mockPrisma.project.findUnique.mockResolvedValue(null);
            await expect(service.executeMatchRun('invalid-id', 'user-1')).rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException if project is CLOSED', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'CLOSED' });
            await expect(service.executeMatchRun('proj-1', 'user-1')).rejects.toThrow(BadRequestException);
        });

        it('throws BadRequestException if there are no active consultants found ', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-01', status: 'OPEN' });
            mockPrisma.consultant.findMany.mockResolvedValue([]);
            await expect(service.executeMatchRun('proj-01', 'user-01')).rejects.toThrow(BadRequestException);
        });
        it('handles project with no endDate', async () => {
            const mockProject = {
                id: 'project-01',
                status: 'OPEN',
                startDate: new Date('2026-08-01T00:00:00Z'),
                endDate: null,
                skills: [{ skill: { name: 'Java' }, competency: 3, mandatory: true }]
            };
            mockPrisma.project.findUnique.mockResolvedValue(mockProject);
            mockPrisma.consultant.findMany.mockResolvedValue([{ id: 'c1', skills: [] }]);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });
            mockScoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false });
            mockAggregation.buildResults.mockReturnValue([]);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-01' });

            await service.executeMatchRun('project-01', 'user-01');

            expect(mockPrisma.projectPlacement.groupBy).toHaveBeenCalled();
        });

        it('handles scoring errors without crashing and increments errorCount', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'OPEN',
                startDate: new Date('2026-08-01T00:00:00Z'), // <-- Added missing property
                skills: [{ skill: { name: 'Java' } }]
            });
            mockPrisma.consultant.findMany.mockResolvedValue([
                { id: 'c1', skills: [] },
                { id: 'c2', skills: [] }
            ]);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });

            mockScoringPipeline.scoreConsultant
                .mockResolvedValueOnce({ excluded: false })
                .mockRejectedValueOnce(new Error('Scoring failed'));

            mockAggregation.buildResults.mockReturnValue([{ consultantId: 'c1' }]);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-1' });

            const result = await service.executeMatchRun('proj-1', 'user-01');
            expect(result.results.length).toBe(1);
        });

        it('updates existing run if existingRunId is provided', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'OPEN',
                startDate: new Date('2026-08-01T00:00:00Z'),
                skills: [{ skill: { name: 'Java' } }]
            });
            mockPrisma.consultant.findMany.mockResolvedValue([{ id: 'c1', skills: [] }]);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });
            mockScoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false });
            mockAggregation.buildResults.mockReturnValue([]);
            mockPrisma.matchRun.update.mockResolvedValue({ id: 'existing-run-id' });

            await service.executeMatchRun('proj-1', 'user-01', 'existing-run-id');

            expect(mockPrisma.matchRun.update).toHaveBeenCalled();
            expect(mockPrisma.matchRun.create).not.toHaveBeenCalled();
        });

        it('throws NotFoundException if project is not found', async () => {
            mockPrisma.project.findUnique.mockResolvedValue(null);


            await expect(service.executeMatchRun('invalid-id', 'user-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('throws BadRequestException if project status is not OPEN or IN_PROGRESS', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'CLOSED',
                skills: [{ id: 'skill-1' }]
            });


            await expect(service.executeMatchRun('proj-1', 'user-1'))
                .rejects.toThrow(BadRequestException);
        });

        it('handles null allocation sums gracefully when building allocations map', async () => {

            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1', status: 'OPEN', startDate: new Date(),
                skills: [{ skill: { name: 'Java' }, competency: 3, mandatory: true }]
            });
            mockPrisma.consultant.findMany.mockResolvedValue([{ id: 'c1', skills: [] }]);
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });
            mockScoringPipeline.scoreConsultant.mockResolvedValue({ excluded: false });
            mockAggregation.buildResults.mockReturnValue([]);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-1' });


            mockPrisma.projectPlacement.groupBy.mockResolvedValue([
                { consultantId: 'c1', _sum: { allocation: null } }
            ]);


            const result = await service.executeMatchRun('proj-1', 'user-01');
            expect(result.runId).toBe('run-1');
        });
    })


    describe('getMatchRun', () => {
        it('successefully retrieves match run results', async () => {
            const mockRun = {
                id: 'run-01',
                projectId: 'project-01',
                results: [
                    { consultantId: 'consultant-01', totalScore: 90, rank: 1, factorScores: [], consultant: { user: { fullName: 'Benji', email: 'Benji@gmail.com' } } },
                ],
            };

            mockPrisma.matchRun.findFirst.mockResolvedValue(mockRun);

            const result = await service.getMatchRun('project-01', 'run-01');

            expect(result).toEqual([{
                consultantId: 'consultant-01',
                consultantName: 'Benji',
                consultantEmail: 'Benji@gmail.com',
                finalScore: 90,
                rank: 1,
                factorBreakdown: [],
            }]);
        });
    })


    describe('getMatchRunStats', () => {
        it('successefully retrieves match run stats', async () => {
            const projectId = 'project-01';
            const runId = 'runId-01';

            const mockMatchRun = {
                totalConsultantsScored: 10,
                totalConsultantsExcluded: 2,
                totalConsultantsPlaced: 3,
            }

            mockPrisma.matchRun.findUnique.mockResolvedValue(mockMatchRun);

            const result = await service.getMatchRunStats('project-01', 'runId-01');

            expect(mockPrisma.matchRun.findUnique).toHaveBeenCalledWith({
                where: { id: runId, projectId },
                select: {
                    totalConsultantsScored: true,
                    totalConsultantsExcluded: true,
                    totalConsultantsPlaced: true,
                },
            });

            expect(result).toEqual({
                totalEvaluated: 12,
                totalExcluded: 2,
                totalMatched: 10,
                totalPlaced: 3,
            });
        });
    });
    describe('enqueueMatchRun', () => {
        it('successfully enqueues a match run', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'OPEN',
                skills: [{ id: 'skill-1' }],
            });
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-1' });

            const result = await service.enqueueMatchRun('proj-1', 'user-1');

            expect(result).toEqual({ runId: 'run-1', status: 'IN_PROGRESS' });
            expect(mockQueue.add).toHaveBeenCalledWith(
                'score-match-run',
                { runId: 'run-1', projectId: 'proj-1', executedByUserId: 'user-1' },
                expect.any(Object)
            );
        });

        it('throws BadRequestException if project has no required skills', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'OPEN', skills: [] });
            await expect(service.enqueueMatchRun('proj-1', 'user-1')).rejects.toThrow(BadRequestException);
        });

        it('throws InternalServerErrorException if queue is not configured', async () => {

            const serviceWithoutQueue = new MatchRunService(
                mockPrisma,
                mockScoringPipeline,
                mockAggregation,
                mockDataIngestion,
                undefined
            );

            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'OPEN',
                skills: [{ id: 'skill-1' }],
            });

            await expect(serviceWithoutQueue.enqueueMatchRun('proj-1', 'user-1'))
                .rejects.toThrow('Match-run queue is not configured');
        });

        it('marks run as failed if queue throws an error', async () => {
            mockPrisma.project.findUnique.mockResolvedValue({
                id: 'proj-1',
                status: 'OPEN',
                skills: [{ id: 'skill-1' }],
            });
            mockDataIngestion.getProjectScoringContext.mockResolvedValue({ activeWeights: {} });
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-1' });

            const mockError = new Error('Redis connection failed');
            mockQueue.add.mockRejectedValue(mockError);

            const markFailedSpy = jest.spyOn(service, 'markMatchRunFailed').mockResolvedValue();

            await expect(service.enqueueMatchRun('proj-1', 'user-1')).rejects.toThrow(mockError);
            expect(markFailedSpy).toHaveBeenCalledWith('run-1', mockError);
        });
    });


    describe('MatchRun Utilities', () => {
        describe('markMatchRunFailed', () => {
            it('extracts message if error is an instance of Error', async () => {
                await service.markMatchRunFailed('run-1', new Error('DB Crash'));
                expect(mockPrisma.matchRun.update).toHaveBeenCalledWith({
                    where: { id: 'run-1' },
                    data: { status: 'FAILED', errorMessage: 'DB Crash' },
                });
            });

            it('casts to string if error is not an Error instance', async () => {
                await service.markMatchRunFailed('run-1', 'String error message');
                expect(mockPrisma.matchRun.update).toHaveBeenCalledWith({
                    where: { id: 'run-1' },
                    data: { status: 'FAILED', errorMessage: 'String error message' },
                });
            });
        });

        describe('updateMatchRunProgress', () => {
            it('clamps progress between 0 and 100', async () => {
                await service.updateMatchRunProgress('run-1', 150);
                expect(mockPrisma.matchRun.update).toHaveBeenCalledWith({
                    where: { id: 'run-1' },
                    data: { progress: 100 },
                });

                await service.updateMatchRunProgress('run-1', -50);
                expect(mockPrisma.matchRun.update).toHaveBeenCalledWith({
                    where: { id: 'run-1' },
                    data: { progress: 0 },
                });
            });
        });

        describe('getMatchRunStatus', () => {
            it('returns mapped status if found', async () => {
                mockPrisma.matchRun.findFirst.mockResolvedValue({
                    id: 'run-1', status: 'IN_PROGRESS', progress: 50, errorMessage: null
                });

                const result = await service.getMatchRunStatus('proj-1', 'run-1');
                expect(result).toEqual({
                    runId: 'run-1', status: 'IN_PROGRESS', progress: 50, errorMessage: undefined
                });
            });

            it('throws NotFoundException if run does not exist', async () => {
                mockPrisma.matchRun.findFirst.mockResolvedValue(null);
                await expect(service.getMatchRunStatus('proj-1', 'run-1'))
                    .rejects.toThrow(NotFoundException);
            });
        });
    });
})