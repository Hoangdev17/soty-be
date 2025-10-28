/**
 * Bot Handler System - Examples
 *
 * File này chứa các ví dụ về cách sử dụng Bot Handler System
 */

// ==================== EXAMPLE 1: Simple Ping Bot ====================

/**
 * 1. Tạo bot
 */
const createBot = {
  method: 'POST',
  url: '/bots',
  body: {
    username: 'PingBot',
    displayName: 'Simple Ping Bot',
    email: 'pingbot@example.com',
  },
};
// Response: { id: 'bot_123', username: 'PingBot', ... }

/**
 * 2. Tạo action cho ping command
 */
const createPingAction = {
  method: 'POST',
  url: '/bots/bot_123/skills/skill_456/actions',
  body: {
    name: 'PingAction',
    handler: 'pingHandler',
    paramsSchema: {}, // Không cần params
  },
};
// Response: { id: 'action_789', name: 'PingAction', handler: 'pingHandler' }

/**
 * 3. Tạo command trigger cho ping
 */
const createPingCommand = {
  method: 'POST',
  url: '/bots/bot_123/commands',
  body: {
    name: 'ping',
    description: 'Kiểm tra bot có hoạt động không',
    triggerType: 'PREFIX',
    pattern: '!ping',
    actionId: 'action_789',
  },
};
// Response: { id: 'cmd_111', name: 'ping', ... }

/**
 * 4. Invite bot vào guild
 */
const inviteBot = {
  method: 'POST',
  url: '/bots/bot_123/invite/guild_999',
  headers: { Authorization: 'Bearer <token>' },
};

/**
 * 5. Khi user gửi message "!ping", xử lý như sau:
 */
const processMessage = {
  method: 'POST',
  url: '/bots/process-message',
  body: {
    messageId: 'msg_001',
    channelId: 'channel_001',
    guildId: 'guild_999',
    authorId: 'user_001',
    content: '!ping',
  },
};
// Bot sẽ tự động phản hồi: "🏓 Pong!"

// ==================== EXAMPLE 2: Moderation Bot ====================

/**
 * Setup một bot với các lệnh moderation
 */

// 1. Tạo bot
const modBot = {
  method: 'POST',
  url: '/bots',
  body: {
    username: 'ModBot',
    displayName: 'Moderation Bot',
    email: 'modbot@example.com',
  },
};

// 2. Tạo kick action
const kickAction = {
  method: 'POST',
  url: '/bots/bot_mod/skills/skill_mod/actions',
  body: {
    name: 'KickAction',
    handler: 'kickMemberHandler',
    paramsSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
      },
      required: ['userId'],
    },
  },
};

// 3. Tạo ban action
const banAction = {
  method: 'POST',
  url: '/bots/bot_mod/skills/skill_mod/actions',
  body: {
    name: 'BanAction',
    handler: 'banMemberHandler',
    paramsSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['userId'],
    },
  },
};

// 4. Tạo kick command với regex để lấy user ID
const kickCommand = {
  method: 'POST',
  url: '/bots/bot_mod/commands',
  body: {
    name: 'kick',
    description: 'Kick member khỏi server',
    triggerType: 'PATTERN',
    pattern: '^!kick <@(\\d+)>$', // Match: !kick <@123456789>
    actionId: 'action_kick',
  },
};

// 5. Tạo ban command với lý do
const banCommand = {
  method: 'POST',
  url: '/bots/bot_mod/commands',
  body: {
    name: 'ban',
    description: 'Ban member khỏi server',
    triggerType: 'PATTERN',
    pattern: '^!ban <@(\\d+)>\\s*(.*)$', // Match: !ban <@123456789> Spamming
    actionId: 'action_ban',
  },
};

// 6. User sends: "!kick <@987654321>"
const kickMessage = {
  method: 'POST',
  url: '/bots/process-message',
  body: {
    messageId: 'msg_002',
    channelId: 'channel_001',
    guildId: 'guild_999',
    authorId: 'admin_001',
    content: '!kick <@987654321>',
  },
};
// Bot sẽ kick user 987654321 và trả về: "Đã kick user 987654321 khỏi server"

// ==================== EXAMPLE 3: Info Bot ====================

/**
 * Bot cung cấp thông tin về server
 */

// 1. Tạo server info action
const serverInfoAction = {
  method: 'POST',
  url: '/bots/bot_info/skills/skill_info/actions',
  body: {
    name: 'ServerInfoAction',
    handler: 'serverInfoHandler',
    paramsSchema: {},
  },
};

// 2. Tạo help action
const helpAction = {
  method: 'POST',
  url: '/bots/bot_info/skills/skill_info/actions',
  body: {
    name: 'HelpAction',
    handler: 'helpHandler',
    paramsSchema: {},
  },
};

// 3. Tạo commands
const serverInfoCommand = {
  method: 'POST',
  url: '/bots/bot_info/commands',
  body: {
    name: 'serverinfo',
    description: 'Hiển thị thông tin server',
    triggerType: 'PREFIX',
    pattern: '!serverinfo',
    actionId: 'action_serverinfo',
  },
};

const helpCommand = {
  method: 'POST',
  url: '/bots/bot_info/commands',
  body: {
    name: 'help',
    description: 'Hiển thị danh sách lệnh',
    triggerType: 'PREFIX',
    pattern: '!help',
    actionId: 'action_help',
  },
};

