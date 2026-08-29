import {Module} from '@nestjs/common';
import { EncryptionPrismaClient } from './services/client-extension.service';

@Module({
  providers: [EncryptionPrismaClient],
  exports: [EncryptionPrismaClient],
})
export class EncryptionModule { } 