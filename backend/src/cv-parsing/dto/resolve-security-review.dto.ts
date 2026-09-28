import { IsEnum } from 'class-validator';

export enum SecurityReviewDecision {
  CLEARED = 'CLEARED',
  REJECTED = 'REJECTED',
}

export class ResolveSecurityReviewDto {
  @IsEnum(SecurityReviewDecision)
  decision!: SecurityReviewDecision;
}