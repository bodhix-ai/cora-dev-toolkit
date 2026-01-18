# Module-Eval

**Automated Document Evaluation with AI-Driven Compliance Assessment**

## Overview

Module-eval provides automated document evaluation against configurable compliance criteria. It uses AI-driven assessments with RAG-grounded citations, supports human editing with version control, and exports results to PDF/XLSX formats.

## Features

- **Document Type Management** - Categorize documents (e.g., "IT Security Policy", "Appraisal Report")
- **Criteria Import** - Import evaluation criteria from spreadsheets (CSV/XLSX)
- **Multi-Document Evaluations** - Evaluate multiple documents together (policy + diagram + screenshot)
- **AI-Driven Evaluation** - Automated Q&A generation with RAG-sourced citations
- **Human Edit with Versioning** - Edit AI results (narrative + status only) with version history
- **Configurable Scoring** - Boolean, detailed, or numerical scoring modes
- **Export** - PDF and XLSX report generation

## Configuration Hierarchy

Module-eval uses a three-tier configuration hierarchy:

| Level | Scope | Configured By |
|-------|-------|---------------|
| **System** | Platform defaults | Sys Admin |
| **Organization** | Org-specific overrides | Org Admin |
| **Workspace** | Evaluation operations | Users |

### Delegation

System admins can delegate AI configuration to individual organizations, allowing org admins to customize:
- AI provider and model selection
- Prompt templates
- Temperature and other parameters

## Dependencies

### Core Modules (Required)
- `module-access` - Authentication and authorization
- `module-ai` - AI provider configuration
- `module-kb` - Document storage, parsing, embeddings, RAG search
- `module-mgmt` - Platform management

### Functional Modules (Required)
- `module-ws` - Workspace scoping

## Configuration

### Tailwind CSS

Module-eval components use Tailwind CSS for styling. Projects must include module-eval paths in their `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    // ... other paths
    './modules/module-eval/**/*.{ts,tsx}',
  ],
  // ... rest of config
}
```

**Without this configuration:**
- Components will lack CSS styles (missing colors, borders, spacing)
- UI elements may appear oversized or unstyled
- Layout and formatting will not render correctly

**Verification:** After adding module-eval paths, restart your dev server and rebuild Tailwind CSS.

## Database Schema

### System Configuration (3 tables)
- `eval_cfg_sys` - Platform-level defaults
- `eval_cfg_sys_prompts` - Default prompts for doc_summary, evaluation, eval_summary
- `eval_sys_status_options` - Default status options (compliant, non-compliant, etc.)

### Organization Configuration (3 tables)
- `eval_cfg_org` - Org-level config with delegation flag
- `eval_cfg_org_prompts` - Org prompt overrides (when delegated)
- `eval_org_status_options` - Org-level status options

### Document Types & Criteria (3 tables)
- `eval_doc_types` - Document categories per org
- `eval_criteria_sets` - Criteria collections linked to doc types
- `eval_criteria_items` - Individual criteria items with weights

### Evaluation Results (4 tables)
- `eval_doc_summaries` - Evaluation records with status and AI summaries
- `eval_doc_sets` - Link table for multi-document evaluations
- `eval_criteria_results` - AI-generated results (immutable)
- `eval_result_edits` - Human edits with version control

### RPC Functions
- `get_eval_config(org_id)` - Resolve config hierarchy
- `get_eval_prompt_config(org_id, prompt_type)` - Resolve prompt config
- `get_eval_status_options(org_id)` - Get active status options
- `can_manage_eval_config(user_id, org_id)` - Check org admin access
- `is_eval_owner(user_id, eval_id)` - Check evaluation ownership

## Backend Lambdas

### eval-config
Configuration, doc types, criteria sets, status options management.

**Routes (35 total):**
- System config CRUD (sys admin)
- Org config CRUD (org admin)
- Doc types CRUD
- Criteria sets CRUD with import

### eval-processor
Async evaluation processing triggered by SQS.

**Processing Pipeline:**
1. Generate document summaries
2. Evaluate each criteria item with RAG search
3. Generate overall evaluation summary
4. Calculate compliance score

### eval-results
Evaluation CRUD, result editing, and export.

**Routes (9 total):**
- Evaluation CRUD
- Result editing with version history
- PDF/XLSX export

## Frontend Structure

### Types (`frontend/types/index.ts`)
~750 lines of TypeScript types covering all entities, inputs, and responses.

### API Client (`frontend/lib/api.ts`)
~900 lines of API functions for all endpoints.

### Store (`frontend/store/evalStore.ts`)
~1600 lines Zustand store with:
- Config state (sys/org)
- Doc types state
- Criteria sets state
- Evaluations state with progress polling

