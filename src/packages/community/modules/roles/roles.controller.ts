import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
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
import { UpdateRolePositionsDto } from './dto/update-role-positions.dto';

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

  @Get('members')
  @ApiOperation({ summary: 'Get members with specific role' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Guild not found' })
  getMembersWithRole(
    @Param('guildId') guildId: string,
    @Query('roleId') roleId?: string,
    @Query('roleName') roleName?: string,
  ) {
    return this.rolesService.getMembersWithRole(guildId, roleId, roleName);
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

  @Patch('positions/update')
  @ApiOperation({ summary: 'Update positions of multiple roles in guild' })
  @ApiResponse({
    status: 200,
    description: 'Role positions updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @RequireManageRoles()
  updateRolePositions(
    @Param('guildId') guildId: string,
    @Body() updateRolePositionsDto: UpdateRolePositionsDto,
  ) {
    return this.rolesService.updateRolePositions(
      guildId,
      updateRolePositionsDto.roles,
    );
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a role to a member' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role or member not found' })
  @ApiResponse({ status: 400, description: 'Member already has this role' })
  @RequireManageRoles()
  assignRole(
    @Param('guildId') guildId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.rolesService.assignRoleToMember(
      guildId,
      assignRoleDto.memberId,
      assignRoleDto.roleId,
    );
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove a role from a member' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Role or member not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove @everyone role' })
  @RequireManageRoles()
  removeRole(
    @Param('guildId') guildId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.rolesService.removeRoleFromMember(
      guildId,
      assignRoleDto.memberId,
      assignRoleDto.roleId,
    );
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Clear roles cache for a guild' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  @RequireManageRoles()
  clearRolesCache(@Param('guildId') guildId: string) {
    console.log('🗑️ clearRolesCache called for guild:', guildId);
    return this.rolesService.clearRolesCache(guildId);
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
  @ApiResponse({ status: 400, description: 'Cannot delete @everyone role' })
  @RequireManageRoles()
  deleteRole(@Param('roleId') roleId: string) {
    console.log('🗑️ deleteRole controller called:', { roleId });
    return this.rolesService.deleteRole(roleId);
  }
}
