# Knowledge Base Module - Data Model

**Parent Document:** [MODULE-KB-TECHNICAL-SPEC.md](../MODULE-KB-TECHNICAL-SPEC.md)

---

## 1.1 Entity: kb_bases

**Purpose:** Primary knowledge base container supporting four scopes (sys, org, workspace, chat).

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| name | VARCHAR(255) | Yes | - | NOT NULL | KB display name |
| description | TEXT | No | NULL | - | KB description |
| scope | VARCHAR(50) | Yes | - | CHECK (scope IN ('sys', 'org', 'workspace', 'chat')) | KB scope level |
| org_id | UUID | No | NULL | FK to orgs(id) | Organization (for org/workspace/chat scopes) |
| workspace_id | UUID | No | NULL | FK to workspaces(id) | Workspace (for workspace scope) |
| chat_session_id | UUID | No | NULL | FK to chat_sessions(id) | Chat session (for chat scope) |
| config | JSONB | Yes | '{}' | - | KB configuration (whoCanUpload, autoIndex) |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is active |
| is_deleted | BOOLEAN | Yes | false | - | Soft delete flag |
| deleted_at | TIMESTAMPTZ | No | NULL | - | Deletion timestamp |
| deleted_by | UUID | No | NULL | FK to auth.users(id) | Who deleted the KB |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

### Relationships

```
kb_bases
├── belongs_to: orgs (org_id → orgs.id) [org/workspace/chat scopes]
├── belongs_to: workspaces (workspace_id → workspaces.id) [workspace scope]
├── belongs_to: chat_sessions (chat_session_id → chat_sessions.id) [chat scope]
├── belongs_to: auth.users (created_by → auth.users.id)
├── has_many: kb_docs (via kb_id)
├── has_many: kb_chunks (via kb_id)
├── has_many: kb_access_sys (via knowledge_base_id) [sys scope only]
└── has_many: kb_access_chats (via knowledge_base_id)
```

### Config JSONB Structure

```json
{
  "whoCanUpload": "admin" | "all_members",
  "autoIndex": true,
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "maxDocuments": 100,
  "maxFileSize": 52428800
}
```

### Validation Rules

**Field Validation:**
- `name`: Required, 1-255 characters
- `scope`: Required, must be one of: sys, org, workspace, chat
- `org_id`: Required for org/workspace/chat scopes
- `workspace_id`: Required for workspace scope
- `chat_session_id`: Required for chat scope

**Business Rules:**
1. System scope: org_id, workspace_id, chat_session_id must all be NULL
2. Org scope: org_id required, workspace_id and chat_session_id must be NULL
3. Workspace scope: org_id and workspace_id required, chat_session_id must be NULL
4. Chat scope: org_id and chat_session_id required, workspace_id optional

### Scope Constraint SQL

```sql
CONSTRAINT kb_bases_scope_check CHECK (
  (scope = 'sys' AND org_id IS NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
  (scope = 'org' AND org_id IS NOT NULL AND workspace_id IS NULL AND chat_session_id IS NULL) OR
  (scope = 'workspace' AND org_id IS NOT NULL AND workspace_id IS NOT NULL AND chat_session_id IS NULL) OR
  (scope = 'chat' AND org_id IS NOT NULL AND chat_session_id IS NOT NULL)
)
```

---

## 1.2 Entity: kb_docs

**Purpose:** Document metadata tracking upload, processing status, and S3 location.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| kb_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | Parent knowledge base |
| filename | VARCHAR(255) | Yes | - | NOT NULL | Original filename |
| s3_key | VARCHAR(512) | Yes | - | NOT NULL, UNIQUE | S3 object key |
| s3_bucket | VARCHAR(255) | Yes | - | NOT NULL | S3 bucket name |
| file_size | BIGINT | Yes | - | NOT NULL | File size in bytes |
| mime_type | VARCHAR(100) | No | NULL | - | MIME type (application/pdf, etc.) |
| status | VARCHAR(50) | Yes | 'pending' | CHECK (status IN ('pending', 'processing', 'indexed', 'failed')) | Processing status |
| error_message | TEXT | No | NULL | - | Error details if failed |
| chunk_count | INTEGER | No | 0 | DEFAULT 0 | Number of chunks created |
| metadata | JSONB | Yes | '{}' | - | Document metadata (page count, author, etc.) |
| is_deleted | BOOLEAN | Yes | false | - | Soft delete flag |
| deleted_at | TIMESTAMPTZ | No | NULL | - | Deletion timestamp |
| deleted_by | UUID | No | NULL | FK to auth.users(id) | Who deleted the document |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Upload timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Uploader user ID |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |

### Relationships

```
kb_docs
├── belongs_to: kb_bases (kb_id → kb_bases.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── has_many: kb_chunks (via document_id)
```

### Metadata JSONB Structure

