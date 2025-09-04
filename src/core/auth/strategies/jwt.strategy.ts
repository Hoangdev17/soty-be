// src/core/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/packages/users/users.service';
import { JWTPayload } from '../dto/jwt.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('AUTH_JWT_SECRET'),
    });
  }

  async validate(payload: JWTPayload) {
    try {
      const { sub: userId, deviceId } = payload;

      // Retrieve user from cache or database
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Return user context for request
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        deviceId,
      };
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
