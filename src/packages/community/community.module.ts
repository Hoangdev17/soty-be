import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { ChannelsModule } from './modules/channels/channels.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { MembersModule } from './modules/members/members.module';
import { ThreadsModule } from './modules/threads/threads.module';
import { EventsModule } from './modules/events/events.module';
import { UploadsModule } from '../uploads/uploads.module';
import { ChannelsService } from './modules/channels/channels.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { MessageService } from '../message/message.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    UploadsModule,
    RolesModule,
    ChannelsModule,
    PermissionsModule,
    MembersModule,
    ThreadsModule,
    EventsModule,
  ],

  controllers: [CommunityController],
  providers: [
    CommunityService,
    PermissionsGuard,
    PrismaService,
    SnowflakeID,
    WebsocketGateway,
    MessageService,
    UsersService,
  ],
  exports: [
    CommunityService,
    PermissionsGuard,
    RolesModule,
    PermissionsModule,
    MembersModule,
    ThreadsModule,
    EventsModule,
  ],
})
export class CommunityModule {}
