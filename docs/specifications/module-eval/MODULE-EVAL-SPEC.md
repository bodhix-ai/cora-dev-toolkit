# Evaluation Module Specification (Parent)

**Module Name:** module-eval  
**Module Type:** Functional Module  
**Entity:** eval_doc_summary  
**Complexity:** Complex  
**Estimated Time:** 30-45 hours (10-15 sessions)  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

---

## Document Overview

This is the **parent specification** for module-eval. It provides an executive summary and references the detailed subordinate specifications.

### Subordinate Specifications

| Specification | Purpose | Est. Size |
|---------------|---------|-----------|
| [MODULE-EVAL-TECHNICAL-SPEC.md](./MODULE-EVAL-TECHNICAL-SPEC.md) | Data model, API, database, async processing | ~2500 lines |
| [MODULE-EVAL-USER-UX-SPEC.md](./MODULE-EVAL-USER-UX-SPEC.md) | User personas, evaluation interface, results display | ~1200 lines |
| [MODULE-EVAL-ADMIN-UX-SPEC.md](./MODULE-EVAL-ADMIN-UX-SPEC.md) | Admin config, doc types, criteria management, prompts | ~1500 lines |

---

## 1. Executive Summary

### Purpose

The Evaluation Module provides automated document evaluation against configurable compliance criteria, producing AI-generated assessments with RAG-grounded citations. Organizations define document types and criteria sets, then users upload documents for evaluation, receiving detailed compliance reports with human-editable results.

### Problem Solved

- Manual document evaluation is time-consuming and inconsistent
- Compliance criteria vary by document type and organization
- AI evaluations need grounding in source documents for accuracy
- Human oversight is required for final compliance determinations
- Organizations need configurable scoring models (boolean, detailed, numerical)
- Evaluation results need export capabilities (PDF, XLSX)

### Key Capabilities

1. **Document Type Management** - Define categories with associated criteria sets
2. **Criteria Import** - Import evaluation criteria from spreadsheets (CSV/XLSX)
3. **Multi-Document Evaluations** - Evaluate multiple documents together (policy + diagram + screenshot)
4. **AI-Driven Evaluation** - Automated Q&A generation with RAG-sourced citations
5. **Human Edit with Versioning** - Edit AI results (narrative + status only) with version history
6. **Configurable Scoring** - Boolean, detailed, or numerical scoring modes
7. **Export** - PDF and XLSX report generation

---

## 2. Scope

### In Scope

**Core Functionality:**
- System-level default configuration (sys admin)
- Organization-level configuration with delegation control
- Document type management per organization
- Criteria set creation and spreadsheet import
- Multi-document evaluation processing (async)
- AI-driven evaluation with RAG context
- Human editing of results with version control
- PDF/XLSX export generation

**User Experience:**
- Evaluation list with status and progress
- Document upload with type selection
- Real-time progress tracking
- Detailed results view with citations
- Result editing dialog
- Export buttons

**Admin Experience:**
- Platform defaults configuration (sys admin)
- Organization delegation management (sys admin)
- Organization config, status options, prompts (org admin)
- Document type management (org admin)
- Criteria set management with import (org admin)

**Integration:**
- module-kb: Document storage, parsing, embeddings, RAG search
- module-ai: AI provider configuration, prompt patterns
- module-ws: Workspace scoping
- module-access: Authentication/authorization

### Out of Scope

- Real-time collaborative editing of evaluations
- Evaluation templates/presets (deferred to v2)
- Scheduled/automated re-evaluations (deferred to v2)
- Evaluation comparison/diffing (deferred to v2)
- Third-party compliance framework imports (deferred to v2)
- Email notifications (deferred to v2)

---

## 3. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 2 | 13 entities (config, prompts, status options, doc types, criteria sets/items, evaluations, results, edits) |
| AI Integration | 2 | Advanced: 3 prompt types, multi-model support, RAG integration, async processing |
| Functional Dependencies | 2 | module-kb (RAG), module-ws, module-ai, module-access |
| Legacy Code Complexity | 2 | Derived from 5 legacy repositories, ~3000+ lines total |
| Business Logic | 2 | Configuration hierarchy, delegation, scoring modes, versioning |
| **Total** | **10** | **Complex** |

### Classification: Complex

**Time Estimate:** 30-45 hours (10-15 sessions)

