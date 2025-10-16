import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebsocketModule)],
  controllers: [UsersController],
  providers: [UsersService, SnowflakeID, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