// 4. User gửi "!serverinfo"
const serverInfoMessage = {
  method: 'POST',
  url: '/bots/process-message',
  body: {
    messageId: 'msg_003',
    channelId: 'channel_001',
    guildId: 'guild_999',
    authorId: 'user_002',
    content: '!serverinfo',
  },
};
// Bot trả về:
// 📊 **Thông tin server: My Server**
// 👥 Thành viên: 150
// 📝 Kênh: 25
// 🎭 Vai trò: 10
// 📅 Tạo lúc: 01/01/2024

// ==================== EXAMPLE 4: Custom Announcement Bot ====================

/**
 * Bot gửi thông báo đến channel cụ thể
 */

// 1. Tạo send message action
const sendMessageAction = {
  method: 'POST',
  url: '/bots/bot_announce/skills/skill_announce/actions',
  body: {
    name: 'SendAnnouncementAction',
    handler: 'sendMessageHandler',
    paramsSchema: {
      type: 'object',
      properties: {
        channelId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['channelId', 'content'],
    },
  },
};

// 2. Tạo command để trigger announcement
const announceCommand = {
  method: 'POST',
  url: '/bots/bot_announce/commands',
  body: {
    name: 'announce',
    description: 'Gửi thông báo đến channel',
    triggerType: 'PATTERN',
    pattern: '^!announce <#(\\d+)>\\s+(.+)$', // Match: !announce <#channelId> message
    actionId: 'action_announce',
  },
};

// 3. Admin gửi: "!announce <#123456789> Server maintenance in 1 hour"
const announceMessage = {
  method: 'POST',
  url: '/bots/process-message',
  body: {
    messageId: 'msg_004',
    channelId: 'channel_admin',
    guildId: 'guild_999',
    authorId: 'admin_001',
    content: '!announce <#123456789> Server maintenance in 1 hour',
  },
};
// Bot sẽ gửi message đến channel 123456789

// ==================== EXAMPLE 5: Role Management Bot ====================

/**
 * Bot quản lý roles
 */

// 1. Tạo create role action
const createRoleAction = {
  method: 'POST',
  url: '/bots/bot_role/skills/skill_role/actions',
  body: {
    name: 'CreateRoleAction',
    handler: 'createRoleHandler',
    paramsSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' },
      },
      required: ['name'],
    },
  },
};

// 2. Tạo assign role action
const assignRoleAction = {
  method: 'POST',
  url: '/bots/bot_role/skills/skill_role/actions',
  body: {
    name: 'AssignRoleAction',
    handler: 'assignRoleHandler',
    paramsSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        roleId: { type: 'string' },
      },
      required: ['userId', 'roleId'],
    },
  },
};

// 3. Tạo commands
const createRoleCommand = {
  method: 'POST',
  url: '/bots/bot_role/commands',
  body: {
    name: 'createrole',
    description: 'Tạo role mới',
    triggerType: 'PATTERN',
    pattern: '^!createrole (.+)$',
    actionId: 'action_createrole',
  },
};

const assignRoleCommand = {
  method: 'POST',
  url: '/bots/bot_role/commands',
  body: {
    name: 'assignrole',
    description: 'Gán role cho member',
    triggerType: 'PATTERN',
    pattern: '^!assignrole <@(\\d+)> <@&(\\d+)>$',
    actionId: 'action_assignrole',
  },
};

// ==================== Checking Bot Statistics ====================

/**
 * Lấy thống kê về bot
 */

// 1. Lấy danh sách handlers
const getHandlers = {
  method: 'GET',
  url: '/bots/bot_123/handlers',
};
// Response: { handlers: ['pingHandler', 'kickHandler', ...] }

// 2. Lấy lịch sử thực thi
const getExecutions = {
  method: 'GET',
  url: '/bots/bot_123/executions',
};
// Response: Array of command executions with details

// 3. Lấy thống kê
const getStats = {
  method: 'GET',
  url: '/bots/bot_123/statistics',
};
// Response: { totalExecutions: 1000, totalResponses: 950, commandStats: [...] }

// ==================== Integration với WebSocket (Future) ====================

/**
 * Trong tương lai, thay vì gọi POST /bots/process-message,
 * có thể tích hợp trực tiếp với WebSocket gateway:
 */

/*
// In message.gateway.ts or similar
@WebSocketGateway()
export class MessageGateway {
  constructor(private botMessageProcessor: BotMessageProcessor) {}

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() data: any) {
    // Process message
    const messageContext = {
      messageId: data.id,
      channelId: data.channelId,
      guildId: data.guildId,
      authorId: data.authorId,
      content: data.content,
    };

    // Trigger bot processing
    await this.botMessageProcessor.processMessage(messageContext);
  }
}
*/

export default {
  examples: [
    'Ping Bot',
    'Moderation Bot',
    'Info Bot',
    'Announcement Bot',
    'Role Management Bot',
  ],
  availableHandlers: [
    'sendMessageHandler',
    'simpleReplyHandler',
    'deleteMessageHandler',
    'kickMemberHandler',
    'banMemberHandler',
    'createRoleHandler',
    'assignRoleHandler',
    'pingHandler',
    'serverInfoHandler',
    'helpHandler',
  ],
};
