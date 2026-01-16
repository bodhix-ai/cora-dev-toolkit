# Module-Eval Integration Test Checklist

**Module Version**: 1.0.0  
**Last Updated**: January 16, 2026

---

## Prerequisites

Before testing module-eval, ensure the following are available:

- [ ] module-access deployed and configured
- [ ] module-ai deployed with at least one AI provider
- [ ] module-kb deployed with document upload capability
- [ ] module-mgmt deployed with platform admin access
- [ ] module-ws deployed with at least one workspace
- [ ] Test user accounts with appropriate roles (sys admin, org admin, workspace member)

---

## Phase 1: Database Schema Verification

### System Configuration Tables
- [ ] `eval_cfg_sys` table exists and has single row
- [ ] `eval_cfg_sys_prompts` table exists with seed data for 3 prompt types
- [ ] `eval_sys_status_options` table exists with default status options

### Organization Configuration Tables
- [ ] `eval_cfg_org` table exists
- [ ] `eval_cfg_org_prompts` table exists
- [ ] `eval_org_status_options` table exists

### Document Types & Criteria Tables
- [ ] `eval_doc_types` table exists
- [ ] `eval_criteria_sets` table exists
- [ ] `eval_criteria_items` table exists

### Evaluation Results Tables
- [ ] `eval_doc_summaries` table exists
- [ ] `eval_doc_sets` table exists
- [ ] `eval_criteria_results` table exists
- [ ] `eval_result_edits` table exists

### RPC Functions
- [ ] `get_eval_config(org_id)` returns merged config
- [ ] `get_eval_prompt_config(org_id, prompt_type)` resolves correctly
- [ ] `get_eval_status_options(org_id)` returns active options
- [ ] `can_manage_eval_config(user_id, org_id)` checks org admin access
- [ ] `is_eval_owner(user_id, eval_id)` checks evaluation ownership

### RLS Policies
- [ ] Sys admin can read/write sys_* tables
- [ ] Org admin can read/write org_* tables for their org
- [ ] Workspace members can read/write evaluation tables for their workspace
- [ ] Users cannot access other orgs' configurations

---

## Phase 2: Backend Lambda Testing

### eval-config Lambda - System Admin Routes

#### System Configuration
- [ ] `GET /admin/sys/eval/config` returns platform defaults
- [ ] `PATCH /admin/sys/eval/config` updates platform defaults
- [ ] Unauthorized users cannot access sys config routes

#### System Status Options
- [ ] `GET /admin/sys/eval/status-options` lists all status options
- [ ] `POST /admin/sys/eval/status-options` creates new status option
- [ ] `PATCH /admin/sys/eval/status-options/{id}` updates status option
- [ ] `DELETE /admin/sys/eval/status-options/{id}` deletes status option

#### System Prompts
- [ ] `GET /admin/sys/eval/prompts` lists all prompt configs
- [ ] `PATCH /admin/sys/eval/prompts/{type}` updates prompt config
- [ ] `POST /admin/sys/eval/prompts/{type}/test` tests prompt with sample

#### Org Delegation
- [ ] `GET /admin/sys/eval/orgs` lists orgs with delegation status
- [ ] `PATCH /admin/sys/eval/orgs/{orgId}/delegation` toggles delegation

### eval-config Lambda - Org Admin Routes

#### Org Configuration
- [ ] `GET /admin/org/eval/config` returns org config (merged with sys)
- [ ] `PATCH /admin/org/eval/config` updates org config
- [ ] Unauthorized users cannot access org config routes

#### Org Status Options
- [ ] `GET /admin/org/eval/status-options` lists org status options
- [ ] `POST /admin/org/eval/status-options` creates org status option
- [ ] `PATCH /admin/org/eval/status-options/{id}` updates org status option
- [ ] `DELETE /admin/org/eval/status-options/{id}` deletes org status option

#### Org Prompts (When Delegated)
- [ ] `GET /admin/org/eval/prompts` returns 403 when not delegated
- [ ] `GET /admin/org/eval/prompts` returns prompts when delegated
- [ ] `PATCH /admin/org/eval/prompts/{type}` updates prompt when delegated
- [ ] `POST /admin/org/eval/prompts/{type}/test` tests prompt when delegated

#### Document Types
- [ ] `GET /admin/org/eval/doc-types` lists doc types for org
- [ ] `POST /admin/org/eval/doc-types` creates new doc type
- [ ] `PATCH /admin/org/eval/doc-types/{id}` updates doc type
- [ ] `DELETE /admin/org/eval/doc-types/{id}` soft deletes doc type

#### Criteria Sets
- [ ] `GET /admin/org/eval/criteria-sets` lists criteria sets
- [ ] `GET /admin/org/eval/criteria-sets?docTypeId={id}` filters by doc type
- [ ] `POST /admin/org/eval/criteria-sets` creates new criteria set
- [ ] `GET /admin/org/eval/criteria-sets/{id}` returns set with items
- [ ] `PATCH /admin/org/eval/criteria-sets/{id}` updates criteria set
- [ ] `DELETE /admin/org/eval/criteria-sets/{id}` soft deletes criteria set

#### Criteria Import
- [ ] `POST /admin/org/eval/criteria-sets/import` imports from CSV
- [ ] `POST /admin/org/eval/criteria-sets/import` imports from XLSX
- [ ] Import validates required columns (criteria_id, requirement)
- [ ] Import handles optional columns (description, category, weight)
- [ ] Import returns summary with success/error counts

#### Criteria Items
- [ ] `GET /admin/org/eval/criteria-sets/{id}/items` lists items
- [ ] `POST /admin/org/eval/criteria-sets/{id}/items` adds item
- [ ] `PATCH /admin/org/eval/criteria-items/{id}` updates item
- [ ] `DELETE /admin/org/eval/criteria-items/{id}` deletes item

### eval-results Lambda - Evaluation Routes

#### Evaluation CRUD
- [ ] `POST /workspaces/{wsId}/eval` creates evaluation
- [ ] `GET /workspaces/{wsId}/eval` lists evaluations
- [ ] `GET /workspaces/{wsId}/eval/{id}` returns evaluation detail
- [ ] `GET /workspaces/{wsId}/eval/{id}/status` returns progress
- [ ] `DELETE /workspaces/{wsId}/eval/{id}` deletes evaluation

#### Result Editing
- [ ] `PATCH /workspaces/{wsId}/eval/{id}/results/{resultId}` edits result
- [ ] Edit creates new version in edit history
- [ ] `GET /workspaces/{wsId}/eval/{id}/results/{resultId}/history` returns history

#### Export
- [ ] `GET /workspaces/{wsId}/eval/{id}/export/pdf` generates PDF
- [ ] `GET /workspaces/{wsId}/eval/{id}/export/xlsx` generates XLSX
- [ ] Export includes all criteria results and citations

### eval-processor Lambda - Async Processing

#### SQS Message Handling
- [ ] Processor receives SQS message
- [ ] Invalid messages sent to DLQ after 3 retries

#### Document Summary Generation
- [ ] Individual doc summaries generated
- [ ] Combined summary generated for multi-doc evaluations
- [ ] Summaries saved to database

#### Criteria Evaluation
- [ ] Each criteria item evaluated with RAG search
- [ ] Results include status, confidence, explanation, citations
- [ ] Progress updated after each item

#### Evaluation Summary
- [ ] Overall evaluation summary generated
- [ ] Compliance score calculated correctly
- [ ] Status transitions (pending → processing → completed)

#### Error Handling
- [ ] AI provider errors handled gracefully
- [ ] Failed evaluations have status = 'failed' with error message
- [ ] Retry from failed state works

---

## Phase 3: Frontend Testing

### Types & API Client
- [ ] TypeScript types compile without errors
- [ ] API functions have correct request/response shapes
- [ ] Error handling works for API failures

### Zustand Store
- [ ] Config state initializes correctly
- [ ] Doc types state CRUD operations work
- [ ] Criteria sets state CRUD operations work
- [ ] Evaluations state with progress polling works

### React Hooks
- [ ] `useEvalConfig` loads and updates config
- [ ] `useEvalDocTypes` CRUD operations work
- [ ] `useEvalCriteriaSets` CRUD operations work
- [ ] `useEvalStatusOptions` loads options correctly
- [ ] `useEvaluations` list/create works
- [ ] `useEvaluation` loads single evaluation
- [ ] `useEvalProgress` polls progress correctly
- [ ] `useEvalExport` generates exports

