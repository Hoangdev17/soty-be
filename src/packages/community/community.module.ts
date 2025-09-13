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
import { UploadsModule } from '../uploads/uploads.module';
import { ChannelsService } from './modules/channels/channels.service';

@Module({
  imports: [
    UploadsModule,
    RolesModule,
    ChannelsModule,
    PermissionsModule,
    MembersModule,
  ],

  controllers: [CommunityController],
  providers: [
    CommunityService,
    PermissionsGuard,
    PrismaService,
    SnowflakeID,
    ChannelsService,
  ],
  exports: [
    CommunityService,
    PermissionsGuard,
    RolesModule,
    PermissionsModule,
    MembersModule,
  ],
})
export class CommunityModule {}
