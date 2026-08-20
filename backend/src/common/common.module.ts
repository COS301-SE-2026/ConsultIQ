import { Global, Module } from '@nestjs/common';
import { TokenService } from './services/token.service';
import { RedisUtilityService } from './services/redis-utility.service';
@Global()
@Module({
  providers: [TokenService, RedisUtilityService],
  exports: [TokenService, RedisUtilityService],
})
export class CommonModule { }
