# Dev Container Setup - Soty BE

## 🚀 Cách sử dụng Dev Container

### Prerequisites

- VS Code với extension: **Dev Containers**
- Docker Desktop đang chạy

### Khởi động Dev Container

1. **Mở project trong VS Code**
2. **Command Palette** (`Ctrl+Shift+P`)
3. Chọn: `Dev Containers: Reopen in Container`
4. Đợi container build và khởi động

### Hoặc từ Command Palette:

- `Dev Containers: Rebuild and Reopen in Container` (rebuild nếu có thay đổi)

## 📁 Cấu trúc Dev Container

```
.devcontainer/
├── devcontainer.json          # Cấu hình chính
└── docker-compose.yml         # Services (API, Redis, MongoDB)
```

## 🔧 Services đã cấu hình

| Service     | Port  | Description                     |
| ----------- | ----- | ------------------------------- |
| **API**     | 3000  | NestJS Application (hot-reload) |
| **Redis**   | 6379  | Cache service với password      |
| **MongoDB** | 27017 | Database service                |

## 🔑 Environment Variables

Tất cả env vars được load từ `.env` file:

- `REDIS_HOST=soty-redis`
- `REDIS_PASSWORD=yourRedisPassword123`
- `DATABASE_URL=...`
- `AUTH_JWT_SECRET=...`
- Và tất cả Cloudinary configs

## 🛠️ VS Code Extensions (Auto-installed)

- TypeScript & ESLint
- Prettier (format on save)
- Prisma
- Docker
- Thunder Client (API testing)
- YAML & JSON support

## 📝 Development Workflow

1. **Code changes** → Auto hot-reload
2. **Database changes** → `npm run prisma:generate`
3. **Package changes** → Rebuild container
4. **Test APIs** → Thunder Client extension

## 🐛 Debug & Logs

```bash
# Trong VS Code terminal (inside container)
npm run start:dev           # Manual start
npm run build              # Build for production
npm run prisma:studio      # Database UI

# Từ host machine
docker compose logs -f api    # Follow API logs
docker compose logs redis    # Redis logs
docker compose logs mongo    # MongoDB logs
```

## 🔄 Rebuild Container

Khi có thay đổi:

- `Dockerfile.dev`
- `package.json` dependencies
- Dev container configuration

→ **Command Palette** → `Dev Containers: Rebuild Container`

## 🚨 Troubleshooting

### Container không start

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Permission issues

- Dev container chạy với root user để tránh permission conflicts
- Hot-reload works seamlessly với volume mounts

### Cache issues

```bash
# Clear Redis cache
docker exec -it soty-redis redis-cli -a yourRedisPassword123 FLUSHALL
```

## 🎯 Production vs Development

|                | Development (Dev Container) | Production          |
| -------------- | --------------------------- | ------------------- |
| **Dockerfile** | `Dockerfile.dev`            | `Dockerfile`        |
| **Command**    | `npm run start:dev`         | `node dist/main.js` |
| **User**       | `root`                      | `node`              |
| **Volumes**    | Source code mounted         | Code copied         |
| **Hot Reload** | ✅ Enabled                  | ❌ Disabled         |
