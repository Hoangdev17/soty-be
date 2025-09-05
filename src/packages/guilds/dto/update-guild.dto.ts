// src/packages/guilds/dto/update-guild.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGuildSchema } from './create-guild.dto';

export const UpdateGuildSchema = CreateGuildSchema
  .omit({
    ownerId: true,     
    vanityURLUses: true,  
  })
  .partial();

export class UpdateGuildDto extends createZodDto(UpdateGuildSchema) {
  // CORE
  @ApiPropertyOptional({ description: 'Tên guild' })
  name?: string;

  @ApiPropertyOptional({ description: 'URL icon' })
  icon?: string;

  @ApiPropertyOptional({ description: 'URL banner' })
  banner?: string;

  @ApiPropertyOptional({ description: 'URL splash' })
  splash?: string;

  @ApiPropertyOptional({ description: 'Mô tả guild' })
  description?: string;

  @ApiPropertyOptional({ description: 'Loại guild', enum: ['PUBLIC', 'PRIVATE'] })
  guildType?: any; // hoặc import enum và dùng: GuildType

  // CONFIG
  @ApiPropertyOptional({ description: 'Mức thông báo mặc định', enum: ['ALL_MESSAGES', 'ONLY_MENTIONS'] })
  defaultMessageNotifications?: any; // NotifLevel

  @ApiPropertyOptional({ description: 'Mức lọc nội dung', enum: ['DISABLED','MEMBERS_WITHOUT_ROLES','ALL_MEMBERS'] })
  explicitContentFilter?: any; // ContentFilter

  @ApiPropertyOptional({ description: 'Mức xác minh', enum: ['NONE','LOW','MEDIUM','HIGH','VERY_HIGH'] })
  verificationLevel?: any; // VerifyLevel

  @ApiPropertyOptional({ description: 'Mức NSFW', enum: ['DEFAULT','EXPLICIT','SAFE','AGE_RESTRICTED'] })
  nsfwLevel?: any; // NsfwLevel

  @ApiPropertyOptional({ description: 'Mức bảo mật 2FA', enum: ['NONE','ELEVATED'] })
  mfaLevel?: any; // MfaLevel

  // PREMIUM
  @ApiPropertyOptional({ description: 'Premium tier', enum: ['NONE','TIER_1','TIER_2','TIER_3'] })
  premiumTier?: any; // PremiumTier

  @ApiPropertyOptional({ description: 'Số lượng subscription premium' })
  premiumSubscriptionCount?: number;

  @ApiPropertyOptional({ description: 'Bật thanh progress premium' })
  premiumProgressBarEnabled?: boolean;

  // LIMITS
  @ApiPropertyOptional({ description: 'Bitrate tối đa (voice)' })
  maximumBitrate?: number;

  @ApiPropertyOptional({ description: 'Số thành viên tối đa' })
  maxMembers?: number;

  @ApiPropertyOptional({ description: 'Số presence tối đa' })
  maxPresences?: number;

  @ApiPropertyOptional({ description: 'Số user tối đa trong stage video channel' })
  maxStageVideoChannelUsers?: number;

  @ApiPropertyOptional({ description: 'Số user tối đa trong video channel' })
  maxVideoChannelUsers?: number;

  // VANITY / WIDGET
  @ApiPropertyOptional({ description: 'Custom vanity URL code' })
  vanityURLCode?: string;

  @ApiPropertyOptional({ description: 'Widget được bật' })
  widgetEnabled?: boolean;

  @ApiPropertyOptional({ description: 'ID channel cho widget' })
  widgetChannelId?: string;

  // SYSTEM CHANNELS
  @ApiPropertyOptional({ description: 'ID system channel' })
  systemChannelId?: string;

  @ApiPropertyOptional({ description: 'ID rules channel' })
  rulesChannelId?: string;

  @ApiPropertyOptional({ description: 'ID public updates channel' })
  publicUpdatesChannelId?: string;

  @ApiPropertyOptional({ description: 'ID safety alerts channel' })
  safetyAlertsChannelId?: string;

  @ApiPropertyOptional({ description: 'System channel flags' })
  systemChannelFlags?: number;

  // META
  @ApiPropertyOptional({ description: 'Shard ID' })
  shardId?: number;

  @ApiPropertyOptional({ description: 'Guild có khả dụng không' })
  available?: boolean;
}
