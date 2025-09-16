import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const sendReplySchema = z.object({
  content: z.string().min(1, 'Content is required'),
  channelId: z.string().min(1, 'Channel ID is required'),
  replyToMessageId: z.string().min(1, 'Reply to message ID is required'),
  mentionAuthor: z.boolean().optional().default(false),
});

export class SendReplyDto extends createZodDto(sendReplySchema) {}
