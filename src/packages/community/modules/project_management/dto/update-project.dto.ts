// update-project.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Tạo Zod schema cho update, tất cả field optional
export const UpdateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
});

export class UpdateProjectDto extends createZodDto(UpdateProjectSchema) {
  @ApiPropertyOptional({
    example: 'AI Learning Path Generator Updated',
    description: 'Tên dự án',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Cập nhật mô tả dự án',
    description: 'Mô tả dự án',
  })
  description?: string;
}
