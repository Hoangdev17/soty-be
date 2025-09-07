import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuildsService } from './guilds.service';
import { CreateGuildDto } from './dto/create-guild.dto';

@Controller('guilds')
export class GuildsController {
    constructor(private readonly guildService: GuildsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all guilds' })
  @ApiResponse({ status: 200, description: 'List of guilds' })
  async getAll(dto: CreateGuildDto) {
  return await this.guildService.createGuild(dto);
  }
}
