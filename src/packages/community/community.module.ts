import { Module } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityPermissionService } from './services/community-permission.service';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [RolesModule],
  controllers: [CommunityController],
  providers: [
    CommunityService,
    CommunityPermissionService,
    PermissionsGuard,
    PrismaService,
    SnowflakeID,
  ],
  exports: [
    CommunityService,
    CommunityPermissionService,
    PermissionsGuard,
    RolesModule,
  ],
})
export class CommunityModule {}
