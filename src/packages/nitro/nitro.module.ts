import { Module } from '@nestjs/common';
import { NitroService } from './nitro.service';
import { NitroController } from './nitro.controller';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SnowflakeID } from '../../utils/snowflake';

@Module({
  controllers: [NitroController],
  providers: [NitroService, PrismaService, SnowflakeID],
  exports: [NitroService],
})
export class NitroModule {}
