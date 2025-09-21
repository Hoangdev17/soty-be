import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const OrderDecorationSchema = z.object({
  decorationId: z.string(),
  avatarEffectId: z.string().optional(),
});

export class OrderDecorationDto extends createZodDto(OrderDecorationSchema) {
  @ApiProperty({
    example: '133142331213',
    description: 'Decoration ID',
  })
  decorationId: string;
}
