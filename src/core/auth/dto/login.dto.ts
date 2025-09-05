import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

// ========== SCHEMA ==========
export const LoginSchema = z.object({
  email: z.email().min(1).max(100).describe('Email'),
  password: z.string().min(6).max(128).describe('Mật khẩu'),
});

// ========== DTO ==========
export class LoginDto extends createZodDto(LoginSchema) {
  @ApiProperty({ example: 'johndoe@gmail.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'secret123', description: 'Mật khẩu của người dùng' })
  password: string;
}
