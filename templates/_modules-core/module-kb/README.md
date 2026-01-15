# Module-KB: Knowledge Base

**Version**: 1.0.0  
**Tier**: 2 (Core Module)  
**Status**: Active

## Overview

The Knowledge Base module provides RAG (Retrieval-Augmented Generation) capabilities for CORA applications. It enables multi-scope document management with pgvector embeddings for AI-powered search and chat grounding.

## Features

- **Multi-Scope Document Management**: Support for global, organization, workspace, and chat-level knowledge bases
- **RAG Embeddings**: pgvector integration for semantic search using configurable embedding models
- **Document Processing**: Automatic parsing and indexing of PDF, DOCX, TXT, and MD files
- **Access Control**: 4-level cascading access control (sys → org → workspace → chat)
- **Admin Management**: Full CRUD for org and platform administrators
- **AI Chat Grounding**: Integration with module-chat for context-aware responses

## Dependencies

- **Required**: `module-access`, `module-ai`
- **Optional**: `module-ws` (for workspace-level KB integration)

## Architecture

### Scopes

| Scope | Description | Managed By |
|-------|-------------|------------|
| Global (sys) | Platform-wide KBs | Platform Admin |
| Organization | Org-level KBs | Org Admin |
| Workspace | Auto-created per workspace | Users |
| Chat | Scoped to chat sessions | Users |

### Database Schema

| Table | Purpose |
|-------|---------|
| `kb_bases` | KB metadata (name, scope, config) |
| `kb_docs` | Document metadata (filename, status) |
| `kb_chunks` | RAG chunks with pgvector embeddings |
| `kb_access_sys` | Global KB → Org associations |
| `kb_access_orgs` | Org-level KB enablement |
| `kb_access_ws` | Workspace KB enablement |
| `kb_access_chats` | Chat KB selection |

### Lambda Functions

| Lambda | Purpose |
|--------|---------|
| `kb-base` | KB CRUD operations, toggle management |
| `kb-document` | Document upload/download via presigned URLs |
| `kb-processor` | Async document parsing and embedding generation |

## API Routes

### Workspace Scoped
- `GET /workspaces/{workspaceId}/kb` - Get workspace KB
- `POST /workspaces/{workspaceId}/kb/documents` - Upload document
- `GET /workspaces/{workspaceId}/available-kbs` - List toggleable KBs

### Chat Scoped
- `GET /chats/{chatId}/kb` - Get chat KB
- `GET /chats/{chatId}/available-kbs` - List available KBs
- `POST /chats/{chatId}/kbs/{kbId}/toggle` - Toggle KB for chat

### Admin - Organization
- `GET /admin/org/kbs` - List org KBs
- `POST /admin/org/kbs` - Create org KB
- `PATCH /admin/org/kbs/{kbId}` - Update org KB
- `DELETE /admin/org/kbs/{kbId}` - Delete org KB

### Admin - Platform
- `GET /admin/sys/kbs` - List global KBs
- `POST /admin/sys/kbs` - Create global KB
- `POST /admin/sys/kbs/{kbId}/orgs` - Associate with org
- `DELETE /admin/sys/kbs/{kbId}/orgs/{orgId}` - Remove org association

### RAG Search
- `POST /kb/search` - Semantic search across enabled KBs

## Frontend Components

### User Components
- `KBToggleSelector` - Toggle available KBs for workspace/chat
- `DocumentUploadZone` - Drag-and-drop file upload
- `DocumentTable` - Document list with status and actions
- `DocumentStatusBadge` - Processing status indicator
- `KBStatsCard` - Document count, storage, chunk stats

### Admin Components
- `KBFormDialog` - Create/edit KB form
- `OrgKBList` - Organization KB management
- `SysKBList` - Global KB management with org associations

### Integration Components
- `WorkspaceDataKBTab` - Ready-to-use workspace integration

## Hooks

- `useKnowledgeBase(workspaceId)` - Workspace KB management
- `useKbDocuments(kbId)` - Document operations
- `useOrgKbs(orgId)` - Org admin KB management
- `useSysKbs()` - Platform admin KB management

## Admin Pages

- `/admin/org/kb` - Organization KB management
- `/admin/sys/kb` - Platform KB management

## Configuration

### Embedding Models

Default: AWS Bedrock Titan Text Embeddings V2 (1024 dimensions)

Supported providers:
- OpenAI (ada-002, text-embedding-3)
- Azure OpenAI
- AWS Bedrock (Titan)
- Google Vertex AI

Configuration is managed via `module-ai` platform settings.

### File Limits

- **Max file size**: 50 MB
- **Supported types**: PDF, DOCX, TXT, MD
- **Presigned URL expiration**: 15 minutes

### Chunking

- **Default chunk size**: 1000 characters
- **Default overlap**: 200 characters
- Configurable per KB via admin settings

## Integration with Other Modules

### module-chat
```typescript
// KB grounding for chat
const availableKbs = await api.get(`/chats/${chatId}/available-kbs`);
await api.post(`/chats/${chatId}/kbs/${kbId}/toggle`, { enabled: true });

// RAG search
const results = await api.post('/kb/search', {
  query: userMessage,
  kbIds: enabledKbIds,
  topK: 5
});
```

### module-ws
```typescript
// Integrate KB tab into workspace detail page
import { WorkspaceDataKBTab } from '@cora/module-kb/frontend';

<WorkspaceDataKBTab
  workspaceId={workspaceId}
  kb={kb}
  documents={documents}
  onUploadDocument={handleUpload}
/>
```

## Installation

Module-kb is automatically included when creating a new CORA project:

```bash
./scripts/create-cora-project.sh my-project
```

## Infrastructure

Requires the following AWS resources (managed by Terraform):

- S3 bucket for document storage
- SQS queue for async processing
- Lambda functions (3)
- API Gateway routes

## Documentation

- [Technical Specification](../../docs/specifications/module-kb/MODULE-KB-TECHNICAL-SPEC.md)
- [User UX Specification](../../docs/specifications/module-kb/MODULE-KB-USER-UX-SPEC.md)
- [Admin UX Specification](../../docs/specifications/module-kb/MODULE-KB-ADMIN-UX-SPEC.md)

## License

Proprietary - See LICENSE file in repository root.
