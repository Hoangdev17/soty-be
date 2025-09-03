import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './packages/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './packages/prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot(), UsersModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
