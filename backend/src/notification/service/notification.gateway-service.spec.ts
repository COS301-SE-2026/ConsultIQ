import { Test, TestingModule } from '@nestjs/testing';
import { Socket, Server } from 'socket.io';
import { NotificationGateway } from './notification.gateway-service';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('NotificationGateway', () => {
    let notificationGateway: NotificationGateway;
    let mockClient: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [NotificationGateway],
        }).compile();

        notificationGateway = module.get<NotificationGateway>(NotificationGateway);
        notificationGateway.server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as Server;

        mockClient = {
            id: 'client-123',
            handshake: {
                auth: { token: 'valid.mock.token' },
                headers: {},
            },
            data: {},
            join: jest.fn(),
            disconnect: jest.fn(),
        } as unknown as Socket;

        process.env.JWT_SECRET = 'test-secret';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Lifecycle connect and disconnect', () => {
        it('should successfully connect and authenticate a client with a valid token', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', role: 'USER' });

            await notificationGateway.handleConnection(mockClient);

            expect(jwt.verify).toHaveBeenCalledWith('valid.mock.token', 'test-secret');
            expect(mockClient.data.user).toEqual({ userId: 'user-123', role: 'USER' });
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Client connected & authenticated: client-123'));

            consoleSpy.mockRestore();
        });

        it('should forcefully disconnect a client if no token is provided', async () => {
            mockClient.handshake.auth = {};
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await notificationGateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalledWith(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unauthorized WS connection attempt'));

            consoleSpy.mockRestore();
        });

        it('should forcefully disconnect a client if the token is invalid', async () => {

            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid signature'); });
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await notificationGateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalledWith(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unauthorized WS connection attempt'));

            consoleSpy.mockRestore();
        });

        it('should log when a client has successfully disconnected', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            notificationGateway.handleDisconnect(mockClient);

            expect(consoleSpy).toHaveBeenCalledWith('Client disconnected: client-123');
            consoleSpy.mockRestore();
        });

        it('should extract the token from cookies if auth payload and authorization header are missing', async () => {

            mockClient.handshake.auth = {};

            mockClient.handshake.headers = {
                cookie: 'some_other_cookie=123; ciq_access_token=cookie-token-456; another=true'
            };

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-cookie', role: 'USER' });

            await notificationGateway.handleConnection(mockClient);

            expect(jwt.verify).toHaveBeenCalledWith('cookie-token-456', 'test-secret');
            expect(mockClient.data.user).toEqual({ userId: 'user-cookie', role: 'USER' });

            consoleSpy.mockRestore();
        });

        it('should forcefully disconnect if JWT_SECRET environment variable is missing', async () => {

            const originalSecret = process.env.JWT_SECRET;
            delete process.env.JWT_SECRET;

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await notificationGateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalledWith(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET environment variable is not set'));

            process.env.JWT_SECRET = originalSecret;
            consoleSpy.mockRestore();
        });

        it('should forcefully disconnect if the decoded token is missing a userId', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            (jwt.verify as jest.Mock).mockReturnValue({ role: 'USER' });

            await notificationGateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalledWith(true);
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('missing userId'));

            consoleSpy.mockRestore();
        });
    });

    describe('Subscriptions', () => {
        it('should allow an authenticated user to join their derived notification room', async () => {

            mockClient.data = { user: { userId: 'user-123' } };

            const result = await notificationGateway.handleSubscribe(mockClient);

            expect(mockClient.join).toHaveBeenCalledWith('user_notifications_user-123');
            expect(result).toEqual({
                event: 'subscribed',
                data: 'Successfully joined user_notifications_user-123'
            });
        });

        it('should return an error event if the userId is missing from socket data', async () => {

            mockClient.data = {};

            const result = await notificationGateway.handleSubscribe(mockClient);

            expect(mockClient.join).not.toHaveBeenCalled();
            expect(result).toEqual({
                event: 'error',
                data: 'Unauthorized access to room'
            });
        });
    });

    describe('Broadcasting', () => {
        it('should emit push notifications to the correct room', () => {
            const mockNotification = { id: 1, title: 'Test', body: 'Test Body', isRead: false };

            notificationGateway.sendPushNotification('user-123', mockNotification);

            expect(notificationGateway.server.to).toHaveBeenCalledWith('user_notifications_user-123');
            expect(notificationGateway.server.to('user_notifications_user-123').emit).toHaveBeenCalledWith('new_notification', mockNotification);
        });
    });
});