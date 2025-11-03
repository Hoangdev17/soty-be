import { z } from 'zod';

export const AddStickerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  url: z.string(),
  tags: z.string().optional(),
  format: z.number().int().min(0).max(4).optional(),
  type: z.number().int().min(0).max(2).optional(),
  packId: z.string().optional(),
});

export type AddStickerDto = z.infer<typeof AddStickerSchema>;

export const CreateStickerPackSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  banner: z.string().optional(),
});

export type CreateStickerPackDto = z.infer<typeof CreateStickerPackSchema>;
