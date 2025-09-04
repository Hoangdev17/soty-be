import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SnowflakeID, PrismaService],
})
export class UsersModule {}
