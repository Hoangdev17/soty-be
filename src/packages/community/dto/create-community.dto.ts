import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== ZOD SCHEMA ==========
export const CreateCommunitySchema = z.object({
  name: z
    .string()
    .min(1, 'Tên community không được để trống')
    .max(100, 'Tên community không được quá 100 ký tự')
    .describe('Tên của community'),
  description: z
    .string()
    .max(500, 'Mô tả không được quá 500 ký tự')
    .optional()
    .describe('Mô tả về community'),
  avatar: z
    .string()
    .url('Avatar phải là URL hợp lệ')
    .optional()
    .describe('URL ảnh đại diện của community'),
  banner: z
    .string()
    .url('Banner phải là URL hợp lệ')
    .optional()
    .describe('URL ảnh banner của community'),
  isPrivate: z.boolean().describe('Community có riêng tư hay không'),
});

// ========== DTO ==========
export class CreateCommunityDto extends createZodDto(CreateCommunitySchema) {
  @ApiProperty({
    description: 'Tên của community',
    example: 'Gaming Community',
    minLength: 1,
    maxLength: 100,
  })
  name: string;

  @ApiProperty({
    description: 'Mô tả về community',
    example: 'Một community dành cho game thủ',
    required: false,
    maxLength: 500,
  })
  description?: string;

  @ApiProperty({
    description: 'URL ảnh đại diện của community',
    example: 'https://example.com/avatar.jpg',
    required: false,
    format: 'url',
  })
  avatar?: string;

  @ApiProperty({
    description: 'URL ảnh banner của community',
    example: 'https://example.com/banner.jpg',
    required: false,
    format: 'url',
  })
  banner?: string;

  @ApiProperty({
    description: 'Community có riêng tư hay không',
    example: false,
    default: false,
  })
  isPrivate: boolean;
}
