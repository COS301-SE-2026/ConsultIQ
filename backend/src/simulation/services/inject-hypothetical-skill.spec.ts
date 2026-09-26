import { injectHypotheticalSkill } from './inject-hypothetical-skill';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';
import { CompetencyLevel } from '@prisma/client';

function consultant(skills: { skillName: string; competencyLevel: CompetencyLevel }[]): RawConsultantDto {
  return {
    consultantId: 'consultant-01',
    skills,
    costToCompany: 50000,
    city: 'Pretoria',
    province: 'Gauteng',
  } as RawConsultantDto;
}

describe('injectHypotheticalSkill', () => {
  it('adds the candidate skill when the consultant does not already have it', () => {
    const original = consultant([{ skillName: 'TypeScript', competencyLevel: 'INTERMEDIATE' }]);

    const result = injectHypotheticalSkill(original, {
      skillName: 'AWS',
      competencyLevel: 'BEGINNER',
    });

    expect(result.skills).toEqual([
      { skillName: 'TypeScript', competencyLevel: 'INTERMEDIATE' },
      { skillName: 'AWS', competencyLevel: 'BEGINNER' },
    ]);
  });

  it('replaces the existing skill entry when the consultant already has it (case-insensitive)', () => {
    const original = consultant([{ skillName: 'AWS', competencyLevel: 'BEGINNER' }]);

    const result = injectHypotheticalSkill(original, {
      skillName: 'aws',
      competencyLevel: 'EXPERT',
    });

    expect(result.skills).toEqual([{ skillName: 'aws', competencyLevel: 'EXPERT' }]);
  });

  it('does not mutate the original consultant object', () => {
    const original = consultant([{ skillName: 'TypeScript', competencyLevel: 'INTERMEDIATE' }]);
    const originalSkillsRef = original.skills;

    injectHypotheticalSkill(original, { skillName: 'AWS', competencyLevel: 'BEGINNER' });

    expect(original.skills).toBe(originalSkillsRef);
    expect(original.skills).toHaveLength(1);
  });

  it('preserves all other consultant fields unchanged', () => {
    const original = consultant([]);

    const result = injectHypotheticalSkill(original, {
      skillName: 'AWS',
      competencyLevel: 'BEGINNER',
    });

    expect(result.consultantId).toBe(original.consultantId);
    expect(result.costToCompany).toBe(original.costToCompany);
    expect(result.city).toBe(original.city);
    expect(result.province).toBe(original.province);
  });
});