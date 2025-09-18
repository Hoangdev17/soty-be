import { Module } from '@nestjs/common';
import { GuildCategoryController } from './categories.controller';
import { GuildCategoryService } from './categories.service';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Module({
  controllers: [GuildCategoryController],
  providers: [GuildCategoryService, PrismaService],
})
export class GuildCategoryModule {}
