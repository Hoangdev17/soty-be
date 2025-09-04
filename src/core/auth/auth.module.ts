import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [AuthService, PrismaService, SnowflakeID],
  controllers: [AuthController],
})
export class AuthModule {}
