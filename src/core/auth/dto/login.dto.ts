import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== SCHEMA ==========
export const LoginSchema = z.object({
  username: z.string().min(1).max(100).describe('Tên đăng nhập'),
  password: z.string().min(6).max(128).describe('Mật khẩu'),
});

// ========== DTO ==========
export class LoginDto extends createZodDto(LoginSchema) {
  @ApiProperty({ example: 'johndoe', description: 'Tên đăng nhập' })
  username: string;

  @ApiProperty({ example: 'secret123', description: 'Mật khẩu của người dùng' })
  password: string;
}
