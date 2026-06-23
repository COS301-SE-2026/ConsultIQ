import { Test, TestingModule } from "@nestjs/testing";
import { NotificationController } from './notification.controller'
import { NotificationService } from "../../notification/service/notification.service";



const mockNotificationService = {
    sendPushNotification: jest.fn(),
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    MarkAllAsRead: jest.fn(),
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
    });

});
