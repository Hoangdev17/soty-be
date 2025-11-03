import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageController } from './message.controller';
import { MessageFilterController } from './message-filter.controller';
import { MessageService } from './message.service';
import { MessageFilterService } from './message-filter.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketModule } from '../websocket/websocket.module';
import { BotModule } from '../bot/bot.module';
import { QueueModule } from 'src/core/queue/queue.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => WebsocketModule),
    forwardRef(() => BotModule),
    forwardRef(() => QueueModule),
  ],
  controllers: [MessageController, MessageFilterController],
  providers: [MessageService, MessageFilterService, PrismaService, SnowflakeID],
  exports: [MessageService, MessageFilterService],
})
export class MessageModule {}
