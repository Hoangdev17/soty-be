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
import { SepayModule } from './packages/sepay/sepay.module';
import { NitroModule } from './packages/nitro/nitro.module';
import { BoostModule } from './packages/boost/boost.module';
import { BotModule } from './packages/bot/bot.module';
import { QueueModule } from './core/queue/queue.module';
import { GuildStickerModule } from './packages/guild-sticker/guild-sticker.module';
import { GuildEmojiModule } from './packages/guild-emoji/guild-emoji.module';
import { LiveKitModule } from './packages/livekit/livekit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CoreCacheModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    QueueModule,
    UsersModule,
    CommunityModule,
    AuthModule,
    MessageModule,
    DmChannelModule,
    WebsocketModule,
    CollectiblesModule,
    SepayModule,
    NitroModule,
    BoostModule,
    BotModule,
    GuildStickerModule,
    GuildEmojiModule,
    LiveKitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
