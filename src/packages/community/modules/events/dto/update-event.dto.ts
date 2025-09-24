import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateEventSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
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

export class UpdateEventDto extends createZodDto(updateEventSchema) {
  @ApiProperty({ description: 'Event title', required: false })
  title?: string;

  @ApiProperty({ description: 'Event description', required: false })
  description?: string;

  @ApiProperty({
    description: 'Event start date/time',
    required: false,
    type: String,
  })
  startAt?: string;

  @ApiProperty({
    description: 'Event end date/time',
    required: false,
    type: String,
  })
  endAt?: string;

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
