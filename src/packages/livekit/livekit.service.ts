import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, Room, RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);
  private roomService: RoomServiceClient;
  private livekitUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(private configService: ConfigService) {
    this.livekitUrl = this.configService.get<string>('LIVEKIT_URL')!;
    this.apiKey = this.configService.get<string>('LIVEKIT_API_KEY')!;
    this.apiSecret = this.configService.get<string>('LIVEKIT_API_SECRET')!;

    this.roomService = new RoomServiceClient(
      this.livekitUrl,
      this.apiKey,
      this.apiSecret,
    );

    this.logger.log('LiveKit service initialized');
  }

  /**
   * Generate access token for user to join a room
   */
  async generateAccessToken(
    roomName: string,
    userId: string,
    username?: string,
    metadata?: string,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      name: username || userId,
      metadata: metadata,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    this.logger.log(
      `Generated access token for user ${userId} to join room ${roomName}`,
    );

    return token;
  }

  /**
   * Create a room if it doesn't exist
   */
  async createRoom(
    roomName: string,
    maxParticipants?: number,
    emptyTimeout?: number,
  ): Promise<Room> {
    try {
      // Check if room already exists
      const existingRooms = await this.roomService.listRooms([roomName]);

      if (existingRooms.length > 0) {
        this.logger.log(`Room ${roomName} already exists`);
        return existingRooms[0];
      }

      // Create new room
      const room = await this.roomService.createRoom({
        name: roomName,
        maxParticipants: maxParticipants || 50,
        emptyTimeout: emptyTimeout || 300, // 5 minutes
        metadata: JSON.stringify({
          createdAt: new Date().toISOString(),
          type: 'voice_channel',
        }),
      });

      this.logger.log(
        `Created room ${roomName} with max participants: ${maxParticipants || 50}`,
      );

      return room;
    } catch (error) {
      this.logger.error(`Failed to create room ${roomName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get room information
   */
  async getRoom(roomName: string): Promise<Room | null> {
    try {
      const rooms = await this.roomService.listRooms([roomName]);
      return rooms.length > 0 ? rooms[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get room ${roomName}: ${error.message}`);
      return null;
    }
  }

  /**
   * List participants in a room
   */
  async listParticipants(roomName: string) {
    try {
      const participants = await this.roomService.listParticipants(roomName);

      this.logger.log(
        `Listed ${participants.length} participants in room ${roomName}`,
      );

      return participants;
    } catch (error) {
      this.logger.error(
        `Failed to list participants in room ${roomName}: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(
    roomName: string,
    participantId: string,
  ): Promise<void> {
    try {
      await this.roomService.removeParticipant(roomName, participantId);

      this.logger.log(
        `Removed participant ${participantId} from room ${roomName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove participant ${participantId} from room ${roomName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Mute participant
   */
  async muteParticipant(
    roomName: string,
    participantId: string,
    trackSid: string,
    muted: boolean,
  ): Promise<void> {
    try {
      await this.roomService.mutePublishedTrack(
        roomName,
        participantId,
        trackSid,
        muted,
      );

      this.logger.log(
        `${muted ? 'Muted' : 'Unmuted'} participant ${participantId} track ${trackSid} in room ${roomName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to ${muted ? 'mute' : 'unmute'} participant: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send data message to participants in room
   */
  async sendDataMessage(
    roomName: string,
    message: string,
    destinationSids?: string[],
  ): Promise<void> {
    try {
      const data = new TextEncoder().encode(message);

      // Use correct API signature
      await this.roomService.sendData(roomName, data, 1, destinationSids);

      this.logger.log(`Sent data message to room ${roomName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send data message to room ${roomName}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);

      this.logger.log(`Deleted room ${roomName}`);
    } catch (error) {
      this.logger.error(`Failed to delete room ${roomName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get room statistics
   */
  async getRoomStats(roomName: string) {
    try {
      const room = await this.getRoom(roomName);
      if (!room) return null;

      const participants = await this.listParticipants(roomName);

      return {
        room: {
          name: room.name,
          sid: room.sid,
          createdAt: room.creationTime,
          numParticipants: room.numParticipants,
          maxParticipants: room.maxParticipants,
          emptyTimeout: room.emptyTimeout,
          metadata: room.metadata,
        },
        participants: participants.map((p) => ({
          sid: p.sid,
          identity: p.identity,
          name: p.name,
          state: p.state,
          joinedAt: p.joinedAt,
          metadata: p.metadata,
          tracks: p.tracks.map((t) => ({
            sid: t.sid,
            type: t.type,
            source: t.source,
            muted: t.muted,
          })),
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get room stats for ${roomName}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.roomService.listRooms();
      return true;
    } catch (error) {
      this.logger.error(`LiveKit health check failed: ${error.message}`);
      return false;
    }
  }
}
