import { Test, TestingModule } from "@nestjs/testing";
import { NotificationService } from "../../notification/service/notification.service";
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
    notification: {
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    },
};
jest.mock('@pusher/push-notifications-server', () => {
    return jest.fn().mockImplementation(() => {
        return {
            publishToInterests: jest.fn().mockResolvedValue({ publishId: 'publish-id-123' }),
        };
    });
});


describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({

            providers: [
                NotificationService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        notificationService = module.get<NotificationService>(NotificationService);
        jest.clearAllMocks();
    });



    describe('getNotifications', () => {
        it('should return list of pending profile users', async () => {


            const mockNotifications = [{ id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false },
            { id: '2', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false }
            ]

            const req = {
                id: 'user-123',
                userId: 'user-123'
            };
            mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

            const result = await notificationService.getNotifications(req.userId);

            expect(result).toEqual(mockNotifications);
            expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        });
    });

    describe('sendNotification', () => {
        it('should send a noification and trigger third party api', async () => {


            const mockNotification = { id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, cretatedAt: new Date() };

            const req = {
                id: 'user-123',
                userId: 'user-123'
            };


            mockPrismaService.notification.create.mockResolvedValue(mockNotification);

            const result = await notificationService.sendPushNotification(req.userId, mockNotification.title, mockNotification.body);

            expect(result).toEqual(mockNotification);
            expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-123',
                    title: mockNotification.title,
                    body: mockNotification.body,
                }

            });


        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {


            const mockNotification = { id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: true, cretatedAt: new Date() };


            mockPrismaService.notification.update.mockResolvedValue(mockNotification);

            const result = await notificationService.markAsRead('1', 'user-123');

            expect(result).toEqual(mockNotification);
            expect(mockPrismaService.notification.update).toHaveBeenCalledWith({

                where: { id: '1', userId: 'user-123' },
                data: { isRead: true }

            });


        });
    });
    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {


            const mockNotification = [{ id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false },
            { id: '2', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: true }
            ]

            mockPrismaService.notification.updateMany.mockResolvedValue(mockNotification);

            const result = await notificationService.markAllAsRead('user-123');

            expect(result).toEqual(mockNotification);
            expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({

                where: { userId: 'user-123' },
                data: { isRead: true }


            });


        });
    });
});
