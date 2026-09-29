import { CompetencyLevel } from '@prisma/client';
import { computeTeamSkillDemand } from './compute-team-skill-demand';
import { ConsultantSkillEntry } from '../interfaces/consultant-skill-entry.interface';
import { ProjectSkillRequirement } from '../interfaces/project-skill-requirement.interface';
import { TeamConsultant } from '../interfaces/team-consultant.interface';

describe('computeTeamSkillDemand', () => {
  const consultant = (overrides: Partial<TeamConsultant>): TeamConsultant => ({
    consultantId: 'c1',
    fullName: 'Jane Doe',
    email: 'jane@consultiq.com',
    ...overrides,
  });

  const req = (overrides: Partial<ProjectSkillRequirement>): ProjectSkillRequirement => ({
    projectId: 'p1',
    skillId: 'skill-aws',
    skillName: 'AWS',
    competency: CompetencyLevel.INTERMEDIATE,
    mandatory: true,
    ...overrides,
  });

  const skillEntry = (overrides: Partial<ConsultantSkillEntry>): ConsultantSkillEntry => ({
    consultantId: 'c1',
    skillId: 'skill-aws',
    competencyLevel: CompetencyLevel.INTERMEDIATE,
    ...overrides,
  });

  it('returns no entries when there are no mandatory requirements', () => {
    expect(computeTeamSkillDemand([consultant({})], [], [req({ mandatory: false })])).toEqual([]);
  });

  it('computes supply as the count of DISTINCT consultants with the skill', () => {
    const team = [consultant({ consultantId: 'c1' }), consultant({ consultantId: 'c2', fullName: 'Sam' })];
    const result = computeTeamSkillDemand(
      team,
      [skillEntry({ consultantId: 'c1' }), skillEntry({ consultantId: 'c2' })],
      [req({})],
    );
    expect(result[0].supply).toBe(2);
  });

  it('does not double-count a consultant with multiple rows for the same skill', () => {
    const team = [consultant({ consultantId: 'c1' })];
    const result = computeTeamSkillDemand(
      team,
      [
        skillEntry({ consultantId: 'c1' }),
        skillEntry({ consultantId: 'c1', competencyLevel: CompetencyLevel.EXPERT }),
      ],
      [req({})],
    );
    expect(result[0].supply).toBe(1);
  });

  it('computes trainingGap as the count of team members without the skill', () => {
    const team = [
      consultant({ consultantId: 'c1' }),
      consultant({ consultantId: 'c2' }),
      consultant({ consultantId: 'c3' }),
    ];
    const result = computeTeamSkillDemand(team, [skillEntry({ consultantId: 'c1' })], [req({})]);
    expect(result[0].trainingGap).toBe(2);
  });

  it('names exactly which consultants have the skill and which need training', () => {
    const team = [
      consultant({ consultantId: 'c1', fullName: 'Has Skill', email: 'has@consultiq.com' }),
      consultant({ consultantId: 'c2', fullName: 'Needs Training', email: 'needs@consultiq.com' }),
    ];
    const result = computeTeamSkillDemand(team, [skillEntry({ consultantId: 'c1' })], [req({})]);

    expect(result[0].consultantsWithSkill).toEqual([
      { consultantId: 'c1', fullName: 'Has Skill', email: 'has@consultiq.com' },
    ]);
    expect(result[0].consultantsNeedingTraining).toEqual([
      { consultantId: 'c2', fullName: 'Needs Training', email: 'needs@consultiq.com' },
    ]);
  });

  it('keeps supply/trainingGap counts consistent with the named arrays lengths', () => {
    const team = [consultant({ consultantId: 'c1' }), consultant({ consultantId: 'c2' })];
    const result = computeTeamSkillDemand(team, [skillEntry({ consultantId: 'c1' })], [req({})]);

    expect(result[0].supply).toBe(result[0].consultantsWithSkill.length);
    expect(result[0].trainingGap).toBe(result[0].consultantsNeedingTraining.length);
  });

  it('counts a project as uncovered when no team member meets the required competency', () => {
    const team = [consultant({ consultantId: 'c1' })];
    const result = computeTeamSkillDemand(
      team,
      [skillEntry({ competencyLevel: CompetencyLevel.BEGINNER })],
      [req({ competency: CompetencyLevel.EXPERT })],
    );
    expect(result[0].uncoveredProjectCount).toBe(1);
  });

  it('does not count a project as uncovered when a team member meets or exceeds the required level', () => {
    const team = [consultant({ consultantId: 'c1' })];
    const result = computeTeamSkillDemand(
      team,
      [skillEntry({ competencyLevel: CompetencyLevel.EXPERT })],
      [req({ competency: CompetencyLevel.INTERMEDIATE })],
    );
    expect(result[0].uncoveredProjectCount).toBe(0);
  });

  it('tallies projectsRequiringSkill and uncoveredProjectCount independently across multiple projects', () => {
    const team = [consultant({ consultantId: 'c1' })];
    const result = computeTeamSkillDemand(
      team,
      [skillEntry({ competencyLevel: CompetencyLevel.BEGINNER })],
      [
        req({ projectId: 'p1', competency: CompetencyLevel.BEGINNER }),
        req({ projectId: 'p2', competency: CompetencyLevel.EXPERT }),
      ],
    );
    expect(result[0].projectsRequiringSkill).toBe(2);
    expect(result[0].uncoveredProjectCount).toBe(1);
  });

  it('ignores optional (non-mandatory) requirements entirely', () => {
    expect(computeTeamSkillDemand([consultant({})], [], [req({ mandatory: false })])).toEqual([]);
  });

  it('keeps different skills separate', () => {
    const team = [consultant({ consultantId: 'c1' }), consultant({ consultantId: 'c2' })];
    const result = computeTeamSkillDemand(
      team,
      [skillEntry({ skillId: 'skill-aws' }), skillEntry({ skillId: 'skill-k8s', consultantId: 'c2' })],
      [
        req({ skillId: 'skill-aws', skillName: 'AWS' }),
        req({ skillId: 'skill-k8s', skillName: 'Kubernetes', projectId: 'p2' }),
      ],
    );
    expect(result.map((r) => r.skillName).sort((a, b) => a.localeCompare(b))).toEqual([
      'AWS',
      'Kubernetes',
    ]);
  });

  it('sorts by uncoveredProjectCount first, trainingGap second, skill name third', () => {
    const team = [consultant({ consultantId: 'c1' }), consultant({ consultantId: 'c2' })];
    const result = computeTeamSkillDemand(
      team,
      [],
      [
        req({ skillId: 's-terraform', skillName: 'Terraform', projectId: 'p1' }),
        req({ skillId: 's-aws', skillName: 'AWS', projectId: 'p1' }),
        req({ skillId: 's-aws', skillName: 'AWS', projectId: 'p2' }),
      ],
    );
    expect(result.map((r) => r.skillName)).toEqual(['AWS', 'Terraform']);
  });

  it('does not mutate its inputs', () => {
    const team = [consultant({})];
    const skills = [skillEntry({})];
    const reqs = [req({})];
    const teamCopy = JSON.parse(JSON.stringify(team));
    const skillsCopy = JSON.parse(JSON.stringify(skills));
    const reqsCopy = JSON.parse(JSON.stringify(reqs));

    computeTeamSkillDemand(team, skills, reqs);

    expect(team).toEqual(teamCopy);
    expect(skills).toEqual(skillsCopy);
    expect(reqs).toEqual(reqsCopy);
  });
});