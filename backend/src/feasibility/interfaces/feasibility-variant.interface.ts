import { CompetencyLevel } from '@prisma/client';
import { FeasibilityCheckRequestDto } from '../dto/feasibility-check-request.dto';

export type FeasibilityVariantKind = 'budget' | 'competency';

export interface FeasibilityVariant {
  kind: FeasibilityVariantKind;
  label: string;
  spec: FeasibilityCheckRequestDto;
  skillName?: string;
  fromLevel?: CompetencyLevel;
  toLevel?: CompetencyLevel;
}

export interface FeasibilityVariantMetadata {
  kind: FeasibilityVariantKind;
  skillName?: string;
  fromLevel?: CompetencyLevel;
  toLevel?: CompetencyLevel;
}