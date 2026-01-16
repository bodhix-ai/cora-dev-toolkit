# Knowledge Base Module Specification (Parent)

**Module Name:** module-kb  
**Module Type:** Core Module (Tier 2)  
**Entity:** knowledge_base (kb)  
**Complexity:** Complex  
**Estimated Time:** 33-48 hours (11-16 sessions)  
**Status:** Draft  
**Created:** January 14, 2026  
**Last Updated:** January 15, 2026

---

## Document Overview

This is the **parent specification** for module-kb. It provides an executive summary and references the detailed subordinate specifications.

### Subordinate Specifications

| Specification | Purpose | Est. Size |
|---------------|---------|-----------|
| [MODULE-KB-TECHNICAL-SPEC.md](./MODULE-KB-TECHNICAL-SPEC.md) | Data model, API, database, backend, pgvector | ~2500 lines |
| [MODULE-KB-USER-UX-SPEC.md](./MODULE-KB-USER-UX-SPEC.md) | User personas, document upload, KB toggles | ~1200 lines |
| [MODULE-KB-ADMIN-UX-SPEC.md](./MODULE-KB-ADMIN-UX-SPEC.md) | Admin KB management, org/platform pages | ~1000 lines |

---

## 1. Executive Summary

### Purpose

The Knowledge Base Module provides a multi-scope document management and RAG (Retrieval-Augmented Generation) system that enables organizations to create, manage, and query knowledge bases at various levels of granularity. It serves as the foundation for AI-powered document retrieval, enabling contextual grounding of AI responses with organizational knowledge.

### Problem Solved

- Organizations need centralized document repositories for AI-assisted knowledge retrieval
- Teams need workspace-scoped documents for project-specific context
- Users need to upload documents directly to chat sessions for immediate context
- Admins need to curate and manage knowledge bases at org and platform levels
- AI responses need grounding in organizational documents with proper citations

### Key Capabilities

1. **Multi-Scope KB Hierarchy** - System → Org → Workspace → Chat knowledge bases
2. **Document Management** - Upload, index, search, and delete documents
3. **RAG Embeddings** - pgvector-based semantic search with configurable embedding models
4. **KB Toggle System** - Users can enable/disable available KBs per workspace/chat
5. **Async Processing** - SQS-triggered document parsing and embedding generation
6. **S3 Integration** - Presigned URL uploads for large documents
7. **Admin Management** - Full CRUD for org/platform-level KBs

---

## 2. Scope

### In Scope

**Core Functionality:**
- Create, read, update, soft delete knowledge bases (4 scopes: sys, org, workspace, chat)
- Document upload via S3 presigned URLs
- Document parsing (PDF, DOCX, TXT, MD)
- Text chunking with configurable overlap
- pgvector embedding generation and storage
- Semantic similarity search for RAG retrieval
- KB toggle selector for workspace/chat grounding

**User Experience:**
- Document upload zone (drag-and-drop)
- Document table with status tracking
- KB toggle selector showing available KBs
- Processing status indicators

**Admin Experience:**
- Platform admin system KB management (`/admin/sys/kb`)
- Org admin org KB management (`/admin/org/kb`)
- Org association management for system KBs
- Document management within admin KBs

**Integration:**
- module-ai: Embedding configuration retrieval
- module-ws: Workspace KB auto-creation
- module-chat: Chat KB auto-creation and RAG context

### Out of Scope

- Full-text search (deferred to v2)
- Document versioning (deferred to v2)
- KB templates (deferred to v2)
- Cross-org KB sharing (not planned)
- Real-time collaborative document editing
- OCR for image-based documents
- Video/audio transcription

---

## 3. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 2 | 5 entities (kb_bases, kb_docs, kb_chunks, kb_access_sys, kb_access_chats) |
| AI Integration | 2 | Advanced: pgvector embeddings, multi-provider support |
| Functional Dependencies | 2 | module-ws, module-chat (future), module-ai |
| Legacy Code Complexity | 2 | 3 Lambda functions, ~1500+ lines |
| Business Logic | 2 | Multi-scope hierarchy, async processing, embedding pipeline |
| **Total** | **10** | **Complex** |

