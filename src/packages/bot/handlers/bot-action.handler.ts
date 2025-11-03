import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import { MessageService } from '../../message/message.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';
import { BotMemoryHandler } from './bot-memory.handler';
import { BotAIChatHandler } from './bot-ai-chat.handler';
import { MessageFilterSkillHandler } from './message-filter-skill.handler';

export interface BotActionContext {
  botId: string;
  messageId: string;
  channelId: string;
  guildId?: string;
  userId: string;
  content: string;
  params?: Record<string, any>;
}

export interface BotActionResult {
  success: boolean;
  response?: string;
  error?: string;
  data?: any;
}

/**
 * Bot Action Handler - Xử lý các action của bot
 * Mỗi action handler sẽ nhận context và trả về result
 */
@Injectable()
export class BotActionHandler {
  private readonly logger = new Logger(BotActionHandler.name);
  private handlers: Map<
    string,
    (context: BotActionContext) => Promise<BotActionResult>
  >;

  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
    @Inject(forwardRef(() => MessageService))
    private messageService: MessageService,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
    @Inject(forwardRef(() => BotMemoryHandler))
    private memoryHandler: BotMemoryHandler,
    private aiChat: BotAIChatHandler,
    private messageFilterSkill: MessageFilterSkillHandler,
  ) {
    this.handlers = new Map();
    this.registerHandlers();
  }

  /**
   * Đăng ký tất cả handlers
   */
  private registerHandlers() {
    // Handler gửi tin nhắn
    this.handlers.set('sendMessageHandler', this.sendMessageHandler.bind(this));

    // Handler phản hồi đơn giản
    this.handlers.set('simpleReplyHandler', this.simpleReplyHandler.bind(this));

    // Handler xóa tin nhắn
    this.handlers.set(
      'deleteMessageHandler',
      this.deleteMessageHandler.bind(this),
    );

    // Handler kick member
    this.handlers.set('kickMemberHandler', this.kickMemberHandler.bind(this));

    // Handler ban member
    this.handlers.set('banMemberHandler', this.banMemberHandler.bind(this));

    // Handler tạo role
    this.handlers.set('createRoleHandler', this.createRoleHandler.bind(this));

    // Handler gán role
    this.handlers.set('assignRoleHandler', this.assignRoleHandler.bind(this));

    // Handler ping
    this.handlers.set('pingHandler', this.pingHandler.bind(this));

    // Handler thông tin server
    this.handlers.set('serverInfoHandler', this.serverInfoHandler.bind(this));

    // Handler help
    this.handlers.set('helpHandler', this.helpHandler.bind(this));

    // Handler random dog image
    this.handlers.set('dogHandler', this.dogHandler.bind(this));

    // Handler random fox image
    this.handlers.set('foxHandler', this.foxHandler.bind(this));

    // Handler random advice
    this.handlers.set('adviceHandler', this.adviceHandler.bind(this));

    // Handler random joke
    this.handlers.set('jokeHandler', this.jokeHandler.bind(this));

    // Handler dragon ball character
    this.handlers.set('dragonBallHandler', this.dragonBallHandler.bind(this));

    // Memory system handlers
    this.handlers.set('remindMeHandler', this.remindMeHandler.bind(this));
    this.handlers.set(
      'listRemindersHandler',
      this.listRemindersHandler.bind(this),
    );
    this.handlers.set('rememberHandler', this.rememberHandler.bind(this));
    this.handlers.set('recallHandler', this.recallHandler.bind(this));
    this.handlers.set('memoryLevelHandler', this.memoryLevelHandler.bind(this));

    // AI Chat handlers
    this.handlers.set('aiChatHandler', this.aiChatHandler.bind(this));
    this.handlers.set('clearChatHandler', this.clearChatHandler.bind(this));

    // Message Filter Skill handlers
    this.handlers.set(
      'messageFilterHandler',
      this.messageFilterHandler.bind(this),
    );
    this.handlers.set('checkSpamHandler', this.checkSpamHandler.bind(this));
    this.handlers.set('checkToxicHandler', this.checkToxicHandler.bind(this));
  }

  /**
   * Thực thi một handler
   */
  async execute(
    handlerName: string,
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const handler = this.handlers.get(handlerName);

    if (!handler) {
      this.logger.warn(`Handler not found: ${handlerName}`);
      return {
        success: false,
        error: `Handler '${handlerName}' không tồn tại`,
      };
    }

    try {
      this.logger.log(
        `Executing handler: ${handlerName} for bot: ${context.botId}`,
      );
      const result = await handler(context);
      return result;
    } catch (error) {
      this.logger.error(`Error executing handler ${handlerName}:`, error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định',
      };
    }
  }

  /**
   * Lấy danh sách tất cả handlers
   */
  getAvailableHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  // ============= ACTION HANDLERS =============

  /**
   * Handler: Gửi tin nhắn đến channel
   */
  private async sendMessageHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params, channelId, content } = context;

    let targetChannelId: string;
    let messageContent: string;

    if (params?.channelId && params?.content) {
      targetChannelId = params.channelId;
      messageContent = params.content;
    } else {
      const parts = content.split(/\s+/);
      if (parts.length < 2) {
        return {
          success: false,
          error:
            'Vui lòng cung cấp nội dung tin nhắn. Ví dụ: !send Hello world',
        };
      }

      targetChannelId = channelId;
      messageContent = parts.slice(1).join(' ');
    }

    try {
      // Sử dụng MessageService để gửi tin nhắn
      // MessageService sẽ tự động emit qua WebSocket
      const message = await this.messageService.sendMessage(
        {
          content: messageContent,
          channelId: targetChannelId,
          type: 'text',
          mentionAuthor: false,
        },
        context.botId, // Bot ID as authorId
      );

      this.logger.log(
        `Bot ${context.botId} sent message to channel ${targetChannelId}: "${messageContent}"`,
      );

      return {
        success: true,
        // Không return response để tránh tạo message confirmation
        // Message đã được gửi qua MessageService rồi
        data: { messageId: message.id },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: `Không thể gửi tin nhắn: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Phản hồi đơn giản
   */
  private async simpleReplyHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params } = context;

    const replyText = params?.message || 'Bot đã nhận được lệnh!';

    return {
      success: true,
      response: replyText,
    };
  }

  /**
   * Handler: Xóa tin nhắn
   */
  private async deleteMessageHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params } = context;

    if (!params?.messageId) {
      return {
        success: false,
        error: 'Thiếu messageId',
      };
    }

    await this.prisma.guildMessage.update({
      where: { id: params.messageId },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      response: 'Đã xóa tin nhắn',
    };
  }

  /**
   * Handler: Kick member khỏi guild
   */
  private async kickMemberHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params, guildId } = context;

    if (!params?.userId || !guildId) {
      return {
        success: false,
        error: 'Thiếu userId hoặc guildId',
      };
    }

    // Xóa member khỏi guild
    await this.prisma.guildMember.deleteMany({
      where: {
        guildId: guildId,
        userId: params.userId,
      },
    });

    // Giảm member count
    await this.prisma.guild.update({
      where: { id: guildId },
      data: { memberCount: { decrement: 1 } },
    });

    return {
      success: true,
      response: `Đã kick user ${params.userId} khỏi server`,
    };
  }

  /**
   * Handler: Ban member
   */
  private async banMemberHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params, guildId } = context;

    if (!params?.userId || !guildId) {
      return {
        success: false,
        error: 'Thiếu userId hoặc guildId',
      };
    }

    // Tạo ban record
    await this.prisma.guildMemberBanned.create({
      data: {
        id: this.snowflake.generate(),
        guildId: guildId,
        userId: params.userId,
        reason: params.reason || 'Bị bot ban',
      },
    });

    // Xóa member
    await this.prisma.guildMember.deleteMany({
      where: {
        guildId: guildId,
        userId: params.userId,
      },
    });

    // Giảm member count
    await this.prisma.guild.update({
      where: { id: guildId },
      data: { memberCount: { decrement: 1 } },
    });

    return {
      success: true,
      response: `Đã ban user ${params.userId}`,
    };
  }

  /**
   * Handler: Tạo role mới
   */
  private async createRoleHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params, guildId } = context;

    if (!params?.name || !guildId) {
      return {
        success: false,
        error: 'Thiếu tên role hoặc guildId',
      };
    }

    const role = await this.prisma.guildRole.create({
      data: {
        id: this.snowflake.generate(),
        guildId: guildId,
        name: params.name,
        color: params.color || '#000000',
        permissions: params.permissions || '0',
        position: 0,
      },
    });

    return {
      success: true,
      response: `Đã tạo role ${params.name}`,
      data: { roleId: role.id },
    };
  }

  /**
   * Handler: Gán role cho member
   */
  private async assignRoleHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { params, guildId } = context;

    if (!params?.userId || !params?.roleId || !guildId) {
      return {
        success: false,
        error: 'Thiếu userId, roleId hoặc guildId',
      };
    }

    // Tìm member
    const member = await this.prisma.guildMember.findFirst({
      where: {
        guildId: guildId,
        userId: params.userId,
      },
    });

    if (!member) {
      return {
        success: false,
        error: 'Không tìm thấy member',
      };
    }

    // Gán role
    await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId: member.id,
        roleId: params.roleId,
      },
    });

    return {
      success: true,
      response: `Đã gán role cho user`,
    };
  }

  /**
   * Handler: Ping
   */
  private async pingHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    return {
      success: true,
      response: '🏓 Pong!',
    };
  }

  /**
   * Handler: Thông tin server
   */
  private async serverInfoHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { guildId } = context;

    if (!guildId) {
      return {
        success: false,
        error: 'Lệnh chỉ có thể dùng trong server',
      };
    }

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        _count: {
          select: {
            members: true,
            channels: true,
            roles: true,
          },
        },
      },
    });

    if (!guild) {
      return {
        success: false,
        error: 'Không tìm thấy server',
      };
    }

    const info = `
📊 **Thông tin server: ${guild.name}**
👥 Thành viên: ${guild._count.members}
📝 Kênh: ${guild._count.channels}
🎭 Vai trò: ${guild._count.roles}
📅 Tạo lúc: ${guild.createdAt.toLocaleDateString('vi-VN')}
    `.trim();

    return {
      success: true,
      response: info,
      data: guild,
    };
  }

  /**
   * Handler: Help - Hiển thị danh sách lệnh
   */
  private async helpHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { botId } = context;

    // Lấy tất cả commands của bot
    const commands = await this.prisma.botCommand.findMany({
      where: {
        botId: botId,
        enabled: true,
      },
      select: {
        name: true,
        description: true,
        pattern: true,
      },
    });

    if (commands.length === 0) {
      return {
        success: true,
        response: 'Bot chưa có lệnh nào được cấu hình.',
      };
    }

    let helpText = '📚 **Danh sách lệnh:**\n\n';
    commands.forEach((cmd) => {
      helpText += `• **${cmd.name}**`;
      if (cmd.description) {
        helpText += ` - ${cmd.description}`;
      }
      if (cmd.pattern) {
        helpText += `\n  Cú pháp: \`${cmd.pattern}\``;
      }
      helpText += '\n';
    });

    return {
      success: true,
      response: helpText,
      data: commands,
    };
  }

  /**
   * Handler: Random Dog Image
   */
  private async dogHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      // Fetch random dog image from API
      const response = await fetch('https://dog.ceo/api/breeds/image/random');
      const data = await response.json();

      if (data.status !== 'success' || !data.message) {
        return {
          success: false,
          error: 'Không thể lấy ảnh chó từ API',
        };
      }

      const dogImageUrl = data.message;

      // Send image using MessageService
      await this.messageService.sendMessage(
        {
          content: dogImageUrl,
          channelId: context.channelId,
          type: 'image',
          mentionAuthor: false,
        },
        context.botId, // Bot is the author
      );

      // Return success without response (message already sent)
      return {
        success: true,
        data: { imageUrl: dogImageUrl },
      };
    } catch (error) {
      this.logger.error('Error fetching dog image:', error);
      return {
        success: false,
        error: `Lỗi khi lấy ảnh chó: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Random Fox Image
   */
  private async foxHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      this.logger.log(`Fetching random fox image for bot: ${context.botId}`);

      // Fetch random fox image from randomfox.ca API
      const response = await fetch('https://randomfox.ca/floof/');
      const data = await response.json();

      if (!data.image) {
        return {
          success: false,
          error: 'Không thể lấy ảnh cáo từ API',
        };
      }

      const foxImageUrl = data.image;

      // Send image using MessageService
      await this.messageService.sendMessage(
        {
          content: foxImageUrl,
          channelId: context.channelId,
          type: 'image',
          mentionAuthor: false,
        },
        context.botId, // Bot is the author
      );

      this.logger.log(`Bot ${context.botId} sent fox image: ${foxImageUrl}`);

      // Return success without response (message already sent)
      return {
        success: true,
        data: { imageUrl: foxImageUrl },
      };
    } catch (error) {
      this.logger.error('Error fetching fox image:', error);
      return {
        success: false,
        error: `Lỗi khi lấy ảnh cáo: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Random Advice
   */
  private async adviceHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      this.logger.log(`Fetching random advice for bot: ${context.botId}`);

      // Fetch random advice from adviceslip API
      const response = await fetch('https://api.adviceslip.com/advice');
      const data = await response.json();

      if (!data.slip || !data.slip.advice) {
        return {
          success: false,
          error: 'Không thể lấy lời khuyên từ API',
        };
      }

      const advice = data.slip.advice;
      const adviceId = data.slip.id;

      // Format response message
      const message = `💡 **Lời khuyên #${adviceId}**\n\n${advice}`;

      this.logger.log(`Bot ${context.botId} sending advice: ${advice}`);

      // Return response text (processor will create message)
      return {
        success: true,
        response: message,
        data: { adviceId, advice },
      };
    } catch (error) {
      this.logger.error('Error fetching advice:', error);
      return {
        success: false,
        error: `Lỗi khi lấy lời khuyên: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Random Joke
   */
  private async jokeHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      this.logger.log(`Fetching random joke for bot: ${context.botId}`);

      // Fetch random joke from official joke API
      const response = await fetch(
        'https://official-joke-api.appspot.com/random_joke',
      );
      const data = await response.json();

      if (!data.setup || !data.punchline) {
        return {
          success: false,
          error: 'Không thể lấy joke từ API',
        };
      }

      const { type, setup, punchline, id } = data;

      // Format response message
      const message = `😂 **Joke #${id}** (${type})\n\n**${setup}**\n\n||${punchline}||`;

      this.logger.log(
        `Bot ${context.botId} sending joke #${id}: ${setup} - ${punchline}`,
      );

      // Return response text (processor will create message)
      return {
        success: true,
        response: message,
        data: { id, type, setup, punchline },
      };
    } catch (error) {
      this.logger.error('Error fetching joke:', error);
      return {
        success: false,
        error: `Lỗi khi lấy joke: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Dragon Ball - Lấy ảnh nhân vật Dragon Ball theo tên
   * Usage: !dragonball <name>
   * Example: !dragonball Goku
   */
  private async dragonBallHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      const { content } = context;

      // Parse command: !dragonball <name>
      const parts = content.split(/\s+/).slice(1);

      if (parts.length === 0) {
        return {
          success: false,
          error: 'Cú pháp: !dragonball <tên nhân vật>\nVí dụ: !dragonball Goku',
        };
      }

      const characterName = parts.join(' ');
      this.logger.log(`Searching Dragon Ball character: ${characterName}`);

      // Fetch từ Dragon Ball API
      const response = await fetch(
        `https://dragonball-api.com/api/characters?name=${encodeURIComponent(characterName)}`,
      );

      this.logger.log(`Dragon Ball API status: ${response.status}`);

      if (!response.ok) {
        this.logger.error(`API error status: ${response.status}`);
        return {
          success: false,
          error: 'Không thể kết nối tới Dragon Ball API',
        };
      }

      const data = await response.json();

      const characters = Array.isArray(data) ? data : [];

      if (characters.length === 0) {
        this.logger.warn(`No character found: ${characterName}`);
        return {
          success: false,
          error: `Không tìm thấy nhân vật "${characterName}"`,
        };
      }

      const character = characters[0];

      // Chỉ gửi ảnh
      const message = character.image;

      this.logger.log(`Sending image for: ${character.name}`);

      return {
        success: true,
        response: message,
        data: character,
      };
    } catch (error) {
      this.logger.error('Error fetching Dragon Ball character:', error);
      return {
        success: false,
        error: `Lỗi khi tìm nhân vật: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Remind Me - Tạo reminder
   * Usage: !remind <thời gian> [repeat] <tin nhắn>
   * Example: !remind 30m Check the oven
   * Example: !remind 1h daily Take medication
   * Example: !remind 10m every Stand up and stretch
   */
  private async remindMeHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { botId, userId, channelId, guildId, content, messageId } = context;

    try {
      // Parse command: !remind <time> [repeat] <message>
      const parts = content.split(/\s+/).slice(1); // Remove command prefix

      if (parts.length < 2) {
        return {
          success: false,
          error:
            'Cú pháp: !remind <thời gian> [repeat] <tin nhắn>\nVí dụ:\n- !remind 14:30 Kiểm tra lò nướng\n- !remind 09:00 daily Uống nước\n- !remind 12:00 every Nghỉ ngơi',
        };
      }

      const timeStr = parts[0];

      // Check if second part is a repeat keyword
      const repeatKeywords = ['daily', 'weekly', 'monthly', 'every'];
      let repeat: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM' = 'ONCE';
      let repeatInterval: number | undefined;
      let messageStartIndex = 1;

      if (
        parts.length >= 3 &&
        repeatKeywords.includes(parts[1].toLowerCase())
      ) {
        const repeatStr = parts[1].toLowerCase();
        messageStartIndex = 2;

        if (repeatStr === 'daily') {
          repeat = 'DAILY';
        } else if (repeatStr === 'weekly') {
          repeat = 'WEEKLY';
        } else if (repeatStr === 'monthly') {
          repeat = 'MONTHLY';
        } else if (repeatStr === 'every') {
          repeat = 'CUSTOM';
          // Use the same interval as the original time
        }
      }

      const message = parts.slice(messageStartIndex).join(' ');

      // Parse time string (HH:mm format - giờ Việt Nam UTC+7)
      const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!timeMatch) {
        return {
          success: false,
          error:
            'Định dạng thời gian không hợp lệ. Sử dụng: HH:mm (ví dụ: 14:30, 09:00)',
        };
      }

      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return {
          success: false,
          error: 'Giờ phải từ 00-23 và phút phải từ 00-59',
        };
      }

      // Tạo thời gian nhắc nhở theo múi giờ Việt Nam (UTC+7)
      // User nhập giờ VN, chuyển sang UTC để lưu DB
      const now = new Date();

      // Lấy ngày hiện tại theo giờ VN
      const vietnamNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

      // Tạo thời gian theo input của user (giờ VN)
      const vietnamTime = new Date(vietnamNow);
      vietnamTime.setHours(hours, minutes, 0, 0);

      // Nếu thời gian đã qua trong ngày (< not <=), chuyển sang ngày mai
      if (vietnamTime < vietnamNow) {
        vietnamTime.setDate(vietnamTime.getDate() + 1);
      }

      // Convert về UTC để lưu vào DB (trừ đi 7 giờ)
      const remindAt = new Date(vietnamTime.getTime() - 7 * 60 * 60 * 1000);

      // If repeat is CUSTOM (every), calculate interval in minutes
      if (repeat === 'CUSTOM') {
        // Interval là khoảng thời gian từ bây giờ đến thời điểm nhắc
        const diffMs = remindAt.getTime() - now.getTime();
        repeatInterval = Math.floor(diffMs / (60 * 1000));
      }

      // Create reminder
      const result = await this.memoryHandler.createReminder(
        botId,
        userId,
        channelId,
        'Nhắc nhở',
        message,
        remindAt,
        {
          guildId,
          repeat,
          repeatInterval,
        },
      );

      return result;
    } catch (error) {
      this.logger.error('Error in remindMeHandler:', error);
      return {
        success: false,
        error: `Lỗi khi tạo nhắc nhở: ${error.message}`,
      };
    }
  }

  /**
   * Handler: List Reminders - Xem danh sách reminders
   */
  private async listRemindersHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { userId, guildId } = context;

    try {
      const result = await this.memoryHandler.getUserReminders(userId, {
        activeOnly: true,
        guildId,
      });

      if (!result.success) {
        return result;
      }

      const reminders = result.data.reminders;

      if (reminders.length === 0) {
        return {
          success: true,
          response: '📝 Bạn chưa có nhắc nhở nào',
        };
      }

      let message = '📝 **Danh sách nhắc nhở:**\n\n';
      reminders.forEach((r, index) => {
        const timeStr = new Date(r.remindAt).toLocaleString('vi-VN');
        message += `${index + 1}. **${r.title}**\n   ${r.message}\n   ⏰ ${timeStr}\n\n`;
      });

      return {
        success: true,
        response: message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Error in listRemindersHandler:', error);
      return {
        success: false,
        error: `Lỗi khi lấy danh sách nhắc nhở: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Remember - Lưu thông tin vào memory
   * Usage: !remember <key> <value>
   * Example: !remember favorite_color blue
   */
  private async rememberHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { botId, userId, guildId, content } = context;

    try {
      const parts = content.split(/\s+/).slice(1);

      if (parts.length < 2) {
        return {
          success: false,
          error:
            'Cú pháp: !remember <key> <value>\nVí dụ: !remember favorite_color blue',
        };
      }

      const key = parts[0];
      const value = parts.slice(1).join(' ');

      await this.memoryHandler.setMemory(botId, userId, key, value, {
        guildId,
        category: 'user_preference',
        importance: 5,
      });

      // Update memory level
      await this.memoryHandler.updateMemoryLevel(botId, userId, guildId);

      return {
        success: true,
        response: `✅ Đã ghi nhớ: **${key}** = "${value}"`,
      };
    } catch (error) {
      this.logger.error('Error in rememberHandler:', error);
      return {
        success: false,
        error: `Lỗi khi ghi nhớ: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Recall - Lấy thông tin từ memory
   * Usage: !recall <key>
   * Example: !recall favorite_color
   */
  private async recallHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { botId, userId, guildId, content } = context;

    try {
      const parts = content.split(/\s+/).slice(1);

      if (parts.length === 0) {
        // Show all memories
        const result = await this.memoryHandler.getUserMemories(botId, userId, {
          guildId,
        });

        if (!result.success) {
          return result;
        }

        const memories = result.data.memories;

        if (memories.length === 0) {
          return {
            success: true,
            response: '🧠 Chưa có thông tin ghi nhớ nào',
          };
        }

        let message = '🧠 **Thông tin ghi nhớ:**\n\n';
        memories.forEach((m) => {
          message += `• **${m.key}**: ${m.value}\n`;
          if (m.category) message += `  📁 ${m.category}\n`;
        });

        return {
          success: true,
          response: message,
          data: result.data,
        };
      }

      const key = parts[0];
      const result = await this.memoryHandler.getMemory(
        botId,
        userId,
        key,
        guildId,
      );

      if (!result.success) {
        return {
          success: false,
          response: `❌ Không tìm thấy thông tin về: **${key}**`,
        };
      }

      const memory = result.data;
      return {
        success: true,
        response: `🧠 **${memory.key}**: ${memory.value}`,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Error in recallHandler:', error);
      return {
        success: false,
        error: `Lỗi khi lấy thông tin: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Memory Level - Xem level ghi nhớ
   */
  private async memoryLevelHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { botId, userId, guildId } = context;

    try {
      const result = await this.memoryHandler.getMemoryLevel(
        botId,
        userId,
        guildId,
      );

      if (!result.success) {
        return result;
      }

      const data = result.data;
      const levelEmojis = ['📝', '📚', '🎓', '🧠', '💎'];
      const emoji = levelEmojis[data.level - 1] || '📝';

      let message = `${emoji} **Memory Level ${data.level}**\n\n`;
      message += `💬 Tổng tin nhắn: ${data.totalMessages}\n`;

      if (data.nextLevelAt > 0) {
        message += `📈 Tiến độ: ${data.progress}%\n`;
        message += `🎯 Level tiếp theo: ${data.nextLevelAt} tin nhắn\n`;
      } else {
        message += `🏆 Đã đạt level tối đa!\n`;
      }

      return {
        success: true,
        response: message,
        data: result.data,
      };
    } catch (error) {
      this.logger.error('Error in memoryLevelHandler:', error);
      return {
        success: false,
        error: `Lỗi khi lấy memory level: ${error.message}`,
      };
    }
  }

  /**
   * Handler cho AI chat
   * Usage: !chat <message> hoặc !ai <message>
   */
  private async aiChatHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { content, channelId, guildId, userId, params } = context;

    try {
      // Extract user message from params.args (đã được parse bởi processor)
      const userMessage = params?.args?.join(' ') || '';

      const response = await this.aiChat.handleAIChat(
        userMessage,
        channelId,
        guildId || '',
        userId,
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      this.logger.error('Error in aiChatHandler:', error);
      return {
        success: false,
        error: `Lỗi khi chat với AI: ${error.message}`,
      };
    }
  }

  /**
   * Handler để xóa context chat
   * Usage: !chat clear hoặc !ai reset
   */
  private async clearChatHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    const { channelId } = context;

    try {
      const response = await this.aiChat.clearContext(channelId);

      return {
        success: true,
        response,
      };
    } catch (error) {
      this.logger.error('Error in clearChatHandler:', error);
      return {
        success: false,
        error: `Lỗi khi xóa context: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Message Filter - Kiểm tra tin nhắn spam/toxic
   * Usage: !filter <text> hoặc !check <text>
   */
  private async messageFilterHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      const result = await this.messageFilterSkill.processSkill(context);
      return result;
    } catch (error) {
      this.logger.error('Error in messageFilterHandler:', error);
      return {
        success: false,
        error: `Lỗi khi kiểm tra tin nhắn: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Check Spam - Kiểm tra spam cụ thể
   * Usage: !spam <text>
   */
  private async checkSpamHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      // Sử dụng config đặc biệt cho spam detection
      const spamConfig = {
        enabled: true,
        spamThreshold: 0.5, // Lower threshold for spam detection
        toxicThreshold: 1.0, // Ignore toxic for this check
        showDetailedResults: true,
      };

      const result = await this.messageFilterSkill.processSkill(
        context,
        spamConfig,
      );
      return result;
    } catch (error) {
      this.logger.error('Error in checkSpamHandler:', error);
      return {
        success: false,
        error: `Lỗi khi kiểm tra spam: ${error.message}`,
      };
    }
  }

  /**
   * Handler: Check Toxic - Kiểm tra nội dung độc hại
   * Usage: !toxic <text>
   */
  private async checkToxicHandler(
    context: BotActionContext,
  ): Promise<BotActionResult> {
    try {
      // Sử dụng config đặc biệt cho toxic detection
      const toxicConfig = {
        enabled: true,
        spamThreshold: 1.0, // Ignore spam for this check
        toxicThreshold: 0.5, // Lower threshold for toxic detection
        showDetailedResults: true,
      };

      const result = await this.messageFilterSkill.processSkill(
        context,
        toxicConfig,
      );
      return result;
    } catch (error) {
      this.logger.error('Error in checkToxicHandler:', error);
      return {
        success: false,
        error: `Lỗi khi kiểm tra nội dung độc hại: ${error.message}`,
      };
    }
  }
}
