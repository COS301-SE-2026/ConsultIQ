import { Module, Global } from '@nestjs/common';
import { NotificationService } from './service/notification.service';
import { NotificationGateway } from './service/notification.gateway-service';
import { NotificationController } from '../controllers/notification/notification.controller';

@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService],
})
export class NotificationModule {}
