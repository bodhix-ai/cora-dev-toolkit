# Evaluation Module - Technical Specification (Index)

**Module Name:** module-eval  
**Module Type:** Functional Module  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-EVAL-SPEC.md](./MODULE-EVAL-SPEC.md)

---

## Technical Documentation Structure

This specification has been split into smaller, focused documents for easier maintenance:

### Core Technical Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [01-data-model.md](./technical/01-data-model.md) | Entity definitions (13 entities) | 🔄 In Progress |
| [02-database-schema.md](./technical/02-database-schema.md) | Migration files with SQL | 🔄 Pending |
| [03-api-endpoints.md](./technical/03-api-endpoints.md) | REST API documentation | 🔄 Pending |
| [04-async-processing.md](./technical/04-async-processing.md) | SQS queue and processor | 🔄 Pending |
| [05-integrations.md](./technical/05-integrations.md) | Module integrations (KB, AI) | 🔄 Pending |
| [06-backend-patterns.md](./technical/06-backend-patterns.md) | Lambda implementations | 🔄 Pending |
| [07-infrastructure.md](./technical/07-infrastructure.md) | Terraform configurations | 🔄 Pending |
| [08-testing.md](./technical/08-testing.md) | Test requirements | 🔄 Pending |

---

## Quick Reference

### Entities (13 Total)

**System Configuration (3 entities):**

