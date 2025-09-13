import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { SnowflakeID } from '../../../../utils/snowflake';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private prisma: PrismaService,
    private snowflake: SnowflakeID,
  ) {}

  async createRole(guildId: string, createRoleDto: CreateRoleDto) {
    // Get highest position to set new role at top
    const highestRole = await this.prisma.guildRole.findFirst({
      where: { guildId },
      orderBy: { position: 'desc' },
    });

    const newPosition = (highestRole?.position || 0) + 1;

    return this.prisma.guildRole.create({
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

    return this.prisma.guildRole.update({
      where: { id: roleId },
      data: updates,
    });
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
    return this.prisma.guildRole.delete({
      where: { id: roleId },
    });
  }

  async getGuildRoles(guildId: string) {
    return this.prisma.guildRole.findMany({
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

    return this.prisma.guildMemberRole.create({
      data: {
        id: this.snowflake.generate(),
        memberId,
        roleId,
      },
    });
  }

  async removeRoleFromMember(memberId: string, roleId: string) {
    // Don't allow removing @everyone role
    const role = await this.prisma.guildRole.findUnique({
      where: { id: roleId },
    });

    if (role?.name === '@everyone') {
      throw new Error('Cannot remove @everyone role from member');
    }

    return this.prisma.guildMemberRole.deleteMany({
      where: {
        memberId,
        roleId,
      },
    });
  }

  async getRoleById(roleId: string) {
    return this.prisma.guildRole.findUnique({
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
  }

  async getMemberRoles(guildId: string, userId: string) {
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

    return member?.roles.map((r) => r.role) || [];
  }
}
