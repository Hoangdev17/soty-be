import { Permission } from '../enums/permissions.enum';

export class PermissionsUtil {
  /**
   * Kiểm tra xem user có permission cụ thể không
   */
  static hasPermission(
    userPermissions: bigint,
    permission: Permission,
  ): boolean {
    const userPerms = BigInt(userPermissions);
    const perm = BigInt(permission);

    // Nếu có ADMINISTRATOR permission thì có tất cả quyền
    if (userPerms & BigInt(Permission.ADMINISTRATOR)) {
      return true;
    }

    return (userPerms & perm) === perm;
  }

  /**
   * Kiểm tra xem user có bất kỳ permission nào trong danh sách không
   */
  static hasAnyPermission(userPermissions: bigint, permissions: Permission[]): boolean {
    return permissions.some((permission) => this.hasPermission(userPermissions, permission));
  }

  /**
   * Kiểm tra xem user có tất cả permissions trong danh sách không
   */
  static hasAllPermissions(userPermissions: bigint, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userPermissions, permission));
  }

  /**
   * Thêm permission vào user permissions
   */
  static addPermission(userPermissions: bigint, permission: Permission): bigint {
    return userPermissions | BigInt(permission);
  }

  /**
   * Xóa permission khỏi user permissions
   */
  static removePermission(userPermissions: bigint, permission: Permission): bigint {
    return userPermissions & ~BigInt(permission);
  }

  /**
   * Toggle permission (thêm nếu chưa có, xóa nếu đã có)
   */
  static togglePermission(userPermissions: bigint, permission: Permission): bigint {
    if (this.hasPermission(userPermissions, permission)) {
      return this.removePermission(userPermissions, permission);
    } else {
      return this.addPermission(userPermissions, permission);
    }
  }

  /**
   * Lấy danh sách tất cả permissions mà user có
   */
  static getPermissionsList(userPermissions: bigint): Permission[] {
    const permissions: Permission[] = [];

    for (const permission of Object.values(Permission)) {
      if (typeof permission === 'number' && this.hasPermission(userPermissions, permission as Permission)) {
        permissions.push(permission as Permission);
      }
    }

    return permissions;
  }

  /**
   * Tính toán permissions cuối cùng của user trong server
   * Bao gồm: server permissions + role permissions
   */
  static calculateUserPermissions(
    serverPermissions: bigint,
    rolePermissions: bigint[],
  ): bigint {
    let finalPermissions = serverPermissions;

    // Cộng tất cả role permissions
    for (const rolePerm of rolePermissions) {
      finalPermissions |= BigInt(rolePerm);
    }

    return finalPermissions;
  }

  /**
   * Kiểm tra xem role có thể được assign cho user không
   * (Role phải có position thấp hơn role cao nhất của user)
   */
  static canAssignRole(
    userHighestRolePosition: number,
    targetRolePosition: number,
  ): boolean {
    return userHighestRolePosition > targetRolePosition;
  }

  /**
   * Kiểm tra xem user có thể quản lý role khác không
   */
  static canManageRole(
    userRolePosition: number,
    targetRolePosition: number,
  ): boolean {
    return userRolePosition > targetRolePosition;
  }

  /**
   * Lấy tên permission dễ đọc
   */
  static getPermissionName(permission: Permission): string {
    const permissionNames: Record<Permission, string> = {
      [Permission.CREATE_INSTANT_INVITE]: 'Tạo lời mời',
      [Permission.KICK_MEMBERS]: 'Kick thành viên',
      [Permission.BAN_MEMBERS]: 'Ban thành viên',
      [Permission.ADMINISTRATOR]: 'Quản trị viên',
      [Permission.MANAGE_CHANNELS]: 'Quản lý kênh',
      [Permission.MANAGE_GUILD]: 'Quản lý server',
      [Permission.ADD_REACTIONS]: 'Thêm phản ứng',
      [Permission.VIEW_AUDIT_LOG]: 'Xem nhật ký kiểm tra',
      [Permission.PRIORITY_SPEAKER]: 'Người nói ưu tiên',
      [Permission.STREAM]: 'Stream',
      [Permission.VIEW_CHANNEL]: 'Xem kênh',
      [Permission.SEND_MESSAGES]: 'Gửi tin nhắn',
      [Permission.SEND_TTS_MESSAGES]: 'Gửi tin nhắn TTS',
      [Permission.MANAGE_MESSAGES]: 'Quản lý tin nhắn',
      [Permission.EMBED_LINKS]: 'Nhúng liên kết',
      [Permission.ATTACH_FILES]: 'Đính kèm tệp',
      [Permission.READ_MESSAGE_HISTORY]: 'Đọc lịch sử tin nhắn',
      [Permission.MENTION_EVERYONE]: 'Mention mọi người',
      [Permission.USE_EXTERNAL_EMOJIS]: 'Sử dụng emoji bên ngoài',
      [Permission.VIEW_GUILD_INSIGHTS]: 'Xem thống kê server',
      [Permission.CONNECT]: 'Kết nối voice',
      [Permission.SPEAK]: 'Nói trong voice',
      [Permission.MUTE_MEMBERS]: 'Tắt tiếng thành viên',
      [Permission.DEAFEN_MEMBERS]: 'Tắt âm thanh thành viên',
      [Permission.MOVE_MEMBERS]: 'Di chuyển thành viên',
      [Permission.USE_VAD]: 'Sử dụng phát hiện giọng nói',
      [Permission.CHANGE_NICKNAME]: 'Đổi biệt danh',
      [Permission.MANAGE_NICKNAMES]: 'Quản lý biệt danh',
      [Permission.MANAGE_ROLES]: 'Quản lý vai trò',
      [Permission.MANAGE_WEBHOOKS]: 'Quản lý webhook',
      [Permission.MANAGE_EMOJIS_AND_STICKERS]: 'Quản lý emoji và sticker',
      [Permission.USE_APPLICATION_COMMANDS]: 'Sử dụng lệnh ứng dụng',
      [Permission.REQUEST_TO_SPEAK]: 'Yêu cầu nói',
      [Permission.MANAGE_EVENTS]: 'Quản lý sự kiện',
      [Permission.MANAGE_THREADS]: 'Quản lý thread',
      [Permission.CREATE_PUBLIC_THREADS]: 'Tạo thread công khai',
      [Permission.CREATE_PRIVATE_THREADS]: 'Tạo thread riêng tư',
      [Permission.USE_EXTERNAL_STICKERS]: 'Sử dụng sticker bên ngoài',
      [Permission.SEND_MESSAGES_IN_THREADS]: 'Gửi tin nhắn trong thread',
      [Permission.USE_EMBEDDED_ACTIVITIES]: 'Sử dụng hoạt động nhúng',
      [Permission.MODERATE_MEMBERS]: 'Kiểm duyệt thành viên',
    };
    
    return permissionNames[permission] || 'Quyền không xác định';
  }
}
