import { Module, forwardRef, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QueueConsumer } from './queue.consumer';
import { MessageModule } from '../../packages/message/message.module';
import { BotModule } from '../../packages/bot/bot.module';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MESSAGE_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'messages_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
      {
        name: 'BOT_QUEUE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'bot_commands_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    forwardRef(() => MessageModule),
    forwardRef(() => BotModule),
  ],
  controllers: [QueueConsumer],
  providers: [QueueService],
  exports: [QueueService, ClientsModule],
})
export class QueueModule {}
