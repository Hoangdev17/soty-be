// src/packages/users/dto/update-user.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserSchema } from './create-user.dto';

// ========== ZOD SCHEMA ==========
export const UpdateUserSchema = CreateUserSchema.partial();

// ========== DTO ==========
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {
  @ApiPropertyOptional({
    description: 'Tên đăng nhập (unique)',
    example: 'johndoe_updated',
  })
  username?: string;

  @ApiPropertyOptional({
    description: 'Email người dùng',
    example: 'johndoe_new@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu mới',
    example: 'newSecret123',
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại',
    example: '+84987654321',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái khóa tài khoản',
    example: true,
  })
  disabled?: boolean;

  @ApiPropertyOptional({
    description: 'Tên toàn cục (global username)',
    example: 'john_updated',
  })
  globalName?: string;

  @ApiPropertyOptional({
    description: 'Tiểu sử người dùng',
    example: 'Backend developer',
  })
  bio?: string;

  @ApiPropertyOptional({
    description: 'URL ảnh đại diện',
    example: 'https://example.com/new-avatar.png',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: 'URL banner',
    example: 'https://example.com/new-banner.png',
  })
  banner?: string;

  @ApiPropertyOptional({
    description: 'Màu chủ đạo dạng số (RGB integer)',
    example: 0x123456,
  })
  accentColor?: string;

  @ApiPropertyOptional({
    description: 'Màu chủ đạo dạng hex',
    example: '#123456',
  })
  hexAccentColor?: string;
}
