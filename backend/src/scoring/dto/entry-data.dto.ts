import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RawConsultantDto } from './raw-consultant.dto';
import { RawProjectDto } from './raw-project.dto';


//Raw unormalized consultant and project data 
//Well formed data before it recheases the normaliser
export class EntryScoringDataDto {
    @IsString()
    consultantId!: string;

    @IsString()
    projectId!: string;

    @IsDefined()
    @ValidateNested()
    @Type(() => RawConsultantDto)
    consultant!: RawConsultantDto;

    @IsDefined()
    @ValidateNested()
    @Type(() => RawProjectDto)
    project!: RawProjectDto;
}