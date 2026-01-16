# Chat Module Specification (Parent)

**Module Name:** module-chat  
**Module Type:** Functional Module  
**Entity:** chat_session  
**Complexity:** Complex  
**Estimated Time:** 30-45 hours (10-15 sessions)  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

---

## Document Overview

This is the **parent specification** for module-chat. It provides an executive summary and references the detailed subordinate specifications.

### Subordinate Specifications

| Specification | Purpose | Est. Size |
|---------------|---------|-----------|
| [MODULE-CHAT-TECHNICAL-SPEC.md](./MODULE-CHAT-TECHNICAL-SPEC.md) | Data model, API, database, streaming, RAG integration | ~2500 lines |
| [MODULE-CHAT-USER-UX-SPEC.md](./MODULE-CHAT-USER-UX-SPEC.md) | User personas, chat interface, streaming, KB selection | ~1200 lines |
| [MODULE-CHAT-ADMIN-UX-SPEC.md](./MODULE-CHAT-ADMIN-UX-SPEC.md) | Admin analytics, usage monitoring, rate limiting | ~800 lines |

---

## 1. Executive Summary

### Purpose

The Chat Module provides an AI-powered conversational interface with streaming responses, knowledge base grounding (RAG), and workspace context. It enables users to have intelligent conversations grounded in organizational knowledge while maintaining proper multi-tenant isolation.

### Problem Solved

- Users need AI-assisted conversations within workspace context
- Teams need to share and collaborate on AI conversations
- AI responses need grounding in organizational documents (KB integration)
- Organizations need visibility into AI usage and costs
- Users need real-time streaming responses for better UX

### Key Capabilities

1. **Workspace-Scoped Chats** - Conversations tied to workspace context
2. **User-Level Chats** - Personal conversations not tied to workspaces
3. **Streaming Responses** - Real-time AI token streaming via SSE
4. **KB Grounding** - RAG integration with module-kb for contextual responses
5. **Citations** - Source attribution for grounded responses
6. **Sharing** - Share conversations with workspace members
7. **Favorites** - Quick access to important conversations

---

## 2. Scope

### In Scope

**Core Functionality:**
- Create, read, update, soft delete chat sessions
- Send messages with streaming AI responses
- KB grounding selection per chat session
- RAG context retrieval from module-kb
- Citation display from retrieved documents
- Chat sharing with permission levels (view/edit)
- Favorites for quick access

**User Experience:**
- Chat list with search and filters
- Full chat interface with message history
- Streaming message display with cancel support
- KB selector for grounding configuration
- Citation badges with source preview

**Admin Experience:**
- Chat usage analytics (via module-mgmt)
- Token usage monitoring
- No dedicated admin pages (analytics only)

**Integration:**
- module-kb: RAG context retrieval
- module-ws: Workspace context
- module-ai: AI provider configuration
- module-access: Authentication/authorization
- module-mgmt: Usage analytics

### Out of Scope

- Thread branching (deferred to v2)
- Chat export (deferred to v2)
- Chat templates (deferred to v2)
- Voice input (deferred to v2)
- Multi-modal (images) (deferred to v2)
- Real-time collaborative editing
- Scheduled/automated chats

---

## 3. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 2 | 5 entities (chat_sessions, chat_messages, chat_shares, chat_favorites, chat_kb_grounding) |
| AI Integration | 2 | Advanced: Streaming responses, multi-provider support, RAG integration |
| Functional Dependencies | 2 | module-kb (RAG), module-ws, module-ai, module-access, module-mgmt |
| Legacy Code Complexity | 2 | 3 Lambda functions, streaming support, ~2000+ lines |
| Business Logic | 2 | Streaming protocol, RAG integration, sharing permissions |
| **Total** | **10** | **Complex** |

### Classification: Complex

**Time Estimate:** 30-45 hours (10-15 sessions)

### Specification Size Estimates

| Specification | Estimated Lines | Actual Lines |
|---------------|-----------------|--------------|
| Parent (this doc) | 300-400 | ~350 |
| Technical Spec | 2000-3000 | TBD |
| User UX Spec | 1000-1500 | TBD |
| Admin UX Spec | 600-1000 | TBD |
| **Total** | **3900-5900** | TBD |

