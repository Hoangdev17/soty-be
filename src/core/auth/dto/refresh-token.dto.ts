import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1).describe('Refresh token của user'),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....',
    description: 'Refresh token hợp lệ',
  })
  refreshToken: string;
}
