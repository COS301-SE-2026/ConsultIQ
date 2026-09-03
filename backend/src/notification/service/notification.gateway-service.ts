import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../../common/guards/jwt-auth.guard';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    try {
      let token =
        client.handshake.auth?.token ||
        client.handshake.headers['authorization']?.split(' ')[1];

      const cookieHeader = client.handshake.headers.cookie;
      if (!token && cookieHeader) {
        const parsedCookies = cookie.parse(cookieHeader);
        token = parsedCookies.ciq_access_token;
      }

      if (!token) {
        throw new Error('Missing authentication token');
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set.');
      }

      const payload = jwt.verify(token, secret) as JwtPayload;

      if (!payload.userId) {
        throw new Error('Invalid token payload: missing userId');
      }

      client.data.user = payload;
      console.log(
        `Client connected & authenticated: ${client.id}, User: ${payload.userId}`,
      );
    } catch (error: any) {
      console.error(
        `Unauthorized WS connection attempt (${client.id}): ${error.message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToNOtifcations')
  async handleSubscribe(client: Socket) {
    const userId = client.data.user?.userId;

    if (!userId) {
      return { event: 'error', data: 'Unauthorized access to room' };
    }

    const roomName = `user_notifications_${userId}`;
    await client.join(roomName);
    return { event: 'subscribed', data: `Successfully joined ${roomName}` };
  }

  sendPushNotification(userId: string, payload: any): void {
    const roomName = `user_notifications_${userId}`;
    this.server.to(roomName).emit('new_notification', payload);
  }
}
