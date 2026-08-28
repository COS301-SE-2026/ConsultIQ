import { Module } from '@nestjs/common';
import { ConsultantController } from '../controllers/consultants/consultant.controller';
import { ConsultantService } from './services/consultant.service';
import { EncryptionModule } from 'src/common/encryption/encryption.module';
@Module({
  controllers: [ConsultantController],
  providers: [ConsultantService,EncryptionModule],
})
export class ConsultantsModule { } 
