// create-task-comment.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// Zod schema
export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, { message: 'Content is required' }),

  authorId: z.string().min(1, { message: 'AuthorId is required' }),
});

// DTO class kết hợp Zod + Swagger
export class CreateTaskCommentDto extends createZodDto(
  CreateTaskCommentSchema,
) {
  @ApiProperty({
    example: 'Đây là comment của tôi',
    description: 'Nội dung comment',
  })
  content: string;

  @ApiProperty({
    example: 'user-id-123',
    description: 'ID của tác giả comment',
  })
  authorId: string;
}
