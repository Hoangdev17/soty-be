import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string; // userId
  username: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenUtil {
  constructor(private readonly jwtService: JwtService) {}

  async generateTokens(payload: TokenPayload): Promise<Tokens> {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return { accessToken, refreshToken };
  }

  // 🔹 Giải mã token (decode, không verify signature)
  decodeToken<T = any>(token: string): T | null {
    return this.jwtService.decode(token);
  }

  // 🔹 Verify token (kiểm tra chữ ký + hạn)
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Access token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }
}
