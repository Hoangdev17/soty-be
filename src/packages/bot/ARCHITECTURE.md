# Bot Integration Flow Diagram

## Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT APP                               │
│  User gửi tin nhắn: "!ping"                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                   POST /messages/send
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                    MESSAGE SERVICE                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  sendMessage()                                            │  │
│  │  1. Tạo message trong DB                                 │  │
│  │  2. Emit qua WebSocket                                   │  │
│  │  3. ✨ Tự động gọi BotMessageProcessor                   │  │
│  └─────────────────────────┬────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
          ┌──────────────────────────────────────┐
          │   BotMessageProcessor                │
          │   processMessage()                   │
          └──────────────────┬───────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  Check author      Find all bots      Match commands
  is bot?          in guild            with patterns
        │                    │                    │
        └────────────────────┴────────────────────┘
                             │
                             ▼
                    Found matching command?
                             │
                   ┌─────────┴─────────┐
                   │                   │
                   NO                 YES
                   │                   │
                   ▼                   ▼
                Return         Execute handler
                             (BotActionHandler)
                                      │
                                      ▼
                            Create bot response
                                      │
                                      ▼
                            Send to channel via
                            WebSocket
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   CLIENT APP            │
                        │   Nhận bot reply:       │
                        │   "🏓 Pong!"            │
                        └─────────────────────────┘
```

## Dependency Injection Flow

```
┌───────────────────────────────────────────────────────────┐
│                      App Module                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Message   │  │     Bot      │  │  WebSocket   │    │
│  │   Module    │  │   Module     │  │   Module     │    │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼────────────────┼─────────────────┼─────────────┘
          │                │                 │
          │  forwardRef    │   forwardRef    │
          └────────────────┼─────────────────┘
                           │
                           ▼
          ┌────────────────────────────────────────┐
          │       Message Service                  │
          │  - PrismaService                       │
          │  - WebsocketGateway                    │
          │  - BotMessageProcessor  ← Injected     │
          └────────────────┬───────────────────────┘
                           │
                           │ calls
                           ▼
          ┌────────────────────────────────────────┐
          │    BotMessageProcessor                 │
          │  - PrismaService                       │
          │  - BotActionHandler                    │
          └────────────────┬───────────────────────┘
                           │
                           │ uses
                           ▼
          ┌────────────────────────────────────────┐
          │      BotActionHandler                  │
          │  - 10 built-in handlers                │
          │  - sendMessageHandler                  │
          │  - pingHandler                         │
          │  - kickMemberHandler                   │
          │  - etc...                              │
          └────────────────────────────────────────┘
```

## Message Processing Sequence

```
Sequence Diagram:

User            MessageService      BotProcessor      BotHandler      Database
 │                    │                  │               │              │
 │──POST /send──────> │                  │               │              │
 │                    │                  │               │              │
 │                    │──Create Message──────────────────────────────>│
 │                    │<─Message Created────────────────────────────── │
 │                    │                  │               │              │
 │<──Response───────  │                  │               │              │
 │                    │                  │               │              │
 │                    │──processMessage->│               │              │
 │                    │                  │               │              │
 │                    │                  │──Check if bot?───────────>│
 │                    │                  │<─Not bot──────────────────│
 │                    │                  │               │              │
 │                    │                  │──Find bots───────────────>│
 │                    │                  │<─Bot list────────────────│
 │                    │                  │               │              │
 │                    │                  │──Match command              │
 │                    │                  │  patterns                   │
 │                    │                  │               │              │
 │                    │                  │──execute────>│              │
 │                    │                  │  handler      │              │
 │                    │                  │               │              │
 │                    │                  │               │──Do action─>│
 │                    │                  │               │<─Result────│
 │                    │                  │               │              │
 │                    │                  │<─Success─────│              │
 │                    │                  │               │              │
 │                    │                  │──Create bot──────────────>│
 │                    │                  │  response                  │
 │                    │                  │<─Response created─────────│
 │                    │<─Done───────────│               │              │
 │                    │                  │               │              │
 │<══WebSocket: Bot Response════════════════════════════════════════│
 │   "🏓 Pong!"       │                  │               │              │
```

## Code Flow trong MessageService

```typescript
async sendMessage(dto: SendMessageDto, authorId: string) {
  // ┌─────────────────────────────────────┐
  // │  BƯỚC 1: Tạo tin nhắn               │
  // └─────────────────────────────────────┘
  const message = await this.prismaService.guildMessage.create({
    data: { ... }
  });

  // ┌─────────────────────────────────────┐
  // │  BƯỚC 2: Emit qua WebSocket         │
  // └─────────────────────────────────────┘
  this.websocketGateway.emitToRoom(...);

  // ┌─────────────────────────────────────┐
  // │  BƯỚC 3: Xử lý bot commands ✨      │
  // │  (TỰ ĐỘNG - Không cần manual call) │
  // └─────────────────────────────────────┘
  if (message.channel.guildId) {
    try {
      await this.botMessageProcessor.processMessage({
        messageId: message.id,
        channelId: message.channel.id,
        guildId: message.channel.guildId,
        authorId: message.author.id,
        content: message.content,
      });
    } catch (error) {
      console.warn('Bot processing failed:', error);
      // Không throw - message vẫn được gửi thành công
    }
  }

  return response;
}
```

## Handler Registration Map

```
BotActionHandler
├── handlers: Map<string, Function>
│   ├── "sendMessageHandler"    → sendMessageHandler()
│   ├── "simpleReplyHandler"    → simpleReplyHandler()
│   ├── "deleteMessageHandler"  → deleteMessageHandler()
│   ├── "kickMemberHandler"     → kickMemberHandler()
│   ├── "banMemberHandler"      → banMemberHandler()
│   ├── "createRoleHandler"     → createRoleHandler()
│   ├── "assignRoleHandler"     → assignRoleHandler()
│   ├── "pingHandler"           → pingHandler()
│   ├── "serverInfoHandler"     → serverInfoHandler()
│   └── "helpHandler"           → helpHandler()
│
├── execute(handlerName, context)
│   ├── Get handler from Map
│   ├── Execute handler with context
│   └── Return BotActionResult
│
└── getAvailableHandlers()
    └── Return Array<string> of handler names
