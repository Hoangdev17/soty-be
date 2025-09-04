import { ConflictException, Injectable } from '@nestjs/common';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from 'src/packages/users/users.service';
import { CreateUserDto } from 'src/packages/users/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowFlake: SnowflakeID,
    private readonly userService: UsersService,
  ) {}

  async register(dto: CreateUserDto) {
    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }

    this.userService.createUser(dto);
  }
}
