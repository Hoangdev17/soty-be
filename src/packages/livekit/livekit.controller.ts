import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LiveKitService } from './livekit.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../websocket/websocket-events.types';

@ApiTags('LiveKit Voice')
@Controller('livekit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveKitController {
  constructor(private readonly livekitService: LiveKitService) {}

  @Post('token/:channelId')
  @ApiOperation({ summary: 'Generate LiveKit access token for voice channel' })
  @ApiResponse({ status: 200, description: 'Token generated successfully' })
  async generateToken(
    @Param('channelId') channelId: string,
    @Request() req: any,
    @Body() body: { username?: string; metadata?: string },
  ) {
    const user: AuthenticatedUser = req.user;
    const roomName = `voice_${channelId}`;

    // Create room if it doesn't exist
    await this.livekitService.createRoom(roomName, 50, 300);

    // Generate token
    const token = await this.livekitService.generateAccessToken(
      roomName,
      user.sub,
      body.username || user.username || user.sub,
      body.metadata,
    );

    return {
      token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName,
      participantId: user.sub,
    };
  }

  @Get('room/:channelId')
  @ApiOperation({ summary: 'Get voice channel room info' })
  @ApiResponse({ status: 200, description: 'Room info retrieved successfully' })
  async getRoomInfo(@Param('channelId') channelId: string) {
    const roomName = `voice_${channelId}`;
    return await this.livekitService.getRoomStats(roomName);
  }

  @Get('room/:channelId/participants')
  @ApiOperation({ summary: 'List participants in voice channel' })
  @ApiResponse({ status: 200, description: 'Participants listed successfully' })
  async listParticipants(@Param('channelId') channelId: string) {
    const roomName = `voice_${channelId}`;
    const participants = await this.livekitService.listParticipants(roomName);

    return {
      channelId,
      roomName,
      participants: participants.map((p) => ({
        participantId: p.identity,
        name: p.name,
        joinedAt: p.joinedAt,
        state: p.state,
        tracks: p.tracks.map((t) => ({
          sid: t.sid,
          type: t.type,
          source: t.source,
          muted: t.muted,
        })),
      })),
    };
  }

  @Post('room/:channelId/remove/:participantId')
  @ApiOperation({ summary: 'Remove participant from voice channel' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  async removeParticipant(
    @Param('channelId') channelId: string,
    @Param('participantId') participantId: string,
  ) {
    const roomName = `voice_${channelId}`;
    await this.livekitService.removeParticipant(roomName, participantId);

    return {
      message: 'Participant removed successfully',
      channelId,
      participantId,
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check LiveKit service health' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  @ApiBearerAuth('access-token')
  async healthCheck() {
    const isHealthy = await this.livekitService.healthCheck();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      livekitUrl: process.env.LIVEKIT_URL,
      timestamp: new Date(),
    };
  }
}
