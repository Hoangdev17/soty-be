import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { BotMemoryHandler } from '../handlers/bot-memory.handler';

/**
 * Bot Reminder Scheduler - Tự động kiểm tra và xử lý reminders đến hạn
 */
@Injectable()
export class BotReminderScheduler {
  private readonly logger = new Logger(BotReminderScheduler.name);
  private processingReminders = new Set<string>();

  constructor(
    private prisma: PrismaService,
    private memoryHandler: BotMemoryHandler,
  ) {}

  /**
   * Chạy mỗi phút để kiểm tra reminders đến hạn
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkReminders() {
    try {
      const now = new Date();

      // Lấy tất cả reminders đến hạn và đang active
      const dueReminders = await this.prisma.botReminder.findMany({
        where: {
          remindAt: {
            lte: now,
          },
          isActive: true,
          completed: false,
        },
        include: {
          bot: {
            select: { id: true, username: true },
          },
          user: {
            select: { id: true, username: true },
          },
        },
      });

      if (dueReminders.length === 0) {
        return;
      }

      this.logger.log(`Found ${dueReminders.length} due reminders to process`);

      // Xử lý từng reminder
      for (const reminder of dueReminders) {
        // Skip nếu đang được xử lý
        if (this.processingReminders.has(reminder.id)) {
          this.logger.log(
            `Skipping reminder ${reminder.id} - already processing`,
          );
          continue;
        }

        try {
          // Đánh dấu đang xử lý
          this.processingReminders.add(reminder.id);

          await this.memoryHandler.processReminder(reminder.id);
          this.logger.log(
            `Processed reminder ${reminder.id} for user ${reminder.userId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process reminder ${reminder.id}:`,
            error,
          );
        } finally {
          // Xóa khỏi danh sách processing sau 5 giây
          setTimeout(() => {
            this.processingReminders.delete(reminder.id);
          }, 5000);
        }
      }
    } catch (error) {
      this.logger.error('Error in checkReminders:', error);
    }
  }

  /**
   * Chạy mỗi 5 phút để check level up
   */
  @Cron('*/5 * * * *') // Mỗi 5 phút
  async checkLevelUps() {
    try {
      this.logger.log('Checking for level ups...');

      // Lấy tất cả memory levels có thể level up (gần đạt milestone)
      // Level 2: 20+, Level 3: 200+, Level 4: 500+, Level 5: 1000+
      const potentialLevelUps = await this.prisma.botMemoryLevel.findMany({
        where: {
          OR: [
            { level: 1, totalMessages: { gte: 20 } },
            { level: 2, totalMessages: { gte: 200 } },
            { level: 3, totalMessages: { gte: 500 } },
            { level: 4, totalMessages: { gte: 1000 } },
          ],
        },
        include: {
          bot: { select: { id: true } },
          user: { select: { id: true } },
        },
      });

      if (potentialLevelUps.length === 0) {
        return;
      }

      this.logger.log(
        `Found ${potentialLevelUps.length} potential level ups to process`,
      );

      // Xử lý từng user
      for (const memoryLevel of potentialLevelUps) {
        try {
          // Lấy channel gần nhất user này active từ guild
          const guildChannels = await this.prisma.guildChannel.findFirst({
            where: {
              guildId: memoryLevel.guildId || undefined,
            },
            select: { id: true },
          });

          if (!guildChannels) {
            this.logger.warn(
              `No channel found for guild ${memoryLevel.guildId}`,
            );
            continue;
          }

          await this.memoryHandler.checkAndProcessLevelUp(
            memoryLevel.botId,
            memoryLevel.userId,
            memoryLevel.guildId || '',
            guildChannels.id,
          );
        } catch (error) {
          this.logger.error(
            `Failed to check level up for user ${memoryLevel.userId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error in checkLevelUps:', error);
    }
  }

  /**
   * Chạy mỗi ngày lúc 3 giờ sáng để dọn dẹp data hết hạn
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredData() {
    try {
      this.logger.log('Running cleanup for expired data...');

      // Cleanup expired memories
      await this.memoryHandler.cleanupExpiredMemories();

      // Cleanup expired notifications
      await this.memoryHandler.cleanupExpiredNotifications();

      // Cleanup completed reminders older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedReminders = await this.prisma.botReminder.deleteMany({
        where: {
          completed: true,
          completedAt: {
            lt: thirtyDaysAgo,
          },
        },
      });

      this.logger.log(
        `Cleanup completed. Deleted ${deletedReminders.count} old completed reminders`,
      );
    } catch (error) {
      this.logger.error('Error in cleanupExpiredData:', error);
    }
  }

  /**
   * Manual trigger - Có thể gọi từ API endpoint để test
   */
  async triggerReminderCheck() {
    this.logger.log('Manual reminder check triggered');
    await this.checkReminders();
  }
}
