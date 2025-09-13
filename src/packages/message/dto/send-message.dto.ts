import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1),
  channelId: z.string().min(1),
});

export class SendMessageDto extends createZodDto(SendMessageSchema) {
  @ApiProperty({ example: 'Hello, world!', description: 'Nội dung tin nhắn' })
  content: string;

  @ApiProperty({ example: '1234567890', description: 'ID kênh tin nhắn' })
  channelId: string;
}
