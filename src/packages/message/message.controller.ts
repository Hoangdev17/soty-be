import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendReplyDto } from './dto/send-reply.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PinMessageDto } from './dto/pin-message.dto';
import { QueueService } from 'src/core/queue/queue.service';

@ApiTags('messages')
@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly queueService: QueueService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi tin nhắn mới' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Queue message for async processing (includes bot handling)
    await this.queueService.queueMessage({
      sendMessageDto,
      authorId: req.user.id,
    });

    return {
      status: 'queued',
      message: 'Message queued for processing',
    };
  }

  @Get(':channelId')
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.messageService.getMessages(channelId, limit, offset);
  }

  @Get('channels/:channelId/unread-count')
  @UseGuards(JwtAuthGuard)
  async getChannelUnreadCount(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.messageService.getUnreadCount(channelId, userId);
  }

  @Get('communities/:guildId/unread-count')
  @UseGuards(JwtAuthGuard)
  async getCommunityUnreadCount(
    @Param('guildId') guildId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.messageService.getCommunityUnreadCount(guildId, userId);
  }

  @Get('communities/:guildId/channels-unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get unread count for each channel in a community' })
  async getCommunityChannelsUnreadCount(
    @Param('guildId') guildId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.messageService.getCommunityChannelsUnreadCount(guildId, userId);
  }

  @Put(':messageId/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Pin a message' })
  async pinMessage(
    @Param('messageId') messageId: string,
    @Body() pinMessageDto: PinMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.messageService.pinMessage(
      messageId,
      pinMessageDto.channelId,
      req.user.id,
    );
  }

  @Delete(':messageId/unpin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unpin a message' })
  async unpinMessage(
    @Param('messageId') messageId: string,
    @Body() pinMessageDto: PinMessageDto,
  ) {
    return this.messageService.unpinMessage(messageId, pinMessageDto.channelId);
  }

  @Get('channels/:channelId/pinned')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get pinned messages in channel' })
  async getPinnedMessages(@Param('channelId') channelId: string) {
    return this.messageService.getPinnedMessages(channelId);
  }

  @Post('reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Send reply to a message' })
  async sendReply(
    @Body() sendReplyDto: SendReplyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { content, channelId, replyToMessageId, mentionAuthor } =
      sendReplyDto;
    return this.messageService.sendReply(
      content,
      channelId,
      replyToMessageId,
      req.user.id,
      mentionAuthor,
    );
  }

  @Get(':messageId/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get message with its replies' })
  async getMessageWithReplies(@Param('messageId') messageId: string) {
    return this.messageService.getMessageWithReplies(messageId);
  }

  @Post(':channelId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark messages in channel as read' })
  async markChannelAsRead(
    @Param('channelId') channelId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.messageService.markChannelAsRead(channelId, userId);
  }

  @Delete(':messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.messageService.deleteMessage(messageId, userId);
  }
}
