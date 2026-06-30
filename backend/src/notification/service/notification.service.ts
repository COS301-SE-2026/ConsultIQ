import { Injectable, Logger } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway-service';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);


    constructor(private readonly prisma: PrismaService, private readonly notificationGateway: NotificationGateway) {
    }

    async createAndSendNotification(userId: string, title: string, body: string, link?: string) {

        try {

            const notification = await this.prisma.notification.create({
                data: {
                    userId: userId,
                    title: title,
                    body: body,
                    link: link,
                }
            })

            this.notificationGateway.sendPushNotification(userId, {
                id: notification.id,
                title: notification.title,
                body: notification.body,
                link: notification.link,
                isRead: false,
                createdAt: notification.createdAt,
            })
            this.logger.log(`Notification Sent Successfully to user: ${userId}`);
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
        return await this.prisma.notification.update({
            where: {
                id: notificationId,
                userId: userId
            },
            data: { isRead: true },
        })
    }

    async markAllAsRead(userId: string) {
        return await this.prisma.notification.updateMany({
            where: { userId: userId },
            data: { isRead: true }
        })
    }
}



