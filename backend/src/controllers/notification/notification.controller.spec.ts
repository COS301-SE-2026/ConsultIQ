import { Test, TestingModule } from "@nestjs/testing";
import { NotificationController } from './notification.controller'
import { NotificationService } from "../../notification/service/notification.service";
import { UnauthorizedException } from "@nestjs/common";


const mockNotificationService = {
    sendPushNotification: jest.fn(),
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getArchivedNotifications: jest.fn(),
    archiveNotification: jest.fn(),
};

describe('NotificationCotroller', () => {
    let controller: NotificationController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationController],
            providers: [
                { provide: NotificationService, useValue: mockNotificationService },
            ],
        }).compile();

        controller = module.get<NotificationController>(NotificationController);
        jest.clearAllMocks();
    });



    describe('getNotifications', () => {
        it('should return 50 latest notifications of user', async () => {

            const notification = { data: { userId: 'user-123', title: 'Prject complete', body: 'Successfully completed a project' } }
            const req = {
                id: 'user-123',
                userId: 'user-123'
            };
            mockNotificationService.getNotifications.mockResolvedValue(notification);

            const result = await controller.getNotifications(req);

            expect(result).toEqual(notification);
            expect(mockNotificationService.getNotifications).toHaveBeenCalledWith('user-123');
        });
        it('should throw UnauthorizedException if user ID is missing', async () => {
            const req = { user: {} };
            await expect(controller.getNotifications(req)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('getArchivedNotifications', () => {
        it('should return 50 latest archived notifications of user', async () => {

            const notification = { data: { userId: 'user-123', title: 'Prject complete', body: 'Successfully completed a project', isArchived: true } }
            const req = {
                id: 'user-123',
                userId: 'user-123'
            };
            mockNotificationService.getArchivedNotifications.mockResolvedValue(notification);

            const result = await controller.getArchivedNotifications(req);

            expect(result).toEqual(notification);
            expect(mockNotificationService.getArchivedNotifications).toHaveBeenCalledWith('user-123');
        });

        it('should throw UnauthorizedException if user ID is missing', async () => {
            const req = {};
            await expect(controller.getArchivedNotifications(req)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {

            const notification = { id: '1', userId: 'user-123', title: 'Project complete', body: 'Successfully completed a project', isRead: true };
            const req = {
                userId: 'user-123'
            };
            mockNotificationService.markAsRead.mockResolvedValue(notification);

            const result = await controller.markAsRead('1', req);

            expect(result).toEqual(notification);
            expect(mockNotificationService.markAsRead).toHaveBeenCalledWith('1', 'user-123');
        });

        it('should throw UnauthorizedException if user ID is missing', async () => {
            const req = { user: { userId: undefined } };
            await expect(controller.markAsRead('1', req)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('arhieveNotification', () => {
        it('should mark notification as read', async () => {

            const notification = { id: '1', userId: 'user-123', title: 'Project complete', body: 'Successfully completed a project', isRead: true, isArchived: true };

            mockNotificationService.archiveNotification.mockResolvedValue(notification);
            const mockReq = {
                user: {
                    userId: 'user-123'
                }
            };
            const result = await controller.archiveNotification('1', mockReq);

            expect(result).toEqual(notification);
            expect(mockNotificationService.archiveNotification).toHaveBeenCalledWith('1', 'user-123');
        });

        it('should throw UnauthorizedException if user ID is missing', async () => {
            const req = { user: null };
            await expect(controller.archiveNotification('1', req)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {

            const resultCount = { count: 5 };
            const req = {
                userId: 'user-123'
            };
            mockNotificationService.markAllAsRead.mockResolvedValue(resultCount);

            const result = await controller.markAllAsRead(req);

            expect(result).toEqual(resultCount);
            expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('user-123');
        });
        it('should throw UnauthorizedException if user ID is missing', async () => {
            const req = { user: { userId: '' } };
            await expect(controller.markAllAsRead(req)).rejects.toThrow(UnauthorizedException);
        });
    });
});
