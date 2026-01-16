# Chat Module - Technical Specification (Index)

**Module Name:** module-chat  
**Module Type:** Functional Module  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-CHAT-SPEC.md](./MODULE-CHAT-SPEC.md)

---

## Technical Documentation Structure

This specification has been split into smaller, focused documents for easier maintenance:

### Core Technical Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [01-data-model.md](./technical/01-data-model.md) | Entity definitions (5 entities) | ✅ Complete |
| [02-database-schema.md](./technical/02-database-schema.md) | Migration files with SQL | 🔄 Pending |
| [03-api-endpoints.md](./technical/03-api-endpoints.md) | REST API documentation | 🔄 Pending |
| [04-streaming.md](./technical/04-streaming.md) | SSE streaming architecture | 🔄 Pending |
| [05-integrations.md](./technical/05-integrations.md) | Module integrations (KB, AI) | 🔄 Pending |
| [06-backend-patterns.md](./technical/06-backend-patterns.md) | Lambda implementations | 🔄 Pending |
| [07-infrastructure.md](./technical/07-infrastructure.md) | Terraform configurations | 🔄 Pending |
| [08-testing.md](./technical/08-testing.md) | Test requirements | 🔄 Pending |

---

## Quick Reference

### Entities (5 Total)

| Entity | Purpose | Document |
|--------|---------|----------|
| chat_sessions | Primary chat container | [01-data-model.md](./technical/01-data-model.md#11-entity-chat_sessions) |
| chat_messages | Message storage with metadata | [01-data-model.md](./technical/01-data-model.md#12-entity-chat_messages) |
| chat_kb_grounding | KB associations per chat | [01-data-model.md](./technical/01-data-model.md#13-entity-chat_kb_grounding) |
| chat_shares | Sharing/collaboration | [01-data-model.md](./technical/01-data-model.md#14-entity-chat_shares) |
| chat_favorites | User favorites | [01-data-model.md](./technical/01-data-model.md#15-entity-chat_favorites) |

### Chat Scopes

| Scope | Description | KB Access |
|-------|-------------|-----------|
| Workspace-Scoped | Associated with workspace_id | Workspace KB, Org KBs, System KBs |
| User-Level | No workspace_id (personal) | Org KBs, System KBs only |

### Lambda Functions (3 Total)

| Lambda | Purpose | Triggers |
|--------|---------|----------|
| chat-session | Session CRUD, sharing, favorites | API Gateway |
| chat-message | Message listing, RAG context | API Gateway |
| chat-stream | Streaming AI responses (SSE) | API Gateway |

### Key Technologies

- **Database:** PostgreSQL (Supabase)
- **Streaming:** Lambda Response Streaming + SSE
- **AI Providers:** OpenAI, Anthropic, Bedrock (via module-ai)
- **RAG:** pgvector semantic search (via module-kb)
- **State Management:** Zustand with persistence

---

## Migration Summary

| # | File | Purpose |
|---|------|---------|
| 001 | chat-sessions.sql | Main sessions table |
| 002 | chat-messages.sql | Message storage |
| 003 | chat-kb-grounding.sql | KB associations |
| 004 | chat-shares.sql | Sharing/collaboration |
| 005 | chat-favorites.sql | User favorites |
| 006 | chat-rpc-functions.sql | Access control functions |
| 007 | chat-rls.sql | Row Level Security |

See [02-database-schema.md](./technical/02-database-schema.md) for complete SQL.

---

## API Endpoint Summary

### Session Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/chats` | GET | List workspace chats |
| `/workspaces/{wsId}/chats` | POST | Create workspace chat |
| `/users/me/chats` | GET | List personal chats |
| `/users/me/chats` | POST | Create personal chat |
| `/chats/{chatId}` | GET | Get chat details |
| `/chats/{chatId}` | PATCH | Update chat |
| `/chats/{chatId}` | DELETE | Delete chat |

### Messaging

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/messages` | GET | List messages (paginated) |
| `/chats/{chatId}/stream` | POST | Stream AI response (SSE) |

### KB Grounding

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/kbs` | GET | List grounded KBs |
| `/chats/{chatId}/kbs` | POST | Add KB grounding |
| `/chats/{chatId}/kbs/{kbId}` | DELETE | Remove KB grounding |

### Sharing

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/shares` | GET | List shares |
| `/chats/{chatId}/shares` | POST | Share chat |
| `/chats/{chatId}/shares/{shareId}` | DELETE | Remove share |

### Favorites

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/favorite` | POST | Toggle favorite |

---

## Streaming Protocol

### SSE Event Types

```typescript
// Streaming token
{ type: "token", content: "..." }

// Citation metadata
{ type: "citation", data: { kbId, kbName, documentId, documentName, chunkIndex, content } }

// Stream complete
{ type: "done", messageId: "uuid", usage: { promptTokens, completionTokens, totalTokens } }

// Error
{ type: "error", message: "..." }
```

### Streaming Flow

```
1. Client POST /chats/{chatId}/stream { message, kbIds? }
2. Lambda retrieves conversation history (last 10 messages)
3. Lambda queries module-kb for RAG context (if kbIds provided)
4. Lambda calls AI provider with streaming enabled
5. Lambda streams tokens back via SSE
6. Lambda saves final message to database
7. Lambda sends "done" event with message ID and usage
```

---

## Related Documentation

- [Parent Specification](./MODULE-CHAT-SPEC.md)
- [User UX Specification](./MODULE-CHAT-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-CHAT-ADMIN-UX-SPEC.md)
- [Implementation Plan](../../plans/plan_module-chat-implementation.md)

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
