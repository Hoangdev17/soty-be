import { Module, forwardRef } from '@nestjs/common';
import { DmChannelService } from './dm-channel.service';
import { DmChannelController } from './dm-channel.controller';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CoreCacheModule } from 'src/core/cache/cache.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { MessageModule } from '../message/message.module';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MessageService } from '../message/message.service';
import { MembersService } from '../community/modules/members/members.service';
import { ChannelsService } from '../community/modules/channels/channels.service';

@Module({
  imports: [
    CoreCacheModule,
    WebsocketModule,
    forwardRef(() => MessageModule), // Import MessageModule để có MessageFilterService
  ],
  controllers: [DmChannelController],
  providers: [
    DmChannelService,
    PrismaService,
    SnowflakeID,
    MessageService,
    MembersService,
    ChannelsService,
  ],
  exports: [DmChannelService],
})
export class DmChannelModule {}
