// Guild Permission Constants
export class GuildPermissions {
  // Basic permissions
  static readonly VIEW_CHANNELS = 1n << 0n; // 1
  static readonly SEND_MESSAGES = 1n << 1n; // 2
  static readonly SEND_TTS_MESSAGES = 1n << 2n; // 4
  static readonly MANAGE_MESSAGES = 1n << 3n; // 8
  static readonly EMBED_LINKS = 1n << 4n; // 16
  static readonly ATTACH_FILES = 1n << 5n; // 32
  static readonly READ_MESSAGE_HISTORY = 1n << 6n; // 64
  static readonly MENTION_EVERYONE = 1n << 7n; // 128
  static readonly USE_EXTERNAL_EMOJIS = 1n << 8n; // 256
  static readonly VIEW_GUILD_INSIGHTS = 1n << 9n; // 512

  // Voice permissions
  static readonly CONNECT = 1n << 10n; // 1024
  static readonly SPEAK = 1n << 11n; // 2048
  static readonly MUTE_MEMBERS = 1n << 12n; // 4096
  static readonly DEAFEN_MEMBERS = 1n << 13n; // 8192
  static readonly MOVE_MEMBERS = 1n << 14n; // 16384
  static readonly USE_VAD = 1n << 15n; // 32768

  // Moderation permissions
  static readonly KICK_MEMBERS = 1n << 16n; // 65536
  static readonly BAN_MEMBERS = 1n << 17n; // 131072
  static readonly MANAGE_ROLES = 1n << 18n; // 262144
  static readonly MANAGE_CHANNELS = 1n << 19n; // 524288
  static readonly MANAGE_GUILD = 1n << 20n; // 1048576
  static readonly ADD_REACTIONS = 1n << 21n; // 2097152
  static readonly VIEW_AUDIT_LOG = 1n << 22n; // 4194304

  // Advanced permissions
  static readonly PRIORITY_SPEAKER = 1n << 23n; // 8388608
  static readonly STREAM = 1n << 24n; // 16777216
  static readonly USE_SLASH_COMMANDS = 1n << 25n; // 33554432
  static readonly MANAGE_THREADS = 1n << 26n; // 67108864
  static readonly CREATE_PUBLIC_THREADS = 1n << 27n; // 134217728
  static readonly CREATE_PRIVATE_THREADS = 1n << 28n; // 268435456
  static readonly USE_EXTERNAL_STICKERS = 1n << 29n; // 537870912
  static readonly SEND_MESSAGES_IN_THREADS = 1n << 30n; // 1073741824
  static readonly USE_EMBEDDED_ACTIVITIES = 1n << 31n; // 2147483648
  static readonly MODERATE_MEMBERS = 1n << 32n; // 4294967296

  // Admin permissions
  static readonly ADMINISTRATOR = 1n << 33n; // 8589934592

  // Default permissions for @everyone role
  static readonly DEFAULT_EVERYONE_PERMISSIONS =
    GuildPermissions.VIEW_CHANNELS |
    GuildPermissions.SEND_MESSAGES |
    GuildPermissions.EMBED_LINKS |
    GuildPermissions.ATTACH_FILES |
    GuildPermissions.READ_MESSAGE_HISTORY |
    GuildPermissions.ADD_REACTIONS |
    GuildPermissions.USE_EXTERNAL_EMOJIS |
    GuildPermissions.CONNECT |
    GuildPermissions.SPEAK |
    GuildPermissions.USE_VAD |
    GuildPermissions.STREAM |
    GuildPermissions.USE_SLASH_COMMANDS;

  // Helper method to check if user has permission
  static hasPermission(userPermissions: bigint, permission: bigint): boolean {
    // Administrator has all permissions
    if (
      (userPermissions & GuildPermissions.ADMINISTRATOR) ===
      GuildPermissions.ADMINISTRATOR
    ) {
      return true;
    }
    return (userPermissions & permission) === permission;
  }

  // Helper method to combine permissions
  static combinePermissions(...permissions: bigint[]): bigint {
    return permissions.reduce((acc, perm) => acc | perm, 0n);
  }
}

