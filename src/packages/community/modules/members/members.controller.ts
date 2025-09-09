import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import {
  RequireKickMembers,
  RequireBanMembers,
} from '../../decorators/permission-shortcuts.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Community Members')
@Controller('community/:guildId/members')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all members of a community' })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  getCommunityMembers(@Param('guildId') guildId: string) {
    return this.membersService.getCommunityMembers(guildId);
  }

  @Delete(':memberId/kick')
  @ApiOperation({ summary: 'Kick a member from community' })
  @ApiResponse({ status: 200, description: 'Member kicked successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @RequireKickMembers()
  kickMember(
    @Param('guildId') guildId: string,
    @Param('memberId') memberId: string,
    @Body() body: { executorId: string },
  ) {
    return this.membersService.kickMember(guildId, memberId);
  }

  @Delete(':memberId/ban')
  @ApiOperation({ summary: 'Ban a member from community' })
  @ApiResponse({ status: 200, description: 'Member banned successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @RequireBanMembers()
  banMember(
    @Param('guildId') guildId: string,
    @Param('memberId') memberId: string,
    @Body() body: { executorId: string },
  ) {
    return this.membersService.banMember(guildId, memberId);
  }

  @Get(':userId/permissions')
  @ApiOperation({ summary: 'Get member permissions in community' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  getMemberPermissions(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.getMemberPermissions(guildId, userId);
  }
}
