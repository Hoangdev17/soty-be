import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from 'src/packages/users/users.service';
import { CreateUserDto } from 'src/packages/users/dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { TokenUtil } from 'src/utils/token.util';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UsersService,
    private readonly tokenUtil: TokenUtil,
  ) {}

  async register(dto: CreateUserDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check tồn tại
      const existingUser = await tx.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUser) {
        throw new ConflictException('Username hoặc email đã được sử dụng');
      }

      // 2. Hash password
      const passwordHash = await bcrypt.hash(dto.passwordHash, 10);

      // 3. Tạo user
      const user = await this.userService.createUser({ ...dto, passwordHash });

      // 4. Tạo tokens
      const payload = { sub: user.id, username: user.username };
      const { accessToken, refreshToken } =
        await this.tokenUtil.generateTokens(payload);

      // 5. Hash & lưu refreshToken
      const hashedRefresh = await bcrypt.hash(refreshToken, 10);
      await tx.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hashedRefresh },
      });

      // 6. Return
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        accessToken,
        refreshToken,
      };
    });
  }

  async login(dto: LoginDto) {
    // 1. Tìm user theo username
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Sai username hoặc password');
    }

    // 2. So sánh password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Sai username hoặc password');
    }

    // 3. Sinh tokens
    const payload = { sub: user.id, username: user.username };
    const { accessToken, refreshToken } =
      await this.tokenUtil.generateTokens(payload);

    // 4. Hash refreshToken & lưu lại
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefresh },
    });

    // 5. Return
    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    // 1. Verify & decode refreshToken
    let payload: { sub: string; username: string };
    try {
      payload = await this.tokenUtil.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    // 2. Transaction đảm bảo consistency
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: payload.sub } });

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException(
          'Không tìm thấy user hoặc refresh token không hợp lệ',
        );
      }

      // 3. So khớp refreshToken cũ trong DB
      const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isValid) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      // 4. Tạo token mới
      const { accessToken, refreshToken: newRefreshToken } =
        await this.tokenUtil.generateTokens({
          sub: user.id,
          username: user.username,
        });

      // 5. Hash & lưu refreshToken mới vào DB
      const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
      await tx.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hashedRefresh },
      });

      // 6. Trả về client
      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  }
}