// Permission names mapping for String[] format
export const PERMISSION_NAMES: Record<string, string> = {
  '1': 'VIEW_CHANNELS',
  '2': 'SEND_MESSAGES',
  '4': 'SEND_TTS_MESSAGES',
  '8': 'MANAGE_MESSAGES',
  '16': 'EMBED_LINKS',
  '32': 'ATTACH_FILES',
  '64': 'READ_MESSAGE_HISTORY',
  '128': 'MENTION_EVERYONE',
  '256': 'USE_EXTERNAL_EMOJIS',
  '512': 'VIEW_GUILD_INSIGHTS',
  '1024': 'CONNECT',
  '2048': 'SPEAK',
  '4096': 'MUTE_MEMBERS',
  '8192': 'DEAFEN_MEMBERS',
  '16384': 'MOVE_MEMBERS',
  '32768': 'USE_VAD',
  '65536': 'KICK_MEMBERS',
  '131072': 'BAN_MEMBERS',
  '262144': 'MANAGE_ROLES',
  '524288': 'MANAGE_CHANNELS',
  '1048576': 'MANAGE_GUILD',
  '2097152': 'ADD_REACTIONS',
  '4194304': 'VIEW_AUDIT_LOG',
  '8388608': 'PRIORITY_SPEAKER',
  '16777216': 'STREAM',
  '33554432': 'USE_SLASH_COMMANDS',
  '67108864': 'MANAGE_THREADS',
  '134217728': 'CREATE_PUBLIC_THREADS',
  '268435456': 'CREATE_PRIVATE_THREADS',
  '536870912': 'USE_EXTERNAL_STICKERS',
  '1073741824': 'SEND_MESSAGES_IN_THREADS',
  '2147483648': 'USE_EMBEDDED_ACTIVITIES',
  '4294967296': 'MODERATE_MEMBERS',
  '8589934592': 'ADMINISTRATOR',
};

// Reverse mapping for String[] to BigInt conversion
export const PERMISSION_VALUES: Record<string, bigint> = {};
Object.entries(PERMISSION_NAMES).forEach(([key, value]) => {
  PERMISSION_VALUES[value] = BigInt(key);
});

// Utility functions for permission conversion
export class PermissionUtils {
  /**
   * Convert BigInt permissions to String[] for JSON serialization
   */
  static bigIntToStringArray(permissions: bigint): string[] {
    const result: string[] = [];
    Object.entries(PERMISSION_NAMES).forEach(([bitValue, name]) => {
      const bit = BigInt(bitValue);
      if ((permissions & bit) === bit) {
        result.push(name);
      }
    });
    return result;
  }

  /**
   * Convert String[] permissions to BigInt for bitwise operations
   */
  static stringArrayToBigInt(permissions: string[]): bigint {
    let result = 0n;
    permissions.forEach((permission) => {
      const value = PERMISSION_VALUES[permission];
      if (value) {
        result |= value;
      }
    });
    return result;
  }

  /**
   * Check if user has permission (supports both BigInt and String[])
   */
  static hasPermission(
    userPermissions: bigint | string[],
    permission: bigint | string,
  ): boolean {
    if (typeof userPermissions === 'bigint' && typeof permission === 'bigint') {
      return GuildPermissions.hasPermission(userPermissions, permission);
    }

    if (Array.isArray(userPermissions) && typeof permission === 'string') {
      return userPermissions.includes(permission);
    }

    // Mixed types - convert to common format
    if (Array.isArray(userPermissions) && typeof permission === 'bigint') {
      const permName =
        PERMISSION_NAMES[
          permission.toString() as keyof typeof PERMISSION_NAMES
        ];
      return permName ? userPermissions.includes(permName) : false;
    }

    if (typeof userPermissions === 'bigint' && typeof permission === 'string') {
      const permValue = PERMISSION_VALUES[permission];
      return permValue
        ? GuildPermissions.hasPermission(userPermissions, permValue)
        : false;
    }

    return false;
  }

  /**
   * Get default permissions as String[]
   */
  static getDefaultPermissions(): string[] {
    return this.bigIntToStringArray(
      GuildPermissions.DEFAULT_EVERYONE_PERMISSIONS,
    );
  }

  /**
   * Validate permission name
   */
  static isValidPermission(permission: string): boolean {
    return permission in PERMISSION_VALUES;
  }
}
