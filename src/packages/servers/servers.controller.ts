import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { CreateServerRoleDto } from './dto/create-server-role.dto';
import { UpdateServerRoleDto } from './dto/update-server-role.dto';
import { CreateServerInviteDto } from './dto/create-server-invite.dto';
import { JoinServerDto } from './dto/join-server.dto';
import { ServerDiscoveryQueryDto } from './dto/server-discovery.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';

@ApiTags('Servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  // ==================== SERVER CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Tạo server mới' })
  @ApiResponse({ status: 201, description: 'Server đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async createServer(@Request() req: any, @Body() createServerDto: CreateServerDto) {
    return this.serversService.createServer(req.user.id, createServerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách server của user' })
  @ApiResponse({ status: 200, description: 'Danh sách server' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  async findAll(@Request() req: any) {
    return this.serversService.findAll(req.user.id);
  }

  @Get('discover')
  @ApiOperation({ summary: 'Khám phá server công khai' })
  @ApiResponse({ status: 200, description: 'Danh sách server công khai' })
  async discoverServers(@Query() query: ServerDiscoveryQueryDto) {
    return this.serversService.discoverServers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết server' })
  @ApiResponse({ status: 200, description: 'Thông tin server' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.serversService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật server' })
  @ApiResponse({ status: 200, description: 'Server đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền cập nhật' })
  async updateServer(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateServerDto: UpdateServerDto,
  ) {
    return this.serversService.updateServer(id, req.user.id, updateServerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa server' })
  @ApiResponse({ status: 200, description: 'Server đã được xóa' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async deleteServer(@Param('id') id: string, @Request() req: any) {
    return this.serversService.deleteServer(id, req.user.id);
  }

  // ==================== SERVER MEMBERS ====================

  @Get(':id/members')
  @ApiOperation({ summary: 'Lấy danh sách thành viên server' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không phải member của server' })
  async getServerMembers(@Param('id') id: string, @Request() req: any) {
    return this.serversService.getServerMembers(id, req.user.id);
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rời khỏi server' })
  @ApiResponse({ status: 200, description: 'Đã rời server thành công' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 400, description: 'Owner không thể rời server' })
  async leaveServer(@Param('id') id: string, @Request() req: any) {
    return this.serversService.leaveServer(id, req.user.id);
  }

  // ==================== SERVER ROLES ====================

  @Post(':id/roles')
  @ApiOperation({ summary: 'Tạo role mới cho server' })
  @ApiResponse({ status: 201, description: 'Role đã được tạo' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Chỉ owner mới có thể tạo role' })
  async createServerRole(
    @Param('id') id: string,
    @Request() req: any,
    @Body() createServerRoleDto: CreateServerRoleDto,
  ) {
    return this.serversService.createServerRole(id, req.user.id, createServerRoleDto);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Lấy danh sách role của server' })
  @ApiResponse({ status: 200, description: 'Danh sách role' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không phải member của server' })
  async getServerRoles(@Param('id') id: string, @Request() req: any) {
    return this.serversService.getServerRoles(id, req.user.id);
  }

  @Patch(':id/roles/:roleId')
  @ApiOperation({ summary: 'Cập nhật role' })
  @ApiResponse({ status: 200, description: 'Role đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Server hoặc role không tồn tại' })
  @ApiResponse({ status: 403, description: 'Chỉ owner mới có thể cập nhật role' })
  async updateServerRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
    @Body() updateServerRoleDto: UpdateServerRoleDto,
  ) {
    return this.serversService.updateServerRole(id, roleId, req.user.id, updateServerRoleDto);
  }

  @Delete(':id/roles/:roleId')
  @ApiOperation({ summary: 'Xóa role' })
  @ApiResponse({ status: 200, description: 'Role đã được xóa' })
  @ApiResponse({ status: 404, description: 'Server hoặc role không tồn tại' })
  @ApiResponse({ status: 403, description: 'Chỉ owner mới có thể xóa role' })
  async deleteServerRole(
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Request() req: any,
  ) {
    return this.serversService.deleteServerRole(id, roleId, req.user.id);
  }

  // ==================== SERVER INVITES ====================

  @Post(':id/invites')
  @ApiOperation({ summary: 'Tạo invite mới cho server' })
  @ApiResponse({ status: 201, description: 'Invite đã được tạo' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Chỉ owner mới có thể tạo invite' })
  async createServerInvite(
    @Param('id') id: string,
    @Request() req: any,
    @Body() createServerInviteDto: CreateServerInviteDto,
  ) {
    return this.serversService.createServerInvite(id, req.user.id, createServerInviteDto);
  }

  @Get(':id/invites')
  @ApiOperation({ summary: 'Lấy danh sách invite của server' })
  @ApiResponse({ status: 200, description: 'Danh sách invite' })
  @ApiResponse({ status: 404, description: 'Server không tồn tại' })
  @ApiResponse({ status: 403, description: 'Chỉ owner mới có thể xem invites' })
  async getServerInvites(@Param('id') id: string, @Request() req: any) {
    return this.serversService.getServerInvites(id, req.user.id);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join server bằng invite code' })
  @ApiResponse({ status: 200, description: 'Đã join server thành công' })
  @ApiResponse({ status: 404, description: 'Invite không hợp lệ' })
  @ApiResponse({ status: 400, description: 'Invite đã hết hạn hoặc đã sử dụng hết' })
  async joinServerByInvite(@Request() req: any, @Body() joinServerDto: JoinServerDto) {
    return this.serversService.joinServerByInvite(req.user.id, joinServerDto);
  }
}
