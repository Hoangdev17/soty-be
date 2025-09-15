import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SnowflakeID } from 'src/utils/snowflake';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from 'src/packages/users/users.service';
import { CacheService } from 'src/core/cache/cache.service';
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
    private readonly cacheService: CacheService,
  ) {}

  async register(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser)
      throw new ConflictException('Username hoặc email đã được sử dụng');

    const passwordHash = await bcrypt.hash(dto.passwordHash, 10);

    const user = await this.userService.createUser({ ...dto, passwordHash });

    const payload = { sub: user.id, username: user.username };
    const { accessToken, refreshToken } =
      await this.tokenUtil.generateTokens(payload);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefresh },
    });

    const { passwordHash: _, refreshTokenHash: _token, ...safeUser } = user; // loại bỏ passwordHash

    await this.cacheService.cacheUser(safeUser);

    return {
      user: safeUser,
      accessToken,
      refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deleted: false },
    });

    if (!user) {
      throw new BadRequestException('Sai email');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Sai password');
    }

    const payload = { sub: user.id, username: user.username };
    const { accessToken, refreshToken } =
      await this.tokenUtil.generateTokens(payload);

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefresh },
    });

    const { passwordHash: _, refreshTokenHash: _token, ...safeUser } = user;

    await this.cacheService.cacheUser(safeUser);

    return {
      user: safeUser,
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

  async getUserLogging(userId: string) {
    const key = `user:id:${userId}`;
    const cached = await this.cacheService.get(key);
    if (cached) return cached;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const { passwordHash: _, refreshTokenHash: _token, ...safe } = user as any;
    try {
      await this.cacheService.cacheUser(safe);
    } catch (e) {}

    return safe;
  }
}
