# 🚀 Production Redis Setup Guide - UPDATED

# 🚀 Redis URL Configuration - UNIFIED SETUP

## ✅ **HOÀN THÀNH**: Dev và Production đều sử dụng Redis URL format

### 🎯 **Configuration Summary:**

| Environment     | Redis URL                                       |
| --------------- | ----------------------------------------------- |
| **Development** | `redis://:yourRedisPassword123@soty-redis:6379` |
| **Production**  | `redis://red-d341peje5dus73ekv3k0:6379`         |

### 📁 **File Configuration:**

#### `.env` (Development):

```bash
REDIS_URL=redis://:yourRedisPassword123@soty-redis:6379
USER_CACHE_TTL=3600
```

#### `.env.production` (Production):

```bash
REDIS_URL=redis://red-d341peje5dus73ekv3k0:6379
USER_CACHE_TTL=3600
NODE_ENV=production
```

### 🔧 **Cache Module Features:**

- ✅ **Unified Redis URL Support**: Cả dev và production đều dùng `REDIS_URL`
- ✅ **Auto Detection**: Ưu tiên `REDIS_URL` > `REDIS_HOST` + `REDIS_PORT`
- ✅ **Graceful Fallback**: App không crash nếu Redis fail
- ✅ **Connection Logs**: `[ioredis] connecting to redis://:***@host:port`
- ✅ **Retry Strategy**: Auto retry với exponential backoff

### 🚀 **Deploy to Render:**

**Environment Variables cần set:**

```bash
AUTH_JWT_SECRET=yourSuperSecretKey123
JWT_EXPIRES_IN=3600s
DB_MONGO_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=db1fqr5vl
CLOUDINARY_API_KEY=922151912674914
CLOUDINARY_API_SECRET=ybOsFmgq-mAQ7JZ3DdhgJrTAUrw
REDIS_URL=redis://red-d341peje5dus73ekv3k0:6379
USER_CACHE_TTL=3600
NODE_ENV=production
```

### ✅ **Expected Logs:**

**Development:**

```
[ioredis] Using Redis URL configuration
[ioredis] connecting to redis://:***@soty-redis:6379
[ioredis] ready
[Nest] Application successfully started
```

**Production:**

```
[ioredis] Using Redis URL configuration
[ioredis] connecting to redis://:***@red-d341peje5dus73ekv3k0:6379
[ioredis] ready
[Nest] Application successfully started
```

### 🛠️ **Benefits:**

- **Simplified Config**: Single `REDIS_URL` variable cho cả dev/prod
- **No Host/Port Complexity**: Không cần quản lý host, port, password riêng biệt
- **Production Ready**: Format tương thích với cloud Redis services
- **Easy Deployment**: Copy/paste Redis URL từ cloud provider

### 🔍 **Testing Redis Connection:**

```bash
# Development (Local)
docker exec -it soty-redis redis-cli -a yourRedisPassword123 ping
# Expected: PONG

# Production (Test connection to cloud Redis)
redis-cli -u redis://red-d341peje5dus73ekv3k0:6379 ping
# Expected: PONG
```

**🎉 Redis configuration is now unified and production-ready!**

## 🔧 Cấu hình cho Render (Production):

### Environment Variables cần set trên Render Dashboard:

```bash
# Auth & JWT
AUTH_JWT_SECRET=yourSuperSecretKey123
JWT_EXPIRES_IN=3600s

# Database
DB_MONGO_URI=mongodb+srv://hoangluudev17_db_user:bBmlMPotmzycTxrk@soty.4xrwors.mongodb.net/dev?retryWrites=true&w=majority&appName=Soty

# Cloudinary
CLOUDINARY_CLOUD_NAME=db1fqr5vl
CLOUDINARY_API_KEY=922151912674914
CLOUDINARY_API_SECRET=ybOsFmgq-mAQ7JZ3DdhgJrTAUrw

# Redis (YOUR RENDER REDIS URL)
REDIS_URL=redis://red-d341peje5dus73ekv3k0:6379

# Cache settings
USER_CACHE_TTL=3600

# Environment
NODE_ENV=production
```

## 🎯 Deploy Steps:

1. **Commit & Push code mới**:

   ```bash
   git add .
   git commit -m "Add Redis URL support and graceful fallback"
   git push origin dev
   ```

2. **Trên Render Dashboard**:
   - Vào Service Settings
   - Add Environment Variable: `REDIS_URL=redis://red-d341peje5dus73ekv3k0:6379`
   - Deploy lại

3. **Verify logs** sau deploy:
   - Tìm `[ioredis] connecting to` và `[ioredis] ready`
   - Không còn lỗi `getaddrinfo ENOTFOUND soty-redis`

## 🔍 Development vs Production:

| Environment     | Redis Config                                      |
| --------------- | ------------------------------------------------- |
| **Development** | `REDIS_HOST=soty-redis` (Docker)                  |
| **Production**  | `REDIS_URL=redis://red-d341peje5dus73ekv3k0:6379` |

## �️ Features đã implement:

- ✅ **Redis URL Support**: Automatically detect và sử dụng `REDIS_URL` nếu có
- ✅ **Graceful Fallback**: App không crash nếu Redis fail
- ✅ **Development Compatible**: Vẫn hoạt động với Docker Redis
- ✅ **Error Handling**: Tất cả cache operations có try/catch
- ✅ **Retry Logic**: Auto retry connection với backoff strategy

## 🚨 Troubleshooting:

### Nếu vẫn có lỗi connection:

1. **Check Redis URL**: Đảm bảo URL đúng format
2. **Check Render logs**: Tìm `[ioredis]` messages
3. **Fallback mode**: App vẫn chạy được, chỉ không có cache

### Redis connection test:

```bash
# Test từ local (nếu có redis-cli)
redis-cli -u redis://red-d341peje5dus73ekv3k0:6379 ping
# Expected: PONG
```

## 🎉 Expected Result:

Sau khi deploy với `REDIS_URL`, logs sẽ hiển thị:

```
[ioredis] connecting to redis://red-***:6379
[ioredis] ready
[Nest] Application successfully started
```

**No more Redis connection errors!** 🚀
