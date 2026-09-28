import { CompetencyLevel } from '@prisma/client';
import { deriveCandidateSkills } from './derive-candidate-skills';
import { PipelineProject } from '../interfaces/candidates-skills.interface';
import { RawConsultantDto } from '../../scoring/dto/raw-consultant.dto';

describe('deriveCandidateSkills', () => {
  const consultantSkills = (
    ...skills: { name: string; level: CompetencyLevel }[]
  ): RawConsultantDto['skills'] =>
    skills.map((s) => ({ skillName: s.name, competencyLevel: s.level }));

  const project = (
    skills: { name: string; competency: CompetencyLevel; mandatory: boolean }[],
  ): PipelineProject => ({
    skills: skills.map((s) => ({
      skill: { name: s.name },
      competency: s.competency,
      mandatory: s.mandatory,
    })),
  });

  it('returns an empty array when the pipeline has no projects', () => {
    const result = deriveCandidateSkills(
      consultantSkills({ name: 'React', level: CompetencyLevel.INTERMEDIATE }),
      [],
    );
    expect(result).toEqual([]);
  });

  it('returns an empty array when the consultant already has every mandatory skill', () => {
    const result = deriveCandidateSkills(
      consultantSkills(
        { name: 'React', level: CompetencyLevel.INTERMEDIATE },
        { name: 'AWS', level: CompetencyLevel.EXPERT },
      ),
      [
        project([
          { name: 'React', competency: CompetencyLevel.BEGINNER, mandatory: true },
          { name: 'AWS', competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
        ]),
      ],
    );
    expect(result).toEqual([]);
  });

  it('includes a mandatory skill the consultant does not have', () => {
    const result = deriveCandidateSkills(
      consultantSkills({ name: 'React', level: CompetencyLevel.INTERMEDIATE }),
      [
        project([
          { name: 'React', competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
          { name: 'Kubernetes', competency: CompetencyLevel.EXPERT, mandatory: true },
        ]),
      ],
    );
    expect(result).toEqual([
      { skillName: 'Kubernetes', competencyLevel: CompetencyLevel.EXPERT },
    ]);
  });

  it('excludes optional (non-mandatory) skills even if the consultant lacks them', () => {
    const result = deriveCandidateSkills(
      consultantSkills({ name: 'React', level: CompetencyLevel.INTERMEDIATE }),
      [
        project([
          { name: 'React', competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
          { name: 'GraphQL', competency: CompetencyLevel.BEGINNER, mandatory: false },
        ]),
      ],
    );
    expect(result).toEqual([]);
  });

  it('matches existing skills case-insensitively and does not recommend them', () => {
    const result = deriveCandidateSkills(
      consultantSkills({ name: 'react', level: CompetencyLevel.INTERMEDIATE }),
      [project([{ name: 'React', competency: CompetencyLevel.EXPERT, mandatory: true }])],
    );
    expect(result).toEqual([]);
  });

  it('deduplicates a missing skill required by multiple pipeline projects into one entry', () => {
    const result = deriveCandidateSkills(
      consultantSkills(),
      [
        project([{ name: 'Kubernetes', competency: CompetencyLevel.INTERMEDIATE, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.INTERMEDIATE, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.INTERMEDIATE, mandatory: true }]),
      ],
    );
    expect(result).toHaveLength(1);
    expect(result[0].skillName).toBe('Kubernetes');
  });

  it('picks the most commonly requested competency level (mode) across the pipeline', () => {
    const result = deriveCandidateSkills(
      consultantSkills(),
      [
        project([{ name: 'Kubernetes', competency: CompetencyLevel.BEGINNER, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.INTERMEDIATE, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.INTERMEDIATE, mandatory: true }]),
      ],
    );
    expect(result[0].competencyLevel).toBe(CompetencyLevel.INTERMEDIATE);
  });

  it('breaks a tie between equally common levels deterministically (first-seen wins)', () => {
    const result = deriveCandidateSkills(
      consultantSkills(),
      [
        project([{ name: 'Kubernetes', competency: CompetencyLevel.EXPERT, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.BEGINNER, mandatory: true }]),
      ],
    );
    // EXPERT appears first in input order and both appear once each — EXPERT wins.
    expect(result[0].competencyLevel).toBe(CompetencyLevel.EXPERT);
  });

  it('preserves the original display casing of the skill name from its first occurrence', () => {
    const result = deriveCandidateSkills(
      consultantSkills(),
      [
        project([{ name: 'kubernetes', competency: CompetencyLevel.BEGINNER, mandatory: true }]),
        project([{ name: 'Kubernetes', competency: CompetencyLevel.BEGINNER, mandatory: true }]),
      ],
    );
    expect(result[0].skillName).toBe('kubernetes'); // first occurrence, lowercase
  });

  it('returns multiple distinct candidate skills across a varied pipeline', () => {
    const result = deriveCandidateSkills(
      consultantSkills({ name: 'React', level: CompetencyLevel.INTERMEDIATE }),
      [
        project([
          { name: 'React', competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
          { name: 'Kubernetes', competency: CompetencyLevel.EXPERT, mandatory: true },
        ]),
        project([
          { name: 'AWS', competency: CompetencyLevel.INTERMEDIATE, mandatory: true },
        ]),
      ],
    );
    const skillNames = result.map((r) => r.skillName).sort();
    expect(skillNames).toEqual(['AWS', 'Kubernetes']);
  });

  it('does not mutate the input consultantSkills or pipelineProjects arrays', () => {
    const skills = consultantSkills({ name: 'React', level: CompetencyLevel.INTERMEDIATE });
    const pipeline = [project([{ name: 'Kubernetes', competency: CompetencyLevel.EXPERT, mandatory: true }])];
    const skillsCopy = JSON.parse(JSON.stringify(skills));
    const pipelineCopy = JSON.parse(JSON.stringify(pipeline));

    deriveCandidateSkills(skills, pipeline);

    expect(skills).toEqual(skillsCopy);
    expect(pipeline).toEqual(pipelineCopy);
  });
});