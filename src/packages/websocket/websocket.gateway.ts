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
import { LiveKitService } from '../livekit/livekit.service';
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
  JoinVoiceChannelPayload,
  LeaveVoiceChannelPayload,
  GetVoiceParticipantsPayload,
  VoiceTokenGeneratedData,
  VoiceChannelJoinedData,
  VoiceChannelLeftData,
  VoiceParticipantData,
  VoiceParticipantsListData,
  GetCommunityVoiceParticipantsPayload,
  CommunityVoiceChannelsData,
} from './websocket-events.types';
import { UsersService } from '../users/users.service';
import { PresenceStatus } from '@prisma/client';
import { CommunityService } from '../community/community.service';

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
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly communityService: CommunityService,
    private readonly livekitService: LiveKitService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake query or headers
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (token) {
        try {
          const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
          if (!secret) {
            throw new Error('JWT secret not configured');
          }

          const payload: AuthenticatedUser = this.jwtService.verify(token, {
            secret,
          });
          client.user = payload;

          await this.userService.changePresence(
            payload.sub,
            PresenceStatus.ONLINE,
          );

          this.emitToUser(payload.sub, 'online', 'online');

          const friends = await this.userService.getUserFriendList(payload.sub);

          for (let friend of friends) {
            this.emitToUser(
              friend.friend.id,
              'presence_online_friend',
              payload.sub,
            );
            this.logger.log(`Sent status to client ${friend.id}`);
          }

          const communities = await this.communityService.getUserCommunities(
            payload.sub,
          );

          for (let community of communities) {
            this.broadcastToCommunity(
              community.id,
              'presence_online_community',
              payload.sub,
            );
          }

          this.logger.log(
            `Client connected: ${client.id}, User: ${payload.sub}`,
          );

          this.logger.log(`Update presence of ${payload.sub}`);
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

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.userService.changePresence(
      client.user?.sub || '',
      PresenceStatus.OFFLINE,
    );

    const payload = client.user;
    if (!payload) return;

    const friends = await this.userService.getUserFriendList(payload.sub);

    for (let friend of friends) {
      this.emitToUser(friend.friend.id, 'presence_offline_friend', payload.sub);
      this.logger.log(`Sent status to client ${friend.id}`);
    }

    const communities = await this.communityService.getUserCommunities(
      payload.sub,
    );

    for (let community of communities) {
      this.broadcastToCommunity(
        community.id,
        'presence_offline_community',
        payload.sub,
      );
    }
    this.logger.log(`Client offline`);
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
            type: data.type || 'text',
            mentionAuthor: false,
            replyToMessageId: data.replyToMessageId,
          },
          client.user.sub,
        );

        await this.messageService.markChannelAsRead(channelId, client.user.sub);

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

  // ============= LiveKit Voice Channel Handlers =============

  @SubscribeMessage(WEBSOCKET_EVENTS.JOIN_VOICE_CHANNEL)
  async handleJoinVoiceChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinVoiceChannelPayload,
  ): Promise<WebSocketResponse<VoiceTokenGeneratedData>> {
    if (!client.user) {
      const errorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };

      // Emit error to client
      client.emit(WEBSOCKET_EVENTS.VOICE_TOKEN_GENERATED, errorResponse);

      return errorResponse;
    }

    try {
      // Create room name from channel ID
      const roomName = `voice_${data.channelId}`;

      // Get user info for display name
      const user = await this.userService.findById(client.user.sub);
      const username = data.username || user?.username || client.user.sub;

      // Create room if it doesn't exist
      await this.livekitService.createRoom(roomName, 50, 300);

      // Generate access token for user
      const token = await this.livekitService.generateAccessToken(
        roomName,
        client.user.sub,
        username,
        data.metadata,
      );

      const livekitUrl = this.configService.get<string>('LIVEKIT_URL')!;

      // Join the voice channel room for WebSocket events
      client.join(`voice_${data.channelId}`);

      this.logger.log(
        `User ${client.user.sub} joined voice channel ${data.channelId}`,
      );

      // Get current participants from LiveKit room
      const currentParticipants =
        await this.livekitService.listParticipants(roomName);

      // Get existing participants in WebSocket room (those connected via our app)
      const room = this.server.sockets.adapter.rooms.get(
        `voice_${data.channelId}`,
      );
      const existingParticipants: VoiceParticipantData[] = [];

      if (room) {
        for (const socketId of room) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && socket.user && socket.user.sub !== client.user.sub) {
            const existingUser = await this.userService.findById(
              socket.user.sub,
            );
            if (existingUser) {
              existingParticipants.push({
                participantId: socket.user.sub,
                username: existingUser.username,
                avatar: existingUser.avatar,
                avatarEffectId: existingUser.avatarEffectId,
                channelId: data.channelId,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      // Prepare response data with existing participants
      const responseData: VoiceTokenGeneratedData & {
        existingParticipants?: VoiceParticipantData[];
      } = {
        token,
        livekitUrl,
        roomName,
        existingParticipants,
      };

      // Emit directly to the requesting client
      client.emit(WEBSOCKET_EVENTS.VOICE_TOKEN_GENERATED, responseData);

      this.logger.log(
        `Emitted ${WEBSOCKET_EVENTS.VOICE_TOKEN_GENERATED} to client ${client.id} with ${existingParticipants.length} existing participants`,
      );

      // Notify others in the channel
      const joinedData: VoiceChannelJoinedData = {
        channelId: data.channelId,
        roomName,
        participantId: client.user.sub,
        username,
        avatar: user?.avatar,
        avatarEffectId: (user as any)?.avatarEffectId,
      };

      // Emit to requesting client as well
      client.emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANT_JOINED, joinedData);

      // Emit to others in the voice channel
      client
        .to(`voice_${data.channelId}`)
        .emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANT_JOINED, joinedData);

      this.logger.log(
        `Notified others of user ${client.user.sub} joining voice channel ${data.channelId}`,
      );

      // Get community ID and broadcast to community members
      const channel = await this.prismaService.guildChannel.findUnique({
        where: { id: data.channelId },
        select: { guildId: true },
      });

      if (channel?.guildId) {
        // Broadcast to all community members
        this.broadcastToCommunity(
          channel.guildId,
          WEBSOCKET_EVENTS.VOICE_PARTICIPANT_JOINED,
          joinedData,
        );

        this.logger.log(
          `Broadcasted voice join to community ${channel.guildId}`,
        );
      }

      // Also return for acknowledgment callback
      return {
        success: true,
        data: responseData,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error joining voice channel: ${error.message}`);

      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join voice channel',
        },
        timestamp: new Date(),
      };

      // Emit error to client
      client.emit(WEBSOCKET_EVENTS.VOICE_TOKEN_GENERATED, errorResponse);

      return errorResponse;
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.LEAVE_VOICE_CHANNEL)
  async handleLeaveVoiceChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveVoiceChannelPayload,
  ): Promise<WebSocketResponse<VoiceChannelLeftData>> {
    if (!client.user) {
      const errorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };

      // Emit error to client
      client.emit(WEBSOCKET_EVENTS.VOICE_CHANNEL_LEFT, errorResponse);

      return errorResponse;
    }

    try {
      // Leave the voice channel room
      client.leave(`voice_${data.channelId}`);

      // Get user info for display name
      const user = await this.userService.findById(client.user.sub);
      const username = user?.username || client.user.sub;

      this.logger.log(
        `User ${client.user.sub} left voice channel ${data.channelId}`,
      );

      // Prepare response data
      const responseData: VoiceChannelLeftData = {
        channelId: data.channelId,
        roomName: `voice_${data.channelId}`,
        participantId: client.user.sub,
        username,
        avatar: user?.avatar,
        avatarEffectId: (user as any)?.avatarEffectId,
      };

      // Emit directly to the requesting client
      client.emit(WEBSOCKET_EVENTS.VOICE_CHANNEL_LEFT, {
        success: true,
        data: responseData,
        timestamp: new Date(),
      });

      // Emit to requesting client as well
      client.emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANT_LEFT, responseData);

      // Notify others in the channel
      client
        .to(`voice_${data.channelId}`)
        .emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANT_LEFT, responseData);

      this.logger.log(
        `Notified others of user ${client.user.sub} leaving voice channel ${data.channelId}`,
      );

      // Get community ID and broadcast to community members
      const channel = await this.prismaService.guildChannel.findUnique({
        where: { id: data.channelId },
        select: { guildId: true },
      });

      if (channel?.guildId) {
        // Broadcast to all community members
        this.broadcastToCommunity(
          channel.guildId,
          WEBSOCKET_EVENTS.VOICE_PARTICIPANT_LEFT,
          responseData,
        );

        this.logger.log(
          `Broadcasted voice leave to community ${channel.guildId}`,
        );
      }

      return {
        success: true,
        data: responseData,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error leaving voice channel: ${error.message}`);

      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to leave voice channel',
        },
        timestamp: new Date(),
      };

      // Emit error to client
      client.emit(WEBSOCKET_EVENTS.VOICE_CHANNEL_LEFT, errorResponse);

      return errorResponse;
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_VOICE_PARTICIPANTS)
  async handleGetVoiceParticipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetVoiceParticipantsPayload,
  ): Promise<WebSocketResponse<VoiceParticipantsListData>> {
    if (!client.user) {
      const errorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };

      client.emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANTS_LIST, errorResponse);
      return errorResponse;
    }

    try {
      const roomName = `voice_${data.channelId}`;

      // Get participants from WebSocket room
      const room = this.server.sockets.adapter.rooms.get(
        `voice_${data.channelId}`,
      );
      const participants: VoiceParticipantData[] = [];

      if (room) {
        for (const socketId of room) {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket && socket.user) {
            const user = await this.userService.findById(socket.user.sub);
            if (user) {
              participants.push({
                participantId: socket.user.sub,
                username: user.username,
                channelId: data.channelId,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        }
      }

      const responseData: VoiceParticipantsListData = {
        channelId: data.channelId,
        roomName,
        participants,
      };

      // Emit directly to the requesting client
      client.emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANTS_LIST, {
        success: true,
        data: responseData,
        timestamp: new Date(),
      });

      this.logger.log(
        `Sent voice participants list for channel ${data.channelId} to user ${client.user.sub}: ${participants.length} participants`,
      );

      return {
        success: true,
        data: responseData,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting voice participants: ${error.message}`);

      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get voice participants',
        },
        timestamp: new Date(),
      };

      client.emit(WEBSOCKET_EVENTS.VOICE_PARTICIPANTS_LIST, errorResponse);
      return errorResponse;
    }
  }

  @SubscribeMessage(WEBSOCKET_EVENTS.GET_COMMUNITY_VOICE_PARTICIPANTS)
  async handleGetCommunityVoiceParticipants(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: GetCommunityVoiceParticipantsPayload,
  ): Promise<WebSocketResponse<CommunityVoiceChannelsData>> {
    if (!client.user) {
      const errorResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        timestamp: new Date(),
      };

      client.emit(
        WEBSOCKET_EVENTS.COMMUNITY_VOICE_PARTICIPANTS_LIST,
        errorResponse,
      );
      return errorResponse;
    }

    try {
      // Get all voice channels in the community
      const channels = await this.prismaService.guildChannel.findMany({
        where: {
          guildId: data.communityId,
          type: 'GUILD_VOICE',
          deleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const voiceChannels: Array<{
        channelId: string;
        channelName?: string;
        participants: VoiceParticipantData[];
      }> = [];

      // For each voice channel, get participants from WebSocket rooms
      for (const channel of channels) {
        const room = this.server.sockets.adapter.rooms.get(
          `voice_${channel.id}`,
        );
        const participants: VoiceParticipantData[] = [];

        if (room && room.size > 0) {
          for (const socketId of room) {
            const socket = this.server.sockets.sockets.get(socketId);
            if (socket && socket.user) {
              const user = await this.userService.findById(socket.user.sub);
              if (user) {
                participants.push({
                  participantId: socket.user.sub,
                  username: user.username,
                  avatar: user.avatar,
                  avatarEffectId: (user as any).avatarEffectId,
                  channelId: channel.id,
                  joinedAt: new Date().toISOString(),
                });
              }
            }
          }

          // Only include channels that have participants
          if (participants.length > 0) {
            voiceChannels.push({
              channelId: channel.id,
              channelName: channel.name,
              participants,
            });
          }
        }
      }

      const responseData: CommunityVoiceChannelsData = {
        communityId: data.communityId,
        voiceChannels,
      };

      // Emit directly to the requesting client
      client.emit(WEBSOCKET_EVENTS.COMMUNITY_VOICE_PARTICIPANTS_LIST, {
        success: true,
        data: responseData,
        timestamp: new Date(),
      });

      this.logger.log(
        `Sent community voice participants list for community ${data.communityId} to user ${client.user.sub}: ${voiceChannels.length} active voice channels`,
      );

      return {
        success: true,
        data: responseData,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting community voice participants: ${error.message}`,
      );

      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get community voice participants',
        },
        timestamp: new Date(),
      };

      client.emit(
        WEBSOCKET_EVENTS.COMMUNITY_VOICE_PARTICIPANTS_LIST,
        errorResponse,
      );
      return errorResponse;
    }
  }
}
