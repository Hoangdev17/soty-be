import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateGuildDto } from './dto/create-guild.dto';
import { UpdateGuildDto } from './dto/update-guild.dto';

@Injectable()
export class GuildsService {
    constructor(
        private prisma: PrismaService,
        private snowFlakeId: SnowflakeID,
    ) {}

    async createGuild(dto: CreateGuildDto) {
        return this.prisma.guild.create({
            data: {
                id: this.snowFlakeId.generate(),
                ...dto,
            },
        });
    }

    async updateGuild(guildId: string, dto: UpdateGuildDto) {
        return this.prisma.guild.update({
            where: { id: guildId },
            data: {
                ...dto,
            },
        });
    }
    async fildAll() {
        return this.prisma.guild.findMany();
    }
    
    async findById(guildId: string) {
        return this.prisma.guild.findFirst({
            where: { id: guildId },
        });
    }
}
