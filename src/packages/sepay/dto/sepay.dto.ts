import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreatePaymentSchema = z.object({
  amount: z.number().min(1000, 'Amount must be at least 1,000 VND'),
  guildId: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  nitroId: z.string().optional(),
  nitroAmount: z.number().min(1).optional(),
  avatarEffectId: z.string().optional(),
  boostId: z.string().optional(),
});

export const WebhookSchema = z.object({
  content: z.string(),
  amount: z.number(),
  status: z.string(),
  guildId: z.string().optional(),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentSchema>;
export type WebhookDto = z.infer<typeof WebhookSchema>;

// DTO classes for Swagger documentation
export class CreatePaymentDtoClass extends createZodDto(CreatePaymentSchema) {
  @ApiProperty({
    description: 'Số tiền thanh toán (VNĐ)',
    example: 50000,
    minimum: 1000,
  })
  amount: number;

  @ApiProperty({
    description: 'guild id',
    example: '123456789012345678',
    required: false,
  })
  guildId?: string;

  @ApiProperty({
    description: 'Nội dung thanh toán',
    example: 'Thanh toán mua Nitro Boost 50 gems',
  })
  content: string;

  @ApiProperty({
    description: 'ID của người dùng',
    example: '123456789012345678',
  })
  userId: string;

  @ApiProperty({
    description: 'ID của gói Nitro (tùy chọn)',
    example: 'nitro-premium-monthly',
    required: false,
  })
  nitroId?: string;

  @ApiProperty({
    description: 'Số lượng Nitro gems (tùy chọn)',
    example: 50,
    minimum: 1,
    required: false,
  })
  nitroAmount?: number;

  @ApiProperty({
    description: 'ID của Boost (tùy chọn)',
    example: 'boost-global-level-2',
    required: false,
  })
  boostId?: string;

  @ApiProperty({
    description: 'ID của Avatar Effect (tùy chọn)',
    example: '123456789012345678',
    required: false,
  })
  avatarEffectId?: string;
}

// DTO for complete payment response
export class CompletePaymentResponseDto {
  @ApiProperty({
    description: 'ID của payment',
    example: '123456789012345678',
  })
  paymentId: string;

  @ApiProperty({
    description: 'Trạng thái payment (1: completed)',
    example: 1,
  })
  status: number;

  @ApiProperty({
    description: 'Số tiền đã thanh toán',
    example: 50000,
  })
  amount: number;

  @ApiProperty({
    description: 'Số lượng gems nhận được',
    example: 2,
    required: false,
  })
  gemsAmount?: number;

  @ApiProperty({
    description: 'Thời gian hoàn thành',
    example: '2025-09-24T04:36:19.000Z',
  })
  completedAt: Date;
}
