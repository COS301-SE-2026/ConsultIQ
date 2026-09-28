import {
  MAX_SKILL_RECOMMENDATIONS,
  selectTopSkillRecommendations,
} from './select-top-skill-recommendations';
import { SkillRecommendation } from '../interfaces/skill-recommendation.interface';

describe('selectTopSkillRecommendations', () => {
  const rec = (overrides: Partial<SkillRecommendation>): SkillRecommendation => ({
    skillName: 'AWS',
    newlyEligibleProjectCount: 0,
    totalScoreDelta: 0,
    projectsTested: 1,
    ...overrides,
  });

  it('returns an empty array for empty input', () => {
    expect(selectTopSkillRecommendations([])).toEqual([]);
  });

  it('drops skills that unlock nothing and add no score', () => {
    const result = selectTopSkillRecommendations([
      rec({ skillName: 'Terraform', newlyEligibleProjectCount: 0, totalScoreDelta: 0 }),
    ]);
    expect(result).toEqual([]);
  });

  it('drops skills with a negative total delta and no unlocks', () => {
    const result = selectTopSkillRecommendations([
      rec({ skillName: 'Terraform', totalScoreDelta: -5 }),
    ]);
    expect(result).toEqual([]);
  });

  it('keeps a skill that unlocks a project even if its score delta is zero', () => {
    const result = selectTopSkillRecommendations([
      rec({ skillName: 'AWS', newlyEligibleProjectCount: 1, totalScoreDelta: 0 }),
    ]);
    expect(result.map((r) => r.skillName)).toEqual(['AWS']);
  });

  it('keeps a skill that only improves score without unlocking anything', () => {
    const result = selectTopSkillRecommendations([
      rec({ skillName: 'Kubernetes', newlyEligibleProjectCount: 0, totalScoreDelta: 12 }),
    ]);
    expect(result.map((r) => r.skillName)).toEqual(['Kubernetes']);
  });

  it('caps the list at the default limit of 3', () => {
    const ranked = ['A', 'B', 'C', 'D', 'E'].map((skillName, i) =>
      rec({ skillName, totalScoreDelta: 50 - i * 10 }),
    );
    const result = selectTopSkillRecommendations(ranked);

    expect(MAX_SKILL_RECOMMENDATIONS).toBe(3);
    expect(result.map((r) => r.skillName)).toEqual(['A', 'B', 'C']);
  });

  it('respects a custom limit', () => {
    const ranked = ['A', 'B', 'C'].map((skillName) => rec({ skillName, totalScoreDelta: 10 }));
    expect(selectTopSkillRecommendations(ranked, 1)).toHaveLength(1);
  });

  it('filters BEFORE capping, so useless skills never take a slot', () => {
    const ranked = [
      rec({ skillName: 'Useless1', totalScoreDelta: 0 }),
      rec({ skillName: 'Useless2', totalScoreDelta: 0 }),
      rec({ skillName: 'Helpful', totalScoreDelta: 10 }),
    ];
    expect(selectTopSkillRecommendations(ranked, 1).map((r) => r.skillName)).toEqual(['Helpful']);
  });

  it('preserves the incoming ranked order', () => {
    const ranked = [
      rec({ skillName: 'First', totalScoreDelta: 30 }),
      rec({ skillName: 'Second', totalScoreDelta: 20 }),
    ];
    expect(selectTopSkillRecommendations(ranked).map((r) => r.skillName)).toEqual(['First', 'Second']);
  });

  it('does not mutate the input array', () => {
    const ranked = [rec({ skillName: 'A', totalScoreDelta: 10 }), rec({ skillName: 'B', totalScoreDelta: 0 })];
    const copy = JSON.parse(JSON.stringify(ranked));
    selectTopSkillRecommendations(ranked);
    expect(ranked).toEqual(copy);
  });
});