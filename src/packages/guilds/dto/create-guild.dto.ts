// src/packages/guilds/dto/create-guild.dto.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import {
  NotifLevel,
  ContentFilter,
  VerifyLevel,
  NsfwLevel,
  MfaLevel,
  PremiumTier,
  GuildType,
} from '../enums/guild.enums';

// ========== ZOD SCHEMA ==========
export const CreateGuildSchema = z.object({
  // CORE
  name: z.string().min(3).max(100).describe('Tên guild'),
  ownerId: z.string().min(1).describe('ID user sở hữu guild'),
  icon: z.string().optional().describe('URL icon'),
  banner: z.string().optional().describe('URL banner'),
  splash: z.string().optional().describe('URL splash'),
  description: z.string().optional().describe('Mô tả guild'),
  guildType: z.nativeEnum(GuildType).default(GuildType.PUBLIC),

  // CONFIG
  defaultMessageNotifications: z.nativeEnum(NotifLevel).default(NotifLevel.ONLY_MENTIONS),
  explicitContentFilter: z.nativeEnum(ContentFilter).default(ContentFilter.DISABLED),
  verificationLevel: z.nativeEnum(VerifyLevel).default(VerifyLevel.NONE),
  nsfwLevel: z.nativeEnum(NsfwLevel).default(NsfwLevel.DEFAULT),
  mfaLevel: z.nativeEnum(MfaLevel).default(MfaLevel.NONE),

  // PREMIUM
  premiumTier: z.nativeEnum(PremiumTier).default(PremiumTier.NONE),
  premiumSubscriptionCount: z.number().int().default(0),
  premiumProgressBarEnabled: z.boolean().default(false),

  // LIMITS
  maximumBitrate: z.number().int().optional(),
  maxMembers: z.number().int().optional(),
  maxPresences: z.number().int().optional(),
  maxStageVideoChannelUsers: z.number().int().optional(),
  maxVideoChannelUsers: z.number().int().optional(),

  // VANITY / WIDGET
  vanityURLCode: z.string().optional(),
  vanityURLUses: z.number().int().default(0),
  widgetEnabled: z.boolean().default(false),
  widgetChannelId: z.string().optional(),

  // SYSTEM CHANNELS
  systemChannelId: z.string().optional(),
  rulesChannelId: z.string().optional(),
  publicUpdatesChannelId: z.string().optional(),
  safetyAlertsChannelId: z.string().optional(),
  systemChannelFlags: z.number().int().default(0),

  // META
  shardId: z.number().int().optional(),
  available: z.boolean().default(true),
});

// ========== DTO ==========
export class CreateGuildDto extends createZodDto(CreateGuildSchema) {
  @ApiProperty({ description: 'Tên guild', example: 'My Server' })
  name: string;

  @ApiProperty({ description: 'ID user sở hữu guild', example: '123456789012345678' })
  ownerId: string;

  @ApiProperty({ description: 'URL icon', required: false })
  icon?: string;

  @ApiProperty({ description: 'URL banner', required: false })
  banner?: string;

  @ApiProperty({ description: 'URL splash', required: false })
  splash?: string;

  @ApiProperty({ description: 'Mô tả guild', required: false })
  description?: string;

  @ApiProperty({ enum: GuildType, description: 'Loại guild', example: GuildType.PUBLIC })
  guildType: GuildType;

  @ApiProperty({ enum: NotifLevel, description: 'Mức thông báo mặc định' })
  defaultMessageNotifications: NotifLevel;

  @ApiProperty({ enum: ContentFilter, description: 'Mức lọc nội dung' })
  explicitContentFilter: ContentFilter;

  @ApiProperty({ enum: VerifyLevel, description: 'Mức xác minh' })
  verificationLevel: VerifyLevel;

  @ApiProperty({ enum: NsfwLevel, description: 'Mức NSFW' })
  nsfwLevel: NsfwLevel;

  @ApiProperty({ enum: MfaLevel, description: 'Mức bảo mật 2FA' })
  mfaLevel: MfaLevel;

  @ApiProperty({ enum: PremiumTier, description: 'Premium tier' })
  premiumTier: PremiumTier;

  @ApiProperty({ description: 'Số lượng subscription premium', default: 0 })
  premiumSubscriptionCount: number;

  @ApiProperty({ description: 'Bật thanh progress premium', default: false })
  premiumProgressBarEnabled: boolean;

  @ApiProperty({ description: 'Bitrate tối đa (voice)', required: false })
  maximumBitrate?: number;

  @ApiProperty({ description: 'Số thành viên tối đa', required: false })
  maxMembers?: number;

  @ApiProperty({ description: 'Số presence tối đa', required: false })
  maxPresences?: number;

  @ApiProperty({ description: 'Số user tối đa trong stage video channel', required: false })
  maxStageVideoChannelUsers?: number;

  @ApiProperty({ description: 'Số user tối đa trong video channel', required: false })
  maxVideoChannelUsers?: number;

  @ApiProperty({ description: 'Custom vanity URL code', required: false })
  vanityURLCode?: string;

  @ApiProperty({ description: 'Số lần sử dụng vanity URL', default: 0 })
  vanityURLUses: number;

  @ApiProperty({ description: 'Widget được bật', default: false })
  widgetEnabled: boolean;

  @ApiProperty({ description: 'ID channel cho widget', required: false })
  widgetChannelId?: string;

  @ApiProperty({ description: 'ID system channel', required: false })
  systemChannelId?: string;

  @ApiProperty({ description: 'ID rules channel', required: false })
  rulesChannelId?: string;

  @ApiProperty({ description: 'ID public updates channel', required: false })
  publicUpdatesChannelId?: string;

  @ApiProperty({ description: 'ID safety alerts channel', required: false })
  safetyAlertsChannelId?: string;

  @ApiProperty({ description: 'System channel flags', default: 0 })
  systemChannelFlags: number;

  @ApiProperty({ description: 'Shard ID', required: false })
  shardId?: number;

  @ApiProperty({ description: 'Guild có khả dụng không', default: true })
  available: boolean;
}
