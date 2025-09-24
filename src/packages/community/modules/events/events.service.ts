import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { CreateEventDto, UpdateEventDto } from './dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

  async findAll(
    guildId: string,
    pagination: { limit?: number; offset?: number } = {},
  ) {
    const skip = Math.max(0, pagination.offset ?? 0);
    const take = pagination.limit ?? 20;

    const [events, total] = await Promise.all([
      this.prisma.guildEvent.findMany({
        where: { guildId, deleted: false },
        orderBy: { startAt: 'asc' },
        skip,
        take,
      }),
      this.prisma.guildEvent.count({ where: { guildId, deleted: false } }),
    ]);

    return { events, total, limit: take, offset: skip };
  }

  async findOne(guildId: string, id: string) {
    const ev = await this.prisma.guildEvent.findUnique({
      where: { id, guildId },
    });
    if (!ev || ev.deleted) throw new NotFoundException('Event not found');
    return ev;
  }

  async create(guildId: string, userId: string, dto: CreateEventDto) {
    const id = this.snowflake.generate();

    return this.prisma.guildEvent.create({
      data: {
        id,
        guildId,
        userId,
        title: dto.title,
        description: dto.description,
        startAt: dto.startAt,
        startTime: dto.startTime,
        imgUrl: dto.imgUrl,
        allDay: dto.allDay,
        timeZone: dto.timeZone,
        platform: dto.platform,
        meetingUrl: dto.meetingUrl,
        remind: dto.remind,
        frequency: dto.frequency,
        channelId: dto.channelId,
        metadata: dto.metadata,
      },
    });
  }

  async update(guildId: string, id: string, dto: UpdateEventDto) {
    const ev = (await this.findOne(guildId, id)) as any;
    // Normalize incoming date strings
    const startAt = dto.startAt ? new Date(dto.startAt as any) : undefined;
    const endAt = dto.endAt ? new Date(dto.endAt as any) : undefined;
    return this.prisma.guildEvent.update({
      where: { id },
      data: {
        title: dto.title ?? ev.title,
        description: dto.description ?? ev.description,
        startAt: startAt ?? ev.startAt,
        endAt: endAt ?? ev.endAt,
        allDay: dto.allDay ?? ev.allDay,
        timeZone: dto.timeZone ?? ev.timeZone,
        platform: dto.platform ?? ev.platform,
        meetingUrl: dto.meetingUrl ?? ev.meetingUrl,
        remind: dto.remind ?? ev.remind,
        frequency: dto.frequency ?? ev.frequency,
        allowedRoleIds: dto.allowedRoleIds ?? ev.allowedRoleIds,
        location: dto.location ?? ev.location,
        channelId: dto.channelId ?? ev.channelId,
        metadata: dto.metadata ?? ev.metadata,
      },
    } as any);
  }

  async remove(guildId: string, id: string) {
    const ev = await this.findOne(guildId, id);
    return this.prisma.guildEvent.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    });
  }
}
