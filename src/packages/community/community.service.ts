import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { SnowflakeID } from '../../utils/snowflake';
import { UpdateCommunityDto } from './dto/update-community.dto';
import {
  GuildPermissions,
  PERMISSION_NAMES,
  PermissionUtils,
} from './constants/guild-permissions';
import { ChannelType } from '@prisma/client';

@Injectable()
export class CommunityService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
    private cacheService: CacheService,
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
        memberCount: 1,
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
        permissions: PermissionUtils.getDefaultPermissions(),
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
        name: 'ADMINISTRATOR',
        guildId: guildId,
        permissions: ['ADMINISTRATOR'],
        position: 1,
        hoist: true,
        mentionable: true,
        color: '0xff0000', // Red color for admin
      },
    });

    // Create guild member for owner
    const ownerMemberId = this.snowflake.generate();
    const ownerMember = await this.prisma.guildMember.create({
      data: {
        id: ownerMemberId,
        guildId: guildId,
        userId,
        permissions: ['ADMINISTRATOR'],
      },
    });

    //Assign @everyone role to owner
    // Assign admin role to owner
    await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId: ownerMemberId,
        roleId: everyoneRoleId,
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

    // Create default categories and channels
    await this.createDefaultChannels(guildId, userId);

    // Clear related cache after creating new community
    await this.cacheService.del('communities:all');
    await this.cacheService.del(`user:${userId}:communities`);
    await this.cacheService.del(`community:${guildId}`);
    await this.cacheService.del(`community:${guildId}:members`);
    await this.cacheService.del(`community:${guildId}:channels`);
    await this.cacheService.del(`roles:guild:${guildId}`);
    await this.cacheService.del(`member:${guildId}:${userId}:roles`);

    return guild;
  }

  private async createDefaultChannels(guildId: string, userId: string) {
    // 1. Create "Kênh Chat" category
    const chatCategoryId = this.snowflake.generate();
    const chatCategory = await this.prisma.guildChannel.create({
      data: {
        id: chatCategoryId,
        name: 'Kênh Chat',
        type: ChannelType.GUILD_CATEGORY,
        guildId: guildId,
        createdById: userId,
        position: 0,
      },
    });

    // 2. Create "Kênh Thoại" category
    const voiceCategoryId = this.snowflake.generate();
    const voiceCategory = await this.prisma.guildChannel.create({
      data: {
        id: voiceCategoryId,
        name: 'Kênh Thoại',
        type: ChannelType.GUILD_CATEGORY,
        guildId: guildId,
        createdById: userId,
        position: 1,
      },
    });

    // 3. Create default text channel in chat category
    const generalTextChannelId = this.snowflake.generate();
    await this.prisma.guildChannel.create({
      data: {
        id: generalTextChannelId,
        name: 'general',
        type: ChannelType.GUILD_TEXT,
        guildId: guildId,
        parentId: chatCategoryId,
        createdById: userId,
        position: 0,
        topic: 'Kênh chat chung cho mọi thành viên',
      },
    });

    // 4. Create default voice channel in voice category
    const generalVoiceChannelId = this.snowflake.generate();
    await this.prisma.guildChannel.create({
      data: {
        id: generalVoiceChannelId,
        name: 'General',
        type: ChannelType.GUILD_VOICE,
        guildId: guildId,
        parentId: voiceCategoryId,
        createdById: userId,
        position: 0,
      },
    });
  }

  async findAll() {
    const cacheKey = 'communities:all';

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const communities = await this.prisma.guild.findMany({
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

    // Cache for 10 minutes
    await this.cacheService.set(cacheKey, communities, 600);
    return communities;
  }

  async findOne(id: string) {
    const cacheKey = `community:${id}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const guild = await this.prisma.guild.findUnique({
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
        channels: {
          where: {
            deleted: false,
            type: {
              in: [
                ChannelType.GUILD_CATEGORY,
                ChannelType.GUILD_TEXT,
                ChannelType.GUILD_VOICE,
              ],
            },
          },
          orderBy: { position: 'asc' },
        },
        roles: {
          orderBy: { position: 'desc' },
          include: {
            members: {
              select: { memberId: true },
            },
          },
        },
      },
    });

    if (!guild) return null;

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, guild, 300);
    return guild;
  }

  async update(id: string, updateCommunityDto: UpdateCommunityDto) {
    // Clear related cache
    await this.cacheService.del(`community:${id}`);
    await this.cacheService.del(`community:${id}:channels`);
    await this.cacheService.del('communities:all');

    return this.prisma.guild.update({
      where: { id },
      data: { ...updateCommunityDto },
    });
  }

  async remove(id: string) {
    // Delete channels in hierarchy order to avoid parent-child constraint violations
    await this.prisma.guildChannel.deleteMany({
      where: { guildId: id, parentId: { not: null } }, // Delete child channels first
    });

    await this.prisma.guildChannel.deleteMany({
      where: { guildId: id }, // Then delete parent channels
    });

    await this.cacheService.del(`community:${id}`);
    await this.cacheService.del(`community:${id}:channels`);
    await this.cacheService.del(`community:${id}:members`);
    await this.cacheService.del('communities:all');

    await this.prisma.guild.delete({
      where: { id },
    });

    return { message: 'Community deleted successfully' };
  }

  async joinCommunity(communityId: string, userId: string) {
    // Check if user is already a member
    const existingMember = await this.prisma.guildMember.findFirst({
      where: {
        guildId: communityId,
        userId,
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this community');
    }

    // Get @everyone role for this guild
    const everyoneRole = await this.prisma.guildRole.findFirst({
      where: {
        guildId: communityId,
        name: '@everyone',
      },
    });

    if (!everyoneRole) {
      throw new Error('Default role not found for this community');
    }

    // Create guild member
    const memberId = this.snowflake.generate();
    const member = await this.prisma.guildMember.create({
      data: {
        id: memberId,
        guildId: communityId,
        userId,
        permissions: PermissionUtils.getDefaultPermissions(),
      },
    });

    // Assign @everyone role to the new member
    await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId: memberId,
        roleId: everyoneRole.id,
      },
    });

    // Update guild member count
    await this.prisma.guild.update({
      where: { id: communityId },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    // Clear related cache
    await this.cacheService.del(`community:${communityId}`);
    await this.cacheService.del(`community:${communityId}:members`);
    await this.cacheService.del(`community:${communityId}:channels`);
    await this.cacheService.del(`user:${userId}:communities`);

    return member;
  }

  async leaveCommunity(communityId: string, userId: string) {
    // Check if user is a member
    const member = await this.prisma.guildMember.findFirst({
      where: {
        guildId: communityId,
        userId,
      },
      include: {
        roles: true,
      },
    });

    if (!member) {
      throw new Error('User is not a member of this community');
    }

    // Remove member roles first
    await this.prisma.guildMemberRole.deleteMany({
      where: {
        memberId: member.id,
      },
    });

    // Remove member
    const result = await this.prisma.guildMember.deleteMany({
      where: {
        guildId: communityId,
        userId,
      },
    });

    // Update guild member count if member was removed
    if (result.count > 0) {
      await this.prisma.guild.update({
        where: { id: communityId },
        data: {
          memberCount: {
            decrement: 1,
          },
        },
      });
    }

    // Clear related cache
    await this.cacheService.del(`community:${communityId}`);
    await this.cacheService.del(`community:${communityId}:members`);
    await this.cacheService.del(`community:${communityId}:channels`);
    await this.cacheService.del(`user:${userId}:communities`);
    await this.cacheService.del(
      `community:${communityId}:user:${userId}:permissions`,
    );

    return result;
  }

  async getCommunityMembers(communityId: string) {
    const cacheKey = `community:${communityId}:members`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const members = await this.prisma.guildMember.findMany({
      where: { guildId: communityId },
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
    });

    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, members, 180);
    return members;
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
    const cacheKey = `communities:search:${query.toLowerCase()}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const communities = await this.prisma.guild.findMany({
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

    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, communities, 180);
    return communities;
  }

  async getMemberPermissions(guildId: string, userId: string) {
    const cacheKey = `community:${guildId}:user:${userId}:permissions`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const member = await this.prisma.guildMember.findFirst({
      where: {
        guildId,
        userId,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!member) {
      return { permissions: [], roles: [] };
    }

    // Calculate combined permissions from all roles (String[] format)
    const combinedPermissions: string[] = [];
    const memberRoles = member.roles.map((r) => r.role);

    for (const role of memberRoles) {
      // Combine permissions arrays
      role.permissions.forEach((permission) => {
        if (!combinedPermissions.includes(permission)) {
          combinedPermissions.push(permission);
        }
      });
    }

    const result = {
      permissions: combinedPermissions,
      roles: memberRoles,
      member,
    };

    // Cache for 2 minutes (short TTL for permissions)
    await this.cacheService.set(cacheKey, result, 120);
    return result;
  }

  async getUserCommunities(userId: string) {
    const cacheKey = `user:${userId}:communities`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const communities = await this.prisma.guild.findMany({
      where: {
        OR: [
          {
            ownerId: userId,
          },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
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

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, communities, 300);
    return communities;
  }
}
