import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private snowFlakeId: SnowflakeID,
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
    // no cache here; auth layer will handle caching
    return updated;
  }

  async findById(userId: string) {
    const key = `user:id:${userId}`;
    // no cache at this layer

    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return user;
  }

  async findByEmail(email: string) {
    const key = `user:email:${email}`;
    // no cache at this layer

    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return user;
  }

  async findByUsername(username: string) {
    const key = `user:username:${username}`;
    // no cache at this layer

    const user = await this.prisma.user.findUnique({
      where: { username, deleted: false } as any,
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
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
    // no cache at this layer
    return updated;
  }

  // Remove sensitive fields before caching
  private sanitizeForCache(user: any) {
    if (!user) return user;
    const { passwordHash, refreshTokenHash, ...safe } = user as any;
    // Optionally remove other heavy or sensitive fields
    return safe;
  }
}
