import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CoreCacheModule } from 'src/core/cache/cache.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../../../websocket/websocket.gateway';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from '../../../message/message.service';
import { MembersService } from '../members/members.service';
import { ChannelsService } from '../channels/channels.service';

@Module({
  imports: [CoreCacheModule, PermissionsModule],
  controllers: [ThreadsController],
  providers: [
    ThreadsService,
    PrismaService,
    SnowflakeID,
    WebsocketGateway,
    JwtService,
    MessageService,
    MembersService,
    ChannelsService,
  ],
  exports: [ThreadsService],
})
export class ThreadsModule {}
