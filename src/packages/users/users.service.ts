import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
        ...dto,
      },
    });
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
      },
    });
  }

  async findById(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
    });
  }
}
