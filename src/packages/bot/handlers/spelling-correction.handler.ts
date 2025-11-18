import { Injectable, Logger } from '@nestjs/common';
import { BotActionResult, BotActionContext } from './bot-action.handler';

/**
 * Spelling Correction Handler
 * Kiểm tra lỗi chính tả và tự động sửa câu sai
 */
@Injectable()
export class SpellingCorrectionHandler {
  private readonly logger = new Logger(SpellingCorrectionHandler.name);
  private readonly API_URL = process.env.API_URL || 'localhost:8000/correct';

  /**
   * Check spelling and auto-correct text
   */
  async checkAndCorrect(context: BotActionContext): Promise<BotActionResult> {
    const { content, params } = context;

    try {
      // Extract text to check
      const textToCheck = this.extractTextToCheck(content, params);

      if (!textToCheck) {
        return {
          success: false,
          response:
            '❌ Vui lòng nhập text cần kiểm tra.\nCú pháp: `!spell <text>`\nVí dụ: `!spell toii dii hoc o truong giao thong`',
        };
      }

      this.logger.log(`Checking spelling for: "${textToCheck}"`);

      // Call spelling correction API
      const correctionResult = await this.callSpellingAPI(textToCheck);

      if (!correctionResult) {
        return {
          success: false,
          response: '❌ Không thể kết nối tới dịch vụ kiểm tra chính tả.',
        };
      }

      // Generate response
      const response = this.generateCorrectionResponse(
        textToCheck,
        correctionResult,
      );

      return {
        success: true,
        response,
        data: {
          original: textToCheck,
          corrected: correctionResult.corrected_text,
          hasErrors: correctionResult.has_errors,
          confidence: correctionResult.confidence,
        },
      };
    } catch (error) {
      this.logger.error('Error in spelling correction:', error);
      return {
        success: false,
        response: `❌ Lỗi khi kiểm tra chính tả: ${error.message}`,
      };
    }
  }

  /**
   * Call spelling correction API
   */
  private async callSpellingAPI(text: string): Promise<any> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          max_length: 128,
          num_beams: 5,
        }),
      });

      if (!response.ok) {
        this.logger.error(
          `Spelling API error: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = await response.json();

      // Check if text has errors
      const hasErrors = data.corrected !== data.original;

      return {
        corrected_text: data.corrected || text,
        original_text: data.original || text,
        has_errors: hasErrors,
        confidence: hasErrors ? 0.9 : 1.0, // Estimate confidence
      };
    } catch (error) {
      this.logger.error('Error calling spelling API:', error);
      return null;
    }
  }

  /**
   * Extract text to check from command
   */
  private extractTextToCheck(
    content: string,
    params?: Record<string, any>,
  ): string | null {
    // Get text from command args
    if (params?.args && Array.isArray(params.args) && params.args.length > 0) {
      return params.args.join(' ').trim();
    }

    // Get text from regex matches
    if (
      params?.matches &&
      Array.isArray(params.matches) &&
      params.matches.length > 0
    ) {
      return params.matches[0].trim();
    }

    // Fallback: get text after command prefix
    const commandPrefixes = ['!spell', '!spelling', '!correct', '!fix'];
    for (const prefix of commandPrefixes) {
      if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
        const text = content.slice(prefix.length).trim();
        if (text) return text;
      }
    }

    return null;
  }

  /**
   * Generate user-friendly response
   */
  private generateCorrectionResponse(
    originalText: string,
    result: any,
  ): string {
    const { corrected_text, has_errors } = result;

    if (!has_errors) {
      return `✅ **Kiểm tra chính tả:**\n\n📝 Câu của bạn không có lỗi chính tả!\n\n"${originalText}"`;
    }

    let response = `📝 **Kiểm tra chính tả:**\n\n`;
    response += `❌ **Câu sai:**\n"${originalText}"\n\n`;
    response += `✅ **Câu đã sửa:**\n"${corrected_text}"\n\n`;

    // Highlight differences
    const differences = this.findDifferences(originalText, corrected_text);
    if (differences.length > 0) {
      response += `🔍 **Các từ đã sửa:**\n`;
      differences.forEach((diff, index) => {
        response += `${index + 1}. "${diff.original}" → "${diff.corrected}"\n`;
      });
    }

    return response;
  }

  /**
   * Find word differences between original and corrected text
   */
  private findDifferences(
    original: string,
    corrected: string,
  ): Array<{ original: string; corrected: string }> {
    const originalWords = original.toLowerCase().split(/\s+/);
    const correctedWords = corrected.toLowerCase().split(/\s+/);
    const differences: Array<{ original: string; corrected: string }> = [];

    // Simple word-by-word comparison
    const maxLength = Math.max(originalWords.length, correctedWords.length);
    for (let i = 0; i < maxLength; i++) {
      const origWord = originalWords[i] || '';
      const corrWord = correctedWords[i] || '';

      if (origWord !== corrWord && origWord && corrWord) {
        differences.push({
          original: origWord,
          corrected: corrWord,
        });
      }
    }

    return differences;
  }

  /**
   * Get handler help text
   */
  getHelp(): string {
    return `
✍️ **Spelling Correction - Hướng dẫn sử dụng:**

**Lệnh:**
• \`!spell <text>\` - Kiểm tra và sửa lỗi chính tả
• \`!spelling <text>\` - Tương tự !spell
• \`!correct <text>\` - Sửa lỗi chính tả
• \`!fix <text>\` - Tương tự !correct

**Ví dụ:**
• \`!spell toii dii hoc o truong giao thong\`
  → Kết quả: "tôi đi học ở trường giao thông"

• \`!correct ban dang lam gi\`
  → Kết quả: "bạn đang làm gì"

• \`!fix chao mung ban den voi server\`
  → Kết quả: "chào mừng bạn đến với server"

**Kết quả:**
✅ Câu không có lỗi - Hiển thị thông báo không có lỗi
📝 Câu có lỗi - Hiển thị cả câu sai và câu đã sửa
🔍 Chi tiết - Liệt kê các từ đã được sửa

**Lưu ý:**
• Bot sử dụng AI để tự động sửa lỗi chính tả tiếng Việt
• Độ chính xác phụ thuộc vào ngữ cảnh câu
• Hỗ trợ sửa lỗi dấu thanh, lỗi gõ phím phổ biến
    `;
  }
}
