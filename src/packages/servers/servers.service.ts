import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { CreateServerRoleDto } from './dto/create-server-role.dto';
import { UpdateServerRoleDto } from './dto/update-server-role.dto';
import { CreateServerInviteDto } from './dto/create-server-invite.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { ServerDiscoveryQueryDto } from './dto/server-discovery.dto';

@Injectable()
export class ServersService {
  constructor(
    private prisma: PrismaService,
    private snowflakeId: SnowflakeID,
  ) {}

  // ==================== SERVER CRUD ====================

  async createServer(userId: string, dto: CreateServerDto) {
    const server = await this.prisma.server.create({
      data: {
        id: this.snowflakeId.generate(),
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        banner: dto.banner,
        ownerId: userId,
        isPublic: dto.isPublic || false,
        maxMembers: dto.maxMembers || 100000,
        memberCount: 1,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
        roles: true,
        channels: true,
      },
    });

    // Tạo member đầu tiên (owner)
    await this.prisma.serverMember.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId: server.id,
        userId: userId,
      },
    });

    // Tạo role mặc định cho owner
    await this.prisma.serverRole.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId: server.id,
        name: 'Owner',
        color: '#ff0000',
        position: 1000,
        permissions: 0x8, // ADMINISTRATOR permission
        isMentionable: false,
        isHoisted: true,
      },
    });

    // Tạo channel mặc định
    await this.prisma.serverChannel.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId: server.id,
        name: 'general',
        type: 'TEXT',
        position: 0,
      },
    });

    return server;
  }

  async findAll(userId: string) {
    return this.prisma.server.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            members: true,
            channels: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOne(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
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
        roles: {
          orderBy: {
            position: 'desc',
          },
        },
        channels: {
          orderBy: {
            position: 'asc',
          },
        },
        categories: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    // Kiểm tra user có phải member không
    const isMember = server.members.some(member => member.userId === userId);
    if (!isMember && !server.isPublic) {
      throw new ForbiddenException('Bạn không có quyền truy cập server này');
    }

    return server;
  }

  async updateServer(serverId: string, userId: string, dto: UpdateServerDto) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể cập nhật server');
    }

    return this.prisma.server.update({
      where: { id: serverId },
      data: dto,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });
  }

  async deleteServer(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể xóa server');
    }

    await this.prisma.server.delete({
      where: { id: serverId },
    });

    return { message: 'Server đã được xóa thành công' };
  }

  // ==================== SERVER MEMBERS ====================

  async getServerMembers(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    const isMember = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new ForbiddenException('Bạn không phải member của server này');
    }

    return this.prisma.serverMember.findMany({
      where: { serverId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            presence: true,
          },
        },
        roles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  async leaveServer(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId === userId) {
      throw new BadRequestException('Owner không thể rời server, hãy xóa server hoặc chuyển quyền owner');
    }

    await this.prisma.serverMember.delete({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    // Cập nhật member count
    await this.prisma.server.update({
      where: { id: serverId },
      data: {
        memberCount: {
          decrement: 1,
        },
      },
    });

    return { message: 'Đã rời server thành công' };
  }

  // ==================== SERVER ROLES ====================

  async createServerRole(serverId: string, userId: string, dto: CreateServerRoleDto) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể tạo role');
    }

    const role = await this.prisma.serverRole.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId,
        name: dto.name,
        color: dto.color || '#99aab5',
        position: dto.position || 0,
        isMentionable: dto.isMentionable ?? true,
        isHoisted: dto.isHoisted ?? false,
        permissions: dto.permissions || 0,
      },
    });

    return role;
  }

  async getServerRoles(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    const isMember = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new ForbiddenException('Bạn không phải member của server này');
    }

    return this.prisma.serverRole.findMany({
      where: { serverId },
      orderBy: {
        position: 'desc',
      },
    });
  }

  async updateServerRole(serverId: string, roleId: string, userId: string, dto: UpdateServerRoleDto) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể cập nhật role');
    }

    const role = await this.prisma.serverRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== serverId) {
      throw new NotFoundException('Role không tồn tại');
    }

    return this.prisma.serverRole.update({
      where: { id: roleId },
      data: dto,
    });
  }

  async deleteServerRole(serverId: string, roleId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể xóa role');
    }

    const role = await this.prisma.serverRole.findUnique({
      where: { id: roleId },
    });

    if (!role || role.serverId !== serverId) {
      throw new NotFoundException('Role không tồn tại');
    }

    await this.prisma.serverRole.delete({
      where: { id: roleId },
    });

    return { message: 'Role đã được xóa thành công' };
  }

  // ==================== SERVER INVITES ====================

  async createServerInvite(serverId: string, userId: string, dto: CreateServerInviteDto) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể tạo invite');
    }

    const inviteCode = this.generateInviteCode();

    const invite = await this.prisma.serverInvite.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId,
        code: inviteCode,
        inviterId: userId,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return invite;
  }

  async getServerInvites(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new NotFoundException('Server không tồn tại');
    }

    if (server.ownerId !== userId) {
      throw new ForbiddenException('Chỉ owner mới có thể xem invites');
    }

    return this.prisma.serverInvite.findMany({
      where: { serverId },
      include: {
        inviter: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async joinServerByInvite(userId: string, dto: JoinServerDto) {
    const invite = await this.prisma.serverInvite.findUnique({
      where: { code: dto.inviteCode },
      include: {
        server: true,
      },
    });

    if (!invite) {
      throw new NotFoundException('Mã invite không hợp lệ');
    }

    if (!invite.isActive) {
      throw new BadRequestException('Invite đã bị vô hiệu hóa');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite đã hết hạn');
    }

    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new BadRequestException('Invite đã hết lượt sử dụng');
    }

    // Kiểm tra user đã là member chưa
    const existingMember = await this.prisma.serverMember.findUnique({
      where: {
        serverId_userId: {
          serverId: invite.serverId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('Bạn đã là member của server này');
    }

    // Kiểm tra server có đủ chỗ không
    if (invite.server.memberCount >= invite.server.maxMembers) {
      throw new BadRequestException('Server đã đầy');
    }

    // Tạo member mới
    await this.prisma.serverMember.create({
      data: {
        id: this.snowflakeId.generate(),
        serverId: invite.serverId,
        userId,
      },
    });

    // Cập nhật member count
    await this.prisma.server.update({
      where: { id: invite.serverId },
      data: {
        memberCount: {
          increment: 1,
        },
      },
    });

    // Cập nhật invite usage
    await this.prisma.serverInvite.update({
      where: { id: invite.id },
      data: {
        uses: {
          increment: 1,
        },
      },
    });

    return { message: 'Đã join server thành công' };
  }

  // ==================== SERVER DISCOVERY ====================

  async discoverServers(query: ServerDiscoveryQueryDto) {
    const { search, page = 1, limit = 20, sortBy = 'memberCount', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where = {
      isPublic: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [servers, total] = await Promise.all([
      this.prisma.server.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              members: true,
              channels: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip,
        take: limit,
      }),
      this.prisma.server.count({ where }),
    ]);

    return {
      servers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== HELPER METHODS ====================

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