| Entity | Purpose | Document |
|--------|---------|----------|
| eval_sys_config | Platform defaults | [01-data-model.md](./technical/01-data-model.md#11-system-configuration) |
| eval_sys_prompt_config | Default prompts | [01-data-model.md](./technical/01-data-model.md#11-system-configuration) |
| eval_sys_status_options | Default status options | [01-data-model.md](./technical/01-data-model.md#11-system-configuration) |

**Organization Configuration (3 entities):**

| Entity | Purpose | Document |
|--------|---------|----------|
| eval_org_config | Org settings + delegation | [01-data-model.md](./technical/01-data-model.md#12-organization-configuration) |
| eval_org_prompt_config | Org prompt overrides | [01-data-model.md](./technical/01-data-model.md#12-organization-configuration) |
| eval_org_status_options | Org status options | [01-data-model.md](./technical/01-data-model.md#12-organization-configuration) |

**Document Types & Criteria (3 entities):**

| Entity | Purpose | Document |
|--------|---------|----------|
| eval_doc_types | Document categories | [01-data-model.md](./technical/01-data-model.md#13-document-types--criteria) |
| eval_criteria_sets | Criteria collections | [01-data-model.md](./technical/01-data-model.md#13-document-types--criteria) |
| eval_criteria_items | Individual criteria | [01-data-model.md](./technical/01-data-model.md#13-document-types--criteria) |

**Evaluation Results (4 entities):**

| Entity | Purpose | Document |
|--------|---------|----------|
| eval_doc_summary | Evaluation record | [01-data-model.md](./technical/01-data-model.md#14-evaluation-results) |
| eval_doc_set | Multi-doc link table | [01-data-model.md](./technical/01-data-model.md#14-evaluation-results) |
| eval_criteria_results | AI results (immutable) | [01-data-model.md](./technical/01-data-model.md#14-evaluation-results) |
| eval_result_edits | Human edits (versioned) | [01-data-model.md](./technical/01-data-model.md#14-evaluation-results) |

### Configuration Hierarchy

| Level | Manages | Delegation |
|-------|---------|------------|
| System (Sys Admin) | Platform defaults, delegation control | Sets delegation flag per org |
| Organization (Org Admin) | Scoring, status options, prompts* | *Prompts only if delegated |
| Workspace (User) | Evaluation operations | N/A |

### Lambda Functions (3 Total)

| Lambda | Purpose | Triggers |
|--------|---------|----------|
| eval-config | Config, doc types, criteria, status options | API Gateway |
| eval-processor | Async evaluation processing | SQS |
| eval-results | Evaluation CRUD, edits, export | API Gateway |

### Key Technologies

- **Database:** PostgreSQL (Supabase)
- **Async Processing:** SQS with Lambda trigger
- **AI Providers:** OpenAI, Anthropic, Bedrock (via module-ai)
- **RAG:** pgvector semantic search (via module-kb)
- **Export:** ReportLab (PDF), openpyxl (XLSX)

---

## Migration Summary

| # | File | Purpose |
|---|------|---------|
| 001 | eval-sys-config.sql | Platform defaults |
| 002 | eval-sys-prompt-config.sql | Default prompts |
| 003 | eval-sys-status-options.sql | Default status options |
| 004 | eval-org-config.sql | Org config + delegation |
| 005 | eval-org-prompt-config.sql | Org prompt overrides |
| 006 | eval-org-status-options.sql | Org status options |
| 007 | eval-doc-types.sql | Document categories |
| 008 | eval-criteria-sets.sql | Criteria collections |
| 009 | eval-criteria-items.sql | Individual criteria |
| 010 | eval-doc-summary.sql | Evaluation records |
| 011 | eval-doc-set.sql | Multi-doc links |
| 012 | eval-criteria-results.sql | AI results |
| 013 | eval-result-edits.sql | Human edits |
| 014 | eval-rpc-functions.sql | Access control functions |
| 015 | eval-rls.sql | Row Level Security |

See [02-database-schema.md](./technical/02-database-schema.md) for complete SQL.

---

## API Endpoint Summary

### System Admin Configuration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/sys/eval/config` | GET | Get platform defaults |
| `/admin/sys/eval/config` | PATCH | Update platform defaults |
| `/admin/sys/eval/status-options` | GET | List default status options |
| `/admin/sys/eval/status-options` | POST | Create status option |
| `/admin/sys/eval/status-options/{id}` | PATCH | Update status option |
| `/admin/sys/eval/status-options/{id}` | DELETE | Delete status option |
| `/admin/sys/eval/prompts` | GET | List default prompts |
| `/admin/sys/eval/prompts/{type}` | PATCH | Update prompt config |
| `/admin/sys/eval/prompts/{type}/test` | POST | Test prompt |
| `/admin/sys/eval/orgs` | GET | List orgs with delegation |
| `/admin/sys/eval/orgs/{orgId}/delegation` | PATCH | Toggle delegation |

### Organization Admin Configuration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/org/eval/config` | GET | Get org config |
| `/admin/org/eval/config` | PATCH | Update org config |
| `/admin/org/eval/status-options` | GET | List org status options |
| `/admin/org/eval/status-options` | POST | Create status option |
| `/admin/org/eval/status-options/{id}` | PATCH | Update status option |
| `/admin/org/eval/status-options/{id}` | DELETE | Delete status option |
| `/admin/org/eval/prompts` | GET | List org prompts (if delegated) |
| `/admin/org/eval/prompts/{type}` | PATCH | Update prompt (if delegated) |
| `/admin/org/eval/prompts/{type}/test` | POST | Test prompt (if delegated) |

### Document Types & Criteria

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/org/eval/doc-types` | GET | List doc types |
| `/admin/org/eval/doc-types` | POST | Create doc type |
| `/admin/org/eval/doc-types/{id}` | PATCH | Update doc type |
| `/admin/org/eval/doc-types/{id}` | DELETE | Delete doc type |
| `/admin/org/eval/criteria-sets` | GET | List criteria sets |
| `/admin/org/eval/criteria-sets` | POST | Create criteria set |
| `/admin/org/eval/criteria-sets/{id}` | GET | Get criteria set with items |
| `/admin/org/eval/criteria-sets/{id}` | PATCH | Update criteria set |
| `/admin/org/eval/criteria-sets/{id}` | DELETE | Delete criteria set |
| `/admin/org/eval/criteria-sets/import` | POST | Import from spreadsheet |

### Evaluations

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/workspaces/{wsId}/eval` | GET | List evaluations |
| `/workspaces/{wsId}/eval` | POST | Create evaluation |
| `/workspaces/{wsId}/eval/{id}` | GET | Get evaluation detail |
| `/workspaces/{wsId}/eval/{id}` | DELETE | Delete evaluation |
| `/workspaces/{wsId}/eval/{id}/status` | GET | Get progress status |
| `/workspaces/{wsId}/eval/{id}/results/{resultId}` | PATCH | Edit result |
| `/workspaces/{wsId}/eval/{id}/results/{resultId}/history` | GET | Get edit history |
| `/workspaces/{wsId}/eval/{id}/export/pdf` | GET | Export PDF |
| `/workspaces/{wsId}/eval/{id}/export/xlsx` | GET | Export XLSX |

---

## Async Processing Flow

### SQS Message Format

```json
{
  "eval_id": "uuid",
  "org_id": "uuid",
  "workspace_id": "uuid",
  "doc_ids": ["uuid1", "uuid2"],
  "criteria_set_id": "uuid",
  "action": "evaluate"
}
```

### Processing Steps

```
1. POST /workspaces/{wsId}/eval (eval-results Lambda)
   ↓
2. Create eval_doc_summary (status: pending)
   Create eval_doc_set records
   ↓
3. Send SQS message
   ↓
4. eval-processor Lambda (async)
   ├── Generate doc summaries (0-10%)
   ├── For each criteria item (10-90%):
   │   ├── RAG search via module-kb
   │   ├── AI evaluation with citations
   │   └── Save eval_criteria_results
   └── Generate eval summary (90-100%)
   ↓
5. Update eval_doc_summary (status: completed)
```

### Progress Tracking

| Progress | Step |
|----------|------|
| 0-10% | Document summaries |
| 10-90% | Criteria evaluation (proportional) |
| 90-100% | Evaluation summary |

---

## Configuration Resolution

### Config Merge Logic

```python
def get_eval_config(org_id):
    """Resolve config with fallback to system defaults."""
    org_config = get_org_config(org_id)
    sys_config = get_sys_config()
    
    return {
        "categorical_mode": org_config.categorical_mode or sys_config.categorical_mode,
        "show_numerical_score": org_config.show_numerical_score if org_config.show_numerical_score is not None else sys_config.show_numerical_score,
    }
```

### Prompt Resolution

```python
def get_prompt_config(org_id, prompt_type):
    """Resolve prompt config with delegation check."""
    org_config = get_org_config(org_id)
    
    if org_config.ai_config_delegated:
        org_prompt = get_org_prompt_config(org_id, prompt_type)
        if org_prompt:
            return org_prompt
    
    return get_sys_prompt_config(prompt_type)
```

### Status Options Resolution

```python
def get_status_options(org_id):
    """Get status options (org overrides sys)."""
    org_options = get_org_status_options(org_id)
    if org_options:
        return [o for o in org_options if o.is_active]
    return get_sys_status_options()
```

---

## Scoring Modes

### Boolean Mode (2 options)

```
✅ Compliant (green)  |  ❌ Non-Compliant (red)
```

### Detailed Mode (6 options, configurable)

```
🔴 Non-Compliant | 🟠 Major Issues | 🟡 Minor Issues | 🟢 Partial | 🟩 Compliant | ✅ Exceeds
```

### Numerical Mode (Additive)

```
Score: 87% based on weighted criteria results
```

---

## Related Documentation

- [Parent Specification](./MODULE-EVAL-SPEC.md)
- [User UX Specification](./MODULE-EVAL-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-EVAL-ADMIN-UX-SPEC.md)
- [Implementation Plan](../../plans/plan_module-eval-implementation.md)

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
