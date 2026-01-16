# Chat Module - Data Model

**Parent Document:** [MODULE-CHAT-TECHNICAL-SPEC.md](../MODULE-CHAT-TECHNICAL-SPEC.md)

---

## 1.1 Entity: chat_sessions

**Purpose:** Primary chat session container supporting workspace-scoped and user-level conversations.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| title | VARCHAR(255) | Yes | 'New Chat' | NOT NULL | Chat title |
| workspace_id | UUID | No | NULL | FK to workspaces(id) | Workspace (for workspace-scoped chats) |
| org_id | UUID | Yes | - | FK to orgs(id) ON DELETE CASCADE | Organization |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| is_shared_with_workspace | BOOLEAN | Yes | false | - | Whether shared with all workspace members |
| metadata | JSONB | Yes | '{}' | - | Chat metadata (model config, etc.) |
| is_deleted | BOOLEAN | Yes | false | - | Soft delete flag |
| deleted_at | TIMESTAMPTZ | No | NULL | - | Deletion timestamp |
| deleted_by | UUID | No | NULL | FK to auth.users(id) | Who deleted the chat |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Relationships

```
chat_sessions
├── belongs_to: orgs (org_id → orgs.id)
├── belongs_to: workspaces (workspace_id → workspaces.id) [optional]
├── belongs_to: auth.users (created_by → auth.users.id)
├── has_many: chat_messages (via session_id)
├── has_many: chat_kb_grounding (via session_id)
├── has_many: chat_shares (via session_id)
└── has_many: chat_favorites (via session_id)
```

### Metadata JSONB Structure

