// update-task-comment.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Zod schema cho update (chỉ content)
export const UpdateTaskCommentSchema = z.object({
  content: z.string().min(1, { message: 'Content is required' }).optional(),
});

// DTO class kết hợp Zod + Swagger
export class UpdateTaskCommentDto extends createZodDto(
  UpdateTaskCommentSchema,
) {
  @ApiPropertyOptional({
    example: 'Cập nhật nội dung comment',
    description: 'Nội dung comment',
  })
  content?: string;
}
