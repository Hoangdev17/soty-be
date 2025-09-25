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
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    @Inject(forwardRef(() => ChannelsService))
    private readonly channelsService: ChannelsService,
    private readonly cacheService: CacheService,
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

  // Voice channel events
  @SubscribeMessage('join-room')
  async handleJoinRoomVoice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; communityId?: string },
  ): Promise<WebSocketResponse<{ roomId: string }>> {
    client.join(data.roomId);
    this.logger.log(`Client ${client.id} joined voice room: ${data.roomId}`);
    // Get existing users in room (socket ids excluding the joining client)
    const room = this.server.sockets.adapter.rooms.get(data.roomId);
    const socketIds = room
      ? Array.from(room).filter((id) => id !== client.id)
      : [];

    let users: Array<any> = [];
    if (socketIds.length > 0) {
      // Build map socketId -> userId and collect userIds to fetch from DB
      const socketToUserId = new Map<string, string | null>();
      const userIdsToFetch = new Set<string>();
      for (const socketId of socketIds) {
        const sock = this.server.sockets.sockets.get(socketId) as
          | Socket
          | undefined;
        const uid = (sock?.user as any)?.sub ?? null;
        socketToUserId.set(socketId, uid);
        if (uid) userIdsToFetch.add(uid);
      }

      // Try cache first, then DB for missing profiles
      const profileMap = new Map<
        string,
        {
          id: string;
          username?: string;
          avatar?: string | null;
          banner?: string | null;
        }
      >();
      if (userIdsToFetch.size > 0) {
        const ids = Array.from(userIdsToFetch);
        let missingIds = ids;
        if (this.cacheService) {
          const cached = await Promise.all(
            ids.map((id) => this.cacheService.get(`user_profile_${id}`)),
          );
          missingIds = [];
          cached.forEach((val, i) => {
            if (val) profileMap.set(ids[i], val);
            else missingIds.push(ids[i]);
          });
        }

        if (missingIds.length > 0) {
          const profiles = await this.prismaService.user.findMany({
            where: { id: { in: missingIds } },
            select: { id: true, username: true, avatar: true, banner: true },
          });
          for (const p of profiles) {
            profileMap.set(p.id, p);
            if (this.cacheService) {
              await this.cacheService.set(`user_profile_${p.id}`, p, 60 * 5);
            }
          }
        }
      }

      // Build user objects for existing sockets
      users = socketIds.map((socketId) => {
        const sock = this.server.sockets.sockets.get(socketId) as
          | Socket
          | undefined;
        const userPartial = sock?.user as any | undefined;
        const uid = socketToUserId.get(socketId) ?? null;
        const profile = uid ? profileMap.get(uid) : undefined;

        return {
          socketId,
          id: uid ?? null,
          username: userPartial?.username ?? profile?.username ?? null,
          avatar: userPartial?.avatar ?? profile?.avatar ?? null,
          banner: userPartial?.banner ?? profile?.banner ?? null,
        };
      });

      // Send existing users to the new client
      client.emit('room-users', { users });
    }

    // Notify existing users about new client with metadata (so FE can show new user immediately)
    const newUserPartial = client.user as any | undefined;
    let newUserProfile:
      | {
          id: string;
          username?: string;
          avatar?: string | null;
          banner?: string | null;
        }
      | undefined;
    if (client.user?.sub) {
      // try cache
      if (this.cacheService) {
        newUserProfile =
          (await this.cacheService.get(`user_profile_${client.user.sub}`)) ??
          undefined;
      }
      if (!newUserProfile) {
        const p = await this.prismaService.user.findUnique({
          where: { id: client.user.sub },
          select: { id: true, username: true, avatar: true, banner: true },
        });
        if (p) {
          newUserProfile = p;
          if (this.cacheService)
            await this.cacheService.set(`user_profile_${p.id}`, p, 60 * 5);
        }
      }
    }

    const newUserMeta = {
      socketId: client.id,
      id: client.user?.sub ?? null,
      username: newUserPartial?.username ?? newUserProfile?.username ?? null,
      avatar: newUserPartial?.avatar ?? newUserProfile?.avatar ?? null,
      banner: newUserPartial?.banner ?? newUserProfile?.banner ?? null,
    };

    client.to(data.roomId).emit('user-joined', { user: newUserMeta });

    // Broadcast presence to community subscribers if communityId provided
    if (data.communityId) {
      // include the joining user so subscribers see the updated full list
      const usersAfter = [newUserMeta, ...users];
      const usersCount = usersAfter.length;
      this.broadcastToCommunity(data.communityId, 'channel-presence', {
        roomId: data.roomId,
        usersCount,
        users: usersAfter,
      });

      this.logger.log(
        `Broadcasted presence for room ${data.roomId} in community ${data.communityId}: ${usersCount} users`,
      );
    }

    return {
      success: true,
      data: { roomId: data.roomId },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage('get-room-users')
  async handleGetRoomUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    const room = this.server.sockets.adapter.rooms.get(data.roomId);
    const socketIds = room
      ? Array.from(room).filter((id) => id !== client.id)
      : [];

    // Map socketId -> userId (from socket.user if present)
    const socketToUserId = new Map<string, string | null>();
    const userIdsToFetch = new Set<string>();
    for (const socketId of socketIds) {
      const sock = this.server.sockets.sockets.get(socketId) as
        | Socket
        | undefined;
      const uid = (sock?.user as any)?.sub ?? null;
      socketToUserId.set(socketId, uid);
      if (uid) userIdsToFetch.add(uid);
    }

    // Try cache first (optional). If cacheService available, attempt to get profiles
    const profileMap = new Map<
      string,
      {
        id: string;
        username?: string;
        avatar?: string | null;
        banner?: string | null;
      }
    >();
    if (userIdsToFetch.size > 0) {
      const ids = Array.from(userIdsToFetch);
      // Try to read from cache in batch (if implemented)
      let missingIds = ids;
      if (this.cacheService) {
        const cached = await Promise.all(
          ids.map((id) => this.cacheService.get(`user_profile_${id}`)),
        );
        missingIds = [];
        cached.forEach((val, i) => {
          if (val) profileMap.set(ids[i], val);
          else missingIds.push(ids[i]);
        });
      }

      // Fetch missing profiles from DB in one query
      if (missingIds.length > 0) {
        const profiles = await this.prismaService.user.findMany({
          where: { id: { in: missingIds } },
          select: { id: true, username: true, avatar: true, banner: true },
        });
        for (const p of profiles) {
          profileMap.set(p.id, p);
          if (this.cacheService) {
            // cache short-lived
            await this.cacheService.set(`user_profile_${p.id}`, p, 60 * 5);
          }
        }
      }
    }

    const users = socketIds.map((socketId) => {
      const sock = this.server.sockets.sockets.get(socketId) as
        | Socket
        | undefined;
      const userPartial = sock?.user as any | undefined;
      const uid = socketToUserId.get(socketId) ?? null;
      const profile = uid ? profileMap.get(uid) : undefined;

      return {
        socketId,
        id: uid ?? null,
        username: userPartial?.username ?? profile?.username ?? null,
        avatar: userPartial?.avatar ?? profile?.avatar ?? null,
        banner: userPartial?.banner ?? profile?.banner ?? null,
      };
    });

    client.emit('room-users', { users });
    this.logger.log(`Sent room users to ${client.id}: ${users.length} users`);
  }

  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { type: string; payload: any; to: string },
  ): void {
    this.server.to(data.to).emit('signal', {
      type: data.type,
      payload: data.payload,
      from: client.id,
    });
  }

  @SubscribeMessage('video-presence')
  handleVideoPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      socketId?: string;
      hasVideo: boolean;
      communityId?: string;
    },
  ): WebSocketResponse<{ roomId?: string }> {
    // Normalize socketId (client may send its own id or omit it)
    const socketId = data.socketId ?? client.id;

    const payload = {
      socketId,
      userId: client.user?.sub ?? null,
      hasVideo: !!data.hasVideo,
    };

    // Emit to other participants in the room (exclude sender)
    client.to(data.roomId).emit('video-presence', payload);

    // If communityId provided, also notify community subscribers
    if (data.communityId) {
      this.broadcastToCommunity(data.communityId, 'video-presence', {
        roomId: data.roomId,
        ...payload,
      });
    }

    return {
      success: true,
      data: { roomId: data.roomId },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage('screen-presence')
  handleScreenPresence(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId: string;
      socketId?: string;
      isSharing: boolean;
      communityId?: string;
    },
  ): WebSocketResponse<{ roomId?: string }> {
    // Normalize socketId (client may send its own id or omit it)
    const socketId = data.socketId ?? client.id;

    const payload = {
      socketId,
      userId: client.user?.sub ?? null,
      isSharing: !!data.isSharing,
    };

    // Log presence change for debugging
    this.logger.log(
      `Screen presence from ${client.id} in room ${data.roomId}: isSharing=${payload.isSharing}`,
    );

    // Emit to other participants in the room (exclude sender)
    client.to(data.roomId).emit('screen-presence', payload);

    // Also emit back to sender so their UI (or any subscribers) can reliably receive the same event
    client.emit('screen-presence', payload);

    // If communityId provided, also notify community subscribers
    if (data.communityId) {
      this.broadcastToCommunity(data.communityId, 'screen-presence', {
        roomId: data.roomId,
        ...payload,
      });
    }

    return {
      success: true,
      data: { roomId: data.roomId },
      timestamp: new Date(),
    };
  }

  @SubscribeMessage('user-left')
  handleUserLeft(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; communityId?: string },
  ): WebSocketResponse<{ roomId: string }> {
    client.leave(data.roomId);
    this.logger.log(`Client ${client.id} left voice room: ${data.roomId}`);
    client.to(data.roomId).emit('user-left', { socketId: client.id });

    // If communityId provided, broadcast updated presence
    if (data.communityId) {
      const roomNow = this.server.sockets.adapter.rooms.get(data.roomId);
      const usersCount = roomNow ? roomNow.size : 0;
      this.broadcastToCommunity(data.communityId, 'channel-presence', {
        roomId: data.roomId,
        usersCount,
      });
    }
    return {
      success: true,
      data: { roomId: data.roomId },
      timestamp: new Date(),
    };
  }
}
