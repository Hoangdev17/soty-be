// update-task.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus, TaskPriority } from '@prisma/client';

// Zod schema cho update (tất cả optional)
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(Object.values(TaskType)).optional(),
  status: z.enum(Object.values(TaskStatus)).optional(),
  priority: z.enum(Object.values(TaskPriority)).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  markdown: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  storyId: z.string().optional().nullable(),
  projectId: z.string().optional(),
});

// DTO class kết hợp Zod + Swagger
export class UpdateTaskDto extends createZodDto(UpdateTaskSchema) {
  @ApiPropertyOptional({ example: 'Task 1', description: 'Tiêu đề task' })
  title?: string;

  @ApiPropertyOptional({
    example: 'Mô tả chi tiết task',
    description: 'Mô tả task',
  })
  description?: string;

  @ApiPropertyOptional({
    example: TaskType.TASK,
    enum: TaskType,
    description: 'Loại task',
  })
  type?: TaskType;

  @ApiPropertyOptional({
    example: TaskStatus.TODO,
    enum: TaskStatus,
    description: 'Trạng thái của task',
  })
  status?: TaskStatus;

  @ApiPropertyOptional({
    example: TaskPriority.MEDIUM,
    enum: TaskPriority,
    description: 'Độ ưu tiên của task',
  })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: '2025-10-21T12:00:00Z',
    description: 'Ngày bắt dầu (ISO string)',
  })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2025-10-21T12:00:00Z',
    description: 'Ngày hết hạn (ISO string)',
  })
  dueDate?: string;

  @ApiPropertyOptional({
    example: '- [ ] Checklist item 1\n- [x] Checklist item 2',
    description: 'Nội dung markdown',
  })
  markdown?: string;

  @ApiPropertyOptional({
    example: 'user-id-123',
    description: 'Người được giao task',
  })
  assigneeId?: string;

  @ApiPropertyOptional({
    example: 'story-id-123',
    description: 'Story liên quan',
  })
  storyId?: string;

  @ApiPropertyOptional({
    example: 'project-id-123',
    description: 'Project chứa task',
  })
  projectId?: string;
}
