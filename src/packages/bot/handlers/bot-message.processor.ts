import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import {
  BotActionHandler,
  BotActionContext,
  BotActionResult,
} from './bot-action.handler';
import { BotMemoryHandler } from './bot-memory.handler';
import { MessageFilterHandler } from './message-filter.handler';
import { MessageFilterSkillHandler } from './message-filter-skill.handler';
import { TriggerType, ResponseType } from '@prisma/client';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';
import { MessageService } from '../../message/message.service';

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
    @Inject(forwardRef(() => MessageService))
    private messageService: MessageService,
    @Inject(forwardRef(() => BotMemoryHandler))
    private memoryHandler: BotMemoryHandler,
    @Inject(forwardRef(() => MessageFilterHandler))
    private messageFilterHandler: MessageFilterHandler,
    private messageFilterSkillHandler: MessageFilterSkillHandler,
  ) {}

  /**
   * Xử lý tin nhắn mới - kiểm tra và thực thi bot commands
   */
  async processMessage(messageContext: MessageContext): Promise<void> {
    const { guildId, content, authorId, channelId } = messageContext;

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

    // Lọc ra các members là bot và load commands/skills
    const botMembers = guildMembers.filter((m) => m.user && m.user.isBot);

    // Kiểm tra từng bot xem có command/skill nào match không
    for (const botMember of botMembers) {
      const bot = botMember.user;
      if (!bot) continue;

      // Update memory level cho user này với bot
      try {
        await this.memoryHandler.updateMemoryLevel(
          bot.id,
          authorId,
          guildId,
          channelId,
        );

        this.logger.log(
          `Updated memory level for user ${authorId} with bot ${bot.username}`,
        );
      } catch (error) {
        // Don't block on memory level update errors
        this.logger.warn('Failed to update memory level:', error);
      }

      // Kiểm tra auto-filter skills trước (chỉ khi bot có MessageFilter skill)
      const hasFilterSkill = await this.hasMessageFilterSkill(bot.id);
      if (hasFilterSkill) {
        // Kiểm tra xem có command nào match với message này không
        const hasMatchingCommand = await this.hasMatchingFilterCommand(
          bot.id,
          content,
        );

        // Chỉ chạy auto filter khi KHÔNG CÓ command match
        if (!hasMatchingCommand) {
          await this.checkAutoFilterSkills(bot.id, messageContext);
        }
      }

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
   * Process bot commands from queue
   */
  async processBotCommand(
    command: string,
    messageContext: MessageContext,
  ): Promise<void> {
    switch (command) {
      case 'process_message':
        await this.processMessage(messageContext);
        break;

      case 'filter_message':
        await this.processMessageFilter(messageContext);
        break;

      default:
        this.logger.warn(`Unknown bot command: ${command}`);
    }
  }

  /**
   * Process message for spam/toxic content filtering
   */
  async processMessageFilter(messageContext: MessageContext): Promise<void> {
    const { messageId, channelId, guildId, authorId, content } = messageContext;

    if (!guildId) {
      // Don't process DM messages
      return;
    }

    // Check if the author is a bot to prevent filtering bot messages
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { isBot: true },
    });

    if (author?.isBot) {
      // Don't filter bot messages
      return;
    }

    try {
      // Process message through filter handler
      await this.messageFilterHandler.processMessage({
        messageId,
        channelId,
        guildId,
        authorId,
        content,
      });

      this.logger.debug(`Processed message filter for message ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process message filter for message ${messageId}:`,
        error,
      );
    }
  }

  /**
   * Kiểm tra xem có command filter nào match với message content không
   */
  private async hasMatchingFilterCommand(
    botId: string,
    content: string,
  ): Promise<boolean> {
    try {
      // Lấy tất cả commands của bot có liên quan đến filter
      const filterCommands = await this.prisma.botCommand.findMany({
        where: {
          botId,
          enabled: true,
          OR: [
            {
              action: {
                handler: 'messageFilterHandler',
              },
            },
            {
              skill: {
                model: 'message-filter',
              },
            },
          ],
        },
        include: {
          action: true,
          skill: true,
        },
      });

      // Kiểm tra từng command xem có match không
      for (const command of filterCommands) {
        const matched = this.matchCommand(
          content,
          command.triggerType,
          command.pattern,
        );

        if (matched) {
          return true; // Có command match
        }
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error checking matching filter commands: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Kiểm tra xem bot có MessageFilter action không
   */
  private async hasMessageFilterSkill(botId: string): Promise<boolean> {
    try {
      // Check theo botCommand có action handler là messageFilterHandler
      const filterCommands = await this.prisma.botCommand.findFirst({
        where: {
          botId,
          enabled: true,
          action: {
            handler: 'messageFilterHandler',
          },
        },
        include: {
          action: true,
        },
      });

      if (filterCommands) {
        return true;
      }

      // Hoặc check theo botSkill có model là message-filter
      const filterSkills = await this.prisma.botSkill.findFirst({
        where: {
          botId,
          enabled: true,
          model: 'message-filter',
        },
      });

      return !!filterSkills;
    } catch (error) {
      this.logger.error(`Error checking filter skills: ${error.message}`);
      return false;
    }
  }

  /**
   * Chạy auto-filter cho bot (khi không có command)
   * Auto mode = xử lý tự động mọi tin nhắn mà không cần command trigger
   */
  private async checkAutoFilterSkills(
    botId: string,
    messageContext: MessageContext,
  ): Promise<void> {
    try {
      // Lấy skill filter của bot (đã được verify có tồn tại từ hasMessageFilterSkill)
      const filterSkill = await this.prisma.botSkill.findFirst({
        where: {
          botId,
          enabled: true,
          model: 'message-filter', // Chỉ lấy skill có model chính xác
        },
      });

      if (filterSkill) {
        // Auto mode = không có command, chạy tự động
        await this.runAutoFilterSkill(botId, filterSkill, messageContext);
      }
    } catch (error) {
      this.logger.error(`Error checking auto filter skills: ${error.message}`);
    }
  }

  /**
   * Chạy auto filter skill
   */
  private async runAutoFilterSkill(
    botId: string,
    skill: any,
    messageContext: MessageContext,
  ): Promise<void> {
    const { messageId, channelId, guildId, authorId, content } = messageContext;

    try {
      const context: BotActionContext = {
        botId,
        messageId,
        channelId,
        guildId: guildId!,
        userId: authorId,
        content,
        params: {},
      };

      // Chạy skill trong auto mode
      const result = await this.messageFilterSkillHandler.processSkill(
        context,
        skill.config,
        true, // isAutoMode = true
      );

      // Nếu phát hiện vi phạm và skill config cho phép auto action
      if (result.success && result.data?.filterResult?.shouldBlock) {
        const filterResult = result.data.filterResult;

        // Log violation
        this.logger.warn(
          `Auto filter detected violation: ${filterResult.prediction} ` +
            `(confidence: ${filterResult.confidence}) in message ${messageId}`,
        );

        // Kiểm tra config có cho phép auto action không
        const skillConfig = skill.config as any;
        if (skillConfig?.autoAction !== false) {
          // Thực hiện auto action (delete message, warn user, etc.)
          await this.handleAutoFilterAction(
            botId,
            messageContext,
            filterResult,
            skillConfig,
          );
        }

        // Nếu config cho phép thông báo kết quả
        if (skillConfig?.notifyResults === true) {
          await this.createBotResponse(
            botId,
            channelId,
            `🛡️ **Auto Filter:** ${result.response}`,
            ResponseType.TEXT,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error running auto filter skill: ${error.message}`,
        error,
      );
    }
  }

  /**
   * Xử lý auto action khi phát hiện vi phạm
   */
  private async handleAutoFilterAction(
    botId: string,
    messageContext: MessageContext,
    filterResult: any,
    skillConfig: any,
  ): Promise<void> {
    const { messageId, channelId, authorId } = messageContext;

    try {
      // Delete message nếu cần
      if (skillConfig?.autoDelete !== false) {
        // Sử dụng MessageService để delete message với auto-filter reason
        await this.messageService.deleteMessage(
          messageId,
          botId,
          'auto_filter',
          filterResult.prediction,
        );

        this.logger.log(
          `Auto-deleted ${filterResult.prediction} message ${messageId}`,
        );
      }

      // Warn user nếu cần
      if (skillConfig?.autoWarn !== false) {
        const warningMessage = this.generateAutoWarningMessage(filterResult);
        await this.createBotResponse(
          botId,
          channelId,
          `${warningMessage}`,
          ResponseType.TEXT,
        );
      }
    } catch (error) {
      this.logger.error(`Error handling auto filter action: ${error.message}`);
    }
  }

  /**
   * Tạo tin nhắn cảnh báo tự động
   */
  private generateAutoWarningMessage(filterResult: any): string {
    const { prediction } = filterResult;

    const warnings = {
      spam: '⚠️ Tin nhắn của bạn được phát hiện là spam và đã bị xóa. Vui lòng tránh gửi tin nhắn lặp lại hoặc không có ý nghĩa.',
      toxic:
        '⚠️ Tin nhắn của bạn chứa nội dung không phù hợp và đã bị xóa. Vui lòng giữ thái độ tôn trọng trong giao tiếp.',
    };

    return (
      warnings[prediction] ||
      '⚠️ Tin nhắn của bạn vi phạm quy tắc cộng đồng và đã bị xóa.'
    );
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
      // Nếu có skill (AI processing hoặc skill khác)
      else if (command.skill) {
        result = await this.processWithSkill(command.skill, content, params, {
          botId,
          messageId,
          channelId,
          guildId,
          userId: authorId,
          content,
          params,
        });
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
    context?: BotActionContext,
  ): Promise<BotActionResult> {
    // TODO: Implement AI skill processing and other skills
    this.logger.log(`Processing with skill: ${skill.name}`);

    // Đối với MessageFilter skill
    if (skill.name === 'MessageFilter' || skill.model === 'message-filter') {
      if (context) {
        try {
          return await this.messageFilterSkillHandler.processSkill(
            context,
            skill.config,
            false, // isAutoMode = false (manual command)
          );
        } catch (error) {
          this.logger.error(
            `Error processing MessageFilter skill: ${error.message}`,
          );
          return {
            success: false,
            response: `❌ Lỗi khi xử lý skill ${skill.name}: ${error.message}`,
          };
        }
      }
    }

    // Fallback cho các skills khác
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
    // Gửi message qua MessageService (sẽ tự động emit WebSocket)
    const message = await this.messageService.sendMessage(
      {
        content,
        channelId,
        type: type === ResponseType.ERROR ? 'system' : 'text',
        mentionAuthor: false,
      },
      botId,
    );

    // Tạo bot response record để track
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

    this.logger.log(
      `Bot response created and emitted via MessageService in channel: ${channelId}`,
    );
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
