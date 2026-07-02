import { Controller, Get, Req, Param, Patch } from '@nestjs/common';
import { NotificationService } from '../../notification/service/notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.userId;

    return await this.notificationService.getNotifications(userId);
  }
  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.userId;

    return await this.notificationService.markAsRead(id, userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const userId = req.userId;

    return await this.notificationService.markAllAsRead(userId);
  }
}
