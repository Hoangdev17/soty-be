import { createZodDto } from 'nestjs-zod';

import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateFeedPostSchema } from './create-post.dto';

export const UpdateFeedPostSchema = CreateFeedPostSchema.partial();

export class UpdateFeedPostDto extends createZodDto(UpdateFeedPostSchema) {
  @ApiPropertyOptional({ example: 'guild_12345' })
  guildId?: string;

  @ApiPropertyOptional({ example: 'Cập nhật nội dung bài viết nè!' })
  content?: string;

  @ApiPropertyOptional({
    example: [
      { url: 'https://example.com/new_photo.jpg', type: 'IMG' },
      { url: 'https://example.com/new_clip.mp4', type: 'VIDEO' },
    ],
  })
  media?: { url: string; type: 'IMG' | 'VIDEO' }[];
}
