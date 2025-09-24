import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto } from './dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('communities/:guildId/events')
@ApiTags('Guild Events')
@ApiBearerAuth('access-token')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(
    @Param('guildId') guildId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const pagination = {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    } as any;
    return this.eventsService.findAll(guildId, pagination);
  }

  @Get(':id')
  async findOne(@Param('guildId') guildId: string, @Param('id') id: string) {
    return this.eventsService.findOne(guildId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('guildId') guildId: string,
    @Body() dto: CreateEventDto,
    @Req() req: any,
  ) {
    return this.eventsService.create(guildId, req.user.id, dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('guildId') guildId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(guildId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('guildId') guildId: string, @Param('id') id: string) {
    return this.eventsService.remove(guildId, id);
  }
}
