# Local AI Chat System

A **production-grade local AI chat system** powered by Ollama with streaming responses, persistent conversations, and comprehensive features.

## ✨ Features

### Backend

- **Streaming Responses**: Real-time token streaming using Node.js ReadableStream
- **Local LLM Integration**: Direct Ollama API integration (no cloud dependencies)
- **Persistent Storage**: SQLite database with Prisma ORM
- **Session Management**: User-based sessions with unique session IDs
- **Rate Limiting**: Per-user rate limiting (30 requests/minute)
- **Request Logging**: Latency and token usage tracking
- **Context Window**: Last 10 messages injected as short-term memory
- **Error Handling**: Comprehensive error handling with graceful degradation

### Frontend

- **Chat Interface**: Modern, responsive chat UI with Dark Mode
- **Streaming UX**: Real-time token-by-token UI updates
- **Conversation Management**: Create, switch, and delete conversations
- **Auto-scroll**: Messages auto-scroll to bottom
- **Error Notifications**: Toast notifications for errors and feedback
- **Client-side Sessions**: localStorage-based user persistence

### Architecture

- **Clean Separation**: API handlers, LLM service, database service, UI logic clearly separated
- **Type-Safe**: Full TypeScript across backend and frontend
- **Modular Design**: Reusable services and components

## 🏗️ Architecture Overview

```
App Structure:
├── app/
│   ├── api/chat/route.ts         # Main streaming API endpoint
│   ├── chat/page.tsx             # Chat page layout
│   ├── components/               # React components
│   │   ├── ChatWindow.tsx        # Chat interface with streaming
│   │   └── ConversationSidebar.tsx # Conversation list
│   ├── layout.tsx                # Layout with providers
│   ├── page.tsx                  # Landing page
│   └── providers.tsx             # Toast provider
│
├── lib/
│   ├── db/
│   │   └── service.ts            # Database operations (CRUD)
│   ├── llm/
│   │   └── ollama.ts             # Ollama LLM integration
│   ├── middleware/
│   │   └── rateLimit.ts          # Rate limiting logic
│   ├── services/
│   │   └── chatService.ts        # Frontend chat API client
│   └── utils/
│       └── toast.ts              # Toast notifications
│
├── prisma/
│   ├── schema.prisma             # Prisma data model
│   └── migrations/               # Database migrations
│
└── .env                          # Environment variables
```

## 📦 Database Schema

### User Model

```typescript
model User {
  id            String
  email         String?
  conversations Conversation[]
  rateLimitKey  String?
  createdAt     DateTime
  updatedAt     DateTime
}
```

### Conversation Model

```typescript
model Conversation {
  id        String
  userId    String
  title     String
  messages  Message[]
  createdAt DateTime
  updatedAt DateTime
}
```

### Message Model

```typescript
model Message {
  id             String
  conversationId String
  role           String      // "user" | "assistant"
  content        String
  tokenUsage     Int?        // Tokens consumed
  latency        Int?        // Response time in ms
  createdAt      DateTime
}
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Ollama installed and running
- A model pulled (e.g., `ollama pull mistral`)

### Installation

1. **Start Ollama**

   ```bash
   ollama serve
   # Or just: ollama run mistral
   ```

2. **Setup Environment**

   ```bash
   # Edit .env file
   DATABASE_URL="file:./dev.db"
   OLLAMA_BASE_URL="http://localhost:11434"
   OLLAMA_MODEL="mistral"
   ```

3. **Install Dependencies**

   ```bash
   npm install
   npx prisma generate
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   # Opens http://localhost:3000 automatically
   ```

5. **Access the Chat**
   - Landing page: `http://localhost:3000`
   - Chat UI: `http://localhost:3000/chat`

## 🔌 API Endpoints

### POST `/api/chat`

Streams chat responses in real-time.

**Request:**

```json
{
  "conversationId": "conv-123",
  "message": "Hello!",
  "userId": "user-123"
}
```

**Response (Streaming):**
Each line is a JSON object:

```json
{"type":"token","content":"Hello","conversationId":"conv-123"}
{"type":"token","content":" there"}
{"type":"complete","content":"Hello there","messageId":"msg-456","latency":1200,"tokens":25}
```

**Error Response:**

```json
{ "type": "error", "error": "Rate limit exceeded" }
```

## 🔧 Configuration

### Rate Limiting

- **Limit**: 30 requests per minute per user
- **Window**: 60 seconds
- **Location**: `lib/middleware/rateLimit.ts`

### LLM Configuration

- **Model**: Configurable via `OLLAMA_MODEL` env var
- **Base URL**: Configurable via `OLLAMA_BASE_URL` env var
- **Default**: Mistral on `http://localhost:11434`

### Database

- **Type**: SQLite (local file)
- **Path**: `./dev.db`
- **ORM**: Prisma v7 with better-sqlite3 adapter

## 📊 Features in Detail

### Streaming Responses

- Real-time token-by-token delivery
- No buffering - immediate UI updates
- Proper error handling during stream

### Context Management

- Automatically loads last 10 messages
- Provides conversation history to LLM
- Single user session per browser

### Error Handling

- Connection validation
- Rate limit checks
- Graceful degradation
- User-friendly error messages

### Performance

- Latency tracking (request duration)
- Token counting
- Efficient database queries
- Memory-efficient streaming

## 🔐 Security Considerations

- **Rate limiting** per user to prevent abuse
- **No external API calls** - all data stays local
- **No authentication** currently (add as needed)
- **SQLite** for simple local persistence

## 📝 Development

### Running Tests

```bash
npm run build  # Type check and build
```

### Database Migrations

```bash
npx prisma migrate dev --name your_change_name
```

### Prisma Studio (View DB)

```bash
npx prisma studio
```

### View Logs

- Check browser console for frontend logs
- Check terminal for backend logs

## 🛣️ Future Enhancements

- [ ] User authentication (PassKeys/OAuth)
- [ ] RAG (Retrieval-Augmented Generation)
- [ ] Tool calling / Function calling
- [ ] Agent capabilities
- [ ] Custom system prompts per conversation
- [ ] Message editing and regeneration
- [ ] Export conversations (PDF/MD)
- [ ] Mobile responsive improvements
- [ ] Dark/Light theme toggle
- [ ] Multi-model support

## 📚 Tech Stack

**Frontend:**

- Next.js 16 (React 19)
- TypeScript
- Tailwind CSS
- Sonner (toasts)

**Backend:**

- Next.js API Routes
- Prisma 7
- SQLite
- Axios
- Zod (validation)

**Local AI:**

- Ollama
- Any Ollama-compatible model

## 🎯 Key Concepts

### Streaming Pattern

The API uses Node.js `ReadableStream` to send tokens as they're generated, providing instant visual feedback.

### Context Injection

The last 10 messages are automatically sent to the LLM to maintain conversation context without overwhelming the model.

### Rate Limiting

Simple in-memory rate limiter prevents abuse. For production, upgrade to Redis.

### Session Management

Uses localStorage for browser session state. Each browser tab gets a unique user ID.

## 🚨 Troubleshooting

**"Failed to connect to Ollama"**

- Ensure Ollama is running: `ollama serve`
- Check Ollama URL in .env matches your setup
- Verify port 11434 is accessible

**"Rate limit exceeded"**

- Per-user limit is 30 requests/minute
- Wait a minute or clear localStorage to reset

**Database errors**

- Delete `dev.db` to reset database
- Run: `npx prisma migrate dev --name init`

**Build errors**

- Clear `.next/` folder
- Run: `npm run build`

## 📄 License

MIT

---

**Built with ❤️ for local AI development**