### Specification Size Estimates

| Specification | Estimated Lines | Actual Lines |
|---------------|-----------------|--------------|
| Parent (this doc) | 400-500 | ~450 |
| Technical Spec | 2000-3000 | TBD |
| User UX Spec | 1000-1500 | TBD |
| Admin UX Spec | 1200-1800 | TBD |
| **Total** | **4600-6800** | TBD |

---

## 4. Source Reference

### Legacy Code

Analysis of legacy ai-doc system at `~/code/sts/ai-doc/` containing 5 repositories:

| Repository | Purpose | Lines (Est.) |
|------------|---------|--------------|
| `sts-ai-doc-fileupload-lambda` | File upload orchestration to S3 | ~500 |
| `sts-ai-doc-embeddings` | Document embedding generation with Azure OpenAI | ~800 |
| `sts-ai-acq-embeddings` | Acquisition embeddings (similar pattern) | ~600 |
| `sts-ai-doc-cleanup` | RFP deletion with cascading cleanup (10+ tables) | ~400 |
| `sts-ai-doc-admin-settings` | Admin settings (placeholder) | ~100 |

### Legacy Database Schema (Reference)

The legacy RFP system used:
- `rfp` - Central hub for RFP records
- `rfp_docs_source`, `rfp_docs_question`, `rfp_docs_proposal` - Document types
- `rfp_questions`, `rfp_answers` - Q&A for evaluations
- `rfp_embedding` - Vector embeddings
- `admin_prompts` - Configurable AI prompts

### Migration Notes

- ~80% of legacy functionality leverages existing CORA modules (module-kb, module-ai, module-ws)
- New functionality: doc type configuration, criteria import, scoring modes, human editing
- Table naming follows CORA `eval_` prefix convention
- API responses use camelCase (CORA standard)

---

## 5. Dependencies

### Core Module Dependencies (Required)

| Module | Version | Purpose |
|--------|---------|---------|
| module-access | ^1.0.0 | Authentication, authorization, user context |
| module-ai | ^1.0.0 | AI provider configuration, prompt patterns |
| module-kb | ^1.0.0 | Document storage, parsing, embeddings, RAG search |
| module-mgmt | ^1.0.0 | Module registration, usage analytics |

### Functional Module Dependencies

| Module | Version | Purpose |
|--------|---------|---------|
| module-ws | ^1.0.0 | Workspace scoping for evaluations |

### External Dependencies

| Service | Purpose |
|---------|---------|
| SQS | Async evaluation processing queue |
| S3 | Document storage (via module-kb) |

---

## 6. Configuration Hierarchy

### Three-Tier Configuration Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM-LEVEL (Sys Admin)                      │
│   Platform-wide defaults for all organizations                   │
│   - Default scoring mode (boolean/detailed)                      │
│   - Default status options (colors, labels, scores)              │
│   - Default prompts & models (doc_summary, evaluation, eval_summary) │
│   - Org delegation control (enable/disable per org)              │
├─────────────────────────────────────────────────────────────────┤
│                  ORGANIZATION-LEVEL (Org Admin)                  │
│   Organization-specific configuration                            │
│   - Scoring display overrides (always available)                 │
│   - Status options overrides (always available)                  │
│   - Prompts & models overrides (ONLY if delegated)               │
│   - Document types (always available)                            │
│   - Criteria sets (always available)                             │
├─────────────────────────────────────────────────────────────────┤
│                   WORKSPACE-LEVEL (User)                         │
│   Evaluation operations within workspace context                 │
│   - Create evaluations                                           │
│   - View/edit results                                            │
│   - Export reports                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Delegation Model

| Setting | Sys Admin | Org Admin (Delegated) | Org Admin (Not Delegated) |
|---------|-----------|----------------------|---------------------------|
| Platform defaults | ✅ Edit | ❌ | ❌ |
| Org delegation flag | ✅ Set | ❌ | ❌ |
| Scoring display | ✅ Default | ✅ Override | ✅ Override |
| Status options | ✅ Default | ✅ Override | ✅ Override |
| Prompts & models | ✅ Default | ✅ Override | ❌ Use default |
| Doc types & criteria | ❌ | ✅ Manage | ✅ Manage |

---

## 7. Evaluation Flow

