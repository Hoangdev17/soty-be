import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateNitroSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  durationDays: z.number().min(1).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const UpdateNitroSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  durationDays: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateNitroDto = z.infer<typeof CreateNitroSchema>;
export type UpdateNitroDto = z.infer<typeof UpdateNitroSchema>;

// DTO classes for Swagger
export class CreateNitroDtoClass extends createZodDto(CreateNitroSchema) {
  @ApiProperty({
    description: 'Tên của gói Nitro',
    example: 'Nitro Basic',
  })
  name: string;

  @ApiProperty({
    description: 'SKU của gói Nitro',
    example: 'nitro-basic',
  })
  sku: string;

  @ApiProperty({
    description: 'Mô tả gói Nitro',
    example: 'Nitro Basic package - 50k/tháng',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Giá của gói Nitro (VNĐ)',
    example: 50000,
  })
  price: number;

  @ApiProperty({
    description: 'Số ngày hiệu lực (null nếu vĩnh viễn)',
    example: 30,
    required: false,
  })
  durationDays?: number;

  @ApiProperty({
    description: 'Metadata bổ sung',
    example: { type: 'basic', features: ['basic perks'] },
    required: false,
  })
  metadata?: any;
}

export class UpdateNitroDtoClass extends createZodDto(UpdateNitroSchema) {
  @ApiProperty({
    description: 'Tên của gói Nitro',
    example: 'Nitro Basic',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'SKU của gói Nitro',
    example: 'nitro-basic',
    required: false,
  })
  sku?: string;

  @ApiProperty({
    description: 'Mô tả gói Nitro',
    example: 'Nitro Basic package - 50k/tháng',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Giá của gói Nitro (VNĐ)',
    example: 50000,
    required: false,
  })
  price?: number;

  @ApiProperty({
    description: 'Số ngày hiệu lực (null nếu vĩnh viễn)',
    example: 30,
    required: false,
  })
  durationDays?: number;

  @ApiProperty({
    description: 'Trạng thái active',
    example: true,
    required: false,
  })
  isActive?: boolean;

  @ApiProperty({
    description: 'Metadata bổ sung',
    example: { type: 'basic', features: ['basic perks'] },
    required: false,
  })
  metadata?: any;
}
