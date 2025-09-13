import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';
import type { MessageData } from '../websocket/websocket-events.types';

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
      content: message.content,
      type: 'text',
      createdAt: message.createdAt,
      room: `channel_${channelId}`,
      metadata: {
        channelId,
        channelName: message.channel.name,
      },
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
      },
    };

    this.websocketGateway.emitToRoom(
      `channel_${channelId}`,
      WEBSOCKET_EVENTS.MESSAGE,
      messageData,
    );

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
