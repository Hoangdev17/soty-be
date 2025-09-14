import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './packages/users/users.module';
import { CommunityModule } from './packages/community/community.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './core/auth/auth.module';
import { PassportModule } from '@nestjs/passport';
import { WebsocketModule } from './packages/websocket/websocket.module';
import { MessageModule } from './packages/message/message.module';
import { MembersModule } from './packages/community/modules/members/members.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    CommunityModule,
    AuthModule,
    MessageModule,
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
