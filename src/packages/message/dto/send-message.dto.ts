import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1),
  channelId: z.string().min(1),
  replyToMessageId: z.string().optional(),
  mentionAuthor: z.boolean().optional().default(false),
});

export class SendMessageDto extends createZodDto(SendMessageSchema) {
  @ApiProperty({ example: 'Hello, world!', description: 'Nội dung tin nhắn' })
  content: string;

  @ApiProperty({ example: '1234567890', description: 'ID kênh tin nhắn' })
  channelId: string;

  @ApiProperty({
    example: '1234567890',
    description: 'ID tin nhắn được reply (tùy chọn)',
    required: false,
  })
  replyToMessageId?: string;

  @ApiProperty({
    example: false,
    description: 'Có mention tác giả tin nhắn gốc không (tùy chọn)',
    required: false,
  })
  mentionAuthor: boolean;
}
