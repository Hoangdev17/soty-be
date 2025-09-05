import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, BadRequestException, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Đăng ký người dùng mới' })
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.createUser(dto);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getById(@Req() req:AuthenticatedRequest) {
    return await this.usersService.findById(req.user.id);
  }

  @Patch('')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng hiện tại' })
  async update(@Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    return await this.usersService.updateUser(req.user.id, dto);
  }

  @Delete('')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa tài khoản người dùng' })
  async delete(@Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest) {
    return await this.usersService.deleteUser(req.user.id);
  }
}