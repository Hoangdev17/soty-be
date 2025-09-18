import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { CreateGuildCategoryDto } from './dto/create-guild-category.dto';
import { UpdateGuildCategoryDto } from './dto/update-guild-category.dto';
import { GuildCategoryService } from './categories.service';

@Controller('guild-categories')
export class GuildCategoryController {
  constructor(private readonly service: GuildCategoryService) {}

  @Post()
  create(@Body() dto: CreateGuildCategoryDto) {
    return this.service.create(dto);
  }

  @Get(':guildId')
  findAll(@Param('guildId') guildId: string) {
    return this.service.findAll(guildId);
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGuildCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
