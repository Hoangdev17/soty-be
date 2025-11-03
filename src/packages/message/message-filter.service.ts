import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import {
  ChatFilterRequest,
  ChatFilterResponse,
  MessageFilterResult,
  MessageFilterConfig,
  ChatFilterResponseSchema,
} from './dto/message-filter.dto';

@Injectable()
export class MessageFilterService {
  private readonly logger = new Logger(MessageFilterService.name);
  private readonly apiUrl = 'https://chat-filter-api.onrender.com';
  private readonly defaultConfig: MessageFilterConfig = {
    enabled: true,
    spamThreshold: 0.7,
    toxicThreshold: 0.6,
    autoDelete: true,
    autoTimeout: true,
    timeoutDuration: 10, // 10 minutes
    notifyModerators: true,
    logViolations: true,
  };

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if a message contains spam or toxic content
   */
  async checkMessage(
    text: string,
    config?: Partial<MessageFilterConfig>,
  ): Promise<MessageFilterResult> {
    const filterConfig = { ...this.defaultConfig, ...config };

    if (!filterConfig.enabled || !text.trim()) {
      return {
        isSpam: false,
        isToxic: false,
        isNormal: true,
        confidence: 1.0,
        prediction: 'normal',
        shouldBlock: false,
        action: 'allow',
      };
    }

    try {
      const prediction = await this.callFilterApi(text);
      return this.processFilterResult(prediction, filterConfig);
    } catch (error) {
      this.logger.error('Failed to check message filter:', error);

      // On API failure, allow message but log the error
      return {
        isSpam: false,
        isToxic: false,
        isNormal: true,
        confidence: 0,
        prediction: 'normal',
        shouldBlock: false,
        action: 'allow',
      };
    }
  }

  /**
   * Call the external chat filter API
   */
  private async callFilterApi(text: string): Promise<ChatFilterResponse> {
    const requestData: ChatFilterRequest = { text };

    try {
      const response = await fetch(`${this.apiUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Validate response with Zod
      const validatedResponse = ChatFilterResponseSchema.parse(
        await response.json(),
      );

      this.logger.debug(`Filter API response: ${validatedResponse.prediction}`);

      return validatedResponse;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          'Filter API timeout',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }
      if (error.response) {
        throw new HttpException(
          `Filter API error: ${error.message}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      throw error;
    }
  }

  /**
   * Process the filter result and determine action
   */
  private processFilterResult(
    response: ChatFilterResponse,
    config: MessageFilterConfig,
  ): MessageFilterResult {
    const { prediction } = response;

    const isSpam = prediction === 'spam';
    const isToxic = prediction === 'toxic';
    const isNormal = prediction === 'normal';

    // Vì API không trả confidence, gán confidence mặc định
    // Nếu toxic hoặc spam thì confidence cao (0.9), normal thì thấp (0.1)
    const confidence = isNormal ? 0.1 : 0.9;

    // Determine if message should be blocked based on prediction
    // Vì không có confidence thực tế, chỉ cần check prediction
    const shouldBlockSpam = isSpam;
    const shouldBlockToxic = isToxic;
    const shouldBlock = shouldBlockSpam || shouldBlockToxic;

    // Determine action based on prediction and configuration
    let action: MessageFilterResult['action'] = 'allow';

    if (shouldBlock) {
      if (config.autoDelete) {
        action = 'delete';
      } else if (config.autoTimeout) {
        action = 'timeout';
      } else {
        action = 'warn';
      }
    }

    return {
      isSpam,
      isToxic,
      isNormal,
      confidence,
      prediction,
      shouldBlock,
      action,
    };
  }

  /**
   * Get default filter configuration
   */
  getDefaultConfig(): MessageFilterConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Check multiple messages in batch (for bulk operations)
   */
  async checkMessages(
    messages: string[],
    config?: Partial<MessageFilterConfig>,
  ): Promise<MessageFilterResult[]> {
    const results = await Promise.allSettled(
      messages.map((text) => this.checkMessage(text, config)),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(`Failed to check message ${index}: ${result.reason}`);
        return {
          isSpam: false,
          isToxic: false,
          isNormal: true,
          confidence: 0,
          prediction: 'normal' as const,
          shouldBlock: false,
          action: 'allow' as const,
        };
      }
    });
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.callFilterApi('Hello world');
      return true;
    } catch (error) {
      this.logger.error('Filter API connection test failed:', error);
      return false;
    }
  }
}
