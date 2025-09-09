import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import {
  RequireManageRoles,
  RequireAdministrator,
} from '../../decorators/permission-shortcuts.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Guild Roles')
@Controller('community/:guildId/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles in a guild' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  getGuildRoles(@Param('guildId') guildId: string) {
    return this.rolesService.getGuildRoles(guildId);
  }

  @Get(':roleId')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  getRoleById(@Param('roleId') roleId: string) {
    return this.rolesService.getRoleById(roleId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role in guild' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @RequireManageRoles()
  createRole(
    @Param('guildId') guildId: string,
    @Body() createRoleDto: CreateRoleDto,
  ) {
    return this.rolesService.createRole(guildId, createRoleDto);
  }

  @Patch(':roleId')
  @ApiOperation({ summary: 'Update a role in guild' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireManageRoles()
  updateRole(
    @Param('roleId') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(roleId, updateRoleDto);
  }

  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete a role from guild' })
  @ApiResponse({ status: 200, description: 'Role deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  @RequireAdministrator()
  deleteRole(@Param('roleId') roleId: string) {
    return this.rolesService.deleteRole(roleId);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign role to member' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member or role not found' })
  @RequireManageRoles()
  assignRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.assignRoleToMember(
      assignRoleDto.memberId,
      assignRoleDto.roleId,
    );
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove role from member' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member or role not found' })
  @RequireManageRoles()
  removeRole(@Body() assignRoleDto: AssignRoleDto) {
    return this.rolesService.removeRoleFromMember(
      assignRoleDto.memberId,
      assignRoleDto.roleId,
    );
  }
}
