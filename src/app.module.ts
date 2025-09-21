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
import { DmChannelModule } from './packages/dm/dm-channel.module';
import { CoreCacheModule } from './core/cache/cache.module';
import { CollectiblesModule } from './packages/collectibles/collectibles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CoreCacheModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UsersModule,
    CommunityModule,
    AuthModule,
    MessageModule,
    DmChannelModule,
    WebsocketModule,
    CollectiblesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