---

## 4. Source Reference

### Legacy Code

- **Repository:** `~/code/policy/legacy/pm-app-stack/apps/web/`
- **Key Files:**
  - `components/chat/` - ChatContainer, ChatHistory, ChatMessage, ChatComposer
  - `store/chatStore.ts` - Zustand store with session management
  - `hooks/useChat.ts` - Chat hooks with streaming support
  - `api/chat/` - API routes for chat operations

### Migration Notes

- Legacy uses Zustand for client-side state, CORA maintains this pattern
- Streaming protocol: SSE (Server-Sent Events) via Lambda response streaming
- Table naming follows CORA `chat_` prefix convention
- API responses use camelCase (CORA standard)

---

## 5. Dependencies

### Core Module Dependencies (Required)

| Module | Version | Purpose |
|--------|---------|---------|
| module-access | ^1.0.0 | Authentication, authorization, user context |
| module-ai | ^1.0.0 | AI provider configuration, token tracking |
| module-kb | ^1.0.0 | RAG context retrieval, KB search |
| module-mgmt | ^1.0.0 | Module registration, usage analytics |

### Functional Module Dependencies

| Module | Version | Purpose |
|--------|---------|---------|
| module-ws | ^1.0.0 | Workspace context for workspace-scoped chats |

### Dependent Modules (Future)

| Module | Integration |
|--------|-------------|
| module-wf | Workflow status updates via chat |
| module-project | Project-scoped conversations |

---

## 6. Chat Architecture

### Chat Scope Model

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORKSPACE-SCOPED CHATS                      │
│   Conversations within a workspace context                       │
│   - Associated with workspace_id                                 │
│   - Accessible to workspace members (when shared)                │
│   - Can ground to: workspace KB, org KBs, system KBs             │
│   - Primary use case for team collaboration                      │
├─────────────────────────────────────────────────────────────────┤
│                       USER-LEVEL CHATS                           │
│   Personal conversations not tied to workspaces                  │
│   - No workspace_id                                              │
│   - Private to individual user                                   │
│   - Can ground to: org KBs, system KBs only                      │
│   - For personal/exploratory AI conversations                    │
└─────────────────────────────────────────────────────────────────┘
```

### KB Grounding Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        KB GROUNDING FLOW                          │
│                                                                   │
│  1. User selects KBs to ground chat                               │
│     ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│     │ Workspace  │  │   Org      │  │  System    │               │
│     │    KB      │  │   KBs      │  │   KBs      │               │
│     └────────────┘  └────────────┘  └────────────┘               │
│                                                                   │
│  2. User sends message                                            │
│     ┌────────────────────────────────────┐                        │
│     │ "What does our policy say about X?" │                       │
│     └────────────────────────────────────┘                        │
│                                                                   │
│  3. RAG retrieval from module-kb                                  │
│     ┌────────────────────────────────────┐                        │
│     │ POST /kb/search                     │                       │
│     │ { query, kbIds, topK: 5 }          │                        │
│     └────────────────────────────────────┘                        │
│              ↓                                                    │
│     ┌────────────────────────────────────┐                        │
│     │ Retrieved chunks with citations     │                       │
│     └────────────────────────────────────┘                        │
│                                                                   │
│  4. Context injection into AI prompt                              │
│     ┌────────────────────────────────────┐                        │
│     │ System: Use this context...        │                        │
│     │ [chunk 1] [chunk 2] [chunk 3]      │                        │
│     │ User: What does our policy say...  │                        │
│     └────────────────────────────────────┘                        │
│                                                                   │
│  5. Streaming response with citations                             │
│     ┌────────────────────────────────────┐                        │
│     │ "According to [Policy Doc, p.5]..." │                       │
│     └────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

### Streaming Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ API Gateway │────▶│ chat-stream │
│  (Browser)  │◀────│    (SSE)    │◀────│   Lambda    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┴────────────────────┐
                    │                                              │
              ┌─────▼─────┐     ┌─────────────┐     ┌─────────────┐
              │ module-kb │     │ module-ai   │     │  Supabase   │
              │ /kb/search│     │ AI Provider │     │   (save)    │
              └───────────┘     └─────────────┘     └─────────────┘

SSE Event Types:
- { type: "token", content: "..." }       - Streaming token
- { type: "citation", data: {...} }       - Citation metadata
- { type: "done", messageId: "...", usage: {...} } - Completion
- { type: "error", message: "..." }       - Error event
```

