import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MessageModule } from '../message/message.module';
import { MessageService } from '../message/message.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.AUTH_JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    MessageModule,
  ],
  providers: [WebsocketGateway, PrismaService, MessageService, SnowflakeID],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
