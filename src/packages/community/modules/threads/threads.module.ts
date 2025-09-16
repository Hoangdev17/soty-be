import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CoreCacheModule } from 'src/core/cache/cache.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  imports: [CoreCacheModule, PermissionsModule],
  controllers: [ThreadsController],
  providers: [ThreadsService, PrismaService, SnowflakeID],
  exports: [ThreadsService],
})
export class ThreadsModule {}