### Classification: Complex

**Time Estimate:** 33-48 hours (11-16 sessions)

### Specification Size Estimates

| Specification | Estimated Lines | Actual Lines |
|---------------|-----------------|--------------|
| Parent (this doc) | 300-400 | ~350 |
| Technical Spec | 2000-3000 | TBD |
| User UX Spec | 1000-1500 | TBD |
| Admin UX Spec | 800-1200 | TBD |
| **Total** | **4100-6100** | TBD |

---

## 4. Source Reference

### Legacy Code

- **Repository:** `~/code/policy/legacy/pm-app-stack/packages/kb-module/`
- **Key Files:**
  - `lambdas/kb-base/lambda_function.py` - KB CRUD operations
  - `lambdas/kb-document/lambda_function.py` - Document management
  - `lambdas/kb-processor/lambda_function.py` - Async document processing
  - `frontend/components/` - 25+ React components
  - `db/schema/` - pgvector schema with indexes

### Migration Notes

- Legacy uses single-scope KBs, CORA adds 4-scope hierarchy
- Legacy embedding model hardcoded, CORA uses module-ai configuration
- Table naming: `knowledge_bases` → `kb_bases`, `kb_access_global` → `kb_access_sys` (CORA convention)
- Role columns: follows `kb_` prefix pattern

---

## 5. Dependencies

### Core Module Dependencies (Required)

| Module | Version | Purpose |
|--------|---------|---------| 
| module-access | ^1.0.0 | Authentication, authorization, database operations |
| module-mgmt | ^1.0.0 | Module registration, health monitoring, admin cards |
| module-ai | ^1.0.0 | Embedding model configuration, token tracking |

**Note:** module-kb is itself a **Core Module (Tier 2)**, providing foundational RAG/knowledge management capabilities that functional modules like module-chat depend on.

### Core Module Tier Classification

| Tier | Module | Purpose |
|------|--------|---------|
| 1 | module-access | Identity & access control |
| 2 | module-ai | AI provider management |
| 2 | **module-kb** | Knowledge base & RAG infrastructure |
| 3 | module-mgmt | Platform management & monitoring |

### Functional Module Dependencies

| Module | Version | Purpose |
|--------|---------|---------|
| module-ws | ^1.0.0 | Workspace context for workspace-scoped KBs |

### Dependent Modules (Future)

| Module | Integration |
|--------|-------------|
| module-chat | `POST /kb/search` for RAG context retrieval |
| module-wf | Document analysis workflows |

---

## 6. Multi-Scope Architecture

