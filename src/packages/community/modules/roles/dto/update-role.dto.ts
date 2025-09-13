import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRoleSchema } from './create-role.dto';

// ========== ZOD SCHEMA ==========
export const UpdateRoleSchema = CreateRoleSchema.partial();

// ========== DTO ==========
export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {
  @ApiProperty({
    description: 'Tên của role',
    example: 'Moderator',
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  name?: string;

  @ApiProperty({
    description: 'Danh sách quyền của role',
    example: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
    type: [String],
    required: false,
  })
  permissions?: string[];

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
    required: false,
  })
  hoist?: boolean;

  @ApiProperty({
    description: 'Cho phép mention role',
    example: false,
    required: false,
  })
  mentionable?: boolean;
}
