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
import { CreateFeedPostDto } from './dto/create-post.dto';
import { UpdateFeedPostDto } from './dto/update-post.dto';
import { ProjectManagement } from './modules/project_management/pm.service';
import { CreateProjectDto } from './modules/project_management/dto/create-project.dto';
import { UpdateProjectDto } from './modules/project_management/dto/update-project.dto';
import { CreateTaskDto } from './modules/project_management/dto/create-task.dto';
import { UpdateTaskDto } from './modules/project_management/dto/update-task.dto';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(
    private readonly communityService: CommunityService,
    private readonly membersService: MembersService,
    private readonly pmService: ProjectManagement,
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
  @ApiOperation({
    summary: 'Join a community or submit join request for private communities',
  })
  @ApiResponse({
    status: 201,
    description: 'Joined community or request submitted successfully',
  })
  @ApiResponse({ status: 404, description: 'Community not found' })
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  joinCommunity(
    @Param('communityId') communityId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communityService.joinCommunity(communityId, req.user.id);
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

  @Get(':id/join-requests')
  @ApiOperation({
    summary: 'Get pending join requests for a community (owner/admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Join requests retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getJoinRequests(
    @Param('id') communityId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communityService.getJoinRequests(communityId, req.user.id);
  }

  @Post(':id/join-requests/:requestId/approve')
  @ApiOperation({ summary: 'Approve a join request (owner/admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Join request approved successfully',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  approveJoinRequest(
    @Param('id') communityId: string,
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communityService.approveJoinRequest(
      communityId,
      requestId,
      req.user.id,
    );
  }

  @Post(':id/join-requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject a join request (owner/admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Join request rejected successfully',
  })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  rejectJoinRequest(
    @Param('id') communityId: string,
    @Param('requestId') requestId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.communityService.rejectJoinRequest(
      communityId,
      requestId,
      req.user.id,
    );
  }

  @Get('/feed/:guildId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get post in community' })
  async getPostByCommunity(@Param('guildId') guildId: string) {
    return await this.communityService.getPostCommunity(guildId);
  }

  @Get('/feed/:guildId/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get post in community' })
  async getPostById(@Param('postId') postId: string) {
    return await this.communityService.getPostById(postId);
  }

  @Post('/feed/:guildId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create new post' })
  async createPost(
    @Body() dto: CreateFeedPostDto,
    @Req() req: AuthenticatedRequest,
    @Param('guildId') guildId: string,
  ) {
    return await this.communityService.createPost(dto, req.user.id, guildId);
  }

  @Delete('/feed/:guildId/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'delete a post' })
  async deletePost(@Param('postId') postId: string) {
    return await this.communityService.deletePost(postId);
  }

  @Patch('/feed/:guildId/:postId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'update post in community' })
  async updatePost(
    @Param('postId') postId: string,
    @Body() dto: UpdateFeedPostDto,
  ) {
    await this.communityService.updatePost(dto, postId);
  }

  @Post('/feed/:guildId/:postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'like post in community' })
  async likePost(
    @Param('postId') postId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.communityService.likePost(postId, req.user.id);
  }

  @Delete('/feed/:guildId/:postId/unlike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'like post in community' })
  async unlikePost(
    @Param('guildId') guildId: string,
    @Param('postId') postId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.communityService.unlikePost(guildId, postId, req.user.id);
  }

  @Get('/feed/:guildId/:postId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get user like post in community' })
  async getUserLikedPost(@Param('postId') postId: string) {
    return await this.communityService.getUserLiked(postId);
  }

  @Get('/feed/:guildId/:postId/comment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get comment post in community' })
  async getCommentByPost(@Param('postId') postId: string) {
    return await this.communityService.getCommentByPost(postId);
  }

  @Post('/feed/:guildId/:postId/comment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get comment post in community' })
  async createComment(
    @Param('guildId') guildId: string,
    @Param('postId') postId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { content: string },
  ) {
    return await this.communityService.createComment(
      guildId,
      postId,
      req.user.id,
      body.content,
    );
  }

  @Delete('/feed/:guildId/:postId/comment/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get comment post in community' })
  async deleteComment(@Param('commentId') commentId: string) {
    return await this.communityService.deleteComment(commentId);
  }

  @Patch('/feed/:guildId/:postId/comment/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get comment post in community' })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() content: string,
  ) {
    return await this.communityService.updateComment(commentId, content);
  }

  @Get('/:guildId/projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get project in community' })
  async getProjectInCommunity(@Param('guildId') guildId: string) {
    return await this.pmService.getProjectListInCommunity(guildId);
  }

  @Post('/:guildId/projects')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'create project in community' })
  async createProjectInCommunity(
    @Param('guildId') guildId: string,
    @Body() dto: CreateProjectDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.pmService.createProject(dto, guildId, req.user.id);
  }

  @Get('/:guildId/projects/:projecId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'get project by id' })
  async getProjectById(@Param('projecId') projecId: string) {
    return await this.pmService.getProjectById(projecId);
  }

  @Patch('/:guildId/projects/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'update project in community' })
  async updateProhject(
    @Body() dto: UpdateProjectDto,
    @Param('projectId') projectId: string,
  ) {
    return await this.pmService.updateProject(dto, projectId);
  }

  @Delete('/:guildId/projects/:projectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'delete project in community' })
  async deleteProhject(@Param('projectId') projectId: string) {
    return await this.pmService.deleteProject(projectId);
  }

  @Post('/:guildId/projects/:projectId/tasks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'create task' })
  async createTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return await this.pmService.createTask(projectId, dto);
  }

  @Patch('/:guildId/projects/:projectId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'update task' })
  async upadteTask(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateTaskDto,
    @Param('taskId') taskId: string,
  ) {
    return await this.pmService.updateTask(projectId, dto, taskId);
  }

  @Get('/:guildId/projects/:projectId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'update task' })
  async getTaskById(@Param('taskId') taskId: string) {
    return await this.pmService.getTaskById(taskId);
  }

  @Delete('/:guildId/projects/:projectId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'update task' })
  async deleteTask(@Param('taskId') taskId: string) {
    return await this.pmService.deleteTask(taskId);
  }
}
