import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD;
const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword || undefined,
  // Connection tuning
  connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
  // retry strategy in ms (called with number of attempts)
  retryStrategy: (times: number) => Math.min(times * 100, 2000),
  // Reconnect on certain errors
  reconnectOnError: (err) => {
    // return true to reconnect for transient errors
    return true;
  },
});

// Attach listeners to avoid unhandled 'error' events and to provide diagnostics.
redisClient.on('error', (err) => {
  // Do not throw here; log for diagnostics. If Redis host is wrong (e.g., 'soty-redis'),
  // you'll see DNS/connect errors here. Check REDIS_HOST/REDIS_PORT or docker-compose.
  // eslint-disable-next-line no-console
  console.warn('[ioredis] error', err && err.message ? err.message : err);
});
redisClient.on('connect', () => {
  // eslint-disable-next-line no-console
  console.log('[ioredis] connecting to', `${redisHost}:${redisPort}`);
});
redisClient.on('ready', () => {
  // eslint-disable-next-line no-console
  console.log('[ioredis] ready');
});
redisClient.on('close', () => {
  // eslint-disable-next-line no-console
  console.log('[ioredis] connection closed');
});

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useValue: redisClient,
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CoreCacheModule {}
