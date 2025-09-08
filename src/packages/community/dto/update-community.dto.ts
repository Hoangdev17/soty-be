import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { CreateCommunitySchema } from './create-community.dto';

// ========== ZOD SCHEMA ==========
export const UpdateCommunitySchema = CreateCommunitySchema.partial();

// ========== DTO ==========
export class UpdateCommunityDto extends createZodDto(UpdateCommunitySchema) {
  @ApiProperty({
    description: 'Tên của community',
    example: 'Gaming Community',
    required: false,
    minLength: 1,
    maxLength: 100,
  })
  name?: string;

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
    required: false,
  })
  isPrivate?: boolean;
}
