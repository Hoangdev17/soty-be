import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { PermissionsService } from '../permissions/permissions.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaService, SnowflakeID, PermissionsService],
  exports: [RolesService],
})
export class RolesModule {}