```

## Database Relations

```
┌─────────────┐
│    User     │ (Bot account)
│ isBot: true │
└──────┬──────┘
       │ 1
       │
       │ N
       ├──────┐
       │      │
       ▼      ▼
┌──────────┐ ┌──────────────┐
│BotAction │ │  BotCommand  │
│handler:  │ │  pattern:    │
│"pingHand"│ │  "!ping"     │
└──────────┘ └──────┬───────┘
       │            │
       └────────────┤
                    │
                    ▼
         ┌────────────────────┐
         │ CommandExecution   │
         │ result: JSON       │
         └─────────┬──────────┘
                   │
                   │ 1
                   │
                   │ N
                   ▼
         ┌────────────────────┐
         │   BotResponse      │
         │   content: string  │
         └────────────────────┘
```

## Module Dependencies

```
AppModule
│
├── MessageModule
│   ├── imports: [WebsocketModule, BotModule] ← forwardRef
│   ├── providers: [MessageService, ...]
│   └── exports: [MessageService]
│
├── BotModule
│   ├── providers: [
│   │   BotService,
│   │   BotMessageProcessor,  ← Exported
│   │   BotActionHandler
│   │ ]
│   └── exports: [BotService, BotMessageProcessor]
│
└── WebsocketModule
    ├── providers: [WebsocketGateway]
    └── exports: [WebsocketGateway]
```

## Ví dụ thực tế

### User sends "!ping"

```
1. POST /messages/send { content: "!ping", channelId: "ch_123" }
   ↓
2. MessageService creates message in DB
   message_id: "msg_001"
   content: "!ping"
   author_id: "user_456"
   ↓
3. MessageService emits via WebSocket
   → All clients in channel receive message
   ↓
4. MessageService calls BotMessageProcessor
   ↓
5. BotMessageProcessor checks if author is bot
   → No, user_456 is not a bot
   ↓
6. BotMessageProcessor finds bots in guild
   → Found: PingBot (bot_789)
   ↓
7. Load PingBot commands
   → Found: "ping" command with pattern "!ping"
   ↓
8. Match "!ping" with pattern "!ping"
   → Match successful!
   ↓
9. Get command action
   → Action: PingAction
   → Handler: "pingHandler"
   ↓
10. BotActionHandler executes "pingHandler"
    → Returns: { success: true, response: "🏓 Pong!" }
    ↓
11. Create CommandExecution record in DB
    ↓
12. Create bot response message in DB
    message_id: "msg_002"
    content: "🏓 Pong!"
    author_id: "bot_789"
    ↓
13. Emit bot response via WebSocket
    → All clients receive: "🏓 Pong!"
```

## Performance Considerations

```
┌──────────────────────────────────────────────────┐
│  Message Sending Performance                     │
├──────────────────────────────────────────────────┤
│                                                  │
│  User Request                                    │
│       │                                          │
│       ▼                                          │
│  ┌─────────────────┐                            │
│  │ Create Message  │  ~10-50ms                  │
│  └────────┬────────┘                            │
│           │                                      │
│           ▼                                      │
│  ┌─────────────────┐                            │
│  │ WebSocket Emit  │  ~1-5ms                    │
│  └────────┬────────┘                            │
│           │                                      │
│           ├────────────────────┐                │
│           │                    │                │
│           ▼                    ▼                │
│  ┌─────────────────┐  ┌──────────────────┐     │
│  │ Return Response │  │ Bot Processing   │     │
│  │ to User         │  │ (Background)     │     │
│  └─────────────────┘  │ ~50-200ms        │     │
│                       └──────────────────┘     │
│                                                  │
│  Total user-facing latency: ~15-60ms ✅         │
│  Bot processing: Async, không block user        │
└──────────────────────────────────────────────────┘
```

## Error Handling Strategy

```
try {
  // Main message flow
  const message = await createMessage();
  await emitWebSocket(message);

  // Bot processing - wrapped in try-catch
  try {
    await botProcessor.processMessage(message);
  } catch (botError) {
    console.warn('Bot error:', botError);
    // ❌ KHÔNG throw
    // ✅ Log error
    // ✅ Message vẫn được gửi thành công
  }

  return message; // ✅ Luôn return message
} catch (error) {
  // Main flow error
  throw error; // ❌ Chỉ throw khi message creation fail
}
```