### Hooks (`frontend/hooks/`)
8 hook files (~1500 lines total):
- `useEvalConfig` - Config management
- `useEvalDocTypes` - Doc types CRUD
- `useEvalCriteriaSets` - Criteria sets CRUD
- `useEvalStatusOptions` - Status options
- `useEvaluations` - List/create evaluations
- `useEvaluation` - Single evaluation with results
- `useEvalProgress` - Progress polling
- `useEvalExport` - Export functionality

### Components (`frontend/components/`)
16 components (~5500 lines total):

**User Components:**
- `EvalProgressCard` - Progress display with status badges
- `EvalResultsTable` - Evaluation list with sorting/filtering
- `CitationViewer` - RAG citation display
- `EvalQAList` - Criteria results Q&A cards
- `EvalSummaryPanel` - Summary with compliance score
- `ResultEditDialog` - Edit result modal
- `EvalExportButton` - Export PDF/XLSX buttons

**Admin Components:**
- `DocTypeManager` - Doc types CRUD
- `CriteriaSetManager` - Criteria sets CRUD
- `CriteriaImportDialog` - Spreadsheet import
- `CriteriaItemEditor` - Edit criteria items
- `StatusOptionManager` - Status options CRUD
- `PromptConfigEditor` - Prompt editing
- `ScoringConfigPanel` - Scoring config
- `OrgDelegationManager` - Delegation toggle

### Pages (`frontend/pages/`)
8 page components (~2200 lines total):

**User Pages:**
- `EvalListPage` - Evaluation list with filtering
- `EvalDetailPage` - Evaluation detail with tabs

**Admin Pages:**
- `SysEvalConfigPage` - Platform config
- `SysEvalPromptsPage` - Platform prompts
- `OrgEvalConfigPage` - Org config
- `OrgEvalPromptsPage` - Org prompts
- `OrgEvalDocTypesPage` - Doc type management
- `OrgEvalCriteriaPage` - Criteria management

## Routes

### User Routes
- `/eval` - Evaluation list
- `/eval/[id]` - Evaluation detail

### Admin Routes
- `/admin/sys/eval/config` - System config (sys admin)
- `/admin/sys/eval/prompts` - System prompts (sys admin)
- `/admin/org/eval/config` - Org config (org admin)
- `/admin/org/eval/prompts` - Org prompts (org admin, when delegated)
- `/admin/org/eval/doc-types` - Doc types (org admin)
- `/admin/org/eval/criteria` - Criteria sets (org admin)

## Infrastructure

### Lambda Configuration
- `eval-config`: Memory 512 MB, Timeout 60s
- `eval-processor`: Memory 1024 MB, Timeout 900s (15 min)
- `eval-results`: Memory 1024 MB, Timeout 120s

### SQS Queue
- Queue for async evaluation processing
- Dead letter queue (3 retries, 7 day retention)
- Visibility timeout: 16 minutes

### S3 Bucket
- Export files storage
- Presigned URLs for downloads

## API Routes Summary

| Category | Count | Lambda |
|----------|-------|--------|
| System Config | 11 | eval-config |
| Org Config | 9 | eval-config |
| Doc Types & Criteria | 15 | eval-config |
| Evaluations | 9 | eval-results |
| **Total** | **44** | |

## Usage Flow

### Creating an Evaluation

1. **Setup (Org Admin)**
   - Create document types
   - Import or create criteria sets
   - Configure scoring options

2. **Evaluate (User)**
   - Select documents from workspace KB
   - Choose document type and criteria set
   - Submit for evaluation

3. **Processing**
   - Documents summarized by AI
   - Each criteria evaluated with RAG search
   - Overall summary generated
   - Progress tracked in real-time

4. **Review**
   - View results with citations
   - Edit narrative and status as needed
   - Export to PDF or XLSX

## Integration Points

### module-kb Integration
- Document storage and retrieval
- Embedding generation
- RAG search for evaluation context

### module-ai Integration
- AI provider configuration
- Model selection
- Prompt templates

### module-ws Integration
- Workspace-scoped evaluations
- Document access control

## Code Statistics

| Category | Files | Lines |
|----------|-------|-------|
| Database Schema | 15 | ~800 |
| Backend Lambdas | 3 | ~3000 |
| TypeScript Types | 1 | ~750 |
| API Client | 1 | ~900 |
| Zustand Store | 1 | ~1600 |
| React Hooks | 8 | ~1500 |
| React Components | 16 | ~5500 |
| React Pages | 8 | ~2200 |
| Terraform | 3 | ~600 |
| **Total** | **56** | **~17,000** |

## Version History

- **1.0.0** - Initial implementation with full feature set
