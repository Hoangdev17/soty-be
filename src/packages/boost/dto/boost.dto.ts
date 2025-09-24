import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateBoostSchema = z.object({
  nitroUsed: z.number().min(0).default(0),
  level: z.number().min(1).default(1),
  perks: z.record(z.string(), z.any()).optional(),
});

export const UpdateBoostSchema = z.object({
  nitroId: z.string().optional(),
  nitroUsed: z.number().min(0).optional(),
  level: z.number().min(1).optional(),
  perks: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateBoostDto = z.infer<typeof CreateBoostSchema> & {
  expiresAt?: Date;
};
export type UpdateBoostDto = z.infer<typeof UpdateBoostSchema> & {
  expiresAt?: Date;
};

// DTO classes for Swagger
export class CreateBoostDtoClass extends createZodDto(CreateBoostSchema) {
  @ApiProperty({
    description: 'Số Nitro gems tiêu thụ',
    example: 10,
    default: 0,
  })
  nitroUsed: number;

  @ApiProperty({
    description: 'Level của boost',
    example: 1,
    default: 1,
  })
  level: number;

  @ApiProperty({
    description: 'Perks của boost',
    example: { extra_emojis: true },
    required: false,
  })
  perks?: any;

  @ApiProperty({
    description: 'Thời gian hết hạn (tùy chọn)',
    example: '2025-10-24T00:00:00.000Z',
    required: false,
  })
  expiresAt?: Date;
}

export class UpdateBoostDtoClass extends createZodDto(UpdateBoostSchema) {
  @ApiProperty({
    description: 'ID của Nitro được sử dụng (tùy chọn)',
    example: 'nitro-basic',
    required: false,
  })
  nitroId?: string;

  @ApiProperty({
    description: 'Số Nitro gems tiêu thụ',
    example: 10,
    required: false,
  })
  nitroUsed?: number;

  @ApiProperty({
    description: 'Level của boost',
    example: 2,
    required: false,
  })
  level?: number;

  @ApiProperty({
    description: 'Perks của boost',
    example: { extra_emojis: true, priority: true },
    required: false,
  })
  perks?: any;

  @ApiProperty({
    description: 'Thời gian hết hạn (tùy chọn)',
    example: '2025-10-24T00:00:00.000Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Trạng thái active',
    example: true,
    required: false,
  })
  isActive?: boolean;
}
