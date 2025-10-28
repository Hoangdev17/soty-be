import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateBotSkillSchema = z.object({
  name: z.string().min(1, 'Skill name is required'),
  description: z.string().optional(),
  model: z.string().optional(),
});

export class CreateBotSkillDto extends createZodDto(CreateBotSkillSchema) {
  @ApiProperty({ example: 'SummarizeText', description: 'Tên kỹ năng của bot' })
  name: string;

  @ApiProperty({
    example: 'Tóm tắt đoạn văn bản được nhập vào',
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 'gpt-4',
    required: false,
    description: 'Tên model AI mà skill sử dụng',
  })
  model?: string;
}
