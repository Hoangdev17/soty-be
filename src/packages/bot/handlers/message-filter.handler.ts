import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../utils/snowflake';
import { WebsocketGateway } from '../../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../../websocket/websocket-events.types';
import { MessageFilterService } from '../../message/message-filter.service';
import {
  MessageFilterResult,
  MessageFilterConfig,
} from '../../message/dto/message-filter.dto';

export interface MessageFilterContext {
  messageId: string;
  channelId: string;
  guildId: string;
  authorId: string;
  content: string;
}

/**
 * Bot handler for automatic message filtering and moderation
 */
@Injectable()
export class MessageFilterHandler {
  private readonly logger = new Logger(MessageFilterHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflake: SnowflakeID,
    private readonly messageFilter: MessageFilterService,
    @Inject(forwardRef(() => WebsocketGateway))
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  /**
   * Process message for spam/toxic content detection
   */
  async processMessage(context: MessageFilterContext): Promise<void> {
    const { messageId, channelId, guildId, authorId, content } = context;

    try {
      // Get guild configuration for message filtering
      const config = await this.getGuildFilterConfig(guildId);

      if (!config.enabled) {
        return;
      }

      // Check message against filter API
      const filterResult = await this.messageFilter.checkMessage(
        content,
        config,
      );

      // Log the filter result if logging is enabled
      if (config.logViolations && filterResult.shouldBlock) {
        await this.logViolation(
          messageId,
          channelId,
          guildId,
          authorId,
          filterResult,
        );
      }

      // Take action if message should be blocked
      if (filterResult.shouldBlock) {
        await this.executeAction(context, filterResult, config);
      }
    } catch (error) {
      this.logger.error(
        `Error processing message filter for message ${messageId}:`,
        error,
      );
    }
  }

  /**
   * Execute moderation action based on filter result
   */
  private async executeAction(
    context: MessageFilterContext,
    filterResult: MessageFilterResult,
    config: MessageFilterConfig,
  ): Promise<void> {
    const { messageId, channelId, guildId, authorId } = context;

    switch (filterResult.action) {
      case 'delete':
        await this.deleteMessage(
          messageId,
          channelId,
          guildId,
          authorId,
          filterResult,
        );
        break;

      case 'timeout':
        await this.timeoutUser(
          guildId,
          authorId,
          config.timeoutDuration,
          filterResult,
        );
        await this.deleteMessage(
          messageId,
          channelId,
          guildId,
          authorId,
          filterResult,
        );
        break;

      case 'warn':
        await this.warnUser(channelId, authorId, filterResult);
        break;

      default:
        // 'allow' - no action needed
        break;
    }

    // Notify moderators if enabled
    if (config.notifyModerators) {
      await this.notifyModerators(guildId, channelId, authorId, filterResult);
    }
  }

  /**
   * Delete the filtered message
   */
  private async deleteMessage(
    messageId: string,
    channelId: string,
    guildId: string,
    authorId: string,
    filterResult: MessageFilterResult,
  ): Promise<void> {
    try {
      // Mark message as deleted in database
      await this.prisma.guildMessage.update({
        where: { id: messageId },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });

      // Emit message deletion event to WebSocket
      this.websocketGateway.emitToRoom(
        `channel_${channelId}`,
        WEBSOCKET_EVENTS.MESSAGE_DELETED,
        {
          messageId,
          channelId,
          reason: 'auto_moderation',
          type: filterResult.prediction,
        },
      );

      this.logger.log(
        `Auto-deleted ${filterResult.prediction} message ${messageId} from user ${authorId} in channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete message ${messageId}:`, error);
    }
  }

  /**
   * Timeout the user who sent the filtered message
   */
  private async timeoutUser(
    guildId: string,
    userId: string,
    duration: number,
    filterResult: MessageFilterResult,
  ): Promise<void> {
    try {
      // Log the timeout action (since we don't have timeout model, just log it)
      this.logger.log(
        `Would timeout user ${userId} in guild ${guildId} for ${duration} minutes due to ${filterResult.prediction} content`,
      );

      // You can implement actual timeout logic here when you have the proper models
      // For now, we'll just delete the message
    } catch (error) {
      this.logger.error(`Failed to timeout user ${userId}:`, error);
    }
  }

  /**
   * Send warning to user about their message
   */
  private async warnUser(
    channelId: string,
    userId: string,
    filterResult: MessageFilterResult,
  ): Promise<void> {
    try {
      // Create warning message
      const warningContent = this.generateWarningMessage(filterResult);

      // Send DM to user (if possible) or public warning
      await this.sendWarningMessage(channelId, userId, warningContent);

      this.logger.log(
        `Warned user ${userId} about ${filterResult.prediction} content in channel ${channelId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to warn user ${userId}:`, error);
    }
  }

  /**
   * Generate appropriate warning message based on filter result
   */
  private generateWarningMessage(filterResult: MessageFilterResult): string {
    const baseMessage =
      '⚠️ **Warning**: Your message has been flagged by our automatic moderation system.';

    switch (filterResult.prediction) {
      case 'spam':
        return `${baseMessage} Please avoid sending spam or repetitive messages.`;
      case 'toxic':
        return `${baseMessage} Please keep your messages respectful and follow our community guidelines.`;
      default:
        return `${baseMessage} Please review your message and ensure it follows our community guidelines.`;
    }
  }

  /**
   * Send warning message to user
   */
  private async sendWarningMessage(
    channelId: string,
    userId: string,
    content: string,
  ): Promise<void> {
    try {
      // Create system message in channel
      const warningMessage = await this.prisma.guildMessage.create({
        data: {
          id: this.snowflake.generate(),
          content: `<@${userId}> ${content}`,
          channelId,
          authorId: 'system', // System message
          type: 20, // System message type
        },
      });

      // Emit warning message to channel
      this.websocketGateway.emitToRoom(
        `channel_${channelId}`,
        WEBSOCKET_EVENTS.MESSAGE,
        {
          id: warningMessage.id,
          content: warningMessage.content,
          createdAt: warningMessage.createdAt,
          type: 'system',
          author: {
            id: 'system',
            username: 'AutoMod',
            avatar: '',
          },
          channelId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to send warning message:', error);
    }
  }

  /**
   * Notify moderators about the filtered content
   */
  private async notifyModerators(
    guildId: string,
    channelId: string,
    authorId: string,
    filterResult: MessageFilterResult,
  ): Promise<void> {
    try {
      // Get moderator role members
      const moderators = await this.getModerators(guildId);

      if (moderators.length === 0) {
        return;
      }

      const notificationContent = this.generateModeratorNotification(
        channelId,
        authorId,
        filterResult,
      );

      // Send notification to moderators (implementation depends on your notification system)
      // For now, just log it
      this.logger.log(`Moderator notification: ${notificationContent}`);
    } catch (error) {
      this.logger.error('Failed to notify moderators:', error);
    }
  }

  /**
   * Generate moderator notification message
   */
  private generateModeratorNotification(
    channelId: string,
    authorId: string,
    filterResult: MessageFilterResult,
  ): string {
    return (
      `🛡️ **Auto-Moderation Alert**\n` +
      `User: <@${authorId}>\n` +
      `Channel: <#${channelId}>\n` +
      `Type: ${filterResult.prediction}\n` +
      `Confidence: ${(filterResult.confidence * 100).toFixed(1)}%\n` +
      `Action: ${filterResult.action}`
    );
  }

  /**
   * Get guild moderators
   */
  private async getModerators(guildId: string): Promise<string[]> {
    try {
      // This is a simplified implementation
      // You might want to get users with specific roles or permissions
      const moderatorRole = await this.prisma.guildRole.findFirst({
        where: {
          guildId,
          name: { in: ['Moderator', 'Admin', 'Staff'] },
        },
      });

      if (!moderatorRole) {
        return [];
      }

      const moderatorMembers = await this.prisma.guildMemberRole.findMany({
        where: { roleId: moderatorRole.id },
        select: { memberId: true },
      });

      return moderatorMembers.map((m) => m.memberId);
    } catch (error) {
      this.logger.error('Failed to get moderators:', error);
      return [];
    }
  }

  /**
   * Log violation to database
   */
  private async logViolation(
    messageId: string,
    channelId: string,
    guildId: string,
    authorId: string,
    filterResult: MessageFilterResult,
  ): Promise<void> {
    try {
      // Since moderationLog model doesn't exist, we'll just log to console for now
      // You can implement proper database logging when the model is available
      this.logger.log(
        `Message filter violation logged: messageId=${messageId}, channelId=${channelId}, ` +
          `guildId=${guildId}, authorId=${authorId}, prediction=${filterResult.prediction}, ` +
          `confidence=${filterResult.confidence}, action=${filterResult.action}`,
      );
    } catch (error) {
      this.logger.error('Failed to log violation:', error);
    }
  }

  /**
   * Get guild filter configuration
   */
  private async getGuildFilterConfig(
    guildId: string,
  ): Promise<MessageFilterConfig> {
    try {
      // Since guildSettings model doesn't exist yet, we'll use default configuration
      // You can implement guild-specific configuration when the model is available
      this.logger.debug(`Using default filter config for guild ${guildId}`);

      // Return default configuration
      return this.messageFilter.getDefaultConfig();
    } catch (error) {
      this.logger.error('Failed to get guild filter config:', error);
      return this.messageFilter.getDefaultConfig();
    }
  }

  /**
   * Update guild filter configuration
   */
  async updateGuildFilterConfig(
    guildId: string,
    config: Partial<MessageFilterConfig>,
  ): Promise<MessageFilterConfig> {
    // For now, since we don't have guildSettings model, just return the merged config
    // This would need to be implemented when the proper database model is available
    const currentConfig = await this.getGuildFilterConfig(guildId);
    const newConfig = { ...currentConfig, ...config };

    this.logger.log(
      `Updated filter config for guild ${guildId}: ${JSON.stringify(newConfig)}`,
    );

    return newConfig;
  }
}
