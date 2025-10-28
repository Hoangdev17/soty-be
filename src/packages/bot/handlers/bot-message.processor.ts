import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import {
  BotActionHandler,
  BotActionContext,
  BotActionResult,
} from './bot-action.handler';
import { TriggerType, ResponseType } from '@prisma/client';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';

export interface MessageContext {
  messageId: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  content: string;
}

/**
 * Bot Message Processor - Xử lý tin nhắn và trigger bot commands
 */
@Injectable()
export class BotMessageProcessor {
  private readonly logger = new Logger(BotMessageProcessor.name);

  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
    private actionHandler: BotActionHandler,
    @Inject(forwardRef(() => WebsocketGateway))
    private websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Xử lý tin nhắn mới - kiểm tra và thực thi bot commands
   */
  async processMessage(messageContext: MessageContext): Promise<void> {
    const { guildId, content, authorId } = messageContext;

    if (!guildId) {
      // Không xử lý DM messages
      return;
    }

    // Check if the author is a bot to prevent infinite loops
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isBot: true },
    });

    if (author?.isBot) {
      // Don't process messages from bots
      return;
    }

    // Lấy tất cả bots trong guild
    const guildMembers = await this.prisma.guildMember.findMany({
      where: { guildId },
      include: {
        user: true,
      },
    });

    // Lọc ra các members là bot và load commands
    const botMembers = guildMembers.filter((m) => m.user && m.user.isBot);

    // Kiểm tra từng bot xem có command nào match không
    for (const botMember of botMembers) {
      const bot = botMember.user;
      if (!bot) continue;

      // Load commands cho bot này
      const commands = await this.prisma.botCommand.findMany({
        where: {
          botId: bot.id,
          enabled: true,
        },
        include: {
          action: true,
          skill: true,
        },
      });

      for (const command of commands) {
        const matched = this.matchCommand(
          content,
          command.triggerType,
          command.pattern,
        );

        if (matched) {
          this.logger.log(
            `Command matched: ${command.name} for bot: ${bot.username}`,
          );

          // Thực thi command
          await this.executeCommand(
            bot.id,
            command,
            messageContext,
            matched.params,
          );
        }
      }
    }
  }

  /**
   * Kiểm tra xem message có match với command pattern không
   */
  private matchCommand(
    content: string,
    triggerType: TriggerType,
    pattern: string | null,
  ): { matched: boolean; params?: Record<string, any> } | null {
    if (!pattern) return null;

    switch (triggerType) {
      case TriggerType.PREFIX:
        // Ví dụ: !ping, !help
        if (content.startsWith(pattern)) {
          const args = content.slice(pattern.length).trim().split(/\s+/);
          return {
            matched: true,
            params: { args },
          };
        }
        break;

      case TriggerType.EXACT:
        // Khớp chính xác
        if (content === pattern) {
          return { matched: true };
        }
        break;

      case TriggerType.PATTERN:
        // Regex pattern
        try {
          const regex = new RegExp(pattern, 'i');
          const match = content.match(regex);
          if (match) {
            return {
              matched: true,
              params: { matches: match.slice(1) }, // Captured groups
            };
          }
        } catch (error) {
          this.logger.error(`Invalid regex pattern: ${pattern}`, error);
        }
        break;
    }

    return null;
  }

  /**
   * Thực thi bot command
   */
  private async executeCommand(
    botId: string,
    command: any,
    messageContext: MessageContext,
    params?: Record<string, any>,
  ): Promise<void> {
    const { messageId, channelId, guildId, authorId, content } = messageContext;

    try {
      // Tạo command execution record
      const execution = await this.prisma.commandExecution.create({
        data: {
          id: this.snowflake.generate(),
          messageId,
          commandId: command.id,
          executedById: authorId,
          executedAt: new Date(),
        },
      });

      let result: BotActionResult;

      // Nếu có action handler
      if (command.action && command.action.handler) {
        const context: BotActionContext = {
          botId,
          messageId,
          channelId,
          guildId,
          userId: authorId,
          content,
          params,
        };

        result = await this.actionHandler.execute(
          command.action.handler,
          context,
        );
      }
      // Nếu có skill (AI processing)
      else if (command.skill) {
        result = await this.processWithSkill(command.skill, content, params);
      }
      // Default response
      else {
        result = {
          success: true,
          response: `Command ${command.name} đã được thực thi`,
        };
      }

      // Cập nhật execution result
      await this.prisma.commandExecution.update({
        where: { id: execution.id },
        data: { result: result as any },
      });

      // Tạo bot response nếu có
      if (result.response) {
        await this.createBotResponse(
          botId,
          channelId,
          result.response,
          result.success ? ResponseType.TEXT : ResponseType.ERROR,
          execution.id,
        );
      }

      this.logger.log(`Command executed successfully: ${command.name}`);
    } catch (error) {
      this.logger.error(`Error executing command ${command.name}:`, error);

      // Gửi error response
      await this.createBotResponse(
        botId,
        channelId,
        `❌ Lỗi khi thực thi lệnh: ${error.message}`,
        ResponseType.ERROR,
      );
    }
  }

  /**
   * Xử lý với AI skill (placeholder - cần implement)
   */
  private async processWithSkill(
    skill: any,
    content: string,
    params?: Record<string, any>,
  ): Promise<BotActionResult> {
    // TODO: Implement AI skill processing
    this.logger.log(`Processing with skill: ${skill.name}`);

    return {
      success: true,
      response: `Skill ${skill.name} đã xử lý tin nhắn (placeholder)`,
    };
  }

  /**
   * Tạo bot response message
   */
  /**
   * Tạo bot response message
   */
  private async createBotResponse(
    botId: string,
    channelId: string,
    content: string,
    type: ResponseType = ResponseType.TEXT,
    commandExecutionId?: string,
  ): Promise<void> {
    // Tạo message từ bot
    const message = await this.prisma.guildMessage.create({
      data: {
        id: this.snowflake.generate(),
        channelId,
        authorId: botId,
        content,
        type: 0, // DEFAULT type
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            avatarEffectId: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            guildId: true,
          },
        },
      },
    });

    // Tạo bot response record
    await this.prisma.botResponse.create({
      data: {
        id: this.snowflake.generate(),
        botId,
        messageId: message.id,
        content,
        type,
        commandExecutionId,
      },
    });

    // Lấy thông tin guild nếu có
    let guildName = '';
    if (message.channel.guildId) {
      const guild = await this.prisma.guild.findUnique({
        where: { id: message.channel.guildId },
        select: { name: true },
      });
      guildName = guild?.name ?? '';
    }

    // Emit message qua WebSocket để client nhận real-time
    const messagePayload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      status: 'UNREAD',
      type: type === ResponseType.ERROR ? 'error' : 'text',
      room: `channel_${channelId}`,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
        avatarEffectId: message.author.avatarEffectId || null,
        isBot: true,
      },
      channelId: message.channel.id,
      channelName: message.channel.name,
      guildId: message.channel.guildId || '',
      guildName,
    };

    this.logger.log(
      `Emitting bot response to room: channel_${channelId}, event: ${WEBSOCKET_EVENTS.MESSAGE}`,
    );
    this.logger.log(`Bot response content: "${content}"`);

    this.websocketGateway.emitToRoom(
      `channel_${channelId}`,
      WEBSOCKET_EVENTS.MESSAGE,
      messagePayload,
    );

    this.logger.log(`Bot response created in channel: ${channelId}`);
  }

  /**
   * Lấy lịch sử thực thi commands của bot
   */
  async getCommandExecutions(botId: string, limit: number = 50) {
    return await this.prisma.commandExecution.findMany({
      where: {
        command: {
          botId,
        },
      },
      include: {
        command: true,
        executedBy: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        responses: true,
      },
      orderBy: {
        executedAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Lấy thống kê sử dụng bot
   */
  async getBotStatistics(botId: string) {
    const totalExecutions = await this.prisma.commandExecution.count({
      where: {
        command: {
          botId,
        },
      },
    });

    const totalResponses = await this.prisma.botResponse.count({
      where: { botId },
    });

    const commandStats = await this.prisma.commandExecution.groupBy({
      by: ['commandId'],
      where: {
        command: {
          botId,
        },
      },
      _count: true,
    });

    return {
      totalExecutions,
      totalResponses,
      commandStats,
    };
  }
}
