import { Injectable } from '@nestjs/common';
import { CreateGuildCategoryDto } from './dto/create-guild-category.dto';
import { UpdateGuildCategoryDto } from './dto/update-guild-category.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class GuildCategoryService {
  private snowflake = new SnowflakeID();

  constructor(private prisma: PrismaService) {}

  // Create new category
  async create(dto: CreateGuildCategoryDto) {
    return this.prisma.guildCategory.create({
      data: {
        id: this.snowflake.generate().toString(),
        name: dto.name,
        guildId: dto.guildId,
        position: dto.position ?? 0,
        nsfw: dto.nsfw ?? false,
      },
    });
  }

  // Get all categories of a guild
  async findAll(guildId: string) {
    return this.prisma.guildCategory.findMany({
      where: { guildId },
      orderBy: { position: 'asc' },
      include: {
        channels: true, // lấy luôn các channel trong category
      },
    });
  }

  // Get one category
  async findOne(id: string) {
    return this.prisma.guildCategory.findUnique({
      where: { id },
      include: { channels: true },
    });
  }

  // Update category
  async update(id: string, dto: UpdateGuildCategoryDto) {
    return this.prisma.guildCategory.update({
      where: { id },
      data: {
        name: dto.name,
        position: dto.position,
        nsfw: dto.nsfw,
      },
    });
  }

  // Delete category
  async remove(id: string) {
    return this.prisma.guildCategory.delete({
      where: { id },
    });
  }
}
