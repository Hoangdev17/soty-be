import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1),
  channelId: z.string().min(1),
  type: z
    .enum(['text', 'image', 'file', 'system', 'reply'])
    .optional()
    .default('text'),
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
    example: 'text',
    description: 'Loại tin nhắn (text, image, file)',
    required: false,
    default: 'text',
  })
  type: 'text' | 'image' | 'file' | 'system' | 'reply';

  @ApiProperty({
    example: false,
    description: 'Có mention tác giả tin nhắn gốc không (tùy chọn)',
    required: false,
  })
  mentionAuthor: boolean;
}
