import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CompletePaymentDto = z.object({
  id: z.string(),
  amount: z.number().min(1000, 'Amount must be at least 1,000 VND'),
  nitroId: z.string().optional(),
});

// DTO classes for Swagger documentation
export class CompletePaymentDtoClass extends createZodDto(CompletePaymentDto) {
  @ApiProperty({
    description: 'ID của payment',
    example: '123456789012345678',
  })
  payment;
  id: string;

  @ApiProperty({
    description: 'Số tiền thanh toán (VNĐ)',
    example: 50000,
    minimum: 1000,
  })
  amount: number;

  @ApiProperty({
    description: 'ID của gói Nitro (tùy chọn)',
    example: 'nitro-premium-monthly',
    required: false,
  })
  nitroId?: string;
}
