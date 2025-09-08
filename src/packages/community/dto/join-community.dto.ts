import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== ZOD SCHEMA ==========
export const JoinCommunitySchema = z.object({
  userId: z
    .string()
    .min(1, 'ID người dùng không được để trống')
    .describe('ID của người dùng tham gia community'),
});

// ========== DTO ==========
export class JoinCommunityDto extends createZodDto(JoinCommunitySchema) {
  @ApiProperty({
    description: 'ID của người dùng tham gia community',
    example: '123456789',
  })
  userId: string;
}
