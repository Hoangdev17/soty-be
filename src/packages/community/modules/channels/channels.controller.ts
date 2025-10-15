import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import {
  RequireAdministrator,
  RequireManageChannels,
} from '../../decorators/permission-shortcuts.decorator';
import { UpdateChannelDto } from './dto/update-channel.dto';
import type { AuthenticatedRequest } from '../../../../core/auth/dto/request-with-auth.dto';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelService: ChannelsService) {}

  @Post(':guildId/categories')
  @ApiOperation({ summary: 'Create a new category in guild' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or category name already exists',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireAdministrator()
  createCategory(
    @Param('guildId') guildId: string,
    @Body() dto: CreateCategoryDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.channelService.createCategory(guildId, dto, req.user.id);
  }

  @Post(':guildId')
  @ApiOperation({ summary: 'Create a new channel in guild' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageChannels()
  createChannel(
    @Param('guildId') guildId: string,
    @Body() dto: CreateChannelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.channelService.createChannel(guildId, dto, req.user.id);
  }

  @Get(':guildId')
  @ApiOperation({ summary: 'Get all channels in guild' })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getChannels(@Param('guildId') guildId: string) {
    return this.channelService.getChannels(guildId);
  }

  @Get(':guildId/:channelId')
  @ApiOperation({ summary: 'Get a channel by ID in guild' })
  @ApiResponse({ status: 200, description: 'Channel retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  getChannelById(
    @Param('guildId') guildId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.channelService.getChannelById(guildId, channelId);
  }

  @Patch(':guildId/:channelId')
  @ApiOperation({ summary: 'Update a channel in guild' })
  @ApiResponse({ status: 200, description: 'Channel updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageChannels()
  updateChannel(
    @Param('guildId') guildId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelService.updateChannel(guildId, channelId, dto);
  }

  @Delete(':guildId/:channelId')
  @ApiOperation({ summary: 'Delete a channel in guild' })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('access-token')
  @RequireManageChannels()
  deleteChannel(
    @Param('guildId') guildId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.channelService.deleteChannel(guildId, channelId);
  }
}
