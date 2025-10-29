import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';

@Injectable()
export class BotAIChatHandler {
  private readonly logger = new Logger(BotAIChatHandler.name);
  private readonly COHERE_API_URL = 'https://api.cohere.com/v2/chat';
  private readonly COHERE_API_KEY = process.env.COHERE_API_KEY;

  // Lưu context chat theo channelId
  private chatContexts: Map<
    string,
    Array<{ role: 'user' | 'assistant'; content: string }>
  > = new Map();

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Handler cho command !chat hoặc !ai
   * Usage: !chat <message> hoặc !ai <message>
   */
  async handleAIChat(
    content: string,
    channelId: string,
    guildId: string,
    authorId: string,
  ): Promise<string> {
    try {
      // User message là toàn bộ content vì command đã được xử lý ở processor
      const userMessage = content.trim();

      if (!userMessage) {
        return '❌ Vui lòng nhập tin nhắn! Ví dụ: `!chat Hello, how are you?`';
      }

      // Get or create conversation context
      if (!this.chatContexts.has(channelId)) {
        this.chatContexts.set(channelId, []);
      }

      const context = this.chatContexts.get(channelId)!;

      // Add user message to context
      context.push({
        role: 'user',
        content: userMessage,
      });

      // Keep only last 20 messages (10 pairs) to avoid token limit
      if (context.length > 20) {
        context.splice(0, context.length - 20);
      }

      // Call Cohere API
      const response = await this.callCohereAPI(context);

      // Add AI response to context
      context.push({
        role: 'assistant',
        content: response,
      });

      return response;
    } catch (error) {
      this.logger.error('Error in AI chat handler:', error);
      return '❌ Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại sau!';
    }
  }

  /**
   * Clear conversation context
   * Usage: !chat clear hoặc !ai reset
   */
  async clearContext(channelId: string): Promise<string> {
    this.chatContexts.delete(channelId);
    return '🗑️ Đã xóa lịch sử trò chuyện!';
  }

  /**
   * Call Cohere API
   */
  private async callCohereAPI(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    try {
      const response = await fetch(this.COHERE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.COHERE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stream: false,
          model: 'command-a-03-2025',
          messages: messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error('Cohere API error:', error);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      this.logger.log('Cohere API response received', data);

      // Extract response from Cohere format
      if (data.message?.content?.[0]?.text) {
        return data.message.content[0].text.trim();
      }

      this.logger.error('Unexpected API response:', data);
      return '❌ Không thể lấy phản hồi từ AI.';
    } catch (error) {
      this.logger.error('Error calling Cohere API:', error);
      throw error;
    }
  }
}
