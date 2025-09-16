import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export enum ThreadType {
  PUBLIC = 'GUILD_PUBLIC_THREAD',
  PRIVATE = 'GUILD_PRIVATE_THREAD',
}

const createThreadSchema = z.object({
  name: z
    .string()
    .min(1, 'Thread name is required')
    .max(100, 'Thread name too long'),
  topic: z.string().optional(),
  type: z.nativeEnum(ThreadType).default(ThreadType.PUBLIC),
  autoArchiveDuration: z.number().default(1440), // 24 hours in minutes
  starterMessageId: z.string().optional(),
  message: z.string().optional(),
});

export class CreateThreadDto extends createZodDto(createThreadSchema) {}
