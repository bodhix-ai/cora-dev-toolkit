# Knowledge Base Module - Technical Specification (Index)

**Module Name:** module-kb  
**Module Type:** Core Module (Tier 2)  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 14, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-KB-SPEC.md](./MODULE-KB-SPEC.md)

---

## Technical Documentation Structure

This specification has been split into smaller, focused documents for easier maintenance:

### Core Technical Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [01-data-model.md](./technical/01-data-model.md) | Entity definitions (7 entities) | ✅ Complete |
| [02-database-schema.md](./technical/02-database-schema.md) | 9 migration files with SQL | ✅ Complete |
| [03-api-endpoints.md](./technical/03-api-endpoints.md) | REST API documentation | 🔄 Pending |
| [04-integrations.md](./technical/04-integrations.md) | Core module integrations | 🔄 Pending |
| [05-backend-patterns.md](./technical/05-backend-patterns.md) | Lambda implementations | 🔄 Pending |
| [06-infrastructure.md](./technical/06-infrastructure.md) | Terraform configurations | 🔄 Pending |
| [07-testing.md](./technical/07-testing.md) | Test requirements | 🔄 Pending |

---

## Quick Reference

### Entities (7 Total)

| Entity | Purpose | Document |
|--------|---------|----------|
| kb_bases | Primary KB container (4 scopes) | [01-data-model.md](./technical/01-data-model.md#11-entity-kb_bases) |
| kb_docs | Document metadata | [01-data-model.md](./technical/01-data-model.md#12-entity-kb_docs) |
| kb_chunks | RAG chunks with pgvector | [01-data-model.md](./technical/01-data-model.md#13-entity-kb_chunks) |
| kb_access_sys | System KB org sharing | [01-data-model.md](./technical/01-data-model.md#14-entity-kb_access_sys) |
| kb_access_orgs | Org-level KB enablement | [01-data-model.md](./technical/01-data-model.md#15-entity-kb_access_orgs) |
| kb_access_ws | Workspace-level KB enablement | [01-data-model.md](./technical/01-data-model.md#16-entity-kb_access_ws) |
| kb_access_chats | Chat-level KB toggles | [01-data-model.md](./technical/01-data-model.md#17-entity-kb_access_chats) |

### KB Scopes

| Scope | Description | Created By |
|-------|-------------|------------|
| sys | Platform-wide system KBs | Platform Admin |
| org | Organization-level KBs | Org Admin |
| workspace | Auto-created for workspace | First document upload |
| chat | Auto-created for chat | First document upload |

### 4-Level Access Inheritance

```
System KB Access Chain:
1. kb_access_sys    → Platform admin shares with org
2. kb_access_orgs   → Org admin enables for org
3. kb_access_ws     → Workspace admin enables for workspace
4. kb_access_chats  → User enables for chat
```

### Lambda Functions (3 Total)

| Lambda | Purpose | Triggers |
|--------|---------|----------|
| kb-base | KB CRUD operations | API Gateway |
| kb-document | Document upload/download | API Gateway |
| kb-processor | Async document processing | SQS |

### Key Technologies

- **Database:** PostgreSQL with pgvector extension
- **Embedding Model:** AWS Bedrock Titan V2 (1024 dimensions)
- **Document Storage:** S3 with presigned URLs
- **Async Processing:** SQS with DLQ
- **Vector Index:** HNSW (better out-of-box performance)

---

## Migration Summary

| # | File | Purpose |
|---|------|---------|
| 001 | kb-bases.sql | Main KB table |
| 002 | kb-docs.sql | Document metadata |
| 003 | kb-chunks.sql | RAG chunks + pgvector |
| 004 | kb-access-sys.sql | System KB sharing |
| 005 | kb-access-orgs.sql | Org enablement |
| 006 | kb-access-ws.sql | Workspace enablement |
| 007 | kb-access-chats.sql | Chat toggles |
| 008 | kb-rpc-functions.sql | Access control functions |
| 009 | kb-rls.sql | Row Level Security |

See [02-database-schema.md](./technical/02-database-schema.md) for complete SQL.

---

## API Endpoint Summary

### User Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/kb` | GET | Get workspace KB |
| `/workspaces/{wsId}/kb/documents` | GET/POST | List/upload documents |
| `/workspaces/{wsId}/available-kbs` | GET | List toggleable KBs |
| `/chats/{chatId}/kb` | GET | Get chat KB |
| `/chats/{chatId}/available-kbs` | GET | List toggleable KBs |

### Admin Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/org/kbs` | GET/POST | List/create org KBs |
| `/admin/org/kbs/{kbId}` | PATCH/DELETE | Manage org KB |
| `/admin/sys/kbs` | GET/POST | List/create system KBs |
| `/admin/sys/kbs/{kbId}/orgs` | POST/DELETE | Org associations |

### Internal Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/kb/search` | POST | Semantic search (RAG) |

---

## Related Documentation

- [Parent Specification](./MODULE-KB-SPEC.md)
- [User UX Specification](./MODULE-KB-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-KB-ADMIN-UX-SPEC.md)
- [Implementation Plan](../../plans/plan_module-kb-implementation.md)

---

**Document Version:** 2.0 (Split structure)  
**Last Updated:** January 15, 2026
