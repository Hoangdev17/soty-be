import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { BotActionHandler } from './handlers/bot-action.handler';
import { BotMessageProcessor } from './handlers/bot-message.processor';
import { BotMemoryHandler } from './handlers/bot-memory.handler';
import { BotAIChatHandler } from './handlers/bot-ai-chat.handler';
import { MessageFilterHandler } from './handlers/message-filter.handler';
import { MessageFilterSkillHandler } from './handlers/message-filter-skill.handler';
import { BotReminderScheduler } from './cron/bot-reminder-scheduler.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => WebsocketModule),
    forwardRef(() => MessageModule),
  ],
  controllers: [BotController],
  providers: [
    BotService,
    PrismaService,
    SnowflakeID,
    BotActionHandler,
    BotMessageProcessor,
    BotMemoryHandler,
    BotAIChatHandler,
    MessageFilterHandler,
    MessageFilterSkillHandler,
    BotReminderScheduler,
  ],
  exports: [
    BotService,
    BotMessageProcessor,
    BotMemoryHandler,
    MessageFilterHandler,
    MessageFilterSkillHandler,
  ],
})
export class BotModule {}
