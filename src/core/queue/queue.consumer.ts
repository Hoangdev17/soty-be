import {
  Controller,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import {
  MessagePattern,
  Payload,
  Ctx,
  RmqContext,
} from '@nestjs/microservices';
import { MessageService } from '../../packages/message/message.service';
import { BotMessageProcessor } from '../../packages/bot/handlers/bot-message.processor';
import type { MessageQueuePayload } from './queue.service';

@Controller()
export class QueueConsumer {
  private readonly logger = new Logger(QueueConsumer.name);

  constructor(
    private readonly messageService: MessageService,
    @Optional()
    @Inject(forwardRef(() => BotMessageProcessor))
    private readonly botMessageProcessor?: BotMessageProcessor,
  ) {}

  /**
   * Consumer xử lý messages từ queue
   */
  @MessagePattern('process_message')
  async handleMessage(
    @Payload() payload: MessageQueuePayload,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing queued message from user: ${payload.authorId}`,
      );

      // Gọi MessageService để xử lý message
      await this.messageService.sendMessage(
        payload.sendMessageDto,
        payload.authorId,
      );

      // Acknowledge message đã xử lý xong
      channel.ack(originalMsg);
      this.logger.log(
        `Message processed successfully for: ${payload.authorId}`,
      );
    } catch (error) {
      this.logger.error('Error processing queued message:', error);

      // Nack message và requeue nếu lỗi
      channel.nack(originalMsg, false, true);
    }
  }

  /**
   * Consumer xử lý bot commands từ queue
   */
  @MessagePattern('process_bot_command')
  async handleBotCommand(@Payload() payload: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Processing bot command for message: ${payload.messageId}`,
      );

      // Gọi BotMessageProcessor để xử lý
      if (this.botMessageProcessor) {
        await this.botMessageProcessor.processMessage({
          messageId: payload.messageId,
          channelId: payload.channelId,
          guildId: payload.guildId,
          authorId: payload.authorId,
          content: payload.content,
        });
      }

      channel.ack(originalMsg);
      this.logger.log(
        `Bot command processed successfully for: ${payload.messageId}`,
      );
    } catch (error) {
      this.logger.error('Error processing bot command:', error);
      channel.nack(originalMsg, false, true);
    }
  }
}
