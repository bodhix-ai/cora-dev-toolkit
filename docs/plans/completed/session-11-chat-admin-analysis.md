# Session 11: Module-Chat Admin Infrastructure Analysis

**Date:** January 27, 2026  
**Sprint:** Admin Standardization S3b  
**Branch:** `admin-page-s3b`  
**Status:** Analysis Complete - Full Build Required

---

## Current State

Module-chat is the **ONLY module with ZERO admin infrastructure**. All existing functionality is user-facing data API.

### Existing Infrastructure (24 routes)

**Workspace Scoped (5 routes):**
- GET /workspaces/{workspaceId}/chats - List workspace chats
- POST /workspaces/{workspaceId}/chats - Create workspace chat
- GET /workspaces/{workspaceId}/chats/{sessionId} - Get chat details
- PATCH /workspaces/{workspaceId}/chats/{sessionId} - Update chat
- DELETE /workspaces/{workspaceId}/chats/{sessionId} - Delete chat

**User Level (5 routes):**
- GET /users/me/chats - List user's personal chats
- POST /users/me/chats - Create personal chat
- GET /chats/{sessionId} - Get chat details
- PATCH /chats/{sessionId} - Update chat
- DELETE /chats/{sessionId} - Delete chat

**KB Grounding (3 routes):**
- GET /chats/{sessionId}/kbs - List grounded KBs
- POST /chats/{sessionId}/kbs - Add KB grounding
- DELETE /chats/{sessionId}/kbs/{kbId} - Remove KB grounding

**Sharing (3 routes):**
- GET /chats/{sessionId}/shares - List shares
- POST /chats/{sessionId}/shares - Share chat
- DELETE /chats/{sessionId}/shares/{shareId} - Remove share

**Favorites (1 route):**
- POST /chats/{sessionId}/favorite - Toggle favorite

**Messages (3 routes):**
- GET /chats/{sessionId}/messages - List messages
- POST /chats/{sessionId}/messages - Create message
- GET /chats/{sessionId}/messages/{messageId} - Get message

**Context & History (2 routes):**
- POST /chats/{sessionId}/context - Get RAG context
- GET /chats/{sessionId}/history - Get conversation history

**Streaming (1 route):**
- POST /chats/{sessionId}/stream - Stream AI response

**Streaming (1 route):**
- POST /chats/{sessionId}/stream - Stream AI response

---

## What's Missing

### No Admin Routes
- No sys admin routes in outputs.tf
- No org admin routes in outputs.tf

### No Admin Handlers
- chat-session Lambda has NO admin handlers
- chat-message Lambda has NO admin handlers
- chat-stream Lambda has NO admin handlers (none needed)

### No Admin API Functions
- frontend/lib/api.ts has NO admin functions
- Only user-facing API functions exist

### No Admin Pages
- No sys admin page (routes/admin/sys/chat)
- No org admin page (routes/admin/org/chat)

---

## Required Admin Features

### Sys Admin (Platform Management)

**Chat Platform Settings:**
- Default chat title format
- Message retention policy (days to keep messages)
- Session timeout configuration
- Max message length
- Max KB groundings per chat
- Default AI provider/model for chats
- Streaming configuration (buffer size, timeout)
- Citation display settings

**Platform Analytics:**
- Total chat sessions (all orgs)
- Total messages sent
- Active chats (last 24h, 7d, 30d)
- Most active organizations
- KB grounding usage stats
- Chat sharing statistics
- Average messages per session
- Token usage statistics

### Org Admin (Organization Management)

**Organization Chat Management:**
- List all org chats (across all workspaces)
- Search chats by title, creator, workspace
- View chat details (messages, KBs, shares)
- View chat analytics for org
- Soft delete/restore chats
- Force delete chats (with confirmation)
- View chat message content (read-only)

**Organization Analytics:**
- Org chat session count
- Org message count
- Most active users (by chat usage)
- Most active workspaces
- KB grounding usage in org
- Chat sharing patterns
- Token usage by user/workspace

**Organization Settings (Overrides):**
- Org-specific message retention
- Org-specific max message length
- Org-specific KB grounding limits
- Org-specific sharing policies

---

## Proposed Admin Routes

### Sys Admin Routes (8 routes)

```
# Platform Configuration
GET    /admin/sys/chat/config           - Get platform chat settings
PUT    /admin/sys/chat/config           - Update platform chat settings

# Platform Analytics
GET    /admin/sys/chat/analytics        - Get platform-wide chat analytics
GET    /admin/sys/chat/analytics/usage  - Get detailed usage stats
GET    /admin/sys/chat/analytics/tokens - Get token usage statistics

# Platform Session Management
GET    /admin/sys/chat/sessions         - List all chat sessions (all orgs)
GET    /admin/sys/chat/sessions/{id}    - Get chat session details
DELETE /admin/sys/chat/sessions/{id}    - Force delete chat session
```

### Org Admin Routes (10 routes)

```
# Organization Configuration
GET    /admin/org/chat/config           - Get org chat settings
PUT    /admin/org/chat/config           - Update org chat settings (overrides)

# Organization Session Management
GET    /admin/org/chat/sessions         - List all org chat sessions
GET    /admin/org/chat/sessions/{id}    - Get chat session details
DELETE /admin/org/chat/sessions/{id}    - Delete org chat session
POST   /admin/org/chat/sessions/{id}/restore - Restore soft-deleted chat

# Organization Analytics
GET    /admin/org/chat/analytics        - Get org chat analytics
GET    /admin/org/chat/analytics/users  - Get user activity stats
GET    /admin/org/chat/analytics/workspaces - Get workspace activity stats
GET    /admin/org/chat/messages/{id}    - View message content (read-only)
```

