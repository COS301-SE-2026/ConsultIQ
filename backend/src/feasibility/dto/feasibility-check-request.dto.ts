import { PickType } from '@nestjs/mapped-types';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';

/**
 * A draft project spec for a feasibility preview — same shape and
 * validation as CreateProjectDto, since a feasibility check must
 * reflect exactly what a real project submission would score.
 * Never persisted; no id, no createdAt, nothing DB-derived.
 */
export class FeasibilityCheckRequestDto extends PickType(CreateProjectDto, [
  'startDate',
  'endDate',
  'teamSize',
  'allocation',
  'budget',
  'skills',
  'latitude',
  'longitude',
  'city',
  'province',
  'workModel',
] as const) {}