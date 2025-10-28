import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateBotSchema = z.object({
  username: z.string().min(3).max(50),
  description: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string(),
});

export class CreateBotDto extends createZodDto(CreateBotSchema) {
  @ApiProperty({ example: 'Soty Assistant' })
  username: string;

  @ApiProperty({ example: 'sotybot@gmail.com' })
  email: string;

  @ApiProperty({ example: 'A helpful assistant for your community.' })
  description?: string;

  @ApiProperty({ example: 'https://cdn.soty.com/avatar/bot.png' })
  avatar?: string;
}
