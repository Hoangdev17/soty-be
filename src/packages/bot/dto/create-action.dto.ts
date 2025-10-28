import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateBotActionSchema = z.object({
  name: z.string().min(1, 'Action name is required'),
  handler: z.string().min(1, 'Handler is required'),
  paramsSchema: z.any().optional(),
});

export class CreateBotActionDto extends createZodDto(CreateBotActionSchema) {
  @ApiProperty({
    example: 'SendMessage',
    description: 'Tên hành động của bot (dùng để định danh nội bộ)',
  })
  name: string;

  @ApiProperty({
    example: 'sendMessageHandler',
    description:
      'Tên hàm hoặc identifier trong code backend mà bot sẽ gọi khi thực thi hành động này',
  })
  handler: string;

  @ApiProperty({
    example: {
      type: 'object',
      properties: {
        channelId: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['channelId', 'content'],
    },
    required: false,
    description: 'Schema mô tả tham số đầu vào của action (JSON schema)',
  })
  paramsSchema?: Record<string, any>;
}
