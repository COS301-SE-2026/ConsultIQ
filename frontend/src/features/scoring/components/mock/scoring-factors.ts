import {type ScoringFactor } from "../scoring-weights-table";
export const DEFAULT_SEEDED_FACTORS: ScoringFactor[] = [
  {
    factorName: 'Skill Alignment',
    description: 'Measures how well consultant skills match project requirements.',
    weight: 40,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Competency Match',
    description: 'Evaluates competency level alignment with project needs.',
    weight: 30,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Availability',
    description: 'Considers consultant availability for the project timeline.',
    weight: 15,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Cost Fit',
    description: 'Assesses cost/rate fit within project budget.',
    weight: 10,
    isActive: true,
    hardExclusion: true,
  },
  {
    factorName: 'Geographic Feasibility',
    description: 'Measures geographic proximity or relocation feasibility.',
    weight: 5,
    isActive: true,
    hardExclusion: true,
  },
];