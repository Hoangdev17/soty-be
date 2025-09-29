import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGuildStickerDto } from './dto/create-sticker.dto';
import { SnowflakeID } from 'src/utils/snowflake';
import { UpdateGuildStickerDto } from './dto/update-sticker.dto';

@Injectable()
export class GuildStickerService {

	constructor(private readonly prisma: PrismaService, private readonly snowFlake : SnowflakeID) {}

	// CREATE
	async create(dto: CreateGuildStickerDto) {
        const guildExist = await this.prisma.guild.findUnique({
            where: { id: dto.guildId },
        });

        if(!guildExist) {
            throw new NotFoundException('Guild not found');
        }
        
		return await this.prisma.guildSticker.create({
            data: { id: this.snowFlake.generate(), ...dto },
        });
	}

    //UPDATE
    async update(id: string, dto: UpdateGuildStickerDto) {
        const sticker = await this.prisma.guildSticker.findUnique({
            where: { id },
        });

        if(!sticker) {
            throw new NotFoundException('Sticker not found');
        }

        if(dto.guildId && dto.guildId !== sticker.guildId) {
            const guildExist = await this.prisma.guild.findUnique({
                where: { id: dto.guildId },
            });

            if(!guildExist) {
                throw new NotFoundException('Guild not found');
            }
        }

        return await this.prisma.guildSticker.update({
            where: { id },
            data: { ...dto },
        });
    }

    // FIND ALL
    async findAll() {
        return await this.prisma.guildSticker.findMany();
    }

    // FIND ONE
    async findOne(id: string) {
        const sticker = await this.prisma.guildSticker.findUnique({
            where: { id },
        });

        if(!sticker) {
            throw new NotFoundException('Sticker not found');
        }

        return sticker;
    }

    // DELETE
    async delete(id: string) {
        const sticker = await this.prisma.guildSticker.findUnique({
            where: { id },
        });

        if(!sticker) {
            throw new NotFoundException('Sticker not found');
        }

        return await this.prisma.guildSticker.delete({
            where: { id },
        });
    }

}
