import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGuildStickerSchema } from './create-sticker.dto';
import { createZodDto } from 'nestjs-zod';

export const UpdateGuildStickerSchema = CreateGuildStickerSchema.partial();

export class UpdateGuildStickerDto extends createZodDto(UpdateGuildStickerSchema) {
  @ApiPropertyOptional({
    description: 'ID của guild mà sticker thuộc về',
    example: '123456789012345678',
  })
  guildId?: string;

  @ApiPropertyOptional({ example: 'Funny Cat' })
  name?: string;

  @ApiPropertyOptional({ example: 'A funny cat sticker' })
  description?: string;

  @ApiPropertyOptional({ example: 'cat,funny' })
  tags?: string;

  @ApiPropertyOptional({ example: 2, description: 'Guild = 2, Standard = 1, Other = 0' })
  type?: number;

  @ApiPropertyOptional({ example: 1, description: 'OTHER = 0, PNG = 1, APNG = 2, Lottie = 3, GIF = 4' })
  format?: number;

  @ApiPropertyOptional({ example: true })
  available?: boolean;

  @ApiPropertyOptional({ example: true })
  deletable?: boolean;

  @ApiPropertyOptional({ example: 'https://cdn.domain.com/sticker.png' })
  url?: string;

  @ApiPropertyOptional({ example: false })
  partial?: boolean;

  @ApiPropertyOptional({ example: 1 })
  sortValue?: number;

  @ApiPropertyOptional({ example: 'user_id_123' })
  authorId?: string;

  @ApiPropertyOptional({ example: 'pack_id_123' })
  packId?: string;
}