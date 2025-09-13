import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== ZOD SCHEMA ==========
export const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên role không được để trống')
    .max(100, 'Tên role không được quá 100 ký tự')
    .describe('Tên của role'),
  permissions: z.array(z.string()).describe('Danh sách quyền của role'),
  color: z
    .number()
    .int()
    .min(0)
    .max(16777215)
    .optional()
    .describe('Màu của role (RGB)'),
  hoist: z.boolean().default(false).describe('Hiển thị thành viên riêng biệt'),
  mentionable: z.boolean().default(false).describe('Cho phép mention role'),
});

// ========== DTO ==========
export class CreateRoleDto extends createZodDto(CreateRoleSchema) {
  @ApiProperty({
    description: 'Tên của role',
    example: 'Moderator',
    minLength: 1,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Danh sách quyền của role',
    example: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
    type: [String],
  })
  permissions: string[];

  @ApiProperty({
    description: 'Màu của role (RGB)',
    example: 0x3498db,
    required: false,
    minimum: 0,
    maximum: 16777215,
  })
  color?: number;

  @ApiProperty({
    description: 'Hiển thị thành viên riêng biệt trong danh sách',
    example: false,
    default: false,
  })
  hoist: boolean;

  @ApiProperty({
    description: 'Cho phép mention role',
    example: false,
    default: false,
  })
  mentionable: boolean;
}
