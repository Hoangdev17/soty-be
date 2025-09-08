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

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(dto.passwordHash, 10);

    return this.prisma.user.create({
      data: {
        id: this.snowFlakeId.generate(),
        ...dto,
        passwordHash: hashedPassword, // Ghi đè passwordHash bằng mật khẩu đã hash
      },
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    // Kiểm tra người dùng tồn tại
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
    });
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email, deleted: false },
    });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username, deleted: false },
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

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
