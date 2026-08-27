import { IsEnum, IsOptional } from 'class-validator';

export enum CvParsingMethodDto {
  AI_ASSISTED = 'AI_ASSISTED',
  RULE_BASED = 'RULE_BASED',
}

export class UploadCvDto {
  consultantId!: string;

  @IsOptional()
  @IsEnum(CvParsingMethodDto)
  parsingMethod?: CvParsingMethodDto;
}
