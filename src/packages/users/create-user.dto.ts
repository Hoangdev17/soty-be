// src/packages/users/dto/create-user.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== ZOD SCHEMA ==========
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50).describe('Tên đăng nhập (unique)'),
  email: z.email().describe('Email người dùng'),
  passwordHash: z
    .string()
    .min(6)
    .max(128)
    .describe('Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string().optional().describe('Số điện thoại'),
  disabled: z.boolean().default(false).describe('Trạng thái khóa tài khoản'),
  globalName: z.string().optional().describe('Tên toàn cục (global username)'),
  bio: z.string().optional().describe('Tiểu sử người dùng'),
  avatar: z.string().optional().describe('URL ảnh đại diện'),
  banner: z.string().optional().describe('URL banner'),
  accentColor: z
    .number()
    .int()
    .optional()
    .describe('Màu chủ đạo dạng số (RGB integer)'),
  hexAccentColor: z.string().optional().describe('Màu chủ đạo dạng hex'),
});

// ========== DTO ==========
export class CreateUserDto extends createZodDto(CreateUserSchema) {
  @ApiProperty({
    description: 'Tên đăng nhập (unique)',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'Email người dùng',
    example: 'johndoe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Mật khẩu tối thiểu 6 ký tự',
    example: 'secret123',
  })
  password: string;

  @ApiProperty({
    description: 'Số điện thoại',
    example: '+84901234567',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Trạng thái khóa tài khoản',
    example: false,
    default: false,
  })
  disabled: boolean;

  @ApiProperty({
    description: 'Tên toàn cục (global username)',
    example: 'johndoe',
    required: false,
  })
  globalName?: string;

  @ApiProperty({
    description: 'Tiểu sử người dùng',
    example: 'Fullstack developer & gamer',
    required: false,
  })
  bio?: string;

  @ApiProperty({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/avatar.png',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'URL banner',
    example: 'https://example.com/banner.png',
    required: false,
  })
  banner?: string;

  @ApiProperty({
    description: 'Màu chủ đạo dạng số (RGB integer)',
    example: 0x5865f2,
    required: false,
  })
  accentColor?: number;

  @ApiProperty({
    description: 'Màu chủ đạo dạng hex',
    example: '#5865F2',
    required: false,
  })
  hexAccentColor?: string;
}
