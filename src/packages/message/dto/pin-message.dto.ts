import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const PinMessageSchema = z.object({
  channelId: z.string().min(1),
});

export class PinMessageDto extends createZodDto(PinMessageSchema) {
  @ApiProperty({ example: '1234567890', description: 'ID kênh tin nhắn' })
  channelId: string;
}
