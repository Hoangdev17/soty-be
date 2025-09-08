import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== ZOD SCHEMA ==========
export const AssignRoleSchema = z.object({
  memberId: z
    .string()
    .min(1, 'Member ID không được để trống')
    .describe('ID của member'),
  roleId: z
    .string()
    .min(1, 'Role ID không được để trống')
    .describe('ID của role'),
});

// ========== DTO ==========
export class AssignRoleDto extends createZodDto(AssignRoleSchema) {
  @ApiProperty({
    description: 'ID của member',
    example: '123456789',
  })
  memberId: string;

  @ApiProperty({
    description: 'ID của role',
    example: '987654321',
  })
  roleId: string;
}