### Processing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVALUATION PROCESSING FLOW                   │
│                                                                  │
│  1. User uploads document(s) with doc type selection             │
│     ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│     │ Primary Doc    │  │ Supporting Doc │  │ Supporting Doc │  │
│     │ (Policy.pdf)   │  │ (Diagram.png)  │  │ (Screenshot)   │  │
│     └────────────────┘  └────────────────┘  └────────────────┘  │
│                              ↓                                   │
│  2. Documents stored in module-kb                                │
│     ┌────────────────────────────────────────┐                   │
│     │ POST /kb/docs (presigned URL upload)   │                   │
│     │ Automatic: parsing, chunking, embedding │                  │
│     └────────────────────────────────────────┘                   │
│                              ↓                                   │
│  3. Evaluation record created (status: pending)                  │
│     ┌────────────────────────────────────────┐                   │
│     │ eval_doc_summary + eval_doc_set links  │                   │
│     └────────────────────────────────────────┘                   │
│                              ↓                                   │
│  4. Message sent to SQS queue                                    │
│     ┌────────────────────────────────────────┐                   │
│     │ { evalId, docIds[], criteriaSetId }    │                   │
│     └────────────────────────────────────────┘                   │
│                              ↓                                   │
│  5. eval-processor Lambda (async)                                │
│     ┌────────────────────────────────────────┐                   │
│     │ a. Generate doc summaries (per doc)    │                   │
│     │ b. Generate combined doc summary       │                   │
│     │ c. For each criteria item:             │                   │
│     │    - RAG search against docs           │                   │
│     │    - AI evaluates with citations       │                   │
│     │    - Save result, update progress      │                   │
│     │ d. Generate evaluation summary         │                   │
│     └────────────────────────────────────────┘                   │
│                              ↓                                   │
│  6. Evaluation complete (status: completed)                      │
│     ┌────────────────────────────────────────┐                   │
│     │ User views results, can edit, export   │                   │
│     └────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Upload Modes

| Mode | Process | Use Case |
|------|---------|----------|
| Upload Only | Document → KB | Just add to knowledge base |
| Upload + Summary | Document → KB → AI Summary | Quick document overview |
| Upload + Summary + Eval | Document → KB → Summary → Full Evaluation | Complete compliance check |

---

## 8. Entities Summary

### Entity Overview (13 Entities)

**System Configuration (3 entities):**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| eval_sys_config | Platform defaults | id, categorical_mode, show_numerical_score |
| eval_sys_prompt_config | Default prompts | id, prompt_type, ai_provider_id, ai_model_id, system_prompt, user_prompt_template |
| eval_sys_status_options | Default status options | id, name, color, score_value, order_index |

**Organization Configuration (3 entities):**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| eval_org_config | Org settings + delegation | id, org_id, ai_config_delegated, categorical_mode, show_numerical_score |
| eval_org_prompt_config | Org prompt overrides | id, org_id, prompt_type, ai_provider_id, ai_model_id, ... |
| eval_org_status_options | Org status options | id, org_id, name, color, score_value, is_active |

**Document Types & Criteria (3 entities):**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| eval_doc_types | Document categories | id, org_id, name, description, is_active |
| eval_criteria_sets | Criteria collections | id, doc_type_id, name, version, use_weighted_scoring, source_file_name |
| eval_criteria_items | Individual criteria | id, criteria_set_id, criteria_id, requirement, description, category, weight |

**Evaluation Results (4 entities):**

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| eval_doc_summary | Evaluation record | id, workspace_id, doc_type_id, criteria_set_id, status, progress, doc_summary, eval_summary |
| eval_doc_set | Multi-doc link table | id, eval_summary_id, kb_doc_id, doc_summary, order_index |
| eval_criteria_results | AI results (immutable) | id, eval_summary_id, criteria_item_id, ai_result, ai_status_id, ai_citations |
| eval_result_edits | Human edits (versioned) | id, criteria_result_id, version, edited_result, edited_status_id, edit_notes |

*See [Technical Spec](./MODULE-EVAL-TECHNICAL-SPEC.md) for complete data model.*

---

## 9. API Summary

