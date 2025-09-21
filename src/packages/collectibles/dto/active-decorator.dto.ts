import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ActiveDecoratorDtoSchema = z.object({
  isActive: z.boolean(),
});

export class ActiveDecoratorDto extends createZodDto(ActiveDecoratorDtoSchema) {
  @ApiProperty({
    example: true,
    description:
      'Set decoration active status (true = active, false = inactive)',
  })
  isActive: boolean;
}
