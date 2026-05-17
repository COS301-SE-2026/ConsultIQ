import { Global, Module } from '@nestjs/common';
import { TokenService } from './services/token.service';

@Global()
@Module({
  providers: [TokenService],
  exports: [TokenService],
})
export class CommonModule {}