### System Admin APIs (`/admin/sys/eval`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/sys/eval/config` | GET/PATCH | System configuration |
| `/admin/sys/eval/status-options` | GET/POST | Status options CRUD |
| `/admin/sys/eval/status-options/{id}` | PATCH/DELETE | Status option management |
| `/admin/sys/eval/prompts` | GET | List default prompts |
| `/admin/sys/eval/prompts/{type}` | PATCH | Update prompt config |
| `/admin/sys/eval/prompts/{type}/test` | POST | Test prompt |
| `/admin/sys/eval/orgs` | GET | List orgs with delegation |
| `/admin/sys/eval/orgs/{orgId}/delegation` | PATCH | Toggle delegation |

### Organization Admin APIs (`/admin/org/eval`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/org/eval/config` | GET/PATCH | Org configuration |
| `/admin/org/eval/status-options` | GET/POST | Status options CRUD |
| `/admin/org/eval/status-options/{id}` | PATCH/DELETE | Status option management |
| `/admin/org/eval/prompts` | GET | List org prompts (if delegated) |
| `/admin/org/eval/prompts/{type}` | PATCH | Update prompt (if delegated) |
| `/admin/org/eval/doc-types` | GET/POST | Document types CRUD |
| `/admin/org/eval/doc-types/{id}` | PATCH/DELETE | Document type management |
| `/admin/org/eval/criteria-sets` | GET/POST | Criteria sets CRUD |
| `/admin/org/eval/criteria-sets/{id}` | GET/PATCH/DELETE | Criteria set management |
| `/admin/org/eval/criteria-sets/import` | POST | Import from spreadsheet |

### User APIs (Workspace Scoped)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/eval` | GET/POST | List/create evaluations |
| `/workspaces/{wsId}/eval/{id}` | GET/DELETE | Get/delete evaluation |
| `/workspaces/{wsId}/eval/{id}/status` | GET | Progress polling |
| `/workspaces/{wsId}/eval/{id}/results/{resultId}` | PATCH | Edit result |
| `/workspaces/{wsId}/eval/{id}/export/pdf` | GET | Export PDF |
| `/workspaces/{wsId}/eval/{id}/export/xlsx` | GET | Export XLSX |

*See [Technical Spec](./MODULE-EVAL-TECHNICAL-SPEC.md) for complete API documentation.*

---

## 10. UX Overview

### Regular Users

**Left Navigation:**
- "Evaluations" link visible to workspace members
- Navigates to `/eval` (evaluation list page)

**Evaluation List Page (`/eval`):**
- All workspace evaluations with status
- Create new evaluation button
- Filter by status, doc type

**Evaluation Detail Page (`/eval/[id]`):**
- Document summary panel
- Criteria results table with status indicators
- Citation viewer
- Edit dialog for individual results
- Export buttons (PDF, XLSX)

### Workspace Integration

**Workspace Detail Page Activities Tab:**
- Shows recent evaluations
- "View Evaluation" links
- Quick create evaluation

### Admins

**System Admin Pages:**
- `/admin/sys/eval/config` - Platform defaults, delegation management
- `/admin/sys/eval/prompts` - Default prompts & models

**Organization Admin Pages:**
- `/admin/org/eval/config` - Scoring & status configuration
- `/admin/org/eval/prompts` - Org prompts (if delegated)
- `/admin/org/eval/doc-types` - Document type management
- `/admin/org/eval/criteria` - Criteria set management with import

*See [Admin UX Spec](./MODULE-EVAL-ADMIN-UX-SPEC.md) for detailed admin flows.*

---

## 11. Implementation Phases

### Phase 1: Specification & Foundation (Sessions 1-2)

- [x] Create implementation plan
- [ ] Create specification documents (this document)
- [ ] Create technical specification
- [ ] Create user UX specification
- [ ] Create admin UX specification

**Estimated:** 6-8 hours

### Phase 2: Database Schema (Sessions 3-4)

- [ ] System configuration tables
- [ ] Organization configuration tables
- [ ] Document types & criteria tables
- [ ] Evaluation results tables
- [ ] RPC functions
- [ ] RLS policies

**Estimated:** 6-8 hours

### Phase 3: Backend - Config Lambda (Sessions 5-6)

- [ ] Sys admin config endpoints
- [ ] Org admin config endpoints
- [ ] Status options CRUD
- [ ] Delegation management
- [ ] Prompt configuration

**Estimated:** 6-8 hours

### Phase 4: Backend - Doc Types & Criteria (Sessions 7-8)

- [ ] Document types CRUD
- [ ] Criteria sets CRUD
- [ ] Criteria items CRUD
- [ ] Spreadsheet import (CSV/XLSX)

