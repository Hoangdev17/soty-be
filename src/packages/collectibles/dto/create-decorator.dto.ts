import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CreateDecoratorDtoSchema = z.object({
  assetType: z.number().int(),
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().default(0),
  salePrice: z.number().default(0),
  metadata: z.any(),
  expiresAt: z.string().datetime().optional(),
  userId: z.string().optional(),
});

export class CreateDecoratorDto extends createZodDto(CreateDecoratorDtoSchema) {
  @ApiProperty({
    example: 1,
    description: '0: nameplate; 1: avatarDecoration; 2: profile_effects',
  })
  assetType: number;

  @ApiPropertyOptional({ example: 'Cool Nameplate' })
  name?: string;

  @ApiPropertyOptional({ example: 'A shiny decoration item' })
  description?: string;

  @ApiProperty({ example: 100 })
  price: number;

  @ApiProperty({ example: 80 })
  salePrice: number;

  @ApiProperty({ example: { color: 'blue', animation: true } })
  metadata: any;

  @ApiPropertyOptional({ example: '2025-12-31T00:00:00.000Z' })
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'clv123456' })
  userId?: string;
}
