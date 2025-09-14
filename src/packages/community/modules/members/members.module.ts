import { Module, forwardRef } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { PermissionsService } from '../permissions/permissions.service';
import { WebsocketModule } from '../../../websocket/websocket.module';

@Module({
  imports: [forwardRef(() => WebsocketModule)],
  controllers: [MembersController],
  providers: [MembersService, PrismaService, SnowflakeID, PermissionsService],
  exports: [MembersService],
})
export class MembersModule {}
