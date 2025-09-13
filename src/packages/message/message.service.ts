import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import id from 'zod/v4/locales/id.js';

@Injectable()
export class MessageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly snowflakeID: SnowflakeID,
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

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      type: 'text',
      room: `channel_${channelId}`,
      author: {
        id: message.author.id,
        username: message.author.username,
        avatar: message.author.avatar || '',
      },
      channelId: message.channel.id,
      channelName: message.channel.name,
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