---

## 7. Entities Summary

### Entity Overview (5 Entities)

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| chat_sessions | Primary chat container | id, title, workspace_id, org_id, created_by, is_shared_with_workspace |
| chat_messages | Message storage | id, session_id, role, content, metadata, token_usage |
| chat_kb_grounding | KB associations per chat | id, session_id, kb_id, is_enabled |
| chat_shares | Sharing/collaboration | id, session_id, shared_with_user_id, permission_level |
| chat_favorites | User favorites | id, session_id, user_id |

### Access Control Model

| Scope | Owner | Shared Access | Visibility |
|-------|-------|---------------|------------|
| Workspace Chat | Creator | Workspace members (if shared) | Based on sharing settings |
| User-Level Chat | Creator | Explicitly shared users | Private by default |

*See [Technical Spec](./MODULE-CHAT-TECHNICAL-SPEC.md) for complete data model.*

---

## 8. API Summary

### User APIs (Workspace/User Scoped)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/chats` | GET/POST | List/create workspace chats |
| `/workspaces/{wsId}/chats/{chatId}` | GET/PATCH/DELETE | Manage workspace chat |
| `/users/me/chats` | GET/POST | List/create personal chats |
| `/chats/{chatId}` | GET/PATCH/DELETE | Manage any accessible chat |
| `/chats/{chatId}/messages` | GET | List messages with pagination |
| `/chats/{chatId}/stream` | POST | Stream AI response (SSE) |

### KB Grounding APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/kbs` | GET/POST | List/add grounded KBs |
| `/chats/{chatId}/kbs/{kbId}` | DELETE | Remove KB grounding |

### Sharing APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/shares` | GET/POST | List/create shares |
| `/chats/{chatId}/shares/{shareId}` | DELETE | Remove share |

### Favorites API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chats/{chatId}/favorite` | POST | Toggle favorite status |

*See [Technical Spec](./MODULE-CHAT-TECHNICAL-SPEC.md) for complete API documentation.*

---

## 9. UX Overview

### Regular Users

**Left Navigation:**
- "Chats" link visible to all authenticated users
- Navigates to `/chat` (chat list page)

**Chat List Page (`/chat`):**
- All accessible chats (workspace + personal)
- Search and filter capabilities
- Create new chat button
- Favorite indicators

**Chat Interface (`/chat/[id]`):**
- Message history with infinite scroll
- Streaming message display
- KB selector for grounding
- Citation badges with source preview
- Options menu (share, favorite, delete)

### Workspace Integration

**Workspace Detail Page Activities Tab:**
- Shows recent workspace chats
- "Continue Chat" buttons
- Quick create workspace chat

### Admins

**No dedicated admin pages.** Chat analytics available through module-mgmt:
- Token usage dashboards
- Chat session counts
- Popular KB usage

---

## 10. Implementation Phases

### Phase 1: Foundation & Specification (Sessions 141-143)

- [ ] Create specification documents
- [ ] Design data model
- [ ] Design API endpoints
- [ ] Define streaming protocol

**Estimated:** 6-9 hours

### Phase 2: Database Schema (Sessions 144-145)

- [ ] Core tables (sessions, messages)
- [ ] KB grounding table
- [ ] Collaboration tables (shares, favorites)
- [ ] RPC functions
- [ ] RLS policies

**Estimated:** 6-8 hours

### Phase 3: Backend - Chat Session Lambda (Sessions 146-147)

- [ ] Session CRUD
- [ ] KB grounding management
- [ ] Sharing management
- [ ] Favorites

**Estimated:** 6-8 hours

### Phase 4: Backend - Chat Message Lambda (Sessions 148-149)

- [ ] Message listing
- [ ] RAG context retrieval
- [ ] Conversation history formatting

**Estimated:** 6-8 hours

### Phase 5: Backend - Chat Stream Lambda (Sessions 150-151)

