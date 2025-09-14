import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MessageService } from '../message/message.service';
import { MembersService } from '../community/modules/members/members.service';
import { WEBSOCKET_EVENTS } from './websocket-events.types';
import type {
  JoinRoomPayload,
  LeaveRoomPayload,
  SendMessagePayload,
  JoinedRoomData,
  LeftRoomData,
  MessageData,
  AuthenticatedUser,
  WebSocketResponse,
  GetMembersPayload,
  MembersListData,
  MemberEventData,
} from './websocket-events.types';

declare module 'socket.io' {
  interface Socket {
    user?: AuthenticatedUser;
  }
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure CORS as needed for your frontend
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebsocketGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}

  handleConnection(client: Socket) {
    try {
      // Extract token from handshake query or headers
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const payload: AuthenticatedUser = this.jwtService.verify(token);
          client.user = payload;
          this.logger.log(
            `Client connected: ${client.id}, User: ${payload.sub}`,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Invalid token for client ${client.id}: ${err.message}`,
          );
          client.disconnect();
          return;
        }
      } else {
        this.logger.log(`Client connected without auth: ${client.id}`);
      }

      // Join user-specific room if authenticated
      if (client.user) {
        client.join(`user_${client.user.sub}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Connection error for client ${client.id}: ${err.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Cleanup logic can be added here
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.JOIN_ROOM)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomPayload,
  ): WebSocketResponse<JoinedRoomData> {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);
    return {
      success: true,
      data: { room: data.room },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomPayload,
  ): WebSocketResponse<LeftRoomData> {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);
    return {
      success: true,
      data: { room: data.room },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessagePayload,
  ): Promise<WebSocketResponse<{ messageId?: string }>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      // Extract channelId from room name (format: channel_{channelId})
      const channelId = data.room.replace('channel_', '');

      // Check if message already exists to avoid duplicates
      const existingMessage = await this.prismaService.guildMessage.findFirst({
        where: {
          content: data.message,
          channelId: channelId,
          authorId: client.user.sub,
          createdAt: {
            gte: new Date(Date.now() - 5000), // Within last 5 seconds
          },
        },
        include: {
          author: true,
          channel: true,
        },
      });

      let message;
      if (existingMessage) {
        // Use existing message
        message = existingMessage;
        this.logger.log(
          `Using existing message ${message.id} to avoid duplicate`,
        );
      } else {
        // Create new message using MessageService
        message = await this.messageService.sendMessage(
          { content: data.message, channelId },
          client.user.sub,
        );
        this.logger.log(`Created new message ${message.id}`);
      }

      // Emit to room excluding the sender
      const messageData: MessageData = {
        id: message.id,
        content: message.content,
        type: data.type || 'text',
        createdAt: message.createdAt,
        room: data.room,
        metadata: {
          channelId,
          channelName: message.channelName,
          author: message.author,
        },
        author: {
          id: message.author.id,
          username: message.author.username,
          avatar: message.author.avatar || '',
        },
      };

      // Emit to room but exclude the sender
      this.emitToRoom(data.room, WEBSOCKET_EVENTS.MESSAGE, messageData, client);

      this.logger.log(
        `Message sent to room ${data.room} by user ${client.user.sub}`,
      );

      return {
        success: true,
        data: { messageId: message.id },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send message' },
        timestamp: new Date(),
      };
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_MEMBERS)
  async handleGetMembers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetMembersPayload,
  ): Promise<WebSocketResponse<MembersListData>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      const members = await this.membersService.getCommunityMembers(
        data.communityId,
      );

      this.logger.log(
        `Members retrieved for community ${data.communityId} by user ${client.user.sub}`,
      );

      // Emit members list to all clients in the community
      this.broadcastToCommunity(
        data.communityId,
        WEBSOCKET_EVENTS.MEMBERS_LIST,
        {
          members,
          requestedBy: client.user.sub,
          timestamp: new Date(),
        },
      );

      return {
        success: true,
        data: { members, timestamp: new Date() },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting members: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get members' },
        timestamp: new Date(),
      };
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.MEMBER_JOINED)
  async handleMemberJoined(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MemberEventData,
  ): Promise<void> {
    // When a member joins, emit the updated members list to all clients in the community
    try {
      const members = await this.membersService.joinCommunity(
        data.communityId,
        data.userId,
      );

      this.logger.log(
        `Member ${data.userId} joined community ${data.communityId}, updating member list`,
      );

      this.broadcastToCommunity(
        data.communityId,
        WEBSOCKET_EVENTS.MEMBER_JOINED,
        {
          members,
          communityId: data.communityId,
          joinedBy: data.userId,
          timestamp: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Error updating members list after join: ${error.message}`,
      );
    }
  }

  // Method to emit events from other services
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any, excludeClient?: Socket) {
    if (excludeClient) {
      excludeClient.to(room).emit(event, data);
    } else {
      this.server.to(room).emit(event, data);
    }
  }

  // Typed emit methods for better type safety
  emitToUserTyped<T>(userId: string, event: string, data: T) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  emitToRoomTyped<T>(
    room: string,
    event: string,
    data: T,
    excludeClient?: Socket,
  ) {
    if (excludeClient) {
      excludeClient.to(room).emit(event, data);
    } else {
      this.server.to(room).emit(event, data);
    }
  }

  // Specific event emitters
  notifyUser(userId: string, notification: any) {
    this.emitToUser(userId, WEBSOCKET_EVENTS.NOTIFICATION, notification);
  }

  broadcastToCommunity(communityId: string, event: string, data: any) {
    this.emitToRoom(`community_${communityId}`, event, data);
  }
}
