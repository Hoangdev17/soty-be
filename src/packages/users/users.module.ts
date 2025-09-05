import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, SnowflakeID, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}