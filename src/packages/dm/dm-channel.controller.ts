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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('dm')
@Controller('dm/channels')
export class DmChannelController {
  constructor(private readonly dmChannelService: DmChannelService) {}

  @Post('')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create or get DM channel with users' })
  @ApiBody({ schema: { example: { userIds: ['userId1', 'userId2'] } } })
  async createDmChannel(
    @Body('userIds') userIds: string[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dmChannelService.createDmChannel(req.user.id, userIds);
  }

  @Get('')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user DM channels' })
  async getUserDmChannels(@Req() req: AuthenticatedRequest) {
    return this.dmChannelService.getUserDmChannels(req.user.id);
  }

  @Get('/:channelId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get DM channels by ID' })
  async getDmChannels(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dmChannelService.getChannelById(channelId, req.user.id);
  }
}