**Estimated:** 6-8 hours

### Phase 5: Backend - Processor Lambda (Sessions 9-11)

- [ ] SQS integration
- [ ] Document summary generation
- [ ] Criteria evaluation with RAG
- [ ] Evaluation summary generation
- [ ] Progress tracking

**Estimated:** 9-12 hours

### Phase 6: Backend - Results Lambda (Sessions 12-13)

- [ ] Evaluation CRUD
- [ ] Result editing with versioning
- [ ] PDF export generation
- [ ] XLSX export generation

**Estimated:** 6-8 hours

### Phase 7: Infrastructure (Session 14)

- [ ] Terraform resources
- [ ] SQS queue configuration
- [ ] Lambda configurations

**Estimated:** 3-4 hours

### Phase 8: Frontend - Types & API (Session 15)

- [ ] TypeScript types
- [ ] API client

**Estimated:** 3-4 hours

### Phase 9: Frontend - Admin Components (Sessions 16-18)

- [ ] Config management
- [ ] Doc type manager
- [ ] Criteria set manager
- [ ] Import wizard
- [ ] Status option manager
- [ ] Prompt editor

**Estimated:** 9-12 hours

### Phase 10: Frontend - User Components (Sessions 19-21)

- [ ] Evaluation list
- [ ] Upload form
- [ ] Progress card
- [ ] Results view
- [ ] Citation viewer
- [ ] Edit dialog
- [ ] Export buttons

**Estimated:** 9-12 hours

### Phase 11: Frontend - Pages & Routes (Sessions 22-23)

- [ ] Evaluation list page
- [ ] Evaluation detail page
- [ ] Admin config pages
- [ ] Next.js routes

**Estimated:** 6-8 hours

### Phase 12: Integration & Testing (Sessions 24-25)

- [ ] Module integration
- [ ] Validation
- [ ] End-to-end testing

**Estimated:** 6-8 hours

### Phase 13: Documentation (Session 26)

- [ ] Module documentation
- [ ] Integration guide updates
- [ ] Developer guide

**Estimated:** 3-4 hours

---

## 12. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Processing Model | Async via SQS | Evaluations can take minutes, don't block user |
| AI Results | Immutable | Preserve original AI assessment for audit |
| Human Edits | Separate table with versioning | Track edit history, support rollback |
| Scoring Modes | Configuration-driven | Flexibility without code changes |
| Delegation | Sys admin controlled | Security - orgs can't enable their own AI config |
| Criteria Import | CSV/XLSX | Standard formats, easy adoption |
| Export Formats | PDF + XLSX | PDF for formal reports, XLSX for data analysis |

---

## 13. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Processing timeout | High | Medium | SQS with DLQ, chunked processing |
| Token costs | Medium | Medium | Configurable limits, usage tracking |
| Large criteria sets | Medium | Medium | Batch processing, progress tracking |
| Import validation | Medium | Low | Strict validation, preview before import |
| RAG accuracy | Medium | Medium | Tunable prompts, human edit capability |
| Export generation | Low | Low | Async generation with download link |

---

## 14. Integration Points

### Module-KB Integration

```
eval-processor → POST /kb/docs → Upload document
eval-processor → POST /kb/search → RAG retrieval for criteria evaluation
```

### Module-AI Integration

```
eval-processor → GET org prompt config → Get AI model & prompt
eval-processor → POST AI completion → Generate evaluation
```

### Module-WS Integration

```
workspace-page → useEvaluations(workspaceId) → workspace evaluations
workspace-activities → EvaluationCard[] → recent evaluations
```

---

## 15. Related Documentation

**CORA Standards:**
- [CORA Module Development Process](../../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../../standards/standard_MODULE-REGISTRATION.md)
- [Frontend Integration Standard](../../standards/standard_CORA-FRONTEND.md)
- [Lambda Route Docstring Standard](../../standards/standard_LAMBDA-ROUTE-DOCSTRING.md)

**Implementation Plan:**
- [Module-Eval Implementation Plan](../../plans/plan_module-eval-implementation.md)

**This Module:**
- [Technical Specification](./MODULE-EVAL-TECHNICAL-SPEC.md)
- [User UX Specification](./MODULE-EVAL-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-EVAL-ADMIN-UX-SPEC.md)

---

## 16. Approval

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
