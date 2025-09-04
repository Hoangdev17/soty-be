import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private snowFlakeId: SnowflakeID,
  ) {}

  async createUser(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        id: this.snowFlakeId.generate(),
        username: dto.username,
        email: dto.email,
        passwordHash: dto.passwordHash,
      },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
    });
  }
}
