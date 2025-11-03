import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessageFilterService } from './message-filter.service';
import { MessageFilterHandler } from '../bot/handlers/message-filter.handler';
import type { ChatFilterRequest } from './dto/message-filter.dto';

@ApiTags('Message Filter')
@Controller('message-filter')
export class MessageFilterController {
  constructor(
    private readonly messageFilterService: MessageFilterService,
    private readonly messageFilterHandler: MessageFilterHandler,
  ) {}

  @Get('test-connection')
  @ApiOperation({ summary: 'Test connection to chat filter API' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection() {
    const isConnected = await this.messageFilterService.testConnection();
    return {
      success: true,
      connected: isConnected,
      message: isConnected
        ? 'Successfully connected to chat filter API'
        : 'Failed to connect to chat filter API',
    };
  }

  @Post('check')
  @ApiOperation({ summary: 'Check a message for spam/toxic content' })
  @ApiResponse({ status: 200, description: 'Message filter result' })
  async checkMessage(@Body() request: ChatFilterRequest) {
    const result = await this.messageFilterService.checkMessage(request.text);
    return {
      success: true,
      text: request.text,
      result,
    };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get default filter configuration' })
  @ApiResponse({ status: 200, description: 'Default filter configuration' })
  async getDefaultConfig() {
    const config = this.messageFilterService.getDefaultConfig();
    return {
      success: true,
      config,
    };
  }

  @Post('test-action/:guildId')
  @ApiOperation({ summary: 'Test message filtering action for a guild' })
  @ApiResponse({ status: 200, description: 'Filter action test result' })
  async testFilterAction(
    @Body()
    request: {
      text: string;
      messageId?: string;
      channelId?: string;
      authorId?: string;
    },
    @Param('guildId') guildId: string,
  ) {
    // Create a mock message context for testing
    const mockContext = {
      messageId: request.messageId || 'test-message-id',
      channelId: request.channelId || 'test-channel-id',
      guildId: guildId || 'test-guild-id',
      authorId: request.authorId || 'test-author-id',
      content: request.text,
    };

    try {
      await this.messageFilterHandler.processMessage(mockContext);
      return {
        success: true,
        message: 'Message filter test completed',
        context: mockContext,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Message filter test failed',
        error: error.message,
        context: mockContext,
      };
    }
  }
}
