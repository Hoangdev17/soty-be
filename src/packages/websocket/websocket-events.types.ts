// WebSocket Event Types and Constants
// This file centralizes all WebSocket event names and their payload types

export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Room management events
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  JOINED_ROOM: 'joined_room',
  LEFT_ROOM: 'left_room',

  // Messaging events
  SEND_MESSAGE: 'send_message',
  MESSAGE: 'message',

  // User events
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',

  // Community events
  COMMUNITY_UPDATE: 'community_update',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  ROLE_UPDATED: 'role_updated',
  GET_MEMBERS: 'get_members',
  MEMBERS_LIST: 'members_list',

  // Channel events
  CREATE_CHANNEL: 'create_channel',
  CHANNEL_CREATED: 'channel_created',
  CREATED_THREAD: 'created_thread',
  UPDATED_THREAD: 'updated_thread',
  DELETED_THREAD: 'deleted_thread',

  //message events
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGES_PINNED: 'messages_pinned',
  MESSAGES_UNPINNED: 'messages_unpinned',

  // Notification events
  NOTIFICATION: 'notification',

  // Error events
  ERROR: 'error',
} as const;

export type WebSocketEvent =
  (typeof WEBSOCKET_EVENTS)[keyof typeof WEBSOCKET_EVENTS];

// Event Payload Interfaces
export interface JoinRoomPayload {
  room: string;
}

export interface LeaveRoomPayload {
  room: string;
}

export interface JoinedRoomData {
  room: string;
}

export interface LeftRoomData {
  room: string;
}

export interface SendMessagePayload {
  room: string;
  message: string;
  type?: 'text' | 'image' | 'file' | 'system' | 'reply';
  replyToMessageId?: string;
  metadata?: Record<string, any>;
}

export interface MessageData {
  id?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system' | 'reply';
  createdAt: Date;
  room?: string;
  replyTo?: Record<string, any>;
  author?: {
    id: string;
    username: string;
    avatar: string;
  };
}

export interface UserOnlineData {
  userId: string;
  username: string;
  timestamp: Date;
}

export interface UserOfflineData {
  userId: string;
  username: string;
  timestamp: Date;
}

export interface CommunityUpdateData {
  communityId: string;
  type: 'name' | 'description' | 'settings' | 'member_count';
  oldValue?: any;
  newValue: any;
  updatedBy: string;
  timestamp: Date;
}

export interface MemberEventData {
  communityId: string;
  userId?: string;
  username?: string;
  roleId?: string;
  roleName?: string;
  members?: MemberData[];
  joinedBy?: string;
  timestamp: Date;
}

export interface GetMembersPayload {
  communityId: string;
}

export interface MemberData {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  roles: {
    role: {
      id: string;
      name: string;
      permissions: string[];
      // Add other fields if needed
    };
  }[];
}

export interface MembersListData {
  members: MemberData[];
  requestedBy?: string;
  timestamp: Date;
}

export interface CreateChannelPayload {
  guildId: string;
  name: string;
  nsfw: boolean;
  topic?: string;
  position?: number;
  type: 'GUILD_TEXT' | 'GUILD_VOICE';
  manageable: boolean;
  rateLimitPerUser?: number;
  viewAble?: boolean;
  recipients?: string[];
  maxMembers?: number;
  parentId?: string;
}

export interface ChannelCreatedData {
  channel: {
    id: string;
    name: string;
    type: string;
    topic?: string;
    nsfw: boolean;
    position: number;
    manageable: boolean;
    rateLimitPerUser?: number;
    viewAble: boolean;
    recipients?: string[];
    maxMembers?: number;
    parentId?: string;
    createdAt: Date;
  };
  guildId: string;
  createdBy: string;
  timestamp: Date;
}

export interface RoleUpdateData {
  communityId: string;
  userId: string;
  roleId: string;
  oldRoleId?: string;
  newRoleId: string;
  updatedBy: string;
  timestamp: Date;
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
  read?: boolean;
}

export interface ErrorData {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Response Types
export interface WebSocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorData;
  timestamp: Date;
}

// Room Types
export type RoomType = 'user' | 'community' | 'channel' | 'direct_message';

export interface RoomInfo {
  id: string;
  type: RoomType;
  name?: string;
  participants?: string[];
  metadata?: Record<string, any>;
}

// Socket Data Types
export interface AuthenticatedUser {
  sub: string;
  username?: string;
  email?: string;
  roles?: string[];
}

export interface SocketClientData {
  user?: AuthenticatedUser;
  rooms?: string[];
  connectedAt?: Date;
}

// Event Handler Types
export type EventHandler<T = any> = (data: T) => void | Promise<void>;
export type MessageHandler = EventHandler<MessageData>;
export type NotificationHandler = EventHandler<NotificationData>;
export type ErrorHandler = EventHandler<ErrorData>;

// Client-side event emitters
export interface WebSocketClientEvents {
  [WEBSOCKET_EVENTS.JOIN_ROOM]: (payload: JoinRoomPayload) => void;
  [WEBSOCKET_EVENTS.LEAVE_ROOM]: (payload: LeaveRoomPayload) => void;
  [WEBSOCKET_EVENTS.SEND_MESSAGE]: (payload: SendMessagePayload) => void;
  [WEBSOCKET_EVENTS.GET_MEMBERS]: (payload: GetMembersPayload) => void;
  [WEBSOCKET_EVENTS.CREATE_CHANNEL]: (payload: CreateChannelPayload) => void;
}

// Server-side event emitters
export interface WebSocketServerEvents {
  [WEBSOCKET_EVENTS.JOINED_ROOM]: (data: JoinedRoomData) => void;
  [WEBSOCKET_EVENTS.LEFT_ROOM]: (data: LeftRoomData) => void;
  [WEBSOCKET_EVENTS.MESSAGE]: (data: MessageData) => void;
  [WEBSOCKET_EVENTS.USER_ONLINE]: (data: UserOnlineData) => void;
  [WEBSOCKET_EVENTS.USER_OFFLINE]: (data: UserOfflineData) => void;
  [WEBSOCKET_EVENTS.COMMUNITY_UPDATE]: (data: CommunityUpdateData) => void;
  [WEBSOCKET_EVENTS.MEMBER_JOINED]: (data: MemberEventData) => void;
  [WEBSOCKET_EVENTS.MEMBER_LEFT]: (data: MemberEventData) => void;
  [WEBSOCKET_EVENTS.ROLE_UPDATED]: (data: RoleUpdateData) => void;
  [WEBSOCKET_EVENTS.MEMBERS_LIST]: (data: MembersListData) => void;
  [WEBSOCKET_EVENTS.CHANNEL_CREATED]: (data: ChannelCreatedData) => void;
  [WEBSOCKET_EVENTS.NOTIFICATION]: (data: NotificationData) => void;
  [WEBSOCKET_EVENTS.ERROR]: (data: ErrorData) => void;
}
