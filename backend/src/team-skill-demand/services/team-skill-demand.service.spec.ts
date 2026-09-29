import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompetencyLevel, ProjectStatus } from '@prisma/client';
import { TeamSkillDemandService } from './team-skill-demand.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TeamSkillDemandService', () => {
  let service: TeamSkillDemandService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      consultantManager: { findMany: jest.fn() },
      consultant: { findMany: jest.fn() },
      project: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamSkillDemandService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TeamSkillDemandService);
  });

  it('throws NotFoundException when the manager has no assigned consultants', async () => {
    prisma.consultantManager.findMany.mockResolvedValue([]);

    await expect(service.getTeamSkillDemandForManager('user-1')).rejects.toThrow(NotFoundException);
    expect(prisma.consultant.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("resolves the manager's consultant ids before fetching anything else", async () => {
    prisma.consultantManager.findMany.mockResolvedValue([{ consultantId: 'c1' }, { consultantId: 'c2' }]);
    prisma.consultant.findMany.mockResolvedValue([]);
    prisma.project.findMany.mockResolvedValue([]);

    await service.getTeamSkillDemandForManager('user-1');

    expect(prisma.consultantManager.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { consultantId: true },
    });
    expect(prisma.consultant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['c1', 'c2'] } } }),
    );
  });

  it('scopes pipeline projects to OPEN and IN_PROGRESS only', async () => {
    prisma.consultantManager.findMany.mockResolvedValue([{ consultantId: 'c1' }]);
    prisma.consultant.findMany.mockResolvedValue([
      { id: 'c1', user: { fullName: 'Jane Doe', email: 'jane@consultiq.com' }, skills: [] },
    ]);
    prisma.project.findMany.mockResolvedValue([]);

    await service.getTeamSkillDemandForManager('user-1');

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: [ProjectStatus.OPEN, ProjectStatus.IN_PROGRESS] } },
      }),
    );
  });

  it('returns teamSize equal to the number of managed consultants', async () => {
    prisma.consultantManager.findMany.mockResolvedValue([{ consultantId: 'c1' }, { consultantId: 'c2' }]);
    prisma.consultant.findMany.mockResolvedValue([
      { id: 'c1', user: { fullName: 'Jane Doe', email: 'jane@consultiq.com' }, skills: [] },
      { id: 'c2', user: { fullName: 'Sam Lee', email: 'sam@consultiq.com' }, skills: [] },
    ]);
    prisma.project.findMany.mockResolvedValue([]);

    const result = await service.getTeamSkillDemandForManager('user-1');

    expect(result.teamSize).toBe(2);
  });

  it('produces a real skill demand entry, with named consultants, end to end', async () => {
    prisma.consultantManager.findMany.mockResolvedValue([{ consultantId: 'c1' }, { consultantId: 'c2' }]);
    prisma.consultant.findMany.mockResolvedValue([
      {
        id: 'c1',
        user: { fullName: 'Has AWS', email: 'has@consultiq.com' },
        skills: [{ skillId: 'skill-aws', competencyLevel: CompetencyLevel.EXPERT }],
      },
      {
        id: 'c2',
        user: { fullName: 'Needs AWS', email: 'needs@consultiq.com' },
        skills: [],
      },
    ]);
    prisma.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        skills: [
          { skillId: 'skill-aws', competency: CompetencyLevel.INTERMEDIATE, mandatory: true, skill: { name: 'AWS' } },
        ],
      },
    ]);

    const result = await service.getTeamSkillDemandForManager('user-1');

    expect(result.skills).toEqual([
      {
        skillName: 'AWS',
        supply: 1,
        trainingGap: 1,
        projectsRequiringSkill: 1,
        uncoveredProjectCount: 0,
        consultantsWithSkill: [{ consultantId: 'c1', fullName: 'Has AWS', email: 'has@consultiq.com' }],
        consultantsNeedingTraining: [{ consultantId: 'c2', fullName: 'Needs AWS', email: 'needs@consultiq.com' }],
      },
    ]);
  });
});