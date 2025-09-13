import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';
import type { MessageData } from '../websocket/websocket-events.types';
import id from 'zod/v4/locales/id.js';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async sendMessage(sendMessageDto: SendMessageDto, authorId: string) {
    const { content, channelId } = sendMessageDto;

    // Create the message in database
    const message = await this.prismaService.guildMessage.create({
      data: {
        id: this.snowflakeID.generate(),
        content,
        channelId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Emit message to WebSocket clients in the channel
    const messageData: MessageData = {
      id: message.id,
      userId: message.authorId,
      username: message.author.username,
      message: message.content,
      type: 'text',
      timestamp: message.createdAt,
      room: `channel_${channelId}`,
      metadata: {
        channelId,
        channelName: message.channel.name,
        author: message.author,
      },
    };

    this.websocketGateway.emitToRoom(
      `channel_${channelId}`,
      WEBSOCKET_EVENTS.MESSAGE,
      messageData,
    );

    console.log(`Đã emit message tới room channel_${channelId}:`, messageData);

    return {
      content: message.content,
      createdAt: message.createdAt,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar,
      },
    };
  }

  async getMessages(channelId: string) {
    return await this.prismaService.guildMessage.findMany({
      where: { channelId: channelId },
      select: {
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }
}