---

## Implementation Plan

### Phase 1: Infrastructure (outputs.tf) - 1 hour
- Add 8 sys admin routes
- Add 10 org admin routes
- Total: 42 routes (24 existing + 18 admin)

### Phase 2: Backend - chat-session Lambda - 4-5 hours
- Update module docstring with admin routes
- Add sys admin route dispatcher
- Add org admin route dispatcher
- Implement 8 sys admin handlers:
  - `handle_sys_get_config()` - Get platform chat settings
  - `handle_sys_update_config()` - Update platform settings
  - `handle_sys_get_analytics()` - Platform-wide analytics
  - `handle_sys_get_usage_stats()` - Detailed usage stats
  - `handle_sys_get_token_stats()` - Token usage statistics
  - `handle_sys_list_sessions()` - List all sessions
  - `handle_sys_get_session()` - Get session details
  - `handle_sys_delete_session()` - Force delete session
- Implement 10 org admin handlers:
  - `handle_org_get_config()` - Get org settings
  - `handle_org_update_config()` - Update org settings
  - `handle_org_list_sessions()` - List org sessions
  - `handle_org_get_session()` - Get session details
  - `handle_org_delete_session()` - Delete session
  - `handle_org_restore_session()` - Restore session
  - `handle_org_get_analytics()` - Org analytics
  - `handle_org_get_user_stats()` - User activity
  - `handle_org_get_workspace_stats()` - Workspace activity
  - `handle_org_get_message()` - View message content

### Phase 3: Backend - chat-message Lambda - 1 hour
- Add sys admin route for viewing message content
- Update module docstring

### Phase 4: Database Schema - 1 hour
- Create `chat_cfg_sys_settings` table (platform config)
- Create `chat_cfg_org_settings` table (org-specific overrides)
- Migration script for config tables

### Phase 5: Frontend API (api.ts) - 2 hours
- Add 8 sys admin API functions
- Add 10 org admin API functions
- Error handling and types

### Phase 6: Sys Admin Page - 2-3 hours
- Create `apps/web/app/admin/sys/chat/page.tsx`
- Platform settings form
- Platform analytics dashboard
- Session list/search (read-only)

### Phase 7: Org Admin Page - 2-3 hours
- Create `apps/web/app/admin/org/chat/page.tsx`
- Org settings form (overrides)
- Org chat session list with search
- Session details modal
- Delete/restore actions
- User/workspace analytics

### Phase 8: Validation - 30 min
- Run admin-route-validator on module-chat
- Ensure 0 errors (42 routes compliant)

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Phase 1: Infrastructure | 1 hour |
| Phase 2: Backend - chat-session Lambda | 4-5 hours |
| Phase 3: Backend - chat-message Lambda | 1 hour |
| Phase 4: Database Schema | 1 hour |
| Phase 5: Frontend API | 2 hours |
| Phase 6: Sys Admin Page | 2-3 hours |
| Phase 7: Org Admin Page | 2-3 hours |
| Phase 8: Validation | 30 min |
| **TOTAL** | **14-17 hours** |

---

## Comparison to Other Modules

| Module | Admin Routes Before | Admin Routes After | Effort |
|--------|---------------------|--------------------| -------|
| module-kb | 13 malformed | 13 fixed | 3 hours |
| module-eval | 0 (complete) | 0 (complete) | 0 hours |
| module-mgmt | 5 migrated | 8 total | 4 hours |
| module-access | 4 migrated | 8 total | 8 hours |
| module-ai | 8 migrated | 18 total | 8 hours |
| module-ws | 5 migrated | 10 total | 6 hours |
| module-voice | 8 fixed | 24 total | 6 hours |
| **module-chat** | **0 routes** | **18 routes** | **14-17 hours** |

**Module-chat is the largest admin build** - requires full infrastructure from scratch.

---

## Decision Point

### Option A: Full Implementation (14-17 hours)
- Complete sys + org admin infrastructure
- All 18 admin routes
- Full CRUD operations
- Analytics dashboards
- Admin pages with full UI

### Option B: Minimal Viable Admin (8-10 hours)
- Basic sys admin routes only (config + analytics)
- Basic org admin routes only (list/view sessions)
- No delete/restore operations
- Simple admin pages (no dashboards)
- Defer advanced features to future sprint

### Option C: Defer Module-Chat (0 hours)
- Accept that module-chat has no admin infrastructure
- Mark as "future work" in documentation
- Complete Sprint 3b without module-chat
- Revisit in separate sprint when needed

---

## Recommendation

**Option A: Full Implementation** is recommended because:
1. Chat is a core module - admin features are important
2. Org admins need visibility into chat usage
3. Sys admins need platform-wide analytics
4. Other modules are complete - this is the last piece
5. Completing this achieves 100% admin parity across all modules

---

## Next Steps

Awaiting user decision on which option to pursue.

---

**Document Status:** Analysis Complete  
**Last Updated:** January 27, 2026 (Session 11)