### KB Scope Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         SYSTEM (sys)                            │
│   Platform-wide KBs managed by platform admins                  │
│   Example: "CORA Best Practices", "Industry Regulations"        │
│   Visibility: All orgs when enabled by platform admin           │
├─────────────────────────────────────────────────────────────────┤
│                            ORG                                  │
│   Organization-level KBs managed by org admins                  │
│   Example: "Company Policies", "Department Guidelines"          │
│   Visibility: All org members when enabled                      │
├─────────────────────────────────────────────────────────────────┤
│                         WORKSPACE                               │
│   Auto-created when user uploads first doc to workspace         │
│   Example: "Project Alpha Research", "Q1 Planning Docs"         │
│   Visibility: Workspace members only                            │
├─────────────────────────────────────────────────────────────────┤
│                           CHAT                                  │
│   Auto-created when user uploads doc to chat session            │
│   Example: Temporary context for specific conversation          │
│   Visibility: Chat participants only                            │
└─────────────────────────────────────────────────────────────────┘
```

### KB Visibility Rules

| Scope | Created By | Managed By | Visible To |
|-------|------------|------------|------------|
| System | Platform Admin | Platform Admin | All orgs (when enabled) |
| Org | Org Admin | Org Admin | Org members (when enabled) |
| Workspace | Auto (first doc) | Workspace Owner | Workspace members |
| Chat | Auto (first doc) | Chat Owner | Chat participants |

---

## 7. Entities Summary

### 4-Level Access Control Model

The module implements a cascading 4-level inheritance chain for KB access:

1. **kb_access_sys** → Sys admin shares system KB with org (Step 1)
2. **kb_access_orgs** → Org admin enables KB for their org (Step 2)
3. **kb_access_ws** → Workspace admin enables KB for workspace (Step 3)
4. **kb_access_chats** → User selects KB for their chat (Step 4)

### Entity Summary (7 Entities)

| Entity | Purpose | Step | Key Fields |
|--------|---------|------|------------|
| kb_bases | Primary KB container | - | id, scope, org_id, workspace_id, chat_session_id, name, config |
| kb_docs | Document metadata | - | id, kb_id, filename, s3_key, status, error_message |
| kb_chunks | RAG chunks with embeddings | - | id, kb_id, document_id, content, embedding (vector), chunk_index |
| kb_access_sys | Platform admin shares system KBs with orgs | 1 | id, knowledge_base_id, org_id, is_enabled |
| kb_access_orgs | Org admin enables KBs at org level | 2 | id, knowledge_base_id, org_id, is_enabled |
| kb_access_ws | Workspace admin enables KBs for workspace | 3 | id, knowledge_base_id, workspace_id, is_enabled |
| kb_access_chats | User enables KBs for chat sessions | 4 | id, knowledge_base_id, chat_session_id, is_enabled, is_override |

### Scope-Based Inheritance Rules

| KB Scope | Required Inheritance Levels | Description |
|----------|----------------------------|-------------|
| System | Steps 1→2→3→4 | All 4 levels must be enabled |
| Org | Steps 2→3→4 | Levels 2-4 (no sys admin sharing) |
| Workspace | Steps 3→4 | Levels 3-4 (no org admin sharing) |
| Chat | Step 4 only | User controls directly |

*See [Technical Spec](./MODULE-KB-TECHNICAL-SPEC.md) for complete data model.*

---

## 8. API Summary

### User APIs (Workspace/Chat Scoped)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/kb` | GET | Get workspace KB |
| `/workspaces/{wsId}/kb/documents` | GET/POST | List/upload documents |
| `/workspaces/{wsId}/available-kbs` | GET | List toggleable KBs (org, system) |
| `/workspaces/{wsId}/kbs/{kbId}/toggle` | POST | Toggle KB access |
| `/chats/{chatId}/kb` | GET | Get chat KB |
| `/chats/{chatId}/kb/documents` | GET/POST | List/upload documents |
| `/chats/{chatId}/available-kbs` | GET | List toggleable KBs |

### Admin APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/org/kbs` | GET/POST | List/create org KBs |
| `/admin/org/kbs/{kbId}` | GET/PATCH/DELETE | Manage org KB |
| `/admin/org/kbs/{kbId}/documents` | GET/POST | Manage org KB documents |
| `/admin/sys/kbs` | GET/POST | List/create system KBs |
| `/admin/sys/kbs/{kbId}` | GET/PATCH/DELETE | Manage system KB |
| `/admin/sys/kbs/{kbId}/orgs` | POST/DELETE | Manage org associations |

### RAG API (Internal)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/kb/search` | POST | Semantic search for RAG context |

*See [Technical Spec](./MODULE-KB-TECHNICAL-SPEC.md) for complete API documentation.*

---

## 9. UX Simplification

### Regular Users See

**NO left navigation for KB management.** KBs are accessed contextually:

1. **Workspace Data Tab:**
   - Document upload zone (drag-and-drop)
   - Document table with status
   - KB toggle selector (enable org/system KBs)

2. **Chat Interface:**
   - Document upload in chat
   - KB toggle selector for grounding

### Admins See

**NO left navigation for KB management.** Admins access KB management through admin dashboard cards:

