import {
  Injectable,
  Inject,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface MessageQueuePayload {
  sendMessageDto: any;
  authorId: string;
  timestamp?: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @Inject('MESSAGE_QUEUE') private readonly messageClient: ClientProxy,
    @Inject('BOT_QUEUE') private readonly botClient: ClientProxy,
  ) {}

  /**
   * Tự động kết nối với RabbitMQ khi module khởi tạo
   */
  async onModuleInit() {
    try {
      await this.connect();
      this.logger.log('QueueService initialized and connected to RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ on init:', error);
      // Retry connection after 5 seconds
      setTimeout(() => this.onModuleInit(), 5000);
    }
  }

  /**
   * Tự động ngắt kết nối khi module bị destroy
   */
  async onModuleDestroy() {
    try {
      await this.disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting from RabbitMQ:', error);
    }
  }

  /**
   * Đẩy message vào queue để xử lý bất đồng bộ
   */
  async queueMessage(payload: MessageQueuePayload): Promise<void> {
    try {
      const enrichedPayload = {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
      };

      this.messageClient.emit('process_message', enrichedPayload);
      this.logger.log(`Message queued for processing: ${payload.authorId}`);
    } catch (error) {
      this.logger.error('Error queueing message:', error);
      throw error;
    }
  }

  /**
   * Đẩy bot command vào queue riêng (không block message creation)
   */
  async queueBotCommand(payload: any): Promise<void> {
    try {
      this.botClient.emit('process_bot_command', payload);
      this.logger.log(`Bot command queued: ${payload.messageId}`);
    } catch (error) {
      this.logger.error('Error queueing bot command:', error);
      throw error;
    }
  }

  /**
   * Kết nối tới RabbitMQ
   */
  async connect(): Promise<void> {
    await Promise.all([this.messageClient.connect(), this.botClient.connect()]);
    this.logger.log('Connected to RabbitMQ queues');
  }

  /**
   * Ngắt kết nối
   */
  async disconnect(): Promise<void> {
    await Promise.all([this.messageClient.close(), this.botClient.close()]);
    this.logger.log('Disconnected from RabbitMQ');
  }
}