- [ ] Lambda response streaming
- [ ] AI provider integration
- [ ] SSE protocol implementation
- [ ] Error handling

**Estimated:** 6-8 hours

### Phase 6: Infrastructure (Session 152)

- [ ] Terraform resources
- [ ] API Gateway streaming configuration
- [ ] Lambda configurations

**Estimated:** 3-4 hours

### Phase 7: Frontend - Types & API (Session 153)

- [ ] TypeScript types
- [ ] API client with streaming support

**Estimated:** 3-4 hours

### Phase 8: Frontend - State Management (Session 154)

- [ ] Zustand chat store
- [ ] Streaming state management

**Estimated:** 3-4 hours

### Phase 9: Frontend - Hooks (Sessions 155-156)

- [ ] Chat session hooks
- [ ] Streaming message hooks
- [ ] KB grounding hooks

**Estimated:** 6-8 hours

### Phase 10: Frontend - Components (Sessions 157-160)

- [ ] Chat container
- [ ] Message display components
- [ ] Input composer
- [ ] KB selector
- [ ] Citation display

**Estimated:** 12-16 hours

### Phase 11: Frontend - Pages & Routes (Sessions 161-162)

- [ ] Chat list page
- [ ] Chat interface page
- [ ] Workspace integration
- [ ] Next.js routes

**Estimated:** 6-8 hours

### Phase 12: Integration & Testing (Sessions 163-164)

- [ ] Module integration
- [ ] Validation
- [ ] End-to-end testing

**Estimated:** 6-8 hours

### Phase 13: Documentation (Session 165)

- [ ] Module documentation
- [ ] Integration guide updates
- [ ] Developer guide

**Estimated:** 3-4 hours

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Streaming Protocol | Lambda Response Streaming + SSE | Native AWS support, simpler than WebSockets |
| Conversation History | Last 10 messages (configurable) | Token limit management |
| Citation Display | Inline badges + expandable panel | Balance between visibility and space |
| Default Sharing | Not shared by default | Privacy first, explicit sharing |
| KB Grounding | Per-chat selection | User controls grounding context |
| State Management | Zustand with persistence | Matches legacy pattern, good for streaming |

---

## 12. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Streaming latency | High | Medium | Lambda in same region, optimize RAG |
| Token costs | Medium | Medium | Rate limiting, usage alerts, tracking |
| RAG context too large | Medium | Medium | Top-K limits, re-ranking, compression |
| Citation accuracy | Medium | Low | Store chunk metadata, test thoroughly |
| Concurrent streams | Low | Low | Zustand state isolation, test multi-tab |

---

## 13. Integration Points

### Module-KB Integration

```
chat-stream → GET /chats/{chatId}/available-kbs → {workspaceKb, orgKbs[], systemKbs[]}
chat-stream → POST /kb/search → {chunks[], citations[]}
```

### Module-AI Integration

```
chat-stream → GET /orgs/{orgId}/ai-config → {chatModel, temperature, maxTokens}
chat-stream → POST /orgs/{orgId}/ai-usage → {tokens, operation: 'chat'}
```

### Module-WS Integration

```
workspace-page → useChatSessions(workspaceId) → workspace chats
workspace-activities → ChatSessionCard[] → recent workspace chats
```

---

## 14. Related Documentation

**CORA Standards:**
- [CORA Module Development Process](../../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../../standards/standard_MODULE-REGISTRATION.md)
- [Frontend Integration Standard](../../standards/standard_CORA-FRONTEND.md)
- [Lambda Route Docstring Standard](../../standards/standard_LAMBDA-ROUTE-DOCSTRING.md)

**Implementation Plan:**
- [Module-Chat Implementation Plan](../../plans/plan_module-chat-implementation.md)

**This Module:**
- [Technical Specification](./MODULE-CHAT-TECHNICAL-SPEC.md)
- [User UX Specification](./MODULE-CHAT-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-CHAT-ADMIN-UX-SPEC.md)

---

## 15. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Module Author | Cline AI Agent | Jan 15, 2026 | ✅ Complete |
| Technical Reviewer | - | - | ⏳ Pending |
| UX Reviewer | - | - | ⏳ Pending |
| Project Owner | - | - | ⏳ Pending |

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** January 15, 2026
