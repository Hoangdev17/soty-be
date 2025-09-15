import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CacheService } from '../../../../core/cache/cache.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
    private cacheService: CacheService,
  ) {}

  async createRole(guildId: string, createRoleDto: CreateRoleDto) {
    // Get highest position to set new role at top
    const highestRole = await this.prisma.guildRole.findFirst({
      where: { guildId },
      orderBy: { position: 'desc' },
    });

    const newPosition = (highestRole?.position || 0) + 1;

    const role = await this.prisma.guildRole.create({
      data: {
        id: this.snowflake.generate(),
        name: createRoleDto.name,
        guildId,
        permissions: createRoleDto.permissions,
        color: createRoleDto.color,
        hoist: createRoleDto.hoist,
        mentionable: createRoleDto.mentionable,
        position: newPosition,
      },
    });

    // Clear related cache
    await this.cacheService.del(`roles:guild:${guildId}`);

    return role;
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto) {
    const updates: any = {};

    if (updateRoleDto.name) updates.name = updateRoleDto.name;
    if (updateRoleDto.permissions)
      updates.permissions = updateRoleDto.permissions;
    if (updateRoleDto.color !== undefined) updates.color = updateRoleDto.color;
    if (updateRoleDto.hoist !== undefined) updates.hoist = updateRoleDto.hoist;
    if (updateRoleDto.mentionable !== undefined)
      updates.mentionable = updateRoleDto.mentionable;

    const role = await this.prisma.guildRole.update({
      where: { id: roleId },
      data: updates,
    });

    // Clear related cache
    await this.cacheService.del(`role:${roleId}`);
    await this.cacheService.del(`roles:guild:${role.guildId}`);

    return role;
  }

  async deleteRole(roleId: string) {
    // Don't allow deleting @everyone role
    const role = await this.prisma.guildRole.findUnique({
      where: { id: roleId },
    });

    if (role?.name === '@everyone') {
      throw new Error('Cannot delete @everyone role');
    }

    // Remove role from all members first
    await this.prisma.guildMemberRole.deleteMany({
      where: { roleId },
    });

    // Delete the role
    const deletedRole = await this.prisma.guildRole.delete({
      where: { id: roleId },
    });

    // Clear related cache
    await this.cacheService.del(`role:${roleId}`);
    if (role) {
      await this.cacheService.del(`roles:guild:${role.guildId}`);
    }

    return deletedRole;
  }

  async getGuildRoles(guildId: string) {
    const cacheKey = `roles:guild:${guildId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const roles = await this.prisma.guildRole.findMany({
      where: { guildId },
      orderBy: { position: 'desc' },
      include: {
        members: {
          include: {
            member: {
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
          },
        },
      },
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, roles, 300);
    return roles;
  }

  async assignRoleToMember(memberId: string, roleId: string) {
    // Check if member already has this role
    const existingAssignment = await this.prisma.guildMemberRole.findFirst({
      where: {
        memberId,
        roleId,
      },
    });

    if (existingAssignment) {
      throw new Error('Member already has this role');
    }

    const assignment = await this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId,
        roleId,
      },
    });

    // Clear permission cache for this member
    const member = await this.prisma.guildMember.findUnique({
      where: { id: memberId },
    });
    if (member) {
      await this.cacheService.del(
        `community:${member.guildId}:user:${member.userId}:permissions`,
      );
    }

    return assignment;
  }

  async removeRoleFromMember(memberId: string, roleId: string) {
    // Don't allow removing @everyone role
    const role = await this.prisma.guildRole.findUnique({
      where: { id: roleId },
    });

    if (role?.name === '@everyone') {
      throw new Error('Cannot remove @everyone role from member');
    }

    const result = await this.prisma.guildMemberRole.deleteMany({
      where: {
        memberId,
        roleId,
      },
    });

    // Clear permission cache for this member
    const member = await this.prisma.guildMember.findUnique({
      where: { id: memberId },
    });
    if (member) {
      await this.cacheService.del(
        `community:${member.guildId}:user:${member.userId}:permissions`,
      );
    }

    return result;
  }

  async getRoleById(roleId: string) {
    const cacheKey = `role:${roleId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const role = await this.prisma.guildRole.findUnique({
      where: { id: roleId },
      include: {
        members: {
          include: {
            member: {
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
          },
        },
      },
    });

    if (role) {
      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, role, 300);
    }

    return role;
  }

  async getMemberRoles(guildId: string, userId: string) {
    const cacheKey = `member:${guildId}:${userId}:roles`;

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

    const roles = member?.roles.map((r) => r.role) || [];

    // Cache for 3 minutes
    await this.cacheService.set(cacheKey, roles, 180);
    return roles;
  }
}
