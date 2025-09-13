import { Module } from '@nestjs/common';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  imports: [],
  controllers: [MessageController],
  providers: [MessageService, PrismaService, SnowflakeID],
})
export class MessageModule {}
