import { SkillGapService, getValidCompetencies } from './skill-gap.service';
import { PrismaClient, CompetencyLevel } from '@prisma/client';

jest.mock('@prisma/client', () => {
    const mPrismaClient = {
        project: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        consultant: {
            count: jest.fn(),
        },
    };
    return {
        PrismaClient: jest.fn(() => mPrismaClient),
        CompetencyLevel: {
            BEGINNER: 'BEGINNER',
            INTERMEDIATE: 'INTERMEDIATE',
            EXPERT: 'EXPERT',
        },
        ProjectStatus: { OPEN: 'OPEN', IN_PROGRESS: 'IN_PROGRESS' },
        ConsultantAvailability: { AVAILABLE: 'AVAILABLE' },
    };
});

describe('Skill Gap Analysis', () => {
    let service: SkillGapService;
    let prismaMock: any;

    beforeEach(() => {
        service = new SkillGapService();
        prismaMock = new PrismaClient();
        jest.clearAllMocks();
    });

    // --- Helper functions ---
    describe('getValidCompetencies', () => {
        it('should return all levels when minimum is BEGINNER', () => {
            const result = getValidCompetencies(CompetencyLevel.BEGINNER);
            expect(result).toEqual(['BEGINNER', 'INTERMEDIATE', 'EXPERT']);
        });

        it('should return INTERMEDIATE and EXPERT when minimum is INTERMEDIATE', () => {
            const result = getValidCompetencies(CompetencyLevel.INTERMEDIATE);
            expect(result).toEqual(['INTERMEDIATE', 'EXPERT']);
        });

        it('should return only EXPERT when minimum is EXPERT', () => {
            const result = getValidCompetencies(CompetencyLevel.EXPERT);
            expect(result).toEqual(['EXPERT']);
        });
    });

    describe('SkillGapService', () => {

        describe('getProjectSkillGapAnalysis', () => {
            it('should throw an error if the project does not exist', async () => {
                prismaMock.project.findUnique.mockResolvedValue(null);

                await expect(service.getProjectSkillGapAnalysis('invalid-id'))
                    .rejects
                    .toThrow('Project not found');
            });

            it('should correctly calculate coverage percentages and severities', async () => {
                // Mock a project needing a team of 4, with 3 required skills
                prismaMock.project.findUnique.mockResolvedValue({
                    id: 'proj-1',
                    projectName: 'Alpha Upgrade',
                    teamSize: 4,
                    skills: [
                        { skillId: 'skill-1', competency: 'INTERMEDIATE', skill: { id: 'skill-1', name: 'React' } },
                        { skillId: 'skill-2', competency: 'BEGINNER', skill: { id: 'skill-2', name: 'NodeJS' } },
                        { skillId: 'skill-3', competency: 'EXPERT', skill: { id: 'skill-3', name: 'AWS' } },
                    ],
                });

                prismaMock.consultant.count
                    .mockResolvedValueOnce(5) // React: 5 available (Needs 4 = >100% -> COVERED)
                    .mockResolvedValueOnce(2) // NodeJS: 2 available (Needs 4 = 50% -> AT_RISK)
                    .mockResolvedValueOnce(0); // AWS: 0 available (Needs 4 = 0% -> CRITICAL)

                const result = await service.getProjectSkillGapAnalysis('proj-1');

                expect(result.summary).toEqual({
                    overallCoveragePercent: 50,
                    adequatelyCoveredCount: 1,
                    atRiskCount: 1,
                    criticalCount: 1,
                });

                expect(result.skills[0].coveragePercent).toBe(100);
                expect(result.skills[0].severity).toBe('COVERED');

                expect(result.skills[1].coveragePercent).toBe(50);
                expect(result.skills[1].severity).toBe('AT_RISK');

                expect(result.skills[2].coveragePercent).toBe(0);
                expect(result.skills[2].severity).toBe('CRITICAL');
            });
        });

        describe('getPortfolioSkillGapAnalysis', () => {
            it('should aggregate portfolio skills and generate alerts for at-risk/critical projects', async () => {

                prismaMock.project.findMany.mockResolvedValue([
                    {
                        id: 'proj-2',
                        projectName: 'Beta Launch',
                        teamSize: 2,
                        skills: [
                            { skillId: 's-1', competency: 'BEGINNER', skill: { name: 'Python' } },
                        ],
                    }
                ]);

                jest.spyOn(service, 'getProjectSkillGapAnalysis').mockResolvedValue({
                    projectId: 'proj-2',
                    projectName: 'Beta Launch',
                    summary: { overallCoveragePercent: 50, adequatelyCoveredCount: 0, atRiskCount: 1, criticalCount: 0 },
                    skills: [
                        {
                            skillId: 's-1',
                            skillName: 'Python',
                            requiredCount: 2,
                            availableCount: 1,
                            coveragePercent: 50,
                            severity: 'AT_RISK'
                        }
                    ]
                });

                prismaMock.consultant.count.mockResolvedValue(1);

                const result = await service.getPortfolioSkillGapAnalysis();

                expect(result.alerts).toHaveLength(1);
                expect(result.alerts[0].projectName).toBe('Beta Launch');
                expect(result.alerts[0].severity).toBe('AT_RISK');
                expect(result.alerts[0].gappedSkills[0].skillName).toBe('Python');

                expect(result.skills).toHaveLength(1);
                expect(result.skills[0].requiredCount).toBe(2);
                expect(result.skills[0].severity).toBe('AT_RISK');
            });
        });
    });
});