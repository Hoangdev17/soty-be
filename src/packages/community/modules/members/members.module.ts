import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { PermissionsService } from '../permissions/permissions.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, PrismaService, SnowflakeID, PermissionsService],
  exports: [MembersService],
})
export class MembersModule {}
