import { Module, Global } from '@nestjs/common';
import { NotificationService } from './service/notification.service';

@Global()
@Module({
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }