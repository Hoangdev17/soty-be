import { Module, forwardRef } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MessageModule } from '../message/message.module';
import { MessageService } from '../message/message.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { MembersModule } from '../community/modules/members/members.module';
import { ChannelsModule } from '../community/modules/channels/channels.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    forwardRef(() => MessageModule),
    forwardRef(() => MembersModule),
    forwardRef(() => ChannelsModule),
  ],
  providers: [
    WebsocketGateway,
    PrismaService,
    MessageService,
    SnowflakeID,
    UsersService,
  ],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
