import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { Notification } from '../common/entities/notification.entity';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.CLIENT_URL || '*' },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(NotificationGateway.name);
  constructor(private readonly authService: AuthService) {}

  afterInit(server: Server) {
    server.use(async (client: Socket, next) => {
      try {
        const token =
          client.handshake.auth?.token || client.handshake.headers['authorization']?.split(' ')[1];
        if (!token) throw new Error('No token provided');

        const userId = await this.authService.verifyWebsocketToken(token);

        client.data.userId = userId;

        next();
      } catch (error) {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId;
    client.join(`user_${userId}`);
    this.logger.log(`Authenticated client connected: ${client.id} (User: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('ws.send_notification')
  handleLiveNotificationPing(payload: { notifications: Notification[] }) {
    payload.notifications.forEach((notification) => {
      this.server.to(`user_${notification.user.id}`).emit('new_notification', {
        id: notification.id,
        text: notification.text,
        type: notification.type,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      });
    });
  }
}
