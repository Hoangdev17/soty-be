import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { TriggerType } from '@prisma/client';

export const CreateBotCommandSchema = z.object({
  name: z.string().min(1, 'Command name is required'),
  description: z.string().optional(),
  triggerType: z.nativeEnum(TriggerType).default(TriggerType.PREFIX),
  pattern: z.string().optional(),
  skillId: z.string().optional(),
  actionId: z.string().optional(),
});

export class CreateBotCommandDto extends createZodDto(CreateBotCommandSchema) {
  @ApiProperty({ example: 'summarize', description: 'Tên command của bot' })
  name: string;

  @ApiProperty({
    example: 'Tóm tắt văn bản người dùng nhập vào',
    required: false,
  })
  description?: string;

  @ApiProperty({
    enum: TriggerType,
    example: TriggerType.PREFIX,
    description: 'Cách trigger lệnh (PREFIX, KEYWORD, REGEX, EVENT)',
  })
  triggerType: TriggerType;

  @ApiProperty({
    example: '^!summarize (.+)$',
    required: false,
    description: 'Mẫu text hoặc regex mà bot dùng để bắt lệnh',
  })
  pattern?: string;

  @ApiProperty({
    example: '1234567890',
    required: false,
    description: 'ID của skill mà command gọi tới',
  })
  skillId?: string;

  @ApiProperty({
    example: '9876543210',
    required: false,
    description: 'ID của action mà command thực thi',
  })
  actionId?: string;
}
