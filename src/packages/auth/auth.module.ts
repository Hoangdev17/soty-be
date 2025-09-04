import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  providers: [AuthService, PrismaService, SnowflakeID],
  controllers: [AuthController],
})
export class AuthModule {}
