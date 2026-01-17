# Module-Chat

AI-powered chat module with streaming responses, knowledge base (KB) grounding, and workspace integration.

## Overview

Module-Chat provides conversational AI capabilities for CORA applications:

- **Workspace-Scoped Chats**: Chats created within a workspace context, accessible to workspace members
- **User-Level Chats**: Personal chats not tied to any workspace
- **KB Grounding**: Ground AI responses in knowledge base content with citations
- **Streaming Responses**: Real-time AI response streaming via Server-Sent Events (SSE)
- **Sharing & Collaboration**: Share chats with specific users or entire workspaces
- **Favorites**: Mark chats for quick access
- **Conversation History**: Context-aware responses using conversation history

## Status

**Version**: 1.0.0  
**Status**: Complete  
**Last Updated**: January 2026

## Dependencies

### Core Modules
- `module-access` - Authentication and authorization
- `module-ai` - AI provider configuration and credentials
- `module-mgmt` - Platform management and monitoring

### Functional Modules
- `module-kb` - Knowledge base for RAG context retrieval
- `module-ws` - Workspace context and membership

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages: ChatListPage, ChatDetailPage                            │
│  Components: ChatInput, ChatMessage, ChatSessionList, etc.      │
│  Hooks: useChat, useChatSession, useStreaming, etc.            │
│  Store: chatStore (Zustand with persistence)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (24 routes)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ chat-session  │    │ chat-message  │    │ chat-stream   │
│   Lambda      │    │   Lambda      │    │   Lambda      │
│  (512MB/30s)  │    │  (512MB/30s)  │    │ (1GB/300s)    │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────┤
│  Tables: chat_sessions, chat_messages, chat_kb_grounding,       │
│          chat_shares, chat_favorites                             │
│  RPC: is_chat_owner, can_view_chat, can_edit_chat, etc.         │
│  RLS: Row-level security for multi-tenant access                │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `chat_sessions` | Chat session metadata (title, workspace, sharing settings) |
| `chat_messages` | Message storage with role, content, and citations |
| `chat_kb_grounding` | KB associations for RAG context |
| `chat_shares` | Per-user sharing with permission levels |
| `chat_favorites` | User favorites for quick access |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `is_chat_owner(user_id, session_id)` | Check if user owns the chat |
| `can_view_chat(user_id, session_id)` | Check view permission |
| `can_edit_chat(user_id, session_id)` | Check edit permission |
| `get_accessible_chats(user_id, org_id, workspace_id?)` | List accessible chats |
| `get_grounded_kbs_for_chat(session_id)` | Get KBs grounded to a chat |
| `get_available_kbs_for_chat(user_id, session_id)` | Get KBs user can add |

## Backend Lambdas

### chat-session (512MB, 30s timeout)
Session CRUD operations, KB grounding management, sharing, and favorites.

**Routes:**
```
Session Management:
  GET  /workspaces/{workspaceId}/chats    - List workspace chats
  POST /workspaces/{workspaceId}/chats    - Create workspace chat
  GET  /users/me/chats                    - List user's personal chats
  POST /users/me/chats                    - Create personal chat
  GET  /chats/{sessionId}                 - Get chat details
  PATCH /chats/{sessionId}                - Update chat
  DELETE /chats/{sessionId}               - Delete chat

KB Grounding:
  GET  /chats/{sessionId}/kbs             - List grounded KBs
  POST /chats/{sessionId}/kbs             - Add KB grounding
  DELETE /chats/{sessionId}/kbs/{kbId}    - Remove KB grounding
  GET  /chats/{sessionId}/kbs/available   - List available KBs

Sharing:
  GET  /chats/{sessionId}/shares              - List shares
  POST /chats/{sessionId}/shares              - Share chat
  PATCH /chats/{sessionId}/shares/{shareId}   - Update share permission
  DELETE /chats/{sessionId}/shares/{shareId}  - Remove share

Favorites:
  POST /chats/{sessionId}/favorite        - Toggle favorite
```

### chat-message (512MB, 30s timeout)
Message CRUD and RAG context retrieval.

**Routes:**
```
GET  /chats/{sessionId}/messages              - List messages (paginated)
GET  /chats/{sessionId}/messages/{messageId}  - Get single message
POST /chats/{sessionId}/context               - Get RAG context for query
GET  /chats/{sessionId}/history               - Get conversation history
```

### chat-stream (1024MB, 300s timeout)
AI response streaming with Server-Sent Events (SSE).

**Routes:**
```
POST /chats/{sessionId}/stream - Stream AI response
```

**SSE Event Types:**
- `session` - Session info with messageId (sent first)
- `chunk` - Streaming content tokens
- `context` - RAG citations when KB grounding is used
- `complete` - Final message with usage stats
- `error` - Error information
- `[DONE]` - Stream termination signal

