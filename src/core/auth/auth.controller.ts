import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CreateUserDto } from 'src/packages/users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './dto/request-with-auth.dto';
import type { Request } from 'express';
import { DeviceUtil } from 'src/utils/device.util';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user account' })
  async register(@Body() dto: CreateUserDto, @Req() req: Request) {
    const deviceInfo = DeviceUtil.extractDeviceInfo(req);
    return this.authService.register(dto, deviceInfo);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const deviceInfo = DeviceUtil.extractDeviceInfo(req);
    return await this.authService.login(dto, deviceInfo);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token bằng refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('/me')
  @ApiOperation({ summary: 'Get current logged in user information' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getUserLogging(@Req() req: AuthenticatedRequest) {
    return this.authService.getUserLogging(req.user.id);
  }

  @Get('/devices')
  @ApiOperation({ summary: 'Get device login history' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getDeviceHistory(@Req() req: AuthenticatedRequest) {
    return this.authService.getDeviceHistory(req.user.id);
  }
}
