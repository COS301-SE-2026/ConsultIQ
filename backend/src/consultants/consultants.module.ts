import { Module } from '@nestjs/common';
import { ConsultantController } from '../controllers/consultants/consultant.controller';
import { ConsultantService } from './services/consultant.service';

@Module({
  controllers: [ConsultantController],
  providers: [ConsultantService],
})
export class ConsultantsModule { } 
