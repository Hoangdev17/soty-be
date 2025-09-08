import { Injectable } from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { ChannelType, Prisma } from '@prisma/client';

@Injectable()
export class ChannelsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly snowflake: SnowflakeID
    ) {}

    async createChannel(guildId: string, createChannelDto: CreateChannelDto) {
        return await this.prisma.guildChannel.create({
            data:
            {
                id: this.snowflake.generate(),
                guildId: guildId,
                ...createChannelDto
            }
        })
    }

    async updateChannel(guildId: string, channelId: string, dto: UpdateChannelDto) {
        const data: Prisma.GuildChannelUpdateInput = {};

        if (dto.name !== undefined) data.name = { set: dto.name };
        if (dto.nsfw !== undefined) data.nsfw = { set: dto.nsfw };
        if (dto.topic !== undefined) data.topic = { set: dto.topic };

        if (dto.type !== undefined) {
            data.type = { set: dto.type as ChannelType }; // enum Prisma
        }

        if (dto.manageable !== undefined) data.manageable = { set: dto.manageable };
        if (dto.rateLimitPerUser !== undefined) data.rateLimitPerUser = { set: dto.rateLimitPerUser };
        if (dto.viewAble !== undefined) data.viewAble = { set: dto.viewAble };
        if (dto.recepients !== undefined) data.recipients = { set: dto.recepients };
        if (dto.maxMembers !== undefined) data.maxMembers = { set: dto.maxMembers };
        if (dto.createdAt !== undefined) data.createdAt = { set: dto.createdAt };
        if (dto.deleteable !== undefined) data.deletable = { set: dto.deleteable };
        if (dto.deletedAt !== undefined) data.deletedAt = { set: dto.deletedAt };
        if (dto.deleted !== undefined) data.deleted = { set: dto.deleted };

        return this.prisma.guildChannel.update({
            where: { 
                id: channelId,
                guildId
            },
            data,
        });
    }

    async getChannels(guildId: string) {
        return await this.prisma.guildChannel.findMany({
            where: {
                guildId: guildId,
                deleted: false
            },
            orderBy: {
                createdAt: 'asc'
            }
        })
    }

    async getChannelById(guildId: string, channelId: string) {
        return await this.prisma.guildChannel.findFirst({
            where: {
                id: channelId,
                guildId,
                deleted: false
            }
        })
    }

    async deleteChannel(guildId: string, channelId: string) {
        return await this.prisma.guildChannel.update({
            where: { 
                id: channelId,
                guildId
            },
            data: { deleted: true, deletedAt: new Date() }
        })
    }


}
