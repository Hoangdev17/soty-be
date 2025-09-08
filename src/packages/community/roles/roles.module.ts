import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CommunityPermissionService } from '../services/community-permission.service';
import { SnowflakeID } from '../../../utils/snowflake';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    PrismaService,
    CommunityPermissionService,
    SnowflakeID,
  ],
  exports: [RolesService],
})
export class RolesModule {}
