import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TeamSkillDemandController } from './team-skill-demand.controller';
import { TeamSkillDemandService } from '../../team-skill-demand/services/team-skill-demand.service';

describe('TeamSkillDemandController', () => {
  let controller: TeamSkillDemandController;
  let service: { getTeamSkillDemandForManager: jest.Mock };

  beforeEach(async () => {
    service = { getTeamSkillDemandForManager: jest.fn().mockResolvedValue({ teamSize: 2, skills: [] }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamSkillDemandController],
      providers: [{ provide: TeamSkillDemandService, useValue: service }],
    }).compile();

    controller = module.get(TeamSkillDemandController);
  });

  it('resolves the manager id from the JWT and delegates to the service', async () => {
    const result = await controller.getTeamSkillDemand({ user: { userId: 'user-1' } });
    expect(service.getTeamSkillDemandForManager).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ teamSize: 2, skills: [] });
  });

  it('throws UnauthorizedException when there is no user on the request', async () => {
    await expect(controller.getTeamSkillDemand({})).rejects.toThrow(UnauthorizedException);
    expect(service.getTeamSkillDemandForManager).not.toHaveBeenCalled();
  });
});