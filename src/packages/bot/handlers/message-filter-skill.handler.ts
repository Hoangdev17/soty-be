import { Injectable, Logger } from '@nestjs/common';
import { MessageFilterService } from '../../message/message-filter.service';
import { BotActionResult, BotActionContext } from './bot-action.handler';

/**
 * Bot Skill Handler for Message Filtering
 * Skill này sẽ kiểm tra tin nhắn có spam, toxic hay không
 */
@Injectable()
export class MessageFilterSkillHandler {
  private readonly logger = new Logger(MessageFilterSkillHandler.name);

  constructor(private readonly messageFilterService: MessageFilterService) {}

  /**
   * Process message filtering skill
   */
  async processSkill(
    context: BotActionContext,
    skillConfig?: any,
    isAutoMode: boolean = false,
  ): Promise<BotActionResult> {
    const { content, params } = context;

    try {
      let textToCheck: string;

      if (isAutoMode) {
        // Trong auto mode, kiểm tra toàn bộ content của message
        textToCheck = content.trim();

        // Bỏ qua tin nhắn quá ngắn trong auto mode
        const minLength = skillConfig?.minMessageLength || 3;
        if (textToCheck.length < minLength) {
          return {
            success: true,
            response: '',
            data: {
              originalText: textToCheck,
              filterResult: {
                prediction: 'normal',
                confidence: 1.0,
                shouldBlock: false,
                reason: 'Message too short',
              },
              isAutoMode: true,
              skipped: true,
            },
          };
        }

        // Bỏ qua command messages trong auto mode (nếu được config)
        if (
          skillConfig?.skipCommands !== false &&
          this.isCommandMessage(textToCheck)
        ) {
          return {
            success: true,
            response: '',
            data: {
              originalText: textToCheck,
              filterResult: {
                prediction: 'normal',
                confidence: 1.0,
                shouldBlock: false,
                reason: 'Command message',
              },
              isAutoMode: true,
              skipped: true,
            },
          };
        }
      } else {
        // Trong manual mode, lấy text từ command
        const extractedText = this.extractTextToCheck(content, params);

        if (!extractedText) {
          return {
            success: false,
            response:
              '❌ Không tìm thấy text để kiểm tra. Sử dụng: `!filter <text>` hoặc reply tin nhắn cần kiểm tra.',
          };
        }

        textToCheck = extractedText;
      }

      // Kiểm tra tin nhắn qua API
      const filterResult = await this.messageFilterService.checkMessage(
        textToCheck,
        skillConfig,
      );

      // Tạo response dựa trên kết quả và mode
      let response: string;

      if (isAutoMode) {
        // Trong auto mode, chỉ tạo response khi có vi phạm và được config
        if (filterResult.shouldBlock && skillConfig?.notifyResults === true) {
          response = `🛡️ Auto-Filter: ${filterResult.prediction} detected (${Math.round(filterResult.confidence * 100)}%)`;
        } else {
          response = ''; // Không response nếu tin nhắn bình thường hoặc không config notify
        }
      } else {
        // Trong manual mode, luôn tạo response chi tiết
        response = this.generateFilterResponse(textToCheck, filterResult);
      }

      return {
        success: true,
        response,
        data: {
          originalText: textToCheck,
          filterResult,
          isAutoMode,
        },
      };
    } catch (error) {
      this.logger.error('Error in message filter skill:', error);

      // Trong auto mode, không gửi error response để tránh spam
      if (isAutoMode) {
        return {
          success: false,
          response: '',
          data: {
            error: error.message,
            isAutoMode: true,
          },
        };
      }

      return {
        success: false,
        response: '❌ Lỗi khi kiểm tra tin nhắn. Vui lòng thử lại sau.',
      };
    }
  }

  /**
   * Check if message is a command (starts with common prefixes)
   */
  private isCommandMessage(content: string): boolean {
    const commandPrefixes = ['!', '/', '.', '>', '<', '#', '$', '%', '?'];
    const trimmedContent = content.trim().toLowerCase();

    // Kiểm tra prefix
    for (const prefix of commandPrefixes) {
      if (trimmedContent.startsWith(prefix)) {
        return true;
      }
    }

    // Kiểm tra mention bot (@botname command)
    if (trimmedContent.match(/^<@[!&]?\d+>/)) {
      return true;
    }

    return false;
  }

  /**
   * Extract text to check from command content or params
   */
  private extractTextToCheck(
    content: string,
    params?: Record<string, any>,
  ): string | null {
    // Nếu có args từ command, lấy text từ đó
    if (params?.args && Array.isArray(params.args) && params.args.length > 0) {
      return params.args.join(' ').trim();
    }

    // Nếu có matches từ regex pattern
    if (
      params?.matches &&
      Array.isArray(params.matches) &&
      params.matches.length > 0
    ) {
      return params.matches[0].trim();
    }

    // Fallback: lấy text sau command prefix
    const commandPrefixes = ['!filter', '!check', '!spam', '!toxic'];
    for (const prefix of commandPrefixes) {
      if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
        const text = content.slice(prefix.length).trim();
        if (text) return text;
      }
    }

    return null;
  }

  /**
   * Generate user-friendly response based on filter result
   */
  private generateFilterResponse(text: string, filterResult: any): string {
    const { prediction, confidence, shouldBlock } = filterResult;

    // Tạo emoji và màu dựa trên kết quả
    const statusEmoji = {
      normal: '✅',
      spam: '🚫',
      toxic: '⚠️',
    };

    const emoji = statusEmoji[prediction] || '❓';
    const confidencePercent = Math.round(confidence * 100);

    let response = `${emoji} **Kết quả kiểm tra tin nhắn:**\n\n`;
    response += `📝 **Text:** "${text.length > 100 ? text.substring(0, 100) + '...' : text}"\n`;
    response += `🔍 **Phân loại:** ${this.getPredictionText(prediction)}\n`;
    response += `📊 **Độ tin cậy:** ${confidencePercent}%\n`;

    if (shouldBlock) {
      response += `\n🛡️ **Cảnh báo:** Tin nhắn này vi phạm quy tắc cộng đồng và sẽ bị xử lý tự động.`;
    } else {
      response += `\n👍 **Kết quả:** Tin nhắn này không vi phạm quy tắc.`;
    }

    // Thêm lời khuyên dựa trên loại vi phạm
    if (prediction === 'spam' && confidence > 0.5) {
      response += `\n\n💡 **Lưu ý:** Tránh gửi tin nhắn lặp lại hoặc không có ý nghĩa.`;
    } else if (prediction === 'toxic' && confidence > 0.5) {
      response += `\n\n💡 **Lưu ý:** Hãy giữ thái độ tôn trọng và lịch sự trong giao tiếp.`;
    }

    return response;
  }

  /**
   * Get localized prediction text
   */
  private getPredictionText(prediction: string): string {
    const predictionMap = {
      normal: 'Bình thường ✅',
      spam: 'Spam 🚫',
      toxic: 'Độc hại ⚠️',
    };

    return predictionMap[prediction] || 'Không xác định ❓';
  }

  /**
   * Get skill configuration schema
   */
  getSkillConfigSchema() {
    return {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
          description: 'Bật/tắt skill kiểm tra tin nhắn',
        },
        autoMode: {
          type: 'boolean',
          default: true,
          description: 'Tự động kiểm tra mọi tin nhắn',
        },
        autoAction: {
          type: 'boolean',
          default: true,
          description: 'Tự động thực hiện hành động khi phát hiện vi phạm',
        },
        autoDelete: {
          type: 'boolean',
          default: true,
          description: 'Tự động xóa tin nhắn vi phạm',
        },
        autoWarn: {
          type: 'boolean',
          default: true,
          description: 'Tự động cảnh báo người dùng',
        },
        notifyResults: {
          type: 'boolean',
          default: false,
          description:
            'Thông báo kết quả kiểm tra (chỉ cho vi phạm trong auto mode)',
        },
        minMessageLength: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          default: 3,
          description: 'Độ dài tối thiểu của tin nhắn để kiểm tra (auto mode)',
        },
        skipCommands: {
          type: 'boolean',
          default: true,
          description: 'Bỏ qua tin nhắn command trong auto mode',
        },
        spamThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.7,
          description: 'Ngưỡng phát hiện spam (0.0 - 1.0)',
        },
        toxicThreshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          default: 0.6,
          description: 'Ngưỡng phát hiện nội dung độc hại (0.0 - 1.0)',
        },
        showDetailedResults: {
          type: 'boolean',
          default: true,
          description: 'Hiển thị kết quả chi tiết (chỉ cho manual check)',
        },
        allowPublicCheck: {
          type: 'boolean',
          default: true,
          description: 'Cho phép kiểm tra công khai trong channel',
        },
        silentMode: {
          type: 'boolean',
          default: false,
          description: 'Chế độ im lặng - không thông báo action (chỉ log)',
        },
      },
    };
  }

  /**
   * Get skill help text
   */
  getSkillHelp(): string {
    return `
🛡️ **Message Filter Skill - Hướng dẫn sử dụng:**

**Auto Mode (Tự động):**
Skill sẽ tự động kiểm tra mọi tin nhắn và thực hiện các hành động:
• 🚫 Tự động xóa tin nhắn spam/toxic
• ⚠️ Cảnh báo người vi phạm
• 📊 Ghi log các vi phạm

**Manual Mode (Thủ công):**
Sử dụng các lệnh để kiểm tra tin nhắn cụ thể:
• \`!filter <text>\` - Kiểm tra text có spam/toxic không
• \`!check <text>\` - Tương tự !filter
• \`!spam <text>\` - Kiểm tra spam cụ thể
• \`!toxic <text>\` - Kiểm tra nội dung độc hại

**Ví dụ Manual:**
• \`!filter Hello world!\` - Kiểm tra text "Hello world!"
• \`!check This is spam spam spam\` - Kiểm tra text spam
• \`!toxic You are stupid\` - Kiểm tra nội dung độc hại

**Kết quả:**
✅ **Normal** - Tin nhắn bình thường
🚫 **Spam** - Tin nhắn spam
⚠️ **Toxic** - Nội dung độc hại

**Cấu hình:**
• \`autoMode\`: Bật/tắt chế độ tự động
• \`autoDelete\`: Tự động xóa tin nhắn vi phạm
• \`autoWarn\`: Tự động cảnh báo người dùng
• \`spamThreshold\`: Ngưỡng phát hiện spam (0.0-1.0)
• \`toxicThreshold\`: Ngưỡng phát hiện độc hại (0.0-1.0)
    `;
  }
}
