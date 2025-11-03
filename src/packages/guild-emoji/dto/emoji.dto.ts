import { z } from 'zod';

export const AddEmojiSchema = z.object({
  name: z.string().min(1).max(50),
  url: z.string(),
  animated: z.boolean().optional(),
  requiresColons: z.boolean().optional(),
});

export type AddEmojiDto = z.infer<typeof AddEmojiSchema>;

export const UpdateEmojiSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  url: z.string().optional(),
  animated: z.boolean().optional(),
});

export type UpdateEmojiDto = z.infer<typeof UpdateEmojiSchema>;
