import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe with Zod
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger config
  setupSwagger(app);

  app.enableCors({
    origin: [
      'http://localhost:5000', // dev frontend local
      'https://soty-fe.vercel.app', // ✅ domain frontend đã có
      'https://soty-fe-*.vercel.app',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // thêm headers cần thiết
  });

  await app.listen(3000);
}

bootstrap();