```json
{
  "lastMessageAt": "2026-01-15T10:30:00Z",
  "messageCount": 15,
  "participantCount": 2,
  "tokenUsage": {
    "promptTokens": 5000,
    "completionTokens": 3000,
    "totalTokens": 8000
  },
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### Validation Rules

**Field Validation:**
- `title`: Required, 1-255 characters
- `org_id`: Required for all chats
- `workspace_id`: Optional (NULL for user-level chats)

**Business Rules:**
1. Workspace-scoped chat: workspace_id is set, user must be workspace member
2. User-level chat: workspace_id is NULL, only creator has access
3. Sharing: Only owner can share, is_shared_with_workspace enables workspace-wide access

### Scope Constraint SQL

```sql
-- No constraint needed since both scopes use same table
-- Workspace-scoped: workspace_id IS NOT NULL
-- User-level: workspace_id IS NULL
```

---

## 1.2 Entity: chat_messages

**Purpose:** Message storage with role (user/assistant/system), content, and metadata including citations.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| session_id | UUID | Yes | - | FK to chat_sessions(id) ON DELETE CASCADE | Parent chat session |
| role | VARCHAR(50) | Yes | - | CHECK (role IN ('user', 'assistant', 'system')) | Message role |
| content | TEXT | Yes | - | NOT NULL | Message content |
| metadata | JSONB | Yes | '{}' | - | Message metadata (citations, model, etc.) |
| token_usage | JSONB | No | NULL | - | Token usage for this message |
| was_truncated | BOOLEAN | Yes | false | - | Whether response was truncated |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| created_by | UUID | No | NULL | FK to auth.users(id) | Creator (for user messages) |

### Relationships

```
chat_messages
├── belongs_to: chat_sessions (session_id → chat_sessions.id)
└── belongs_to: auth.users (created_by → auth.users.id) [optional]
```

### Metadata JSONB Structure

```json
{
  "citations": [
    {
      "kbId": "uuid",
      "kbName": "Company Policies",
      "documentId": "uuid",
      "documentName": "HR Policy 2026.pdf",
      "chunkIndex": 5,
      "content": "Excerpt from the document...",
      "pageNumber": 12
    }
  ],
  "model": "gpt-4-turbo",
  "temperature": 0.7,
  "ragContext": {
    "queryUsed": "original user query",
    "chunksRetrieved": 5,
    "kbsSearched": ["uuid1", "uuid2"]
  }
}
```

### Token Usage JSONB Structure

```json
{
  "promptTokens": 500,
  "completionTokens": 300,
  "totalTokens": 800
}
```

### Validation Rules

**Field Validation:**
- `role`: Required, must be 'user', 'assistant', or 'system'
- `content`: Required, non-empty
- `session_id`: Required, must reference valid session

**Business Rules:**
1. User messages have created_by set
2. Assistant messages have token_usage set
3. System messages are auto-generated (no created_by)

---

## 1.3 Entity: chat_kb_grounding

**Purpose:** Associates knowledge bases with chat sessions for RAG context retrieval.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| session_id | UUID | Yes | - | FK to chat_sessions(id) ON DELETE CASCADE | Chat session |
| kb_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | Knowledge base |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is active for this chat |
| added_at | TIMESTAMPTZ | Yes | NOW() | - | When KB was added |
| added_by | UUID | Yes | - | FK to auth.users(id) | Who added the KB |

### Constraints

```sql
UNIQUE(session_id, kb_id)
```

### Relationships

```
chat_kb_grounding
├── belongs_to: chat_sessions (session_id → chat_sessions.id)
├── belongs_to: kb_bases (kb_id → kb_bases.id)
└── belongs_to: auth.users (added_by → auth.users.id)
```

### KB Access Rules

For a KB to be added to a chat, the user must have access through the KB inheritance chain:

| KB Scope | Required Access |
|----------|-----------------|
| System | kb_access_sys + kb_access_orgs enabled for user's org |
| Org | kb_access_orgs enabled for user's org |
| Workspace | User must be workspace member |
| Chat | KB belongs to this chat session |

---

## 1.4 Entity: chat_shares

**Purpose:** Enables sharing chat sessions with specific users with permission levels.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| session_id | UUID | Yes | - | FK to chat_sessions(id) ON DELETE CASCADE | Chat session |
| shared_with_user_id | UUID | Yes | - | FK to auth.users(id) ON DELETE CASCADE | User receiving access |
| permission_level | VARCHAR(50) | Yes | 'view' | CHECK (permission_level IN ('view', 'edit')) | Permission level |
| created_by | UUID | Yes | - | FK to auth.users(id) | Who created the share |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |

### Constraints

```sql
UNIQUE(session_id, shared_with_user_id)
```

### Relationships

```
chat_shares
├── belongs_to: chat_sessions (session_id → chat_sessions.id)
├── belongs_to: auth.users (shared_with_user_id → auth.users.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

### Permission Levels

| Level | Can View | Can Send Messages | Can Delete |
|-------|----------|-------------------|------------|
| view | ✅ | ❌ | ❌ |
| edit | ✅ | ✅ | ❌ |
| owner | ✅ | ✅ | ✅ |

**Note:** Owner permission is implicit (created_by = user_id), not stored in chat_shares.

---

## 1.5 Entity: chat_favorites

**Purpose:** Allows users to mark chat sessions as favorites for quick access.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| session_id | UUID | Yes | - | FK to chat_sessions(id) ON DELETE CASCADE | Chat session |
| user_id | UUID | Yes | - | FK to auth.users(id) ON DELETE CASCADE | User who favorited |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | When favorited |

### Constraints

```sql
UNIQUE(session_id, user_id)
```

### Relationships

```
chat_favorites
├── belongs_to: chat_sessions (session_id → chat_sessions.id)
└── belongs_to: auth.users (user_id → auth.users.id)
```

---

## 2. Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │      orgs       │
                                    └────────┬────────┘
                                             │
                                             │ org_id
                                             ▼
┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│   workspaces    │◀──────────────│  chat_sessions  │──────────────▶│   auth.users    │
└─────────────────┘  workspace_id  └────────┬────────┘  created_by   └─────────────────┘
                                             │
           ┌─────────────────────────────────┼─────────────────────────────────┐
           │                                 │                                 │
           ▼                                 ▼                                 ▼
┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐
│  chat_messages  │                │chat_kb_grounding│                │   chat_shares   │
└─────────────────┘                └────────┬────────┘                └─────────────────┘
                                             │
                                             │ kb_id
                                             ▼
                                    ┌─────────────────┐
                                    │    kb_bases     │
                                    └─────────────────┘
                                             
           ┌─────────────────┐
           │  chat_favorites │◀───────────────────────────────────────┘
           └─────────────────┘
```

---

## 3. Access Control Summary

### Chat Access Rules

| User Role | Can View | Can Send Messages | Can Share | Can Delete |
|-----------|----------|-------------------|-----------|------------|
| Owner (created_by) | ✅ | ✅ | ✅ | ✅ |
| Shared (edit) | ✅ | ✅ | ❌ | ❌ |
| Shared (view) | ✅ | ❌ | ❌ | ❌ |
| Workspace Member* | ✅ | ✅ | ❌ | ❌ |
| No Access | ❌ | ❌ | ❌ | ❌ |

*Only if `is_shared_with_workspace = true`

### RPC Functions Required

| Function | Purpose |
|----------|---------|
| `is_chat_owner(user_id, session_id)` | Check if user owns the chat |
| `can_view_chat(user_id, session_id)` | Check view permission |
| `can_edit_chat(user_id, session_id)` | Check edit permission |
| `get_accessible_chats(user_id, org_id, workspace_id?)` | List all accessible chats |
| `get_available_kbs_for_chat(user_id, session_id)` | List KBs user can add |

---

## 4. Indexes

### chat_sessions

```sql
CREATE INDEX chat_sessions_workspace_id_idx ON chat_sessions(workspace_id);
CREATE INDEX chat_sessions_org_id_idx ON chat_sessions(org_id);
CREATE INDEX chat_sessions_created_by_idx ON chat_sessions(created_by);
CREATE INDEX chat_sessions_created_at_idx ON chat_sessions(created_at DESC);
CREATE INDEX chat_sessions_is_deleted_idx ON chat_sessions(is_deleted) WHERE is_deleted = false;
```

### chat_messages

```sql
CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX chat_messages_created_at_idx ON chat_messages(created_at DESC);
CREATE INDEX chat_messages_session_created_idx ON chat_messages(session_id, created_at DESC);
```

### chat_kb_grounding

```sql
CREATE INDEX chat_kb_grounding_session_id_idx ON chat_kb_grounding(session_id);
CREATE INDEX chat_kb_grounding_kb_id_idx ON chat_kb_grounding(kb_id);
```

### chat_shares

```sql
CREATE INDEX chat_shares_session_id_idx ON chat_shares(session_id);
CREATE INDEX chat_shares_shared_with_idx ON chat_shares(shared_with_user_id);
```

### chat_favorites

```sql
CREATE INDEX chat_favorites_session_id_idx ON chat_favorites(session_id);
CREATE INDEX chat_favorites_user_id_idx ON chat_favorites(user_id);
```

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
