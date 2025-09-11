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
      'http://localhost:3000', // nếu dev frontend local
      'https://your-frontend-domain.com', // domain frontend đã deploy
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
}

bootstrap();
