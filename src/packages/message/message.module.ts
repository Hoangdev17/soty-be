import { Module, forwardRef } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebsocketModule)],
  controllers: [MessageController],
  providers: [MessageService, PrismaService, SnowflakeID],
  exports: [MessageService],
})
export class MessageModule {}
