import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDecoratorDtoSchema } from './create-decorator.dto';

export const UpdateDecoratorDtoSchema = CreateDecoratorDtoSchema.partial();

export class UpdateDecoratorDto extends createZodDto(UpdateDecoratorDtoSchema) {
  @ApiPropertyOptional({ example: 1 })
  assetType?: number;

  @ApiPropertyOptional({ example: 'Updated name' })
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  description?: string;

  @ApiPropertyOptional({ example: 150 })
  price?: number;

  @ApiPropertyOptional({ example: 120 })
  salePrice?: number;

  @ApiPropertyOptional({ example: { color: 'red', glow: true } })
  metadata?: any;

  @ApiPropertyOptional({ example: 'clv654321' })
  userId?: string;
}
