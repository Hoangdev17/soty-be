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
  Req,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { MembersService } from './modules/members/members.service';
import { PermissionsService } from './modules/permissions/permissions.service';
import { ChannelsService } from './modules/channels/channels.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { JoinCommunityDto } from './dto/join-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import {
  RequireManageGuild,
  RequireAdministrator,
} from './decorators/permission-shortcuts.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../core/auth/dto/request-with-auth.dto';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly membersService: MembersService,
    private readonly permissionsService: PermissionsService,
    private readonly channelsService: ChannelsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new community' })
  @ApiResponse({ status: 201, description: 'Community created successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  create(
    @Body() createCommunityDto: CreateCommunityDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communityService.create(createCommunityDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all communities' })
  @ApiResponse({
    status: 200,
    description: 'Communities retrieved successfully',
  })
  findAll() {
    return this.communityService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search communities' })
  @ApiQuery({ name: 'q', description: 'Search query' })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  searchCommunities(@Query('q') query: string) {
    return this.communityService.searchCommunities(query);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get communities where current user is member or owner',
  })
  @ApiResponse({
    status: 200,
    description: 'User communities retrieved successfully',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getUserCommunities(@Req() req: AuthenticatedRequest) {
    return this.communityService.getUserCommunities(req.user.id);
  }

  @Get('owner/:ownerId')
  @ApiOperation({ summary: 'Get communities by owner' })
  @ApiResponse({
    status: 200,
    description: 'Owner communities retrieved successfully',
  })
  getCommunitiesByOwner(@Param('ownerId') ownerId: string) {
    return this.communityService.getCommunitiesByOwner(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a community by ID' })
  @ApiResponse({ status: 200, description: 'Community retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  findOne(@Param('id') id: string) {
    return this.communityService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a community' })
  @ApiResponse({ status: 200, description: 'Community updated successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageGuild()
  update(
    @Param('id') id: string,
    @Body() updateCommunityDto: UpdateCommunityDto,
  ) {
    return this.communityService.update(id, updateCommunityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a community' })
  @ApiResponse({ status: 200, description: 'Community deleted successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireAdministrator()
  remove(@Param('id') id: string) {
    return this.communityService.remove(id);
  }

  @Post(':communityId/join')
  @ApiOperation({ summary: 'Join a community' })
  @ApiResponse({ status: 201, description: 'Joined community successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  joinCommunity(
    @Param('communityId') communityId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.membersService.joinCommunity(communityId, req.user.id);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a community' })
  @ApiResponse({ status: 200, description: 'Left community successfully' })
  @ApiResponse({ status: 404, description: 'Community not found' })
  leaveCommunity(
    @Param('id') communityId: string,
    @Body() joinDto: JoinCommunityDto,
  ) {
    return this.communityService.leaveCommunity(communityId, joinDto.userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get community members' })
  @ApiResponse({
    status: 200,
    description: 'Community members retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Community not found' })
  getCommunityMembers(@Param('id') communityId: string) {
    return this.membersService.getCommunityMembers(communityId);
  }

  @Get(':id/members/:userId/permissions')
  @ApiOperation({ summary: 'Get member permissions in community' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  getMemberPermissions(
    @Param('id') guildId: string,
    @Param('userId') userId: string,
  ) {
    return this.membersService.getMemberPermissions(guildId, userId);
  }
}
