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
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { MessageService } from '../message/message.service';
import { MembersService } from '../community/modules/members/members.service';
import { ChannelsService } from '../community/modules/channels/channels.service';
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
  CreateChannelPayload,
  ChannelCreatedData,
  ToggleVideoData,
  ToggleVideoPayload,
  GetRoomUsersPayload,
  RoomUsersData,
} from './websocket-events.types';
import { UsersService } from '../users/users.service';

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
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    private readonly cacheService: CacheService,
    private readonly userService: UsersService,
  ) {}

  handleConnection(client: Socket) {
    try {
      // Extract token from handshake query or headers
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const secret = this.configService.get<string>('AUTH_JWT_SECRET');
          if (!secret) {
            throw new Error('JWT secret not configured');
          }

          const payload: AuthenticatedUser = this.jwtService.verify(token, {
            secret,
          });
          client.user = payload;
          this.logger.log(
            `Client connected: ${client.id}, User: ${payload.sub}`,
          );
        } catch (error) {
          const err = error as Error;
          this.logger.error(
            `Invalid token for client ${client.id}: ${err.message}`,
          );
          client.emit('auth_error', { message: 'Invalid or expired token' });
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
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomPayload,
  ): Promise<WebSocketResponse<JoinedRoomData>> {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);

    const user = await this.userService.findById(client.user?.sub || '');

    client.to(data.room).emit('user_joined', {
      socketId: client.id,
      room: data.room,
      user,
    });

    client.emit('user_joined', {
      socketId: client.id,
      room: data.room,
      user,
    });
    return {
      success: true,
      data: { room: data.room },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { to: string; signal: any },
  ) {
    this.logger.log(`Signal from ${socket.id} to ${data.to}`);
    socket.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.TOGGLE_VIDEO)
  async handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { from: string; isVideoEnabled: boolean }, // Khớp client
  ): Promise<WebSocketResponse<{ userId: string; isVideoEnabled: boolean }>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      // Emit cho remote users trong room
      client.to(data.from).emit(WEBSOCKET_EVENTS.TOGGLE_VIDEO, {
        from: client.id,
        isVideoEnabled: data.isVideoEnabled,
      });

      this.logger.log(
        `Video toggled to ${data.isVideoEnabled ? 'on' : 'off'} in room ${data.from} by user ${client.user.sub}`,
      );

      return {
        success: true,
        data: { userId: client.user.sub, isVideoEnabled: data.isVideoEnabled },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error toggling video: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle video' },
        timestamp: new Date(),
      };
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_ROOM_USERS)
  async handleGetRoomUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetRoomUsersPayload,
  ): Promise<WebSocketResponse<RoomUsersData>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      const room = this.server.sockets.adapter.rooms.get(data.room);

      if (!room) {
        return {
          success: false,
          error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
          timestamp: new Date(),
        };
      }

      // Chuẩn bị hai mảng: một để trả về (không kèm socketId),
      // một để emit (có socketId)
      const usersForReturn: Array<{
        id: string;
        username: string;
        avatar?: string;
      }> = [];
      const usersWithSocket: Array<{
        socketId: string;
        id: string;
        username: string;
        avatar?: string;
      }> = [];

      for (const socketId of room) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket && socket.user) {
          const user = await this.userService.findById(socket.user.sub);
          if (user) {
            usersForReturn.push({
              id: user.id,
              username: user.username,
              avatar: user.avatar,
            });

            usersWithSocket.push({
              socketId,
              id: user.id,
              username: user.username,
              avatar: user.avatar,
            });
          }
        }
      }

      this.logger.log(
        `Room users retrieved for room ${data.room} by user ${client.user.sub}`,
      );

      let emitRoom = data.room;
      if (data.room.endsWith('_init')) {
        emitRoom = data.room.replace('_init', '');
      }

      this.emitToRoom(emitRoom, WEBSOCKET_EVENTS.ROOM_USERS, {
        users: usersWithSocket,
        requestedBy: client.user.sub,
        timestamp: new Date(),
        sourceRoom: data.room,
      });

      return {
        success: true,
        data: { users: usersForReturn },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting room users: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get room users' },
        timestamp: new Date(),
      };
    }
  }

  @SubscribeMessage('user-left')
  handleUserLeft(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { room: string; userId: string },
  ) {
    socket
      .to(data.room)
      .emit('user-left', { userId: data.userId, socketId: socket.id });
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_ROOM)
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveRoomPayload,
  ): WebSocketResponse<LeftRoomData> {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);

    client
      .to(data.room)
      .emit('user_left', { socketId: client.id, room: data.room });
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
          channel: {
            select: {
              id: true,
              name: true,
              guildId: true,
              guild: { select: { id: true, name: true } },
            },
          },
          referredBy: {
            include: {
              messageRef: {
                select: {
                  id: true,
                  content: true,
                  author: {
                    select: { id: true, username: true, avatar: true },
                  },
                },
              },
            },
          },
        },
      });

      let message;
      let messageData: MessageData;

      if (existingMessage) {
        // Use existing message from database
        message = existingMessage;
        this.logger.log(
          `Using existing message ${message.id} to avoid duplicate`,
        );

        // Build messageData from database result
        messageData = {
          id: existingMessage.id,
          content: existingMessage.content,
          type: existingMessage.type === 19 ? 'reply' : data.type || 'text',
          createdAt: existingMessage.createdAt,
          room: data.room,
          channelId: existingMessage.channel.id,
          channelName: existingMessage.channel.name,
          guildId: existingMessage.channel.guildId,
          guildName: existingMessage.channel.guild.name,
          author: {
            id: existingMessage.author.id,
            username: existingMessage.author.username,
            avatar: existingMessage.author.avatar || '',
          },
          metadata: { communityId: existingMessage.channel.guildId },
        };

        // Add reply information if message has references
        if (
          existingMessage.referredBy &&
          existingMessage.referredBy.length > 0
        ) {
          const reference = existingMessage.referredBy[0];
          messageData.replyTo = {
            id: reference.messageRef.id,
            content: reference.messageRef.content,
            author: reference.messageRef.author,
          };
        }
      } else {
        // Create new message using MessageService
        const serviceResponse = await this.messageService.sendMessage(
          {
            content: data.message,
            channelId,
            mentionAuthor: false,
            replyToMessageId: data.replyToMessageId,
          },
          client.user.sub,
        );

        this.logger.log(`Created new message ${serviceResponse.id}`);

        // Use service response directly as it already has proper format
        messageData = {
          id: serviceResponse.id,
          content: serviceResponse.content,
          type: serviceResponse.type,
          createdAt: serviceResponse.createdAt,
          room: data.room,
          channelId: serviceResponse.channelId,
          channelName: serviceResponse.channelName,
          guildId: serviceResponse.guildId,
          guildName: serviceResponse.guildName,
          author: serviceResponse.author,
          replyTo: serviceResponse.replyTo,
          metadata: { communityId: serviceResponse.guildId },
        };
      }

      console.log('Emitting message data:', messageData);

      this.emitToRoom(data.room, WEBSOCKET_EVENTS.MESSAGE, messageData, client);
      // Extract communityId from channelId to emit to community
      const channel = await this.prismaService.guildChannel.findUnique({
        where: { id: channelId },
        select: { guildId: true, recipients: true },
      });

      if (channel) {
        this.emitToRoom(
          `community_${channel.guildId}`,
          WEBSOCKET_EVENTS.MESSAGE,
          messageData,
          client,
        );

        // Emit to all guild members or recipients excluding sender
        if (channel.guildId) {
          // Guild channel: emit to all members
          const members = await this.prismaService.guildMember.findMany({
            where: { guildId: channel.guildId },
            select: { userId: true },
          });
          for (const member of members) {
            if (member.userId !== client.user.sub) {
              this.emitToUser(
                member.userId,
                WEBSOCKET_EVENTS.MESSAGE,
                messageData,
              );

              this.logger.log(`Emitted message to user ${member.userId}`);
            }
          }
        } else if (channel.recipients && channel.recipients.length > 0) {
          // DM/Group DM: emit to recipients
          for (const userId of channel.recipients) {
            if (userId !== client.user.sub) {
              this.emitToUser(userId, WEBSOCKET_EVENTS.MESSAGE, messageData);
            }
          }
        }
      }

      this.logger.log(
        `Message sent to room ${data.room} by user ${client.user.sub}`,
      );

      return {
        success: true,
        data: { messageId: messageData.id },
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

  @SubscribeMessage(WEBSOCKET_EVENTS.CHANNEL_READ)
  async handleChannelRead(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { channelId: string; lastReadMessageId?: string; lastRead?: string },
  ): Promise<WebSocketResponse<{ channelId?: string }>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      // Always use markChannelAsRead to get the latest message ID instead of trusting client
      await this.messageService.markChannelAsRead(
        data.channelId,
        client.user.sub,
      );

      this.logger.log(
        `Channel read updated in DB for channel ${data.channelId} by user ${client.user.sub}`,
      );

      // Get the actual lastReadMessageId that was set
      const lastRead = await this.prismaService.channelLastRead.findUnique({
        where: {
          channelId_userId: {
            channelId: data.channelId,
            userId: client.user.sub,
          },
        },
        select: { lastReadMessageId: true },
      });

      const payload = {
        channelId: data.channelId,
        userId: client.user.sub,
        lastReadMessageId: lastRead?.lastReadMessageId ?? null,
        lastRead: data.lastRead ? new Date(data.lastRead) : new Date(),
      };

      // Broadcast to channel excluding sender
      this.emitToRoom(
        `channel_${data.channelId}`,
        WEBSOCKET_EVENTS.READ_UPDATE,
        payload,
      );

      // Emit to all guild members or recipients excluding sender
      const channel = await this.prismaService.guildChannel.findUnique({
        where: { id: data.channelId },
        select: { guildId: true, recipients: true },
      });

      if (channel) {
        if (channel.guildId) {
          // Guild channel: emit to all members
          const members = await this.prismaService.guildMember.findMany({
            where: { guildId: channel.guildId },
            select: { userId: true },
          });
          for (const member of members) {
            if (member.userId !== client.user.sub) {
              this.emitToUser(
                member.userId,
                WEBSOCKET_EVENTS.READ_UPDATE,
                payload,
              );
            }
          }
        } else if (channel.recipients && channel.recipients.length > 0) {
          // DM/Group DM: emit to recipients
          for (const userId of channel.recipients) {
            if (userId !== client.user.sub) {
              this.emitToUser(userId, WEBSOCKET_EVENTS.READ_UPDATE, payload);
            }
          }
        }
      }

      this.logger.log(
        `Channel read updated for channel ${data.channelId} by user ${client.user.sub}`,
      );

      return {
        success: true,
        data: { channelId: data.channelId },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error handling channel read: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to process read' },
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
        data.userId || '',
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

  @SubscribeMessage(WEBSOCKET_EVENTS.CREATE_CHANNEL)
  async handleCreateChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateChannelPayload,
  ): Promise<WebSocketResponse<{ channelId?: string }>> {
    if (!client.user) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };
    }

    try {
      // Create the channel using ChannelsService
      const createData = {
        ...data,
        position: data.position ?? 0,
        viewAble: data.viewAble ?? true,
        parentId: data.parentId,
      };
      const channel = await this.channelsService.createChannel(
        data.guildId,
        createData,
        client.user.sub,
      );

      this.logger.log(
        `Channel ${channel.name} created in guild ${data.guildId} by user ${client.user.sub}`,
      );

      // Emit the channel creation to all clients in the community
      const channelData: ChannelCreatedData = {
        channel: {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          topic: channel.topic || undefined,
          nsfw: channel.nsfw,
          position: channel.position || 0,
          manageable: channel.manageable,
          rateLimitPerUser: channel.rateLimitPerUser || undefined,
          viewAble: channel.viewAble,
          recipients: channel.recipients || undefined,
          maxMembers: channel.maxMembers || undefined,
          parentId: channel.parentId || undefined,
          createdAt: channel.createdAt,
        },
        guildId: data.guildId,
        createdBy: client.user.sub,
        timestamp: new Date(),
      };

      this.broadcastToCommunity(
        data.guildId,
        WEBSOCKET_EVENTS.CHANNEL_CREATED,
        channelData,
      );

      return {
        success: true,
        data: { channelId: channel.id },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error creating channel: ${error.message}`);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create channel' },
        timestamp: new Date(),
      };
    }
  }

  // Method to emit events from othyer services
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
