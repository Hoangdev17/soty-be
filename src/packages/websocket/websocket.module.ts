import { Module, forwardRef } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { MessageModule } from '../message/message.module';
import { MembersModule } from '../community/modules/members/members.module';
import { ChannelsModule } from '../community/modules/channels/channels.module';
import { UsersModule } from '../users/users.module';
import { CommunityModule } from '../community/community.module';
import { CommunityService } from '../community/community.service';
import { LiveKitModule } from '../livekit/livekit.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    forwardRef(() => MessageModule),
    forwardRef(() => MembersModule),
    forwardRef(() => ChannelsModule),
    forwardRef(() => UsersModule),
    LiveKitModule,
  ],
  providers: [WebsocketGateway, PrismaService, SnowflakeID, CommunityService],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
