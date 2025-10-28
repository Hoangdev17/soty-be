import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { BotActionHandler } from './handlers/bot-action.handler';
import { BotMessageProcessor } from './handlers/bot-message.processor';
import { WebsocketModule } from '../websocket/websocket.module';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [forwardRef(() => WebsocketModule), forwardRef(() => MessageModule)],
  controllers: [BotController],
  providers: [
    BotService,
    PrismaService,
    SnowflakeID,
    BotActionHandler,
    BotMessageProcessor,
  ],
  exports: [BotService, BotMessageProcessor],
})
export class BotModule {}