1. **Platform Admin Dashboard Card:**
   - Card title: "Knowledge Bases"
   - Quick stats: System KB count, total documents
   - "Manage System KBs" button → `/admin/sys/kb`
   - Full CRUD for system KBs
   - Org association management (enable/disable per org)

2. **Org Admin Dashboard Card:**
   - Card title: "Knowledge Bases"  
   - Quick stats: Org KB count, enabled KBs
   - "Manage Org KBs" button → `/admin/org/kb`
   - Full CRUD for org KBs
   - Enable/disable system KBs for their org

---

## 10. Implementation Phases

### Phase 0: AI Config Table Migration ✅ COMPLETE

- [x] Migrate `sys_rag` → `ai_cfg_sys_rag`
- [x] Migrate `org_prompt_engineering` → `ai_cfg_org_prompts`
- [x] Update ai-config-handler Lambda
- [x] Frontend validation complete

**Completed:** January 14, 2026 (Session 127)

### Phase 1: Foundation & Specification ⏳ IN PROGRESS

- [x] Create specification directory structure
- [ ] Write parent specification (this document)
- [ ] Write technical specification
- [ ] Write user UX specification
- [ ] Write admin UX specification

**Estimated:** 6-9 hours

### Phase 2-12: Implementation 🔄 NOT STARTED

See [Implementation Plan](../../plans/plan_module-kb-implementation.md) for detailed phase breakdown.

---

## 11. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding model | AWS Bedrock Titan V2 (1024 dims) | Best balance of performance/accuracy/cost |
| Scope hierarchy | System → Org → Workspace → Chat | Matches organizational structure |
| Auto-creation | Workspace/Chat KBs auto-created | Reduces user friction |
| KB toggles | Per-workspace/chat | Users control grounding context |
| Document processing | SQS async | Non-blocking uploads |
| Chunk size | 1000 chars, 200 overlap | Standard RAG best practice |

---

## 12. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| pgvector performance at scale | High | Medium | IVFFlat indexing, monitoring, partitioning |
| Document processing timeout | Medium | Medium | SQS DLQ, Lambda concurrency limits |
| S3 costs for large uploads | Medium | Low | 50MB file limit, lifecycle policies |
| Embedding API rate limits | Medium | Medium | Exponential backoff, batching |
| Scope complexity confusion | Low | Medium | Clear UX, documentation |

---

## 13. Integration Points

### Module-AI Integration

```
kb-processor → GET /platform/ai-config/embedding → {provider, model, dimension}
kb-processor → POST /orgs/{orgId}/ai-usage → {tokens, operation: 'embedding'}
```

### Module-Chat Integration (Future)

```
chat-stream → GET /chats/{chatId}/available-kbs → {workspaceKb, orgKbs[], systemKbs[]}
chat-stream → POST /kb/search → {chunks[], citations[]}
```

### Module-WS Integration

```
ws-detail-page → useWorkspaceKB() → workspace KB data + available KBs
ws-data-tab → DocumentUploadZone, KBToggleSelector, DocumentTable
```

---

## 14. Related Documentation

**CORA Standards:**
- [CORA Module Development Process](../../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../../standards/standard_MODULE-REGISTRATION.md)
- [Frontend Integration Standard](../../standards/standard_CORA-FRONTEND.md)
- [Database Naming Standards](../../standards/cora/standard_DATABASE-NAMING.md)

**Implementation Plan:**
- [Module-KB Implementation Plan](../../plans/plan_module-kb-implementation.md)

**This Module:**
- [Technical Specification](./MODULE-KB-TECHNICAL-SPEC.md)
- [User UX Specification](./MODULE-KB-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-KB-ADMIN-UX-SPEC.md)

---

## 15. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Module Author | Cline AI Agent | Jan 14, 2026 | ✅ Complete |
| Technical Reviewer | - | - | ⏳ Pending |
| UX Reviewer | - | - | ⏳ Pending |
| Project Owner | - | - | ⏳ Pending |

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** January 14, 2026
