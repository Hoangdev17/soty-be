import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { GuildPermissions } from '../../constants/guild-permissions';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async hasPermission(
    guildId: string,
    userId: string,
    permission: bigint,
  ): Promise<boolean> {
    // Check if user is guild owner
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerId: true },
    });

    if (guild?.ownerId === userId) {
      return true; // Guild owner has all permissions
    }

    // Get user's combined permissions from roles
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
      return false; // User is not a member
    }

    let combinedPermissions = 0n;
    for (const memberRole of member.roles) {
      combinedPermissions |= memberRole.role.permissions;
    }

    return GuildPermissions.hasPermission(combinedPermissions, permission);
  }

  async requirePermission(
    guildId: string,
    userId: string,
    permission: bigint,
    errorMessage?: string,
  ): Promise<void> {
    const hasPermission = await this.hasPermission(guildId, userId, permission);
    if (!hasPermission) {
      throw new Error(
        errorMessage || 'You do not have permission to perform this action',
      );
    }
  }

  async canManageRoles(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, GuildPermissions.MANAGE_ROLES);
  }

  async canKickMembers(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, GuildPermissions.KICK_MEMBERS);
  }

  async canBanMembers(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, GuildPermissions.BAN_MEMBERS);
  }

  async canManageChannels(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(
      guildId,
      userId,
      GuildPermissions.MANAGE_CHANNELS,
    );
  }

  async canManageGuild(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, GuildPermissions.MANAGE_GUILD);
  }

  async isAdministrator(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, GuildPermissions.ADMINISTRATOR);
  }
}
