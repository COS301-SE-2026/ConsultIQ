import { Test, TestingModule } from "@nestjs/testing";
import { NotificationService } from "../../notification/service/notification.service";
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationGateway } from "./notification.gateway-service";

const mockPrismaService = {
    notification: {
        updateMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    },
};

const mockNotificationGateway = {
    sendPushNotification: jest.fn(),
};

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({

            providers: [
                NotificationService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: NotificationGateway, useValue: mockNotificationGateway },
            ],
        }).compile();

        notificationService = module.get<NotificationService>(NotificationService);
        jest.clearAllMocks();
    });



    describe('getNotifications', () => {
        it('should get all notifications that are not archived', async () => {


            const mockNotifications = [{ id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, isArchived: false },
            { id: '2', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, isArchived: false }
            ]

            const req = {
                id: 'user-123',
                userId: 'user-123'
            };
            mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

            const result = await notificationService.getNotifications(req.userId);

            expect(result).toEqual(mockNotifications);
            expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123', isArchived: false },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        });


    });

    describe('createAndSendNotification', () => {
        it('should send a noification and trigger Socket.io gateway', async () => {


            const mockNotification = { id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', link: undefined, isRead: false, createdAt: new Date() };

            const req = {
                id: 'user-123',
                userId: 'user-123'
            };


            mockPrismaService.notification.create.mockResolvedValue(mockNotification);

            const result = await notificationService.createAndSendNotification(req.userId, mockNotification.title, mockNotification.body);

            expect(result).toEqual(mockNotification);
            expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: 'user-123',
                    title: mockNotification.title,
                    body: mockNotification.body,
                }

            });

            expect(mockNotificationGateway.sendPushNotification).toHaveBeenCalledWith(
                'user-123',
                {
                    id: mockNotification.id,
                    title: mockNotification.title,
                    body: mockNotification.body,
                    link: mockNotification.link,
                    isRead: false,
                    createdAt: mockNotification.createdAt,
                }

            );



        });
        it('should throw database error', async () => {

            const req = { userId: 'user-123', title: 'Test title', body: 'test body' };
            const mockError = new Error('Database connection failed: 500');

            mockPrismaService.notification.create.mockRejectedValue(mockError);

            await expect(notificationService.createAndSendNotification(req.userId, req.title, req.body)).rejects.toThrow(mockError);

            expect(mockNotificationGateway.sendPushNotification).not.toHaveBeenCalled();;

        })

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



    describe('getArchivedNotifications', () => {
        it('should return all archived notifications', async () => {


            const mockNotifications = [{ id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, isArchived: true },
            { id: '2', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, isArchived: true }
            ]

            const req = {
                id: 'user-123',
                userId: 'user-123'
            };
            mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

            const result = await notificationService.getArchivedNotifications(req.userId);

            expect(result).toEqual(mockNotifications);
            expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
                where: { userId: 'user-123', isArchived: true },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        });

    });

    describe('archieveNotifications', () => {
        it('should archieve a notification', async () => {


            const mockNotifications = { id: '1', userId: 'user-123', title: 'Project Complete', body: 'Successfully completed a project', isRead: false, isArchived: true, archivedAt: new Date() };

            mockPrismaService.notification.update.mockResolvedValue(mockNotifications);

            const result = await notificationService.archiveNotification(mockNotifications.id, mockNotifications.userId);

            expect(result).toEqual(mockNotifications);
            expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
                where: {
                    id: '1',
                    userId: 'user-123'
                },
                data: {
                    isArchived: true, archivedAt: expect.any(Date),
                }
            });
        });


    });
});
