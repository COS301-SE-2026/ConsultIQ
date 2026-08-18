import {
  IsInt,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsString
} from 'class-validator';

export class CreatePlacementDto{
    @IsString()
    consultantId!: string;

    @IsDateString()
    startDate!: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsInt()
    @Min(1)
    @Max(100)
    allocation!: number;
}