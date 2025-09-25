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
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private snowFlakeId: SnowflakeID,
    private cacheService: CacheService,
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
}
