// create-project.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
});

export class CreateProjectDto extends createZodDto(CreateProjectSchema) {
  @ApiProperty({
    example: 'AI Learning Path Generator',
    description: 'Tên dự án',
  })
  name: string;

  @ApiProperty({
    example: 'Project sinh viên về AI',
    description: 'Mô tả dự án',
    required: false,
  })
  description?: string;
}
