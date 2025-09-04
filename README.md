# 🛠️ Backend - Social Community Platform

Backend cho dự án **Social Community Platform**, được xây dựng bằng [NestJS](https://nestjs.com/).  
Nền tảng này cung cấp API cho hệ thống **chat real-time, news feed và short video**, kết hợp tính năng của Discord và TikTok.

---

## 🚀 Công nghệ sử dụng

- [NestJS](https://nestjs.com/) - Node.js framework
- [Prisma](https://www.prisma.io/) - ORM cho PostgreSQL
- [PostgreSQL](https://www.postgresql.org/) - Database chính
- [Redis](https://redis.io/) - Pub/Sub, cache, queue
- [Socket.IO](https://socket.io/) / WebRTC - Real-time communication
- [AWS S3 / Cloudflare R2] - Lưu trữ media (ảnh, video)
- [Swagger](https://swagger.io/) - API docs

---

## 📂 Cấu trúc thư mục

```bash
src/
├── modules/          # Các module chính (auth, user, server, chat, feed, video)
│   ├── auth/         
│   ├── user/
│   ├── server/
│   ├── channel/
│   ├── message/
│   ├── feed/
│   └── video/
├── common/           # Middleware, filters, decorators, guards
├── database/         # Prisma schema + migration
├── main.ts           # Entry point
└── app.module.ts     # Root module
⚙️ Cài đặt
1. Clone repo
  git clone https://github.com/Hoangdev17/soty-be
  cd soty-be
2. Cài dependencies
  npm install
3. Cấu hình biến môi trường
  Tạo file .env ở root:
4. Generate db: (npx prisma generate)
5. Chạy server: (npm run start:dev)
📖 API Docs
Swagger: http://localhost:3000/api
🧩 Các module chính
Auth → Đăng nhập / đăng ký (JWT, OAuth Google/Facebook)
User → Hồ sơ cá nhân, bạn bè, follow
Server / Channel → Quản lý cộng đồng, roles, permissions
Message → Chat text, reactions, emoji
Feed → Bảng tin (post, like, comment)
Video → Upload & xem short video
Notification → Thông báo real-time
