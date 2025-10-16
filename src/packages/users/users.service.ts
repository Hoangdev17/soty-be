import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { CacheService } from 'src/core/cache/cache.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { WEBSOCKET_EVENTS } from '../websocket/websocket-events.types';
import { Presence, PresenceStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private snowFlakeId: SnowflakeID,
    private cacheService: CacheService,
    private ws: WebsocketGateway,
  ) {}

  async createUser(dto: CreateUserDto) {
    // Kiểm tra xem username hoặc email đã tồn tại chưa
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });
    if (existingUser) {
      throw new BadRequestException('Username hoặc email đã tồn tại');
    }

    const user = await this.prisma.user.create({
      data: {
        id: this.snowFlakeId.generate(),
        ...dto,
        passwordHash: dto.passwordHash,
      },
    });

    // Cache the new user
    await this.cacheService.cacheUser(this.sanitizeForCache(user));

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    // Kiểm tra người dùng tồn tại
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });

    // Clear user cache and re-cache with updated data
    await this.cacheService.uncacheUser(userId, user.email, user.username);
    await this.cacheService.cacheUser(this.sanitizeForCache(updated));
    await this.cacheService.del(`user_profile_${userId}`);

    return updated;
  }

  async findById(userId: string) {
    const cacheKey = `user:id:${userId}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Cache the user
    await this.cacheService.cacheUser(this.sanitizeForCache(user));
    return user;
  }

  async findByEmail(email: string) {
    // Note: We only cache by ID, so we need to fetch from DB first
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Cache the user by ID for future lookups
    await this.cacheService.cacheUser(this.sanitizeForCache(user));
    return user;
  }

  async findByUsername(username: string) {
    // Note: We only cache by ID, so we need to fetch from DB first
    const user = await this.prisma.user.findUnique({
      where: { username, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Cache the user by ID for future lookups
    await this.cacheService.cacheUser(this.sanitizeForCache(user));
    return user;
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });

    if (!user) {
      throw new NotFoundException(
        'Người dùng không tồn tại hoặc đã bị vô hiệu hóa',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    // Clear user cache when deleted
    await this.cacheService.uncacheUser(userId, user.email, user.username);

    return updated;
  }

  // Remove sensitive fields before caching
  private sanitizeForCache(user: any) {
    if (!user) return user;
    const { passwordHash, refreshTokenHash, ...safe } = user as any;
    // Optionally remove other heavy or sensitive fields
    return safe;
  }

  async fetchUserGems(userId: string) {
    const userNitro = await this.prisma.userNitro.findUnique({
      where: { userId },
    });
    return userNitro?.balance || 0;
  }

  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException(
        'Không thể gửi yêu cầu kết bạn cho chính mình',
      );
    }

    // Kiểm tra xem người nhận có tồn tại không
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId, deleted: false } as any,
    });
    if (!receiver) {
      throw new NotFoundException('Người dùng nhận không tồn tại');
    }

    // Kiểm tra xem đã có yêu cầu kết bạn đang chờ xử lý hay chưa
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        senderId,
        receiverId,
        status: 'PENDING',
      },
    });
    if (existingRequest) {
      throw new BadRequestException('Đã có yêu cầu kết bạn đang chờ xử lý');
    }

    // Kiểm tra xem hai người đã là bạn bè chưa
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: senderId, friendId: receiverId },
          { userId: receiverId, friendId: senderId },
        ],
      },
    });
    if (existingFriendship) {
      throw new BadRequestException('Hai người đã là bạn bè');
    }

    // Tạo yêu cầu kết bạn mới
    const friendRequest = await this.prisma.friendRequest.create({
      data: {
        id: this.snowFlakeId.generate(),
        senderId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    this.ws.emitToUser(
      receiverId,
      WEBSOCKET_EVENTS.SEND_FRIEND_REQUEST,
      friendRequest,
    );

    return friendRequest;
  }

  async getUserFriendRequests(userId: string) {
    return await this.prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: true },
    });
  }

  async getFriendRequestSent(userId: string) {
    return await this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: {
        receiver: {
          select: {
            id: true,
            avatar: true,
            username: true,
          },
        },
      },
    });
  }

  async acceptFriendRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Yêu cầu kết bạn không tồn tại');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu kết bạn đã được xử lý');
    }

    // Cập nhật trạng thái yêu cầu thành accepted
    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    // Tạo bản ghi Friendship cho cả hai người
    await this.prisma.friendship.createMany({
      data: [
        {
          id: this.snowFlakeId.generate(),
          userId: request.senderId,
          friendId: request.receiverId,
        },

        {
          id: this.snowFlakeId.generate(),
          userId: request.receiverId,
          friendId: request.senderId,
        },
      ],
    });

    return { message: 'Kết bạn thành công' };
  }

  async rejectFriendRequest(requestId: string, userId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.receiverId !== userId) {
      throw new NotFoundException('Yêu cầu kết bạn không tồn tại');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Yêu cầu kết bạn đã được xử lý');
    }

    // Cập nhật trạng thái yêu cầu thành rejected
    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    return { message: 'Đã từ chối yêu cầu kết bạn' };
  }

  async deleteFriendRequest(requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException('Yêu cầu kết bạn không tồn tại');
    }

    await this.prisma.friendRequest.delete({
      where: { id: requestId },
    });

    return { message: 'Đã xóa yêu cầu kết bạn' };
  }

  async deleteFriendship(userId: string, friendId: string) {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    if (!friendship) {
      throw new NotFoundException('Bạn bè không tồn tại');
    }

    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return { message: 'Đã xóa bạn bè' };
  }

  async getUserFriendList(userId: string) {
    return await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: true,
      },
    });
  }

  async changePresence(userId: string, status: PresenceStatus) {
    await this.cacheService.del(`user:id:${userId}`);
    // Lấy user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not exist');

    // Xây dựng object presence mới
    const newPresence = {
      status,
      customText: user.presence?.customText ?? null,
      activities: user.presence?.activities ?? [],
      lastUpdated: new Date(),
    };

    // Update user.presence
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { presence: newPresence },
    });

    // await this.cacheService.cacheUser(updatedUser);

    return updatedUser.presence;
  }
}
