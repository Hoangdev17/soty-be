import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { GuildPermissions } from '../../constants/guild-permissions';

@Injectable()
export class MembersService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

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
        permissions: [GuildPermissions.DEFAULT_EVERYONE_PERMISSIONS.toString()],
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

    return result;
  }

  async getCommunityMembers(communityId: string) {
    return this.prisma.guildMember.findMany({
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
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async getMemberPermissions(guildId: string, userId: string) {
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
      return { permissions: 0n, roles: [] };
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

    return {
      permissions: combinedPermissions,
      roles: memberRoles,
      member,
    };
  }

  async kickMember(guildId: string, memberId: string) {
    // Get member to be kicked
    const member = await this.prisma.guildMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Remove member roles first
    await this.prisma.guildMemberRole.deleteMany({
      where: {
        memberId: memberId,
      },
    });

    // Remove member
    const result = await this.prisma.guildMember.delete({
      where: { id: memberId },
    });

    // Update guild member count
    await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return result;
  }

  async banMember(guildId: string, memberId: string) {
    // Get member to be banned
    const member = await this.prisma.guildMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Remove member roles first
    await this.prisma.guildMemberRole.deleteMany({
      where: {
        memberId: memberId,
      },
    });

    // Remove member
    const result = await this.prisma.guildMember.delete({
      where: { id: memberId },
    });

    // Update guild member count
    await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return result;
  }
}
