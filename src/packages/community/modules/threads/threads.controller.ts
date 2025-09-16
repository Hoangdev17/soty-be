import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequireManageThreads } from '../../decorators/permission-shortcuts.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';

@ApiTags('Threads')
@Controller('channels/:channelId/threads')
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new thread in channel' })
  @ApiResponse({ status: 201, description: 'Thread created successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  createThread(
    @Param('channelId') channelId: string,
    @Body() createThreadDto: CreateThreadDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.threadsService.createThread(
      channelId,
      createThreadDto,
      req.user.id,
    );
  }

  @Get(':threadId')
  @ApiOperation({ summary: 'Get thread by ID' })
  @ApiResponse({ status: 200, description: 'Thread retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getThread(
    @Param('channelId') channelId: string,
    @Param('threadId') threadId: string,
  ) {
    return this.threadsService.getThreadById(channelId, threadId);
  }

  @Get('/list/all')
  @ApiOperation({ summary: 'Get all threads in channel' })
  @ApiResponse({ status: 200, description: 'Threads retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  async getThreads(@Param('channelId') channelId: string) {
    return this.threadsService.getThreads(channelId);
  }

  @Put(':threadId')
  @ApiOperation({ summary: 'Update thread' })
  @ApiResponse({ status: 200, description: 'Thread updated successfully' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageThreads()
  updateThread(
    @Param('threadId') threadId: string,
    @Body() updateData: Partial<CreateThreadDto>,
  ) {
    return this.threadsService.updateThread(threadId, updateData);
  }

  @Delete(':threadId')
  @ApiOperation({ summary: 'Delete thread' })
  @ApiResponse({ status: 200, description: 'Thread deleted successfully' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageThreads()
  deleteThread(@Param('threadId') threadId: string) {
    return this.threadsService.deleteThread(threadId);
  }

  @Post(':threadId/join')
  @ApiOperation({ summary: 'Join thread' })
  @ApiResponse({ status: 200, description: 'Joined thread successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  joinThread(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.threadsService.joinThread(threadId, req.user.id);
  }

  @Post(':threadId/leave')
  @ApiOperation({ summary: 'Leave thread' })
  @ApiResponse({ status: 200, description: 'Left thread successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  leaveThread(
    @Param('threadId') threadId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.threadsService.leaveThread(threadId, req.user.id);
  }
}
