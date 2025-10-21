import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';

export const CreateFeedPostSchema = z.object({
  content: z.string().min(1),
  media: z
    .array(
      z.object({
        url: z.string(),
        type: z.enum(['IMG', 'VIDEO']),
      }),
    )
    .optional(),
});

export class CreateFeedPostDto extends createZodDto(CreateFeedPostSchema) {
  @ApiProperty({ example: 'guild_12345' })
  @ApiProperty({
    example: 'Hôm nay trời đẹp quá!',
  })
  content!: string;

  @ApiProperty({
    example: [
      { url: 'https://example.com/photo.jpg', type: 'IMG' },
      { url: 'https://example.com/clip.mp4', type: 'VIDEO' },
    ],
    required: false,
  })
  media?: { url: string; type: 'IMG' | 'VIDEO' }[];
}
