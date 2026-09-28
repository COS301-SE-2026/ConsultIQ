import { aggregateSkillRecommendations } from './aggregate-skill-recommendations';
import { SimulationResult } from '../interfaces/simulation-result.interface';

describe('aggregateSkillRecommendations', () => {
  const row = (overrides: Partial<SimulationResult>): SimulationResult => ({
    consultantId: 'consultant-01',
    projectId: 'project-a',
    candidateSkillName: 'AWS',
    baselineScore: 50,
    projectedScore: 50,
    scoreDelta: 0,
    baselineExcluded: false,
    projectedExcluded: false,
    ...overrides,
  });

  it('returns an empty array for no results', () => {
    expect(aggregateSkillRecommendations([])).toEqual([]);
  });

  it('collapses multiple rows for one skill into a single recommendation', () => {
    const result = aggregateSkillRecommendations([
      row({ projectId: 'p1', scoreDelta: 10 }),
      row({ projectId: 'p2', scoreDelta: 15 }),
      row({ projectId: 'p3', scoreDelta: 5 }),
    ]);

    expect(result).toEqual([
      { skillName: 'AWS', newlyEligibleProjectCount: 0, totalScoreDelta: 30, projectsTested: 3 },
    ]);
  });

  it('counts a project as newly eligible only when baseline was excluded and projected is not', () => {
    const result = aggregateSkillRecommendations([
      row({ projectId: 'p1', baselineExcluded: true, projectedExcluded: false, projectedScore: 70 }),
      row({ projectId: 'p2', baselineExcluded: false, projectedExcluded: false, scoreDelta: 20 }),
      row({ projectId: 'p3', baselineExcluded: true, projectedExcluded: true }),
      row({ projectId: 'p4', baselineExcluded: false, projectedExcluded: true }),
    ]);

    expect(result[0].newlyEligibleProjectCount).toBe(1);
    expect(result[0].projectsTested).toBe(4);
  });

  it('ranks by newly eligible count before total score delta', () => {
    const result = aggregateSkillRecommendations([
      // Kubernetes: big score bump but unlocks nothing
      row({ candidateSkillName: 'Kubernetes', projectId: 'p1', scoreDelta: 60 }),
      // AWS: small delta but unlocks a project
      row({ candidateSkillName: 'AWS', projectId: 'p2', baselineExcluded: true, projectedExcluded: false, scoreDelta: 0 }),
    ]);

    expect(result.map((r) => r.skillName)).toEqual(['AWS', 'Kubernetes']);
  });

  it('breaks ties on newly eligible count by total score delta', () => {
    const result = aggregateSkillRecommendations([
      row({ candidateSkillName: 'AWS', scoreDelta: 10 }),
      row({ candidateSkillName: 'Kubernetes', scoreDelta: 25 }),
    ]);

    expect(result.map((r) => r.skillName)).toEqual(['Kubernetes', 'AWS']);
  });

  it('breaks full ties alphabetically for deterministic output', () => {
    const result = aggregateSkillRecommendations([
      row({ candidateSkillName: 'Terraform', scoreDelta: 10 }),
      row({ candidateSkillName: 'AWS', scoreDelta: 10 }),
      row({ candidateSkillName: 'Kubernetes', scoreDelta: 10 }),
    ]);

    expect(result.map((r) => r.skillName)).toEqual(['AWS', 'Kubernetes', 'Terraform']);
  });

  it('contributes zero delta from excluded rows', () => {
    const result = aggregateSkillRecommendations([
      row({ projectId: 'p1', scoreDelta: 0, baselineExcluded: true, projectedExcluded: true }),
      row({ projectId: 'p2', scoreDelta: 12 }),
    ]);

    expect(result[0].totalScoreDelta).toBe(12);
  });

  it('keeps skills separate and preserves each skill\'s own totals', () => {
    const result = aggregateSkillRecommendations([
      row({ candidateSkillName: 'AWS', projectId: 'p1', scoreDelta: 10 }),
      row({ candidateSkillName: 'AWS', projectId: 'p2', scoreDelta: 10 }),
      row({ candidateSkillName: 'Kubernetes', projectId: 'p3', scoreDelta: 30 }),
    ]);

    const aws = result.find((r) => r.skillName === 'AWS')!;
    const k8s = result.find((r) => r.skillName === 'Kubernetes')!;

    expect(aws).toMatchObject({ totalScoreDelta: 20, projectsTested: 2 });
    expect(k8s).toMatchObject({ totalScoreDelta: 30, projectsTested: 1 });
  });

  it('does not mutate the input array or its rows', () => {
    const input = [row({ projectId: 'p1', scoreDelta: 10 }), row({ projectId: 'p2', scoreDelta: 5 })];
    const copy = JSON.parse(JSON.stringify(input));

    aggregateSkillRecommendations(input);

    expect(input).toEqual(copy);
  });
});