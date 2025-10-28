# Bot Handler System - Hướng dẫn sử dụng

## Tổng quan

System này cung cấp khả năng xử lý bot commands thông qua một hệ thống handler linh hoạt và có thể mở rộng.

## Cấu trúc

```
src/packages/bot/
├── handlers/
│   ├── bot-action.handler.ts     # Chứa các action handlers
│   └── bot-message.processor.ts  # Xử lý tin nhắn và trigger commands
├── dto/
│   ├── create-action.dto.ts
│   ├── create-command.dto.ts
│   ├── create-skill.dto.ts
│   └── process-message.dto.ts
├── bot.controller.ts
├── bot.service.ts
└── bot.module.ts
```

## 1. Tạo Bot

```bash
POST /bots
{
  "username": "MyBot",
  "displayName": "My Awesome Bot",
  "email": "bot@example.com"
}
```

## 2. Tạo Action Handler

Action handler là hàm xử lý cho các command. Hệ thống có sẵn các handlers:

### Danh sách Handlers có sẵn:

1. **sendMessageHandler** - Gửi tin nhắn đến channel
2. **simpleReplyHandler** - Phản hồi đơn giản
3. **deleteMessageHandler** - Xóa tin nhắn
4. **kickMemberHandler** - Kick member khỏi guild
5. **banMemberHandler** - Ban member
6. **createRoleHandler** - Tạo role mới
7. **assignRoleHandler** - Gán role cho member
8. **pingHandler** - Ping bot (trả về "Pong!")
9. **serverInfoHandler** - Hiển thị thông tin server
10. **helpHandler** - Hiển thị danh sách lệnh

### Tạo Action:

```bash
POST /bots/:botId/skills/:skillId/actions
{
  "name": "PingAction",
  "handler": "pingHandler",
  "paramsSchema": {}
}
```

## 3. Tạo Command

Command định nghĩa cách trigger một action.

### Trigger Types:

- **PREFIX**: Bắt đầu bằng một prefix (vd: `!ping`)
- **EXACT**: Khớp chính xác (vd: `hello bot`)
- **PATTERN**: Regex pattern (vd: `^!kick @(.+)$`)

### Ví dụ:

#### Command Ping đơn giản:

```bash
POST /bots/:botId/commands
{
  "name": "ping",
  "description": "Kiểm tra bot có hoạt động không",
  "triggerType": "PREFIX",
  "pattern": "!ping",
  "actionId": "<action_id>"
}
```

#### Command Help:

```bash
POST /bots/:botId/commands
{
  "name": "help",
  "description": "Hiển thị danh sách lệnh",
  "triggerType": "PREFIX",
  "pattern": "!help",
  "actionId": "<help_action_id>"
}
```

#### Command với Regex:

```bash
POST /bots/:botId/commands
{
  "name": "kick",
  "description": "Kick một member",
  "triggerType": "PATTERN",
  "pattern": "^!kick <@(\\d+)>(.*)$",
  "actionId": "<kick_action_id>"
}
```

## 4. Invite Bot vào Community

```bash
POST /bots/:botId/invite/:communityId
```

## 5. Xử lý Tin nhắn

Khi có tin nhắn mới trong guild, gọi endpoint này để bot xử lý:

```bash
POST /bots/process-message
{
  "messageId": "1234567890",
  "channelId": "9876543210",
  "guildId": "1111111111",
  "authorId": "2222222222",
  "content": "!ping"
}
```

Hệ thống sẽ:

1. Tìm tất cả bots trong guild
2. Kiểm tra các commands của từng bot
3. Match pattern với nội dung tin nhắn
4. Thực thi handler tương ứng
5. Gửi response về channel

## 6. Các Handlers Chi tiết

### sendMessageHandler

Gửi tin nhắn đến một channel cụ thể.

**Params Schema:**

```json
{
  "channelId": "string (required)",
  "content": "string (required)"
}
```

**Usage Example:**

```bash
POST /bots/:botId/skills/:skillId/actions
{
  "name": "SendAnnouncement",
  "handler": "sendMessageHandler",
  "paramsSchema": {
    "type": "object",
    "properties": {
      "channelId": { "type": "string" },
      "content": { "type": "string" }
    },
    "required": ["channelId", "content"]
  }
}
```

### kickMemberHandler

Kick một member khỏi guild.

**Params Schema:**

```json
{
  "userId": "string (required)"
}
```

### banMemberHandler

Ban một member khỏi guild.

**Params Schema:**

```json
{
  "userId": "string (required)",
  "reason": "string (optional)"
}
```

### createRoleHandler

Tạo role mới trong guild.

**Params Schema:**

```json
{
  "name": "string (required)",
  "color": "string (optional, default: #000000)",
  "permissions": "string (optional, default: 0)"
}
```

### assignRoleHandler

Gán role cho một member.

**Params Schema:**

```json
{
  "userId": "string (required)",
  "roleId": "string (required)"
}
```

### serverInfoHandler

Hiển thị thông tin chi tiết về server.

**Params Schema:** Không cần params

**Response Example:**

```
📊 **Thông tin server: My Server**
👥 Thành viên: 150
📝 Kênh: 25
🎭 Vai trò: 10
📅 Tạo lúc: 01/01/2024
```

## 7. API Endpoints Bổ sung

### Lấy danh sách handlers

```bash
GET /bots/:botId/handlers
```

**Response:**

```json
{
  "handlers": [
    "sendMessageHandler",
    "simpleReplyHandler",
    "deleteMessageHandler",
    "kickMemberHandler",
    "banMemberHandler",
    "createRoleHandler",
    "assignRoleHandler",
    "pingHandler",
    "serverInfoHandler",
    "helpHandler"
  ]
}
```

### Lấy lịch sử thực thi commands

```bash
GET /bots/:botId/executions
```

**Response:**

```json
[
  {
    "id": "exec_id",
    "messageId": "msg_id",
    "commandId": "cmd_id",
    "executedById": "user_id",
    "result": {
      "success": true,
      "response": "🏓 Pong!"
    },
    "executedAt": "2024-01-01T00:00:00.000Z",
    "command": { ... },
    "executedBy": { ... },
    "responses": [ ... ]
  }
]
```

### Lấy thống kê bot

```bash
GET /bots/:botId/statistics
```

**Response:**

```json
{
  "totalExecutions": 1000,
  "totalResponses": 950,
  "commandStats": [
    {
      "commandId": "cmd_id_1",
      "_count": 500
    },
    {
      "commandId": "cmd_id_2",
      "_count": 300
    }
  ]
}
```

## 8. Tạo Custom Handler

Để thêm handler mới, edit file `bot-action.handler.ts`:

```typescript
// 1. Đăng ký handler trong registerHandlers()
private registerHandlers() {
  // ... existing handlers
  this.handlers.set('myCustomHandler', this.myCustomHandler.bind(this));
}

// 2. Implement handler method
private async myCustomHandler(context: BotActionContext): Promise<BotActionResult> {
  const { params, guildId, userId } = context;

  // Your custom logic here

  return {
    success: true,
    response: 'Custom action completed!',
    data: { /* optional data */ }
  };
}
```

## 9. Flow Diagram

```
User sends message
      ↓
POST /bots/process-message
      ↓
BotMessageProcessor.processMessage()
      ↓
Find all bots in guild
      ↓
For each bot, check commands
      ↓
Match command pattern
      ↓
Execute action handler
      ↓
BotActionHandler.execute()
      ↓
Create CommandExecution record
      ↓
Send bot response to channel
```

## 10. Best Practices

1. **Command Naming**: Sử dụng tên command rõ ràng và dễ nhớ
2. **Pattern Design**: Với PATTERN type, luôn test regex trước khi deploy
3. **Error Handling**: Handlers luôn trả về BotActionResult với success flag
4. **Permissions**: Kiểm tra quyền user trước khi thực thi action (kick, ban, etc.)
5. **Rate Limiting**: Implement rate limiting cho các commands để tránh spam
6. **Logging**: Tất cả executions được log và lưu trong database

## 11. Ví dụ Hoàn chỉnh

### Setup một Moderation Bot:

```typescript
// 1. Tạo bot
const bot = await POST('/bots', {
  username: 'ModBot',
  displayName: 'Moderation Bot',
});

// 2. Tạo actions
const kickAction = await POST(`/bots/${bot.id}/skills/default/actions`, {
  name: 'KickMember',
  handler: 'kickMemberHandler',
});

const banAction = await POST(`/bots/${bot.id}/skills/default/actions`, {
  name: 'BanMember',
  handler: 'banMemberHandler',
});

// 3. Tạo commands
await POST(`/bots/${bot.id}/commands`, {
  name: 'kick',
  description: 'Kick member khỏi server',
  triggerType: 'PATTERN',
  pattern: '^!kick <@(\\d+)>$',
  actionId: kickAction.id,
});

await POST(`/bots/${bot.id}/commands`, {
  name: 'ban',
  description: 'Ban member khỏi server',
  triggerType: 'PATTERN',
  pattern: '^!ban <@(\\d+)>\\s*(.*)$',
  actionId: banAction.id,
});

// 4. Invite bot
await POST(`/bots/${bot.id}/invite/${communityId}`);

// 5. Test
await POST('/bots/process-message', {
  messageId: '...',
  channelId: '...',
  guildId: communityId,
  authorId: '...',
  content: '!kick <@123456789>',
});
```

## Troubleshooting

- **Command không trigger**: Kiểm tra pattern và triggerType
- **Handler not found**: Kiểm tra tên handler trong action
- **Permission errors**: Đảm bảo bot có quyền thực hiện action
- **Regex errors**: Test regex pattern với regex101.com

## Next Steps

- [ ] Implement AI skills integration
- [ ] Add more built-in handlers
- [ ] WebSocket integration for real-time responses
- [ ] Rate limiting per user/command
- [ ] Command cooldowns
- [ ] Permission checks per handler
