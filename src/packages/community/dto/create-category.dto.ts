import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Tên category không được để trống'),
  topic: z.string().optional(),
  position: z.number().min(0).optional(),
});

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {
  @ApiProperty({
    description: 'Tên của category',
    example: 'Kênh Chat',
  })
  name: string;

  @ApiProperty({
    description: 'Mô tả về category (tùy chọn)',
    example: 'Category chứa các kênh chat',
    required: false,
  })
  topic?: string;

  @ApiProperty({
    description: 'Vị trí của category trong danh sách (tùy chọn)',
    example: 1,
    required: false,
    minimum: 0,
  })
  position?: number;
}