```json
{
  "pageCount": 15,
  "author": "John Doe",
  "title": "Document Title",
  "createdDate": "2025-01-01",
  "wordCount": 5000,
  "language": "en"
}
```

### Status Transitions

```
pending → processing (when processor picks up from SQS)
processing → indexed (successful parsing + embedding)
processing → failed (error during processing)
failed → pending (manual retry)
```

---

## 1.3 Entity: kb_chunks

**Purpose:** RAG text chunks with pgvector embeddings for semantic search.

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| kb_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | Parent knowledge base |
| document_id | UUID | Yes | - | FK to kb_docs(id) ON DELETE CASCADE | Source document |
| content | TEXT | Yes | - | NOT NULL | Chunk text content |
| embedding | vector(1024) | No | NULL | - | pgvector embedding (Bedrock Titan V2) |
| chunk_index | INTEGER | Yes | - | NOT NULL | Position within document |
| token_count | INTEGER | No | NULL | - | Token count for billing |
| metadata | JSONB | Yes | '{}' | - | Chunk metadata (page, heading, etc.) |
| embedding_model | VARCHAR(100) | No | NULL | - | Model used for embedding |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |

### Relationships

```
kb_chunks
├── belongs_to: kb_bases (kb_id → kb_bases.id)
└── belongs_to: kb_docs (document_id → kb_docs.id)
```

### Metadata JSONB Structure

```json
{
  "pageNumber": 5,
  "heading": "Section 2.1",
  "startChar": 4500,
  "endChar": 5500,
  "paragraphIndex": 12
}
```

### Embedding Dimensions by Provider

| Provider | Model | Dimensions |
|----------|-------|------------|
| AWS Bedrock | amazon.titan-embed-text-v2:0 | 1024 (DEFAULT) |
| OpenAI | text-embedding-ada-002 | 1536 |
| OpenAI | text-embedding-3-small | 1536 |
| OpenAI | text-embedding-3-large | 3072 |
| Google Vertex | textembedding-gecko | 768 |

**Note:** The embedding column dimension must match the configured model. Changing embedding models requires migration.

---

## 1.4 Entity: kb_access_sys

**Purpose:** Platform admin shares system KBs with specific organizations (Step 1 of inheritance chain).

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| knowledge_base_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | System KB |
| org_id | UUID | Yes | - | FK to orgs(id) ON DELETE CASCADE | Organization granted access |
| is_enabled | BOOLEAN | Yes | true | - | Whether access is active |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Association timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Who granted access |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |

### Constraints

```sql
UNIQUE(knowledge_base_id, org_id)
```

### Relationships

```
kb_access_sys
├── belongs_to: kb_bases (knowledge_base_id → kb_bases.id)
├── belongs_to: orgs (org_id → orgs.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

---

## 1.5 Entity: kb_access_orgs

**Purpose:** Org admin enables KBs at org level - required for org members to use the KB (Step 2 of inheritance chain).

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| knowledge_base_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | KB being enabled |
| org_id | UUID | Yes | - | FK to orgs(id) ON DELETE CASCADE | Organization enabling the KB |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is enabled at org level |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Enablement timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Who enabled the KB |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |

### Constraints

```sql
UNIQUE(knowledge_base_id, org_id)
```

### Relationships

```
kb_access_orgs
├── belongs_to: kb_bases (knowledge_base_id → kb_bases.id)
├── belongs_to: orgs (org_id → orgs.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

---

## 1.6 Entity: kb_access_ws

**Purpose:** Workspace admin enables KBs for workspace-associated chats (Step 3 of inheritance chain).

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| knowledge_base_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | KB being enabled |
| workspace_id | UUID | Yes | - | FK to workspaces(id) ON DELETE CASCADE | Workspace enabling the KB |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is enabled for workspace |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Enablement timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Who enabled the KB |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |

### Constraints

```sql
UNIQUE(knowledge_base_id, workspace_id)
```

### Relationships

```
kb_access_ws
├── belongs_to: kb_bases (knowledge_base_id → kb_bases.id)
├── belongs_to: workspaces (workspace_id → workspaces.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

---

## 1.7 Entity: kb_access_chats

**Purpose:** User enables KBs for specific chat sessions (Step 4 of inheritance chain - final user selection).

### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| knowledge_base_id | UUID | Yes | - | FK to kb_bases(id) ON DELETE CASCADE | KB being toggled |
| chat_session_id | UUID | Yes | - | FK to chat_sessions(id) ON DELETE CASCADE | Chat session |
| is_enabled | BOOLEAN | Yes | true | - | Whether KB is active for chat |
| is_override | BOOLEAN | Yes | false | - | User explicitly toggled (vs. default) |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Toggle timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |

### Constraints

```sql
UNIQUE(knowledge_base_id, chat_session_id)
```

### Relationships

```
kb_access_chats
├── belongs_to: kb_bases (knowledge_base_id → kb_bases.id)
└── belongs_to: chat_sessions (chat_session_id → chat_sessions.id)
```

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