### User Components
- [ ] `EvalProgressCard` displays progress correctly
- [ ] `EvalResultsTable` sorting and filtering work
- [ ] `CitationViewer` displays citations correctly
- [ ] `EvalQAList` displays Q&A cards correctly
- [ ] `EvalSummaryPanel` displays summary with score
- [ ] `ResultEditDialog` edit and save works
- [ ] `EvalExportButton` triggers export correctly

### Admin Components
- [ ] `DocTypeManager` CRUD operations work
- [ ] `CriteriaSetManager` CRUD operations work
- [ ] `CriteriaImportDialog` import flow works
- [ ] `CriteriaItemEditor` inline editing works
- [ ] `StatusOptionManager` CRUD operations work
- [ ] `PromptConfigEditor` editing and testing works
- [ ] `ScoringConfigPanel` config changes work
- [ ] `OrgDelegationManager` toggle works

### User Pages
- [ ] `EvalListPage` displays evaluations correctly
- [ ] `EvalDetailPage` displays detail with tabs

### Admin Pages
- [ ] `SysEvalConfigPage` loads and saves config
- [ ] `SysEvalPromptsPage` prompt editing works
- [ ] `OrgEvalConfigPage` loads and saves config
- [ ] `OrgEvalPromptsPage` shows delegation state
- [ ] `OrgEvalDocTypesPage` doc type management works
- [ ] `OrgEvalCriteriaPage` criteria management works

---

## Phase 4: End-to-End Testing

### Scenario 1: Basic Evaluation Flow
1. [ ] Org admin creates document type
2. [ ] Org admin imports criteria set from CSV
3. [ ] User uploads document to workspace via module-kb
4. [ ] User creates evaluation with document and criteria set
5. [ ] Evaluation processes successfully (status: completed)
6. [ ] User views results with citations
7. [ ] User exports to PDF

### Scenario 2: Multi-Document Evaluation
1. [ ] User selects 3 documents for evaluation
2. [ ] Evaluation processes all documents
3. [ ] Combined summary reflects all documents
4. [ ] Citations reference correct source documents

### Scenario 3: Result Editing
1. [ ] User edits evaluation result narrative
2. [ ] User changes result status
3. [ ] Edit history shows all versions
4. [ ] Current version displayed in results

### Scenario 4: Config Hierarchy
1. [ ] Sys admin sets platform default scoring mode
2. [ ] Org admin overrides scoring mode
3. [ ] Evaluation uses org-level config
4. [ ] New org uses platform defaults

### Scenario 5: AI Config Delegation
1. [ ] Sys admin enables delegation for org
2. [ ] Org admin can now edit prompts
3. [ ] Evaluation uses org prompts
4. [ ] Sys admin disables delegation
5. [ ] Org admin cannot edit prompts

### Scenario 6: Error Recovery
1. [ ] Evaluation fails due to AI error
2. [ ] Status shows 'failed' with error message
3. [ ] User can retry evaluation
4. [ ] Retry completes successfully

---

## Phase 5: Validation

### CORA Compliance
- [ ] API response validator: 0 violations
- [ ] Frontend compliance validator: 0 violations
- [ ] Structure validator: 0 violations
- [ ] Python key consistency validator: 0 violations

### Performance
- [ ] Evaluation processing completes within timeout (15 min)
- [ ] Large criteria sets (100+ items) process correctly
- [ ] Export generation completes within timeout (2 min)

### Security
- [ ] RLS policies enforce access control
- [ ] API routes require authentication
- [ ] Sys admin routes require sys admin role
- [ ] Org admin routes require org admin role

---

## Test Results

| Phase | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| Database | | | | |
| Backend | | | | |
| Frontend | | | | |
| E2E | | | | |
| Validation | | | | |
| **Total** | | | | |

---

## Sign-Off

- [ ] All tests passed
- [ ] Documentation complete
- [ ] Ready for production deployment

**Tested By**: _______________  
**Date**: _______________  
**Version**: 1.0.0
