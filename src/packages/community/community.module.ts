import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { MembersModule } from './modules/members/members.module';

@Module({
  imports: [RolesModule, PermissionsModule, MembersModule],
  controllers: [CommunityController],
  providers: [CommunityService, PermissionsGuard, PrismaService, SnowflakeID],
  exports: [
    CommunityService,
    PermissionsGuard,
    RolesModule,
    PermissionsModule,
    MembersModule,
  ],
})
export class CommunityModule {}
