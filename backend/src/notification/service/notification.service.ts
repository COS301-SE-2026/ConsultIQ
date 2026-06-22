import { Injectable, Logger } from '@nestjs/common';
import PushNotifications from '@pusher/push-notifications-server';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class NotificationService {
    private beamsClient: PushNotifications;
    private readonly logger = new Logger(NotificationService.name);


    constructor(private readonly prisma: PrismaService) {
        this.beamsClient = new PushNotifications({
            instanceId: process.env.PUSHER_BEAMS_INSTANCE_ID as string,
            secretKey: process.env.PUSHER_BEAMS_SECRET_KEY as string,
        });
    }

    async sendPushNotification(userId: string, title: string, body: string, link?: string) {

        try {

            const notification = await this.prisma.notification.create({
                data: {
                    userId: userId,
                    title: title,
                    body: body,
                    link: link,
                }
            })

            const response = await this.beamsClient.publishToInterests(
                [`user-${userId}`], {
                web: {
                    notification: {
                        title,
                        body,
                    },
                },
            },)
            this.logger.log(`Push Notification Sent Successfully, ID: ${response.publishId}`);
            return notification;
        } catch (error) {
            this.logger.error('Error Pushing Notifications', error)
            throw error;
        }

    }

    async getNotifications(userId: string) {
        return this.prisma.notification.findMany({
            where: {
                userId: userId
            },
            orderBy: { createdAt: 'desc' },
            take: 50

        });
    }

    async markAsRead(notificationId: string, userId: string) {
        await this.prisma.notification.update({
            where: {
                id: notificationId,
                userId: userId
            },
            data: { isRead: true },
        })
    }

    async markAllAsRead(userId: string) {
        await this.prisma.notification.updateMany({
            where: { userId: userId },
            data: { isRead: true }
        })
    }
}



