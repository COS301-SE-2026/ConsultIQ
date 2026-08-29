import { Module } from '@nestjs/common';
import { ConsultantController } from '../controllers/consultants/consultant.controller';
import { ConsultantService } from './services/consultant.service';
import { EncryptionModule } from 'src/common/encryption/encryption.module';
@Module({
  imports:[EncryptionModule],
  controllers: [ConsultantController],
  providers: [ConsultantService],
})
export class ConsultantsModule { } 
