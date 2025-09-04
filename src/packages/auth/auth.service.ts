import { ConflictException, Injectable } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from 'src/prisma.service';
import { SnowflakeID } from 'src/utils/snowflake';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowFlake: SnowflakeID,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email đã được sử dụng');
    }
  }
}
