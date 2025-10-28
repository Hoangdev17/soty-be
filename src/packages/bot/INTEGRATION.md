# Tích hợp Bot Command Processing vào Message Service

## Tổng quan

Bot commands giờ đây được tự động xử lý mỗi khi có tin nhắn mới được gửi trong guild. Không cần gọi endpoint `/bots/process-message` thủ công nữa.

## Cách hoạt động

### 1. Khi user gửi tin nhắn

```typescript
// User gửi tin nhắn qua API
POST /messages/send
{
  "content": "!ping",
  "channelId": "channel_123"
}
```

### 2. Message Service tự động xử lý

```typescript
// Trong MessageService.sendMessage()
async sendMessage(sendMessageDto: SendMessageDto, authorId: string) {
  // ... tạo message trong database ...

  // TỰ ĐỘNG xử lý bot commands
  if (message.channel.guildId) {
    await this.botMessageProcessor.processMessage({
      messageId: message.id,
      channelId: message.channel.id,
      guildId: message.channel.guildId,
      authorId: message.author.id,
      content: message.content,
    });
  }

  return response;
}
```

### 3. Bot Message Processor xử lý

```typescript
// BotMessageProcessor.processMessage()
async processMessage(messageContext: MessageContext) {
  // 1. Kiểm tra nếu author là bot → skip (tránh infinite loop)
  if (author?.isBot) return;

  // 2. Tìm tất cả bots trong guild
  // 3. Kiểm tra commands của từng bot
  // 4. Match pattern với message content
  // 5. Thực thi handler tương ứng
  // 6. Gửi bot response về channel
}
```

## Flow hoàn chỉnh

```
User sends: "!ping"
      ↓
POST /messages/send
      ↓
MessageService.sendMessage()
      ↓
Create message in DB
      ↓
Emit to WebSocket
      ↓
BotMessageProcessor.processMessage() ← TỰ ĐỘNG
      ↓
Check if author is bot? → Yes: Skip
                       → No: Continue
      ↓
Find all bots in guild
      ↓
Check each bot's commands
      ↓
Match "!ping" with command patterns
      ↓
Found: pingHandler
      ↓
Execute pingHandler
      ↓
Create bot response message
      ↓
Bot replies: "🏓 Pong!"
```

## Tính năng

### ✅ Tự động xử lý

- Không cần gọi API riêng
- Bot tự động phản hồi khi match command
- Hoạt động trong background, không block message sending

### ✅ Tránh infinite loop

- Bỏ qua tin nhắn từ bots
- Bot không trigger bot khác
- Chỉ xử lý tin nhắn từ users

### ✅ Error handling

- Lỗi từ bot processing không ảnh hưởng đến message sending
- Wrapped trong try-catch
- Log errors nhưng không throw

### ✅ Hỗ trợ cả reply messages

- sendMessage() → có bot processing
- sendReply() → có bot processing
- Cả 2 methods đều trigger bots

## Ví dụ sử dụng

### Setup Bot

```typescript
// 1. Tạo bot
POST /bots
{
  "username": "PingBot",
  "displayName": "Ping Bot"
}

// 2. Tạo action
POST /bots/{botId}/skills/{skillId}/actions
{
  "name": "PingAction",
  "handler": "pingHandler"
}

// 3. Tạo command
POST /bots/{botId}/commands
{
  "name": "ping",
  "triggerType": "PREFIX",
  "pattern": "!ping",
  "actionId": "{actionId}"
}

// 4. Invite bot
POST /bots/{botId}/invite/{guildId}
```

### User gửi message

```typescript
// Chỉ cần gửi message bình thường
POST /messages/send
{
  "content": "!ping",
  "channelId": "channel_123"
}

// Bot TỰ ĐỘNG phản hồi "🏓 Pong!"
```

## Lợi ích

### 1. Đơn giản hơn

- Không cần endpoint riêng cho bot processing
- Client không cần gọi 2 API
- Tự động và trong suốt

### 2. Real-time

- Bot phản hồi ngay lập tức
- Không có delay
- User experience tốt hơn

### 3. Scalable

- Bot processing không block message sending
- Error-resilient
- Có thể xử lý nhiều bots cùng lúc

### 4. Maintainable

- Code tập trung ở message service
- Dễ debug
- Dễ test

## Lưu ý

### Messages từ bots

