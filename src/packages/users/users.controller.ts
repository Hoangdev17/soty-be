import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Req,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
  async getById(@Req() req: AuthenticatedRequest) {
    return await this.usersService.findById(req.user.id);
  }

  @Get('/findById')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'lấy thông tin user theo id' })
  async findOne(@Query('userId') userId: string) {
    return await this.usersService.findById(userId);
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

  @Get('gems')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy số dư gems của người dùng hiện tại' })
  async getGems(@Req() req: AuthenticatedRequest) {
    const gems = await this.usersService.fetchUserGems(req.user.id);
    return { gems };
  }

  @Get('/friends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách bnaj bè' })
  async getUserFriendList(@Req() req: AuthenticatedRequest) {
    return await this.usersService.getUserFriendList(req.user.id);
  }

  @Post('/friends/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi yêu cầu kết bạn' })
  async sendFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Body('receiverId') receiverId: string,
  ) {
    return await this.usersService.sendFriendRequest(req.user.id, receiverId);
  }

  @Get('/friends/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu kết bạn' })
  async getReceivedFriendRequests(@Req() req: AuthenticatedRequest) {
    return await this.usersService.getUserFriendRequests(req.user.id);
  }

  @Get('/friends/requests/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'lấy danh sách đã gửi' })
  async getSentRequest(@Req() req: AuthenticatedRequest) {
    return await this.usersService.getFriendRequestSent(req.user.id);
  }

  @Patch('/friends/request/:requestId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chấp nhận yêu cầu kết bạn' })
  async acceptFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return await this.usersService.acceptFriendRequest(requestId, req.user.id);
  }

  @Patch('/friends/request/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Từ chối yêu cầu kết bạn' })
  async rejectFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return await this.usersService.rejectFriendRequest(requestId, req.user.id);
  }

  @Delete('/friends/request/:requestId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hủy yêu cầu kết bạn đã gửi' })
  async deleteFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId') requestId: string,
  ) {
    return await this.usersService.deleteFriendRequest(requestId);
  }

  @Delete('/friends/:friendId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa bạn bè' })
  async deleteFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendId') friendId: string,
  ) {
    return await this.usersService.deleteFriendship(req.user.id, friendId);
  }
}
