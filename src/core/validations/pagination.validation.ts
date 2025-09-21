import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const paginationSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  filter: z.string().optional(),

  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export class PaginationDto extends createZodDto(paginationSchema) {
  @ApiProperty({ required: false, description: 'The offset for pagination' })
  offset?: number;

  @ApiProperty({ required: false, description: 'The limit of items per page' })
  limit?: number;

  @ApiProperty({ required: false, description: 'The field to sort by' })
  sort?: string;

  @ApiProperty({
    required: false,
    enum: ['asc', 'desc'],
    description: 'The sort order',
  })
  order?: 'asc' | 'desc';

  @ApiProperty({ required: false, description: 'Search query' })
  q?: string;

  @ApiProperty({ required: false, description: 'Status filter' })
  status?: string;

  @ApiProperty({ required: false, description: 'Additional filter' })
  filter?: string;

  @ApiProperty({ required: false, description: 'Additional min price' })
  minPrice?: number;

  @ApiProperty({ required: false, description: 'Additional max price' })
  maxPrice?: number;
}
