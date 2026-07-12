import { Module, Global } from '@nestjs/common';
import { NotificationService } from './service/notification.service';
import { NotificationGateway } from './service/notification.gateway-service';

@Global()
@Module({
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