```typescript
// Bot response messages KHÔNG trigger bots khác
// Tránh infinite loop:
// User: !ping
// Bot: Pong!  ← Tin nhắn này KHÔNG trigger commands
```

### Error handling

```typescript
// Nếu bot processing lỗi:
try {
  await this.botMessageProcessor.processMessage(...);
} catch (error) {
  console.warn('Failed to process bot commands:', error);
  // Không throw, message vẫn được gửi thành công
}
```

### Performance

```typescript
// Bot processing chạy async
// Không block message response
// User nhận response ngay lập tức
// Bot processing chạy background
```

## API Changes

### TRƯỚC (Cũ)

```typescript
// Client phải gọi 2 API
1. POST /messages/send     → Gửi message
2. POST /bots/process-message  → Xử lý bot commands
```

### SAU (Mới)

```typescript
// Client chỉ cần 1 API
POST /messages/send     → Gửi message + tự động xử lý bot
```

### Endpoint cũ vẫn hoạt động

```typescript
// /bots/process-message vẫn có thể dùng
// Dành cho:
// - Testing
// - Manual trigger
// - Replay messages
// - Debugging
```

## Testing

### Test bot commands

```bash
# 1. Gửi message
curl -X POST http://localhost:3000/messages/send \
  -H "Authorization: Bearer <token>" \
  -d '{
    "content": "!ping",
    "channelId": "channel_123"
  }'

# Response:
# {
#   "id": "msg_001",
#   "content": "!ping",
#   ...
# }

# 2. Bot tự động phản hồi
# WebSocket event: MESSAGE
# {
#   "id": "msg_002",
#   "content": "🏓 Pong!",
#   "author": {
#     "id": "bot_123",
#     "username": "PingBot",
#     "isBot": true
#   }
# }
```

### Check bot execution history

```bash
GET http://localhost:3000/bots/{botId}/executions

# Response:
# [
#   {
#     "id": "exec_001",
#     "messageId": "msg_001",
#     "commandId": "cmd_001",
#     "result": {
#       "success": true,
#       "response": "🏓 Pong!"
#     },
#     "executedAt": "2024-01-01T00:00:00.000Z"
#   }
# ]
```

## Migration Guide

### Nếu bạn đang dùng endpoint cũ

```typescript
// TRƯỚC
async sendMessageAndTriggerBot(content: string, channelId: string) {
  // Gửi message
  const message = await fetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ content, channelId })
  });

  // Trigger bot manually
  await fetch('/bots/process-message', {
    method: 'POST',
    body: JSON.stringify({
      messageId: message.id,
      channelId: channelId,
      guildId: message.guildId,
      authorId: message.authorId,
      content: content
    })
  });
}

// SAU - Đơn giản hơn nhiều!
async sendMessage(content: string, channelId: string) {
  // Chỉ cần gửi message, bot tự động xử lý
  await fetch('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ content, channelId })
  });
  // Bot đã được trigger tự động! ✨
}
```

## Troubleshooting

### Bot không phản hồi?

1. **Kiểm tra bot đã được invite vào guild chưa**

```bash
GET /communities/{guildId}/members
# Tìm bot trong danh sách members
```

2. **Kiểm tra command đã được tạo chưa**

```bash
GET /bots/{botId}
# Check BotCommand array
```

3. **Kiểm tra pattern có match không**

```bash
# Pattern: "!ping"
# Message: "!ping" ✅
# Message: "ping" ❌
# Message: "!PING" ❌ (case-sensitive by default)
```

4. **Check logs**

```bash
# Message service logs
[MessageService] Message sent: msg_123
[BotMessageProcessor] Processing message: msg_123
[BotMessageProcessor] Command matched: ping for bot: bot_123
[BotActionHandler] Executing handler: pingHandler

# Nếu không thấy logs → bot processing không chạy
```

### Bot response không gửi được?

```bash
# Check bot response creation
# Trong BotMessageProcessor.createBotResponse()

# 1. Message được tạo trong DB?
# 2. BotResponse record được tạo?
# 3. WebSocket emit thành công?
```

## Kết luận

Tích hợp bot processing vào message service giúp:

- ✅ Đơn giản hóa API
- ✅ Tự động hóa bot responses
- ✅ Cải thiện UX
- ✅ Dễ maintain hơn
- ✅ Tránh infinite loops
- ✅ Error-resilient

Bot commands giờ hoạt động tự nhiên như một phần của message flow! 🎉
