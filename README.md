# 🛠️ Social Community Platform - Backend

Backend API cho dự án **Social Community Platform**, được phát triển với [NestJS](https://nestjs.com/).  
Nền tảng kết hợp tính năng **chat real-time, news feed và short video**, mang đến trải nghiệm như Discord và TikTok.

---

## 🚀 Công nghệ sử dụng

| Công nghệ                                                                                               | Mô tả                                     |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **[NestJS](https://nestjs.com/)**                                                                       | Node.js framework hiện đại với TypeScript |
| **[Prisma](https://www.prisma.io/)**                                                                    | ORM type-safe cho PostgreSQL              |
| **[MongoDB](https://www.mongo.org/)**                                                           | Hệ quản trị cơ sở dữ liệu chính           |
| **[Redis](https://redis.io/)**                                                                          | Cache, Pub/Sub và message queue           |
| **[Socket.IO](https://socket.io/)** / **WebRTC**                                                        | Giao tiếp real-time                       |
| **[AWS S3](https://aws.amazon.com/s3/)** / **[Cloudflare R2](https://www.cloudflare.com/products/r2/)** | Lưu trữ media (ảnh, video)                |
| **[Swagger](https://swagger.io/)**                                                                      | Tự động generate API documentation        |

---

## 📂 Cấu trúc dự án

```
src/
├── packages/                 # Các module nghiệp vụ chính
│   ├── auth/               # Xác thực & phân quyền
│   ├── user/               # Quản lý người dùng
│   ├── server/             # Quản lý server/cộng đồng
│   ├── channel/            # Kênh chat trong server
│   ├── message/            # Tin nhắn & chat
│   ├── feed/               # Bảng tin & bài đăng
│   ├── video/              # Short video & streaming
│   └── notification/       # Hệ thống thông báo
├── common/                 # Shared components
│   ├── guards/             # Authentication guards
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   ├── interceptors/       # Response interceptors
│   └── dto/               # Data Transfer Objects
├── database/               # Cấu hình database
│   ├── prisma/            # Schema & migrations
│   └── seeds/             # Dữ liệu mẫu
├── config/                # Cấu hình ứng dụng
├── utils/                 # Các utility functions
├── main.ts                # Entry point của ứng dụng
└── app.module.ts          # Root module
```

---

## ⚙️ Hướng dẫn cài đặt

### 1. **Clone repository**

```bash
git clone https://github.com/Hoangdev17/soty-be.git
cd soty-be
```

### 2. **Cài đặt dependencies**

```bash
npm install
# hoặc
yarn install
```

### 3. **Cấu hình biến môi trường**

Tạo file `.env` trong thư mục gốc:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/social_platform"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""

# AWS S3 / Cloudflare R2
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="your-bucket-name"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_APP_ID="your-facebook-app-id"
FACEBOOK_APP_SECRET="your-facebook-app-secret"

# Other
PORT=3000
NODE_ENV="development"
```

### 4. **Thiết lập cơ sở dữ liệu**

```bash
# Generate Prisma client
npx prisma generate

# Chạy migration
npx prisma migrate dev

# Seed dữ liệu mẫu (optional)
npx prisma db seed
```

### 5. **Khởi chạy ứng dụng**

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## 📖 API Documentation

**Swagger UI**: [http://localhost:3000/api](http://localhost:3000/api)

Tài liệu API được tự động generate và cập nhật real-time với mọi thay đổi endpoint.

---

## 🧩 Các module chính

### **🔐 Auth Module**

- Đăng ký / Đăng nhập bằng email/username
- OAuth integration (Google, Facebook)
- JWT token authentication
- Password reset & email verification

### **👤 User Module**

- Quản lý hồ sơ cá nhân
- Hệ thống bạn bè & theo dõi
- Avatar & banner upload
- Privacy settings

### **🏢 Server Module**

- Tạo & quản lý server/cộng đồng
- Roles & permissions system
- Server discovery
- Invite system

### **📺 Channel Module**

- Text, voice, video channels
- Channel permissions
- Thread discussions
- Pin messages

### **💬 Message Module**

- Real-time messaging
- File & media sharing
- Message reactions & emojis
- Message history & search

### **📰 Feed Module**

- Tạo & chia sẻ bài đăng
- Like, comment, share
- Image/video posts
- Feed algorithm

### **🎬 Video Module**

- Upload short videos
- Video processing & compression
- Video streaming
- View count & analytics

### **🔔 Notification Module**

- Real-time push notifications
- In-app notification center
- Email notifications
- Notification preferences

---

## 🛡️ Security Features

- **JWT Authentication** với refresh token rotation
- **Rate limiting** cho API endpoints
- **CORS** configuration
- **Input validation** với class-validator
- **SQL injection** protection với Prisma
- **File upload** security với type validation

---

## 🚀 Performance Optimization

- **Redis caching** cho data frequently accessed
- **Database indexing** optimization
- **Image/video compression** trước khi upload
- **CDN integration** cho static assets
- **Query optimization** với Prisma

---

## 📊 Monitoring & Logging

- **Winston** logger với multiple transports
- **Health check** endpoints
- **Metrics collection** cho API performance
- **Error tracking** và notification

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

---

## 🔄 CI/CD

- **GitHub Actions** workflow
- **Docker** containerization
- **Automated testing** trên mọi PR
- **Deployment** tự động lên staging/production

---

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

---

## 📝 License

Dự án này được phân phối dưới [MIT License](LICENSE).

---

## 📞 Liên hệ

- **Developer**: Hoang Dev
- **Email**: hoangdev17@example.com
- **GitHub**: [Hoangdev17](https://github.com/Hoangdev17)

---

## 🎯 Roadmap

- [ ] **Q1 2024**: Voice/Video calling
- [ ] **Q2 2024**: Mobile app integration
- [ ] **Q3 2024**: AI-powered content moderation
- [ ] **Q4 2024**: Advanced analytics dashboard
