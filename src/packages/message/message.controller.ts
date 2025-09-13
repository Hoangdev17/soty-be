import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Param,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from 'src/core/auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/core/auth/dto/request-with-auth.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

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
  async getMessages(@Param('channelId') channelId: string) {
    return this.messageService.getMessages(channelId);
  }
}
