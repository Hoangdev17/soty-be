import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect RabbitMQ microservices (2 separate queues)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'messages_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'bot_commands_queue',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Global validation pipe with Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger config
  setupSwagger(app);

  app.enableCors({
    origin: [
      'http://localhost:5000',
      'https://soty-fe.vercel.app',
      'https://soty-fe-*.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.startAllMicroservices();
  await app.listen(3000);
}

bootstrap();