**Supports Multiple AI Providers:**
- OpenAI (GPT-4, GPT-4o, etc.)
- Anthropic (Claude 3, Claude 3.5)
- AWS Bedrock (with inference profile fallback)

## Frontend

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| `ChatListPage` | `/chat` | List all accessible chats with filters |
| `ChatDetailPage` | `/chat/[id]` | Full chat interface with streaming |

### Components

| Component | Purpose |
|-----------|---------|
| `ChatInput` | Multi-line input with send/cancel, KB grounding indicators |
| `ChatMessage` | Message display with citations, copy, streaming animation |
| `ChatOptionsMenu` | 3-dots menu with favorite, rename, share, delete actions |
| `ChatSessionList` | Session list with search, filters, pagination |
| `KBGroundingSelector` | Toggle-based KB selection dialog |
| `ShareChatDialog` | Share with users, manage permissions |

### Hooks

| Hook | Purpose |
|------|---------|
| `useChat` | Main hook for session management and messaging |
| `useChatSession` | Single session with messages, KBs, shares |
| `useStreaming` | Streaming state (content, citations, cancel) |
| `useChatActions` | Action handlers matching ChatOptionsMenu pattern |
| `useChatSharing` | Share list management and helpers |
| `useChatKBGrounding` | KB grounding management |

### Store (Zustand)

`chatStore.ts` provides:
- Session management with optimistic updates
- Message caching by session
- SSE streaming integration
- KB grounding and sharing state
- localStorage persistence
- Performance-optimized selectors

## Access Control

### Chat Access Rules

| Access Type | Can View | Can Send Messages | Can Share | Can Delete |
|-------------|----------|-------------------|-----------|------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Shared (edit) | ✅ | ✅ | ❌ | ❌ |
| Shared (view) | ✅ | ❌ | ❌ | ❌ |
| Workspace Member* | ✅ | ✅ | ❌ | ❌ |

*Only if `is_shared_with_workspace = true`

## Installation

### 1. Apply Database Migrations

```bash
# Run in order
psql < db/schema/001-chat-sessions.sql
psql < db/schema/002-chat-messages.sql
psql < db/schema/003-chat-kb-grounding.sql
psql < db/schema/004-chat-shares.sql
psql < db/schema/005-chat-favorites.sql
psql < db/schema/006-chat-rpc-functions.sql
psql < db/schema/007-chat-rls.sql
```

### 2. Deploy Lambda Functions

```bash
# Deploy via Terraform
cd infrastructure
terraform init
terraform apply
```

### 3. Add Frontend Routes

Copy routes to your Next.js app:
```
routes/chat/page.tsx       → app/chat/page.tsx
routes/chat/[id]/page.tsx  → app/chat/[id]/page.tsx
```

### 4. Register Module

Add to your app's module registry and left navigation.

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARN, ERROR) |

### AI Provider Configuration

AI providers are configured via `module-ai`. The chat-stream Lambda retrieves:
- Provider type (openai, anthropic, bedrock)
- API credentials
- Default model
- Temperature and other settings

## Integration Points

### With module-kb
- KB selector shows KBs from workspace, org, and global scope
- RAG context retrieval using pgvector similarity search
- Citations formatted with document name, page, relevance

### With module-ws
- Workspace-scoped chats use workspace context
- Access control via workspace membership
- Activities tab integration for workspace chats

### With module-ai
- AI provider configuration retrieval
- Multi-provider streaming support
- Token usage tracking

### With module-access
- Authentication via Cognito JWT
- User identity for access control
- Org membership verification

## Testing Checklist

See [Integration Test Checklist](./INTEGRATION-TEST-CHECKLIST.md) for end-to-end testing.

## Version History

- **1.0.0** (January 2026) - Initial release
  - Workspace and user-level chats
  - KB grounding with citations
  - SSE streaming
  - Sharing and favorites
  - Full frontend with Zustand store

## Related Documentation

- [MODULE-CHAT-SPEC.md](../../docs/specifications/module-chat/MODULE-CHAT-SPEC.md) - Full specification
- [MODULE-CHAT-TECHNICAL-SPEC.md](../../docs/specifications/module-chat/MODULE-CHAT-TECHNICAL-SPEC.md) - Technical details
- [MODULE-CHAT-USER-UX-SPEC.md](../../docs/specifications/module-chat/MODULE-CHAT-USER-UX-SPEC.md) - User experience
- [MODULE-CHAT-ADMIN-UX-SPEC.md](../../docs/specifications/module-chat/MODULE-CHAT-ADMIN-UX-SPEC.md) - Admin features
