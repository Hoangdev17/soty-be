import type { Request } from 'express';
import { Platform } from '@prisma/client';
import * as UAParser from 'ua-parser-js';

export interface DeviceInfo {
  platform: Platform;
  ip: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceModel?: string;
  deviceVendor?: string;
  userAgent?: string;
  lastActiveAt: Date;
}

export class DeviceUtil {
  /**
   * Lấy IP address từ request
   */
  static getIpAddress(req: Request): string {
    // Kiểm tra các header proxy phổ biến
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = req.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    // Fallback sang IP từ connection
    return (
      req.socket.remoteAddress || req.connection.remoteAddress || 'unknown'
    );
  }

  /**
   * Parse user agent để xác định platform
   */
  static parsePlatform(userAgent?: string): Platform {
    if (!userAgent) {
      return Platform.WEB;
    }

    const ua = userAgent.toLowerCase();

    // Kiểm tra mobile platforms
    if (ua.includes('android')) {
      return Platform.ANDROID;
    }

    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      return Platform.IOS;
    }

    // Kiểm tra desktop apps
    if (ua.includes('electron') || ua.includes('desktop')) {
      return Platform.DESKTOP;
    }

    // Default là web
    return Platform.WEB;
  }

  /**
   * Tạo device info từ request
   */
  static extractDeviceInfo(req: Request): DeviceInfo {
    const userAgent = req.headers['user-agent'];
    const ip = this.getIpAddress(req);
    const platform = this.parsePlatform(userAgent);

    // Parse chi tiết user agent
    const parser = new UAParser.UAParser();
    parser.setUA(userAgent || '');
    const result = parser.getResult();

    return {
      platform,
      ip,
      browser: result.browser.name || undefined,
      browserVersion: result.browser.version || undefined,
      os: result.os.name || undefined,
      osVersion: result.os.version || undefined,
      deviceModel: result.device.model || undefined,
      deviceVendor: result.device.vendor || undefined,
      userAgent,
      lastActiveAt: new Date(),
    };
  }

  /**
   * Kiểm tra xem device đã tồn tại trong danh sách chưa
   * (dựa trên platform và IP)
   */
  static findExistingDevice(devices: any[], newDevice: DeviceInfo): number {
    return devices.findIndex(
      (d) => d.platform === newDevice.platform && d.ip === newDevice.ip,
    );
  }

  /**
   * Thêm device mới vào lịch sử (luôn lưu lại tất cả lần đăng nhập)
   */
  static addDeviceToHistory(
    existingDevices: any[],
    newDevice: DeviceInfo,
  ): any[] {
    // Luôn thêm device mới vào mảng để lưu lịch sử đầy đủ
    return [
      ...existingDevices,
      {
        platform: newDevice.platform,
        ip: newDevice.ip,
        browser: newDevice.browser,
        browserVersion: newDevice.browserVersion,
        os: newDevice.os,
        osVersion: newDevice.osVersion,
        deviceModel: newDevice.deviceModel,
        deviceVendor: newDevice.deviceVendor,
        userAgent: newDevice.userAgent,
        lastActiveAt: newDevice.lastActiveAt,
      },
    ];
  }

  /**
   * Cập nhật hoặc thêm mới device vào danh sách
   * (Dùng khi muốn merge device trùng platform+IP)
   */
  static upsertDevice(existingDevices: any[], newDevice: DeviceInfo): any[] {
    const devices = [...existingDevices];
    const existingIndex = this.findExistingDevice(devices, newDevice);

    if (existingIndex >= 0) {
      // Cập nhật device hiện có
      devices[existingIndex] = {
        ...devices[existingIndex],
        lastActiveAt: newDevice.lastActiveAt,
      };
    } else {
      // Thêm device mới
      devices.push({
        platform: newDevice.platform,
        ip: newDevice.ip,
        lastActiveAt: newDevice.lastActiveAt,
      });
    }

    return devices;
  }
}
