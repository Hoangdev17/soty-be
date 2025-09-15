import { Injectable, Inject } from '@nestjs/common';
import type Redis from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {}

  async get<T = any>(key: string): Promise<T | undefined> {
    const raw = await this.client.get(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number) {
    const raw = JSON.stringify(value);
    if (typeof ttlSeconds === 'number') {
      return await this.client.set(key, raw, 'EX', ttlSeconds);
    }
    return await this.client.set(key, raw);
  }

  async del(key: string) {
    return await this.client.del(key);
  }

  /**
   * Cache common user keys for faster lookup.
   * Sets keys: user:login:<id>, user:id:<id>, user:email:<email>, user:username:<username>
   */
  async cacheUser(user: any) {
    if (!user || !user.id) return;
    const ttl = Number(process.env.USER_CACHE_TTL) || 60;
    const raw = JSON.stringify(user);

    return this.client.set(`user:id:${user.id}`, raw, 'EX', ttl);
  }

  /**
   * Remove cached keys for a user. You can pass email/username if available to avoid
   * reading the DB first.
   */
  async uncacheUser(userId: string, email?: string, username?: string) {
    if (!userId) return 0;
    return await this.client.del(`user:id:${userId}`);
  }
}
