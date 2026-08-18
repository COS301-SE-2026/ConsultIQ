import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  WebSocketServer,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeToNOtifcations')
  handleSubscribe(client: Socket, userId: string) {
    const roomName = `user_notifications_${userId}`;
    client.join(roomName);
    return { event: 'subscribed', data: `Successfully joined ${roomName}` };
  }

  async sendPushNotification(userId: string, payload: any): Promise<void> {
    const roomName = `user_notifications_${userId}`;
    return new Promise((resolve) => {
      this.server.to(roomName).emit('new_notification', payload);
      resolve();
    });
  }
}
