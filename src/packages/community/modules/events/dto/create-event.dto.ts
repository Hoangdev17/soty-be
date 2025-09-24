import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imgUrl: z.string().optional(),
  startAt: z.string().pipe(z.coerce.date()).optional(),
  startTime: z.string().optional(),
  endAt: z.string().pipe(z.coerce.date()).optional(),
  allDay: z.boolean().optional(),
  timeZone: z.string().optional(),
  platform: z.string().optional(),
  meetingUrl: z.string().optional(),
  remind: z.boolean().optional(),
  frequency: z.string().optional(),
  allowedRoleIds: z.array(z.string()).optional(),
  location: z.string().optional(),
  channelId: z.string().optional(),
  metadata: z.any().optional(),
});

export class CreateEventDto extends createZodDto(createEventSchema) {
  @ApiProperty({ description: 'Event title' })
  title!: string;

  @ApiProperty({ description: 'Event description', required: false })
  description?: string;

  @ApiProperty({ description: 'Event image URL', required: false })
  imgUrl?: string;

  @ApiProperty({ description: 'Event start time', required: false })
  startTime?: string;

  @ApiProperty({
    description: 'Event start date/time (ISO string)',
    type: String,
  })
  startAt!: Date;

  @ApiProperty({
    description: 'Event end date/time (ISO string)',
    required: false,
    type: String,
  })
  endAt?: Date;

  @ApiProperty({ description: 'All day event', required: false })
  allDay?: boolean;

  @ApiProperty({ description: 'Timezone of event', required: false })
  timeZone?: string;

  @ApiProperty({ description: 'Platform (Zoom, Teams, ...)', required: false })
  platform?: string;

  @ApiProperty({ description: 'Meeting URL', required: false })
  meetingUrl?: string;

  @ApiProperty({ description: 'Send reminder', required: false })
  remind?: boolean;

  @ApiProperty({ description: 'Recurrence frequency', required: false })
  frequency?: string;

  @ApiProperty({
    description: 'Allowed role ids',
    required: false,
    type: [String],
  })
  allowedRoleIds?: string[];

  @ApiProperty({ description: 'Location type or freeform', required: false })
  location?: string;

  @ApiProperty({ description: 'Associated channel id', required: false })
  channelId?: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: any;
}
