import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis | null) {}

  async get<T = any>(key: string): Promise<T | undefined> {
    if (!this.client) {
      console.warn(
        '[CacheService] Redis not available, returning undefined for key:',
        key,
      );
      return undefined;
    }

    try {
      const raw = await this.client.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.warn('[CacheService] Error getting key:', key, error);
      return undefined;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number) {
    if (!this.client) {
      console.warn(
        '[CacheService] Redis not available, skipping cache set for key:',
        key,
      );
      return null;
    }

    try {
      // JSON.stringify với replacer để convert BigInt sang string
      const raw = JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      );

      if (typeof ttlSeconds === 'number') {
        return await this.client.set(key, raw, 'EX', ttlSeconds);
      }
      return await this.client.set(key, raw);
    } catch (error) {
      console.warn('[CacheService] Error setting key:', key, error);
      return null;
    }
  }

  async del(key: string) {
    if (!this.client) {
      console.warn(
        '[CacheService] Redis not available, skipping cache delete for key:',
        key,
      );
      return 0;
    }

    try {
      return await this.client.del(key);
    } catch (error) {
      console.warn('[CacheService] Error deleting key:', key, error);
      return 0;
    }
  }

  /**
   * Delete all keys matching a pattern using SCAN
   * Pattern example: "messages:channel:123:*"
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.client) {
      console.warn(
        '[CacheService] Redis not available, skipping pattern delete:',
        pattern,
      );
      return 0;
    }

    try {
      let cursor = '0';
      let deletedCount = 0;
      const batchSize = 100;

      do {
        // SCAN returns [cursor, keys[]]
        const result = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize,
        );
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      console.warn('[CacheService] Error deleting by pattern:', pattern, error);
      return 0;
    }
  }

  /**
   * Cache common user keys for faster lookup.
   * Sets keys: user:login:<id>, user:id:<id>, user:email:<email>, user:username:<username>
   */
  async cacheUser(user: any) {
    if (!user || !user.id) return;
    if (!this.client) {
      console.warn('[CacheService] Redis not available, skipping user cache');
      return;
    }

    try {
      const ttl = Number(process.env.USER_CACHE_TTL) || 60;
      const raw = JSON.stringify(user);
      return this.client.set(`user:id:${user.id}`, raw, 'EX', ttl);
    } catch (error) {
      console.warn('[CacheService] Error caching user:', error);
      return null;
    }
  }

  /**
   * Remove cached keys for a user. You can pass email/username if available to avoid
   * reading the DB first.
   */
  async uncacheUser(userId: string, email?: string, username?: string) {
    if (!userId) return 0;
    if (!this.client) {
      console.warn('[CacheService] Redis not available, skipping user uncache');
      return 0;
    }

    try {
      return await this.client.del(`user:id:${userId}`);
    } catch (error) {
      console.warn('[CacheService] Error uncaching user:', error);
      return 0;
    }
  }
}
