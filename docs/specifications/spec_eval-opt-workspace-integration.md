# Specification: Eval Optimizer Workspace Integration

**Status:** In Progress
**Created:** February 6, 2026
**Sprint:** 3

## Overview

Integrate eval-opt prompt optimization functionality into the workspace detail page with proper UX for the optimization workflow.

## Workspace Tabs

The eval-opt app workspace detail page should have these tabs:

| Tab | Purpose | Implementation |
|-----|---------|----------------|
| **Overview** | Workspace stats and getting started guide | Custom |
| **Context** | Domain context documents for RAG | Reuse module-kb `WorkspaceDataKBTab` |
| **Optimization** | List optimization runs + create new | Custom (new) |
| **Settings** | Workspace settings | Standard module-ws pattern |

## Optimization Tab

### Run List
- Table/cards showing existing Optimization Runs
- Columns: Name, Doc Type, Criteria Set, Truth Sets count, Status, Created Date
- Click to navigate to Run Details page

### Create Run
- Button: "+ New Optimization Run"
- Dialog: Select doc type + criteria set (same pattern as evaluation creation)
- After creation → redirect to `/ws/[id]/runs/[runId]`

## Optimization Run Details Page

Route: `/ws/[id]/runs/[runId]`

### Section 1: Response Sections Builder
- Define the JSON structure the AI response should follow
- Example sections: Justification, Non-Compliance Findings, Recommendations
- **Must be defined before Truth Sets can be created**
- Stored in `eval_opt_response_structures` table

### Section 2: Truth Sets
- List existing truth sets with document name, completion status
- Button: "+ New Truth Set" (disabled until response sections defined)
- Each truth set linked to one document from workspace KB

### Section 3: Optimization Controls
- Button: "Optimize Eval Config" (disabled until ≥1 truth set exists)
- Results display: Ranked configurations with accuracy scores
- Status indicator for running optimization

## Truth Set Creation Wizard

Route: `/ws/[id]/runs/[runId]/truth-sets/new` or modal

### Step 1: Document Selection
- Option A: Select existing document from workspace KB
- Option B: Upload new document (automatically adds to workspace KB)

### Step 2: Criteria Evaluation (Wizard)
- Document viewer on left (with search, scroll to section)
- Evaluation form on right
- Progress indicator: "Criterion 3 of 12 (25%)"
- Save progress at any time

### Per-Criterion Form Fields:
1. **Score Range** (5-tier selector):
   - 0-20 (Non-Compliant)
   - 21-40 (Mostly Non-Compliant)
   - 41-60 (Partially Compliant)
   - 61-80 (Mostly Compliant)
   - 81-100 (Fully Compliant)

2. **Response Sections** (one text field per defined section):
   - Example: Justification, Non-Compliance Findings, Recommendations
   - Fields match what was defined in Response Sections Builder

### Deferred Features (Not This Sprint)
- Text highlighting for citation selection
- Citation verification

## Database Tables

### Existing Tables (from Sprint 2)
- `eval_opt_runs` - Optimization runs
- `eval_opt_response_structures` - Response section definitions
- `eval_opt_truth_keys` - Truth key data per criterion
- `eval_opt_doc_groups` - Document groupings

### Schema Considerations
- Truth keys need to store per-section responses (may need JSON column)
- Score stored as range tier (1-5) or actual value (0-100) with tier mapping

## API Endpoints

### Optimization Runs
- `GET /api/eval-opt/workspaces/{wsId}/runs` - List runs
- `POST /api/eval-opt/workspaces/{wsId}/runs` - Create run
- `GET /api/eval-opt/workspaces/{wsId}/runs/{runId}` - Get run details
- `DELETE /api/eval-opt/workspaces/{wsId}/runs/{runId}` - Delete run

### Response Sections
- `GET /api/eval-opt/runs/{runId}/sections` - Get sections
- `PUT /api/eval-opt/runs/{runId}/sections` - Update sections

### Truth Sets
- `GET /api/eval-opt/runs/{runId}/truth-sets` - List truth sets
- `POST /api/eval-opt/runs/{runId}/truth-sets` - Create truth set
- `GET /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Get truth set
- `PUT /api/eval-opt/runs/{runId}/truth-sets/{tsId}` - Update (save progress)

### Optimization
- `POST /api/eval-opt/runs/{runId}/optimize` - Start optimization
- `GET /api/eval-opt/runs/{runId}/results` - Get optimization results

## Implementation Phases

### Phase 1: Workspace Tabs ✅ Current
- Update workspace detail page with Context + Optimization tabs
- Context tab uses module-kb components

### Phase 2: Optimization Run CRUD
- Create Run dialog (doc type + criteria set selection)
- Optimization tab run list
- API endpoints for runs

### Phase 3: Run Details Page
- Response Sections Builder UI
- Truth Sets list
- Navigation structure

### Phase 4: Truth Set Wizard
- Document selection/upload
- Criterion-by-criterion wizard
- Save progress functionality
- Score range + section responses

### Phase 5: Optimization Execution
- "Optimize Eval Config" trigger
- Results display
- Configuration ranking

## UX Mockup (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Workspaces  >  IT Security Compliance                             │
│                                                                     │
│ [IT] IT Security Compliance               ☆  [Eval Optimizer]      │
│      CJIS security policy evaluation optimization                   │
├─────────────────────────────────────────────────────────────────────┤
│ [Overview] [Context] [Optimization] [Settings]                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Optimization Runs                          [+ New Optimization Run]│
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CJIS Compliance v1                                          │   │
│  │ IT Security Policies • CJIS Criteria Set                    │   │
│  │ 3 Truth Sets • Optimized ✓                   Feb 5, 2026   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CJIS Compliance v2 (Draft)                                  │   │
│  │ IT Security Policies • CJIS Criteria Set                    │   │
│  │ 1 Truth Set • In Progress                    Feb 6, 2026   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Success Criteria

1. ✅ User can view Context documents (via module-kb integration)
2. ✅ User can create new Optimization Run (doc type + criteria set)
3. ✅ User can define Response Sections for a run
4. ✅ User can create Truth Sets with document + criterion evaluations
5. ✅ User can save Truth Set progress and resume later
6. ✅ User can trigger optimization and view results