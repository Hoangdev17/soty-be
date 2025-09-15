import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { CacheService } from './cache.service';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = Number(process.env.REDIS_PORT) || 6379;
const redisPassword = process.env.REDIS_PASSWORD;

// Check if Redis is available in environment
// Priority: REDIS_URL > REDIS_HOST + REDIS_PORT
const isRedisEnabled =
  redisUrl || (process.env.REDIS_HOST && process.env.REDIS_HOST !== '');

let redisClient: Redis | null = null;

if (isRedisEnabled) {
  const redisOptions = {
    // Connection tuning
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT) || 10000,
    // retry strategy in ms (called with number of attempts)
    retryStrategy: (times: number) => {
      if (times > 5) {
        console.warn(
          '[ioredis] Redis connection failed after 5 retries, disabling cache',
        );
        return null; // Stop retrying
      }
      return Math.min(times * 100, 2000);
    },
    // Reconnect on certain errors
    reconnectOnError: (err) => {
      const targetError = /READONLY|ECONNRESET|ETIMEDOUT/;
      return targetError.test(err.message);
    },
  };

  // Use Redis URL if provided (preferred), otherwise use individual host/port/password
  if (redisUrl) {
    console.log('[ioredis] Using Redis URL configuration');
    redisClient = new Redis(redisUrl, redisOptions);
  } else {
    console.log('[ioredis] Using Redis host/port configuration');
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword || undefined,
      ...redisOptions,
    });
  }

  // Attach listeners to avoid unhandled 'error' events and to provide diagnostics.
  redisClient.on('error', (err) => {
    console.warn('[ioredis] error', err && err.message ? err.message : err);
  });
  redisClient.on('connect', () => {
    const connectionInfo = redisUrl
      ? redisUrl.replace(/:[^:@]*@/, ':***@')
      : `${redisHost}:${redisPort}`;
    console.log('[ioredis] connecting to', connectionInfo);
  });
  redisClient.on('ready', () => {
    console.log('[ioredis] ready');
  });
  redisClient.on('close', () => {
    console.log('[ioredis] connection closed');
  });
} else {
  console.warn('[ioredis] Redis disabled - using fallback mode');
}

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
