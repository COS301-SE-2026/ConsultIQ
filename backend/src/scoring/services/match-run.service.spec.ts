import { Test, TestingModule } from '@nestjs/testing';
import { MatchRunService } from './match-run.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataIngestionService } from './data-normalization/data-ingestion.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MatchRunStatus } from '@prisma/client';
import { ScoringPipelineService } from './scoring-pipeline.service';
import { MatchRunAggregationService } from './match-run-aggregation.service';
import { ScoringFactor } from '../enums/scoring-factor.enum';


describe('MatchRunService', () => {
    let service: MatchRunService;
    let mockPrisma: any;
    let mockScoringPipeline: any;
    let mockAggregation: any;
    let mockDataIngestion: any;

    beforeEach(async () => {
        mockPrisma = {
            project: { findUnique: jest.fn(), },
            consultant: { findMany: jest.fn() },
            matchRun: { create: jest.fn(), findFirst: jest.fn() },
            matchRunResult: { createMany: jest.fn() },
            $transaction: jest.fn((callback) => callback(mockPrisma)),
        }

        mockScoringPipeline = {
            scoreConsultant: jest.fn(),
        }

        mockAggregation = {
            buildResults: jest.fn(),
        }

        mockDataIngestion = {
            ingestData: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchRunService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: ScoringPipelineService, useValue: mockScoringPipeline },
                { provide: MatchRunAggregationService, useValue: mockAggregation },
                { provide: DataIngestionService, useValue: mockDataIngestion },
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
                }, //{
                //     id: 'consultant-02',
                //     costToCompany: 100,
                //     city: 'Cape Town',
                //     province: 'Western Cape',
                //     user: { fullName: 'Arnold Swartzannegar' },
                //     skills: [{ skill: { name: 'Java' }, competencyLevel: 2 }],
                // }, {
                //     id: 'consultant-03',
                //     costToCompany: 100,
                //     city: 'Johannesburg',
                //     province: 'Gauteng',
                //     user: { fullName: 'Bruce Lee' },
                //     skills: [{ skill: { name: 'Java' }, competencyLevel: 1 }],
                // },
            ];

            const mockWeights = { [ScoringFactor.SKILL_ALIGNMENT]: 0.5 };
            const mockScoringOutcome = { excluded: false, factorScores: { [ScoringFactor.SKILL_ALIGNMENT]: 0.8 }, redistributedWeights: mockWeights };
            const mockAggregatedResults = [{ consultantId: 'consultant-01', finalScore: 80, rank: 1, factorBreakdown: [] }];

            mockPrisma.project.findUnique.mockResolvedValue(mockProject);
            mockPrisma.consultant.findMany.mockResolvedValue(mockConsultants);
            mockDataIngestion.ingestData.mockResolvedValue({ activeWeights: mockWeights });
            mockScoringPipeline.scoreConsultant.mockResolvedValue(mockScoringOutcome);
            mockAggregation.buildResults.mockReturnValue(mockAggregatedResults);
            mockPrisma.matchRun.create.mockResolvedValue({ id: 'run-01' });

            const result = await service.executeMatchRun('project-01', 'user-01');

            expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({ where: { id: 'project-01' }, include: expect.any(Object) });
            expect(mockPrisma.consultant.findMany).toHaveBeenCalled();
            expect(mockDataIngestion.ingestData).toHaveBeenCalledTimes(1);
            expect(mockScoringPipeline.scoreConsultant).toHaveBeenCalledTimes(1);
            expect(mockAggregation.buildResults).toHaveBeenCalledTimes(1);
            expect(mockPrisma.matchRun.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    status: MatchRunStatus.COMPLETED,
                    totalConsultantsScored: 1,
                })
            })
            expect(mockPrisma.matchRunResult.createMany).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockAggregatedResults);
        })

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
    })


    describe('getMatchRun', () => {
        it('successefully retrieves match run results', async () => {
            const mockRun = {
                id: 'run-01',
                projectId: 'project-01',
                results: [
                    { consultantId: 'consultant-01', totalScore: 90, rank: 1, factorScores: [] },
                ],
            };

            mockPrisma.matchRun.findFirst.mockResolvedValue(mockRun);

            const result = await service.getMatchRun('project-01', 'run-01');

            expect(result).toEqual([{
                consultantId: 'consultant-01',
                finalScore: 90,
                rank: 1,
                factorBreakdown: [],
            }]);
        });
    })



})