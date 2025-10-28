import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const ProcessMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
  guildId: z.string().optional(),
  authorId: z.string().min(1, 'Author ID is required'),
  content: z.string().min(1, 'Content is required'),
});

export class ProcessMessageDto extends createZodDto(ProcessMessageSchema) {
  @ApiProperty({
    example: '1234567890',
    description: 'ID của tin nhắn',
  })
  messageId: string;

  @ApiProperty({
    example: '9876543210',
    description: 'ID của channel',
  })
  channelId: string;

  @ApiProperty({
    example: '1111111111',
    required: false,
    description: 'ID của guild (server)',
  })
  guildId?: string;

  @ApiProperty({
    example: '2222222222',
    description: 'ID của người gửi tin nhắn',
  })
  authorId: string;

  @ApiProperty({
    example: '!ping',
    description: 'Nội dung tin nhắn',
  })
  content: string;
}
