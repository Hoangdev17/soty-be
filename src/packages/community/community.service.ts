import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { SnowflakeID } from '../../utils/snowflake';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { GuildPermissions } from './constants/guild-permissions';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

  async create(createCommunityDto: CreateCommunityDto, userId: string) {
    const guildId = this.snowflake.generate();
    const urlSlug = createCommunityDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create guild with default roles
    const guild = await this.prisma.guild.create({
      data: {
        id: guildId,
        name: createCommunityDto.name,
        description: createCommunityDto.description,
        avatar: createCommunityDto.avatar,
        banner: createCommunityDto.banner,
        visibility: createCommunityDto.isPrivate ? 'PRIVATE' : 'PUBLIC',
        ownerId: userId,
        url: `${urlSlug}-${guildId}`,
      },
    });

    // Create @everyone role (default role for all members)
    const everyoneRoleId = this.snowflake.generate();
    await this.prisma.guildRole.create({
      data: {
        id: everyoneRoleId,
        name: '@everyone',
        guildId: guildId,
        permissions: GuildPermissions.DEFAULT_EVERYONE_PERMISSIONS,
        position: 0,
        hoist: false,
        mentionable: false,
        managed: true, // System managed role
      },
    });

    // Create Admin role for guild owner
    const adminRoleId = this.snowflake.generate();
    const adminRole = await this.prisma.guildRole.create({
      data: {
        id: adminRoleId,
        name: 'Admin',
        guildId: guildId,
        permissions: GuildPermissions.ADMINISTRATOR,
        position: 1,
        hoist: true,
        mentionable: true,
        color: 0xff0000, // Red color for admin
      },
    });

    // Create guild member for owner and assign admin role
    const ownerMemberId = this.snowflake.generate();
    const ownerMember = await this.prisma.guildMember.create({
      data: {
        id: ownerMemberId,
        guildId: guildId,
        userId: userId,
        permissions: [GuildPermissions.ADMINISTRATOR.toString()],
      },
    });

    // Assign admin role to owner
    await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId: ownerMemberId,
        roleId: adminRoleId,
      },
    });

    return guild;
  }

  async findAll() {
    return this.prisma.guild.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                globalName: true,
                avatar: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            globalName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.guild.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                globalName: true,
                avatar: true,
              },
            },
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            username: true,
            globalName: true,
            avatar: true,
          },
        },
        channels: true,
        roles: {
          orderBy: { position: 'desc' },
        },
      },
    });
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto) {
    return this.prisma.guild.update({
      where: { id },
      data: { ...updateCommunityDto },
    });
  }

  async remove(id: string) {
    return this.prisma.guild.delete({
      where: { id },
    });
  }

  async joinCommunity(communityId: string, userId: string) {
    // This method has been moved to MembersService
    throw new Error('This method has been moved to MembersService');
  }

  async leaveCommunity(communityId: string, userId: string) {
    // This method has been moved to MembersService
    throw new Error('This method has been moved to MembersService');
  }

  async getCommunityMembers(communityId: string) {
    // This method has been moved to MembersService
    throw new Error('This method has been moved to MembersService');
  }

  async getMemberPermissions(guildId: string, userId: string) {
    // This method has been moved to MembersService
    throw new Error('This method has been moved to MembersService');
  }

  async getCommunitiesByOwner(ownerId: string) {
    return this.prisma.guild.findMany({
      where: { ownerId },
      include: {
        members: true,
      },
    });
  }

  async searchCommunities(query: string) {
    return this.prisma.guild.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        visibility: 'PUBLIC', // Only show public communities in search
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            globalName: true,
            avatar: true,
          },
        },
      },
    });
  }
}
