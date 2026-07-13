import { Test, TestingModule } from "@nestjs/testing";
import { Socket, Server } from 'socket.io'
import { NotificationGateway } from "./notification.gateway-service";


describe('NotificationGateway', () => {
    let notificationGateway: NotificationGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({

            providers: [
                NotificationGateway
            ],
        }).compile();

        notificationGateway = module.get<NotificationGateway>(NotificationGateway);
        notificationGateway.server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),

        } as unknown as Server
    });



    describe('Subscriptions', () => {
        it('should allow a user to join their notification room', () => {
            const client = {
                join: jest.fn()
            } as unknown as Socket

            const result = notificationGateway.handleSubscribe(client, 'user-123');
            expect(client.join).toHaveBeenCalledWith('user_notifications_user-123');
            expect(result).toEqual({
                event: 'subscribed',
                data: 'Successfully joined user_notifications_user-123'
            })
        })
    })

    describe('Lifecycle connect and disconnect', () => {
        it('should log when a client has successfully connected', () => {
            const client = {
                id: 'client-123'
            } as Socket
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();


            notificationGateway.handleConnection(client);
            expect(consoleSpy).toHaveBeenCalledWith('Client connected: client-123');
            consoleSpy.mockRestore();
        })

        it('should log when a client has successfully disconnected', () => {
            const client = {
                id: 'client-123'
            } as Socket
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();


            notificationGateway.handleDisconnect(client);
            expect(consoleSpy).toHaveBeenCalledWith('Client disconnected: client-123');
            consoleSpy.mockRestore();
        })
    })


    describe('Broadcasting', () => {
        it('should emit push notifications to the correct room', () => {
            const mockNotification = { id: 1, title: 'Test', body: 'Test Body', isRead: false };

            notificationGateway.sendPushNotification('user-123', mockNotification)
            expect(notificationGateway.server.to).toHaveBeenCalledWith('user_notifications_user-123');
            expect(notificationGateway.server.to('user_notifications_user-123').emit).toHaveBeenCalledWith('new_notification', mockNotification)
        })
    })




});
