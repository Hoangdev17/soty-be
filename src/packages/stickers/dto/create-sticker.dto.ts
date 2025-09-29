import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

export const CreateGuildStickerSchema = z.object({
    guildId: z.string().min(1, 'Guild ID is required').describe('ID of the guild the sticker belongs to'),
    name: z.string().min(1, 'Name is required').describe('Name of the sticker'),
    description: z.string().max(100, 'Description can be up to 100 characters').optional().describe('Description of the sticker'),
    tags: z.string().max(200, 'Tags can be up to 200 characters').optional().describe('Comma-separated list of tags for the sticker'),
    type: z.number().int().min(0).max(2).optional().describe('Type of sticker: Guild = 2, Standard = 1, Other = 0'),
    format: z.number().int().min(0).max(4).optional().describe('Format of sticker: OTHER = 0, PNG = 1, APNG = 2, Lottie = 3, GIF = 4'),
    available: z.boolean().optional().describe('Whether the sticker is available'),
    deletable: z.boolean().optional().describe('Whether the sticker is deletable'),
    url: z.string().url('URL must be valid').optional().describe('URL of the sticker image'),
    partial: z.boolean().optional().describe('Whether the sticker is partial'),
    sortValue: z.number().int().optional().describe('Sort value for ordering stickers'),
    authorId: z.string().min(1, 'Author ID is required').describe('ID of the user who created the sticker'),
    packId: z.string().optional().describe('ID of the sticker pack, if applicable'),
});

export class CreateGuildStickerDto {
	@ApiProperty({ example: '360679449995251712' })
	guildId: string;

	@ApiProperty({ example: 'Funny Cat' })
	name: string;

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

	@ApiProperty({ example: 'user_id_123' })
	authorId: string;

	@ApiPropertyOptional({ example: 'pack_id_123' })
	packId?: string;
}