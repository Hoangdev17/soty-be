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

@ApiTags('messages')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi tin nhắn mới' })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.messageService.sendMessage(sendMessageDto, req.user.id);
  }

  @Get(':channelId')
  async getMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.messageService.getMessages(channelId, limit, offset);
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
}
