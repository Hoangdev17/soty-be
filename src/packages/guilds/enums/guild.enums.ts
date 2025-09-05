// src/packages/guilds/enums/guild.enums.ts

export enum NotifLevel {
  ALL_MESSAGES = 'ALL_MESSAGES',
  ONLY_MENTIONS = 'ONLY_MENTIONS',
}

export enum ContentFilter {
  DISABLED = 'DISABLED',
  MEMBERS_WITHOUT_ROLES = 'MEMBERS_WITHOUT_ROLES',
  ALL_MEMBERS = 'ALL_MEMBERS',
}

export enum VerifyLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum NsfwLevel {
  DEFAULT = 'DEFAULT',
  EXPLICIT = 'EXPLICIT',
  SAFE = 'SAFE',
  AGE_RESTRICTED = 'AGE_RESTRICTED',
}

export enum MfaLevel {
  NONE = 'NONE',
  ELEVATED = 'ELEVATED',
}

export enum PremiumTier {
  NONE = 'NONE',
  TIER_1 = 'TIER_1',
  TIER_2 = 'TIER_2',
  TIER_3 = 'TIER_3',
}

export enum GuildType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

// ========== CHANNEL & EVENT ENUMS ==========
export enum ChannelType {
  GUILD_TEXT = 'GUILD_TEXT',
  GUILD_VOICE = 'GUILD_VOICE',
  GUILD_CATEGORY = 'GUILD_CATEGORY',
  GUILD_STAGE_VOICE = 'GUILD_STAGE_VOICE',
  GUILD_FORUM = 'GUILD_FORUM',
  GUILD_ANNOUNCEMENT = 'GUILD_ANNOUNCEMENT',
}

export enum EventEntity {
  STAGE_INSTANCE = 'STAGE_INSTANCE',
  VOICE = 'VOICE',
  EXTERNAL = 'EXTERNAL',
}

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}
