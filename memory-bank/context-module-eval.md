# Context: Module-Eval Development

**Created:** January 2026  
**Primary Focus:** Document evaluation features for CORA workspaces

---

## Initiative Overview

Module-eval provides document evaluation capabilities including:
- Criteria-based document evaluation
- Configurable scoring and status options
- Citation support for evaluation results
- Export functionality (PDF, XLSX)

---

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| Implementation | `feature/module-eval-implementation` | Various | ✅ Complete | 2026-01-18 |
| Config Testing | `feature/module-eval-config` | `plan_module-eval-config.md` | ✅ Complete | 2026-01-20 |
| UI Enhancements | `ui-enhancements` | `plan_ui-enhancements-p2.md` | ✅ Complete | 2026-01-23 |
| **Citations** | `feature/eval-citations` | `plan_eval-citations.md` | 🚫 Blocked | - |
| **Scoring Quality** | `fix/eval-scoring-quality` | `plan_eval-scoring-quality.md` | 🚫 Blocked | - |

---

## Upcoming Sprints

### Citations Implementation (P2 - Blocked by P1)

**Branch:** `feature/eval-citations`  
**Plan:** `docs/plans/plan_eval-citations.md` (to be created)  
**Dependency:** WS Plugin Architecture (P1) - type errors must be fixed first

**Scope:**
- Implement Issue D: Paperclip citation modal
- Display citation details from evaluation results
- Link citations to source documents
- UI components for viewing citations

**Blocking Issue:**
Currently blocked by 78 TypeScript errors (`accessToken does not exist on type 'Session'`).
This is caused by module-eval importing from module-ws, which triggers cross-module type-checking.
The WS Plugin Architecture sprint (P1) must fix this first.

### Scoring Quality Investigation (P3 - Blocked by P2)

**Branch:** `fix/eval-scoring-quality`  
**Plan:** `docs/plans/plan_eval-scoring-quality.md` (to be created)  
**Dependency:** Citations working (P2) - need functional eval to debug scoring

**Scope:**
- Investigate why individual criteria evaluations don't use full numerical scoring range
- Analyze why answers are not always specific/relevant to the criterion
- Potential root causes:
  - RAG retrieval quality
  - Prompt engineering issues
  - Backend processing logic
- Implement fixes based on findings

---

## Current Test Environment

- **Project:** test-cite (for citations work)
- **Stack:** `~/code/bodhix/testing/test-cite/ai-sec-stack`
- **Infra:** `~/code/bodhix/testing/test-cite/ai-sec-infra`
- **API Gateway:** `https://hk5bzq4kv3.execute-api.us-east-1.amazonaws.com/`

---

## Implementation Status Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation & Specification | ✅ Complete |
| 2 | Database Schema (15 migrations) | ✅ Complete |
| 3 | Backend - Eval Config Lambda | ✅ Complete |
| 4 | Backend - Eval Processor Lambda | ✅ Complete |
| 5 | Backend - Eval Results Lambda | ✅ Complete |
| 6 | Infrastructure (Terraform) | ✅ Complete |
| 7 | Frontend - Types & API | ✅ Complete |
| 8 | Frontend - State Management | ✅ Complete |
| 9 | Frontend - Hooks | ✅ Complete |
| 10 | Frontend - Components | ✅ Complete |
| 11 | Frontend - Pages & Routes | ✅ Complete |
| 12 | Integration & Testing | ✅ Complete |
| 13 | Documentation | ✅ Complete |

---

## Key Decisions

- ADR-XXX: Evaluation Configuration Hierarchy (sys → org)
- ADR-XXX: Criteria-based Evaluation Model

---

## Module Architecture

### Configuration Hierarchy
1. **System-Level (Sys Admin)**: Platform defaults, org delegation control
2. **Organization-Level (Org Admin)**: Scoring overrides, status options, prompts
3. **Workspace-Level (User)**: Evaluation operations

### Database Tables (13 entities)
- **System Config (3):** `eval_cfg_sys`, `eval_cfg_sys_prompts`, `eval_sys_status_options`
- **Org Config (3):** `eval_cfg_org`, `eval_cfg_org_prompts`, `eval_org_status_options`
- **Doc Types & Criteria (3):** `eval_doc_types`, `eval_criteria_sets`, `eval_criteria_items`
- **Evaluation Results (4):** `eval_doc_summaries`, `eval_doc_sets`, `eval_criteria_results`, `eval_result_edits`

### Async Processing Flow
1. User creates evaluation → `eval-results` Lambda
2. SQS message sent → `eval-processor` Lambda
3. Processor generates summaries, evaluates criteria
4. Progress updates via polling `/status` endpoint

---

## Dependencies

Module-eval depends on:
- `module-kb` - Document storage, parsing, embeddings, RAG search
- `module-ai` - AI provider configuration
- `module-ws` - Workspace scoping (causes current type error issue)
- `module-access` - Authentication
- `module-mgmt` - Platform management

---

## Session Log

### January 24, 2026 - Citations Sprint Blocked
- Created test-cite project for citations implementation
- Discovered 125 TypeScript errors (78 are accessToken issues)
- Root cause: module-eval imports from module-ws
- Decision: Must fix WS Plugin Architecture first (P1)

### January 23, 2026 - UI Enhancements Complete
- Implemented Expand/Collapse All functionality
- Fixed backend data retrieval for document metadata
- Completed compliance score display in header
- All UI enhancement work merged

### January 20-22, 2026 - Config Testing Complete
- Tested org admin configuration flow
- Fixed criteria import from spreadsheet
- Verified evaluation processing end-to-end

---

## Template Location

```
templates/_modules-functional/module-eval/
├── backend/lambdas/
│   ├── eval-config/       # 35 routes - Config, Doc Types, Criteria
│   ├── eval-processor/    # Async SQS processing
│   └── eval-results/      # 9 routes - CRUD, Edits, Export
├── db/schema/             # 15 migration files
├── frontend/
│   ├── types/             # TypeScript types
│   ├── lib/api.ts         # API functions
│   ├── store/             # Zustand store
│   ├── hooks/             # 8 hook files
│   ├── components/        # 15 components
│   └── pages/             # 8 page components
├── infrastructure/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── module.json
```

---

**Last Updated:** January 24, 2026