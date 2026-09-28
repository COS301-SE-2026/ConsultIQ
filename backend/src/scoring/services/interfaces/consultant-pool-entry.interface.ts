import { RawConsultantDto } from '../../dto/raw-consultant.dto';

export interface ConsultantPoolEntry {
  consultantId: string;
  consultantName: string;
  consultantEmail: string;
  isPlaced: boolean;
  consultant: RawConsultantDto;
}