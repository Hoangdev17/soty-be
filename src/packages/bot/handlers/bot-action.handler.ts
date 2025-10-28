import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import { MessageService } from '../../message/message.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';

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
}
