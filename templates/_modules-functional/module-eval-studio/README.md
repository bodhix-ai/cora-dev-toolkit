# Module: Eval Optimizer

**Business Analyst Workbench for Evaluation Prompt Optimization**

## Overview

The Evaluation Optimizer module provides a comprehensive workbench for business analysts to systematically optimize evaluation prompts using sample-driven training. It enables truth key creation, optimization runs, and results analysis to improve the accuracy of AI-powered document evaluations.

## Architecture

This module follows a **hybrid architecture**:

- **Module:** `module-eval-optimizer/` (backend, database, infrastructure)
- **UI App:** `apps/eval-optimizer/` (separate Next.js app for unique BA UX)

This design enables:
- ✅ Proper CORA module provisioning/enablement patterns
- ✅ API-first approach (backend APIs can be consumed by any UI)
- ✅ Separate UI for analyst-specific workflows
- ✅ Paid feature monetization capability (open source core + paid enhancement)

## Key Features

### 1. Project Management
- Create and manage optimization projects
- Link projects to specific doc types and criteria sets
- Manage project members (owner/admin/user roles)
- Track project versioning and criteria set changes

### 2. Sample Document Management
- Upload sample documents for training
- Organize documents into groups (primary doc + supporting artifacts)
- Track document evaluation status
- Integration with module-kb for document storage

### 3. Truth Key Creation (Manual Evaluation)
- Web-based UI for manual document evaluation
- Evaluate documents against criteria
- Assign status, confidence, explanation, and citations
- Track validation and versioning

### 4. Optimization Runs
- Configure evaluation prompts (system prompt, user prompt template, temperature, etc.)
- Run AI evaluations against sample documents
- Compare AI results to truth keys
- Calculate accuracy metrics

### 5. Results Analysis
- Overall accuracy metrics (precision, recall, F1 score)
- Per-criteria breakdown
- Error analysis (false positives/negatives)
- A/B comparison between optimization runs

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `eval_optimization_projects` | Optimization projects linked to doc types and criteria sets |
| `eval_opt_project_members` | Project access control (owner/admin/user) |
| `eval_opt_test_orgs` | Test organizations for optimization runs |
| `eval_opt_document_groups` | Sample document groups |
| `eval_opt_document_group_members` | Supporting documents in groups |
| `eval_opt_truth_keys` | Manual evaluations (truth keys) |
| `eval_opt_runs` | Optimization run configurations and results |
| `eval_opt_run_results` | Detailed results per criterion per sample |

### References Existing Tables

This module references existing live tables:
- `eval_doc_types` (per-org document types)
- `eval_criteria_sets` (per-org criteria sets)
- `eval_criteria_items` (criteria items)
- `eval_sys_status_options` (system-level status options)

## Module Dependencies

### Required Modules

- **module-eval:** Run AI evaluations and compare to truth keys
- **module-kb:** Store and retrieve sample documents
- **module-ws:** Create workspaces for optimization projects

### Optional Modules

- **module-access:** Create test organizations for optimization runs

## API Endpoints

### Projects

- `GET /api/eval-optimizer/projects` - List user's projects
- `POST /api/eval-optimizer/projects` - Create new project
- `GET /api/eval-optimizer/projects/:id` - Get project details
- `PUT /api/eval-optimizer/projects/:id` - Update project
- `DELETE /api/eval-optimizer/projects/:id` - Delete project

### Project Members

- `POST /api/eval-optimizer/projects/:id/members` - Add member
- `DELETE /api/eval-optimizer/projects/:id/members/:user_id` - Remove member

### Sample Documents

- `GET /api/eval-optimizer/projects/:id/samples` - List samples
- `POST /api/eval-optimizer/projects/:id/samples` - Upload sample
- `GET /api/eval-optimizer/projects/:id/samples/:group_id` - Get document group
- `DELETE /api/eval-optimizer/projects/:id/samples/:group_id` - Delete sample

### Truth Keys

- `GET /api/eval-optimizer/projects/:id/truth-keys` - List truth keys
- `POST /api/eval-optimizer/projects/:id/truth-keys` - Create truth keys
- `PUT /api/eval-optimizer/projects/:id/truth-keys/:truth_key_id` - Update truth key
- `DELETE /api/eval-optimizer/projects/:id/truth-keys/:truth_key_id` - Delete truth key

### Optimization Runs

- `GET /api/eval-optimizer/projects/:id/runs` - List runs
- `POST /api/eval-optimizer/projects/:id/runs` - Start optimization run
- `GET /api/eval-optimizer/projects/:id/runs/:run_id` - Get run results
- `GET /api/eval-optimizer/projects/:id/runs/:run_id/results` - Detailed results

## Workflow

### 1. Create Optimization Project
Analyst creates a project linked to a specific doc type and criteria set.

### 2. Upload Sample Documents
Upload 5-100 sample documents representing the document domain.

### 3. Manually Evaluate Documents
Use the web UI to evaluate each document against criteria, creating "truth keys" (the correct answers).

### 4. Run Optimization
Configure evaluation prompt and run AI evaluation against all samples.

### 5. Analyze Results
Review accuracy metrics, identify false positives/negatives, and iterate on prompt configuration.

### 6. Iterate
Adjust prompt based on results and re-run optimization until acceptable accuracy is achieved.

## Configuration

See `module.config.yaml` for full configuration options.

### Key Settings

- **Max Projects per User:** 10
- **Max Samples per Project:** 100
- **Max Document Size:** 10 MB
- **Run Timeout:** 30 minutes
- **Min Samples Required:** 1
- **Cache TTL:** 3600 seconds

## Permissions

### Roles

- **optimizer_admin:** Full control over projects and configurations
- **optimizer_analyst:** Create and manage projects, run optimizations
- **optimizer_viewer:** View-only access to projects and results

## Sprint 2 Implementation Status

**Current Status:** Phase 0 Complete - Module structure created

**Completed:**
- ✅ Module directory structure
- ✅ module.config.yaml
- ✅ module.json
- ✅ README.md
- ✅ Database schema files
- ✅ RLS policies
- ✅ Infrastructure stubs

**Next Sprint:**
- Phase 1: Project management UI
- Phase 2: Sample document management
- Phase 3: Truth key creation UI
- Phase 4: Basic optimization runs
- Phase 5: Results display

## Related Documentation

- **ADR-021:** Eval Optimizer Deployment Architecture
- **ConOps:** `docs/specifications/spec_eval-optimization-conops.md`
- **Sprint 2 Plan:** `docs/plans/plan_eval-optimization-s2.md`
- **Context:** `memory-bank/context-eval-optimization.md`

## Development

### Database Migrations

Database schema files are in `db/schema/`:
- `001-eval-opt-projects.sql` - Projects and members
- `002-eval-opt-project-members.sql` - Project access control
- `003-eval-opt-document-groups.sql` - Sample documents
- `004-eval-opt-truth-keys.sql` - Truth keys
- `005-eval-opt-runs.sql` - Optimization runs
- `006-eval-opt-run-results.sql` - Run results
- `007-eval-opt-rls.sql` - RLS policies

### Backend Lambda APIs

Backend Lambda functions will be in `backend/lambdas/`:
- `opt-projects/` - Project management API (future)

### Frontend

Frontend is in **separate app** at `{project}-stack/apps/eval-optimizer/`.

See Sprint 1 prototype for initial UI implementation.

## License

MIT