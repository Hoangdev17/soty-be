import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  GuildPermissions,
  PERMISSION_VALUES,
} from '../../constants/guild-permissions';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async hasPermission(
    guildId: string,
    userId: string,
    permission: bigint | string, // có thể truyền bigint hoặc string
  ): Promise<boolean> {
    // Guild owner có tất cả quyền
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { ownerId: true },
    });

    if (guild?.ownerId === userId) {
      return true;
    }

    // Lấy member kèm roles
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
      return false; // User không phải thành viên
    }

    // Combine tất cả permissions của các role thành 1 bigint
    let combinedPermissions = 0n;
    for (const memberRole of member.roles) {
      combinedPermissions |= memberRole.role.permissions; // role.permissions là bigint
    }

    // Nếu truyền string, convert sang bigint
    let permissionValue: bigint;
    if (typeof permission === 'string') {
      permissionValue = PERMISSION_VALUES[permission];
      if (!permissionValue) {
        return false; // permission không hợp lệ
      }
    } else {
      permissionValue = permission;
    }

    // Check quyền bằng bitwise
    return GuildPermissions.hasPermission(combinedPermissions, permissionValue);
  }

  async requirePermission(
    guildId: string,
    userId: string,
    permission: string,
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
    return this.hasPermission(guildId, userId, 'MANAGE_ROLES');
  }

  async canKickMembers(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, 'KICK_MEMBERS');
  }

  async canBanMembers(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, 'BAN_MEMBERS');
  }

  async canManageChannels(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, 'MANAGE_CHANNELS');
  }

  async canManageGuild(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, 'MANAGE_GUILD');
  }

  async isAdministrator(guildId: string, userId: string): Promise<boolean> {
    return this.hasPermission(guildId, userId, 'ADMINISTRATOR');
  }
}
