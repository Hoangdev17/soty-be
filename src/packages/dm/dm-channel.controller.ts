import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { DmChannelService } from './dm-channel.service';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('dm')
@Controller('dm')
export class DmChannelController {
  constructor(private readonly dmChannelService: DmChannelService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create or get DM channel with another user' })
  async createDmChannel(
    @Body('recipientId') recipientId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dmChannelService.createDmChannel(req.user.id, recipientId);
  }

  @Get('channels')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user DM channels' })
  async getUserDmChannels(@Req() req: AuthenticatedRequest) {
    return this.dmChannelService.getUserDmChannels(req.user.id);
  }

  @Post(':channelId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Send DM message' })
  async sendDmMessage(
    @Param('channelId') channelId: string,
    @Body('content') content: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dmChannelService.sendDmMessage(channelId, content, req.user.id);
  }

  @Get(':channelId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get DM messages' })
  async getDmMessages(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.dmChannelService.getDmMessages(
      channelId,
      req.user.id,
      limit,
      offset,
    );
  }

  @Get(':channelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get DM channel details' })
  async getDmChannel(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dmChannelService.getDmChannel(channelId, req.user.id);
  }
}
