# Plan: CORA Validation Automation Implementation

**Status**: ✅ COMPLETE  
**Date**: January 16, 2026  
**Completed**: January 16, 2026  
**Revised**: January 16, 2026 (Enhanced with deterministic fallbacks, reliability improvements, and discoverability)  
**Complexity**: Medium  
**Related**: ADR-012-VALIDATION-SKILLS-STRATEGY.md

---

## Executive Summary

This plan outlines the creation of a comprehensive AI automation suite for CORA validation. Using a **Hybrid Workflow + Skill Architecture**, we combine explicit automation (Workflows) with domain expertise (Skills) to enable developers and AI agents to find issues, understand them, and fix them correctly.

This approach respects architectural boundaries (Stack vs Infra), leverages Cline features as designed, and integrates with the Fast Iteration Testing workflow.

---

## Context

The CORA toolkit includes ~13 validation scripts managed by `cora-validate.py`. The original plan proposed using Skills with an "orchestrator" that would route to "expert" skills. **This approach was fundamentally flawed**—Cline skills cannot invoke other skills programmatically.

**Revised Approach**: Use Workflows for explicit execution and Skills for domain expertise.

### Cline Feature Alignment

| Feature | Design Intent | Our Usage |
|---------|---------------|-----------|
| **Workflows** | Explicit, repeatable automation via `/command` | Running validation, presenting results |
| **Skills** | Domain expertise loaded when user intent matches | Remediation knowledge during fix conversations |
| **Tasks** | Conversation units with checkpoints | Multi-step fix sessions |

### Critical Design Principles

1. **Dual-Path Access**: Every domain expertise is accessible via both skills (intent) AND workflows (explicit)
2. **Guided Activation**: Workflows must output skill-trigger-friendly language to ensure reliable skill activation
3. **Deterministic Fallbacks**: When skills don't activate, `/fix-*.md` workflows guarantee expertise access
4. **Domain Boundaries**: Skills should not attempt fixes outside their domain—they document the need and defer
5. **Fallback Handling**: Vague user intents must be clarified before proceeding
6. **No Documentation Duplication**: Skills/workflows reference existing docs via relative paths
7. **Activation Observability**: Skills must output confirmation messages to verify correct activation
8. **Project Isolation**: All skills are project-level (in `.clinerules/skills/`) to avoid global precedence conflicts
9. **Distinctive Naming**: Skills use `cora-toolkit-validation-*` prefix to minimize global skill collision
10. **Discoverability**: `/help-validation.md` workflow lists all available commands
11. **Error Resilience**: Workflows handle failures gracefully with actionable error messages
12. **Versioning**: Skills include version field for tracking and compatibility

---

## Architecture: Hybrid Workflow + Skill Model

### Directory Structure

```
.clinerules/
├── workflows/                           # Explicit automation
│   ├── validate.md                     # /validate.md - Main entry
│   ├── validate-backend.md             # /validate-backend.md
│   ├── validate-frontend.md            # /validate-frontend.md
│   ├── fix-and-sync.md                 # /fix-and-sync.md <file>
│   ├── fix-backend.md                  # /fix-backend.md - Deterministic fallback
│   ├── fix-data.md                     # /fix-data.md - Deterministic fallback
│   ├── fix-frontend.md                 # /fix-frontend.md - Deterministic fallback
│   ├── fix-structure.md                # /fix-structure.md - Deterministic fallback
│   └── help-validation.md              # /help-validation.md - Discoverability
│
└── skills/                              # Domain expertise (intent-triggered)
    ├── cora-toolkit-validation-backend/
    │   └── SKILL.md                    # Main instructions (references existing docs)
    ├── cora-toolkit-validation-data/
    │   └── SKILL.md                    # References existing docs
    ├── cora-toolkit-validation-frontend/
    │   └── SKILL.md                    # References existing docs
    └── cora-toolkit-validation-structure/
        └── SKILL.md                    # References existing docs
```

**Note on Documentation**: Skills do NOT bundle duplicate documentation. Instead, they reference existing docs via relative paths (e.g., `[Lambda Standards](../../../docs/standards/standard_LAMBDA-DEPLOYMENT.md)`).

---

## Implementation Steps

### Phase 1: Core Workflows

#### 1.1 Main Validation Workflow (`validate.md`)

**Purpose**: Run full validation suite, categorize results, present actionable summary with skill-trigger guidance.

```markdown
# CORA Validation Suite

This workflow runs the full CORA validation suite and helps you fix issues.

## 1. Run Validation
Execute the validation suite with error handling:

```bash
if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found at ./validation/cora-validate.py"
    echo "Are you in the correct directory? Expected: project root"
    exit 1
fi

python3 ./validation/cora-validate.py --all --format json 2>&1 || {
    echo "ERROR: Validation script failed. Common causes:"
    echo "  - Missing Python 3"
    echo "  - Missing dependencies (run: pip install -r validation/requirements.txt)"
    echo "  - Invalid project structure"
    exit 1
}
```

## 2. Categorize Results
Parse the output and group errors by domain:

| Domain | Validators | Error Types |
|--------|------------|-------------|
| **Backend** | api-tracer, cora-compliance, role-naming | Lambda, API, Authorization |
| **Data** | db-naming, schema, rpc-function | Schema, Naming, RLS |
| **Frontend** | a11y, frontend-compliance | Accessibility, UI |
| **Structure** | structure, import, portability | Files, Imports |

## 3. Present Summary
Show a summary table with error counts per domain:

| Domain | Errors | Top Issue |
|--------|--------|-----------|
| Backend | X | [description] |
| Data | X | [description] |
| Frontend | X | [description] |
| Structure | X | [description] |

## 4. Task Recommendation (Multi-Domain)
If errors span 2+ domains, output:

> You have **{X} errors across {N} domains**. This fix session may take multiple conversation turns.
>
> **Recommended**: Start a new Task for checkpoint support:
> "Start a task to fix the validation errors"

## 5. Suggested Next Steps (Dual-Path Guidance)
Present BOTH skill triggers AND fallback workflows:

**Option A: Natural Language (Skill Activation)**
Say one of the following to activate domain expertise:

| Domain | Say This | Expert Activated |
|--------|----------|------------------|
| **Backend** | "Fix the Lambda errors" or "Help with API routing" | `cora-toolkit-validation-backend` |
| **Data** | "Fix the database naming issues" or "Help with schema" | `cora-toolkit-validation-data` |
| **Frontend** | "Fix the accessibility errors" or "Help with a11y" | `cora-toolkit-validation-frontend` |
| **Structure** | "Fix the import violations" or "Help with file structure" | `cora-toolkit-validation-structure` |

**Option B: Direct Workflow (Guaranteed)**
If skills don't activate, use these commands directly:

| Domain | Workflow Command |
|--------|------------------|
| **Backend** | `/fix-backend.md` |
| **Data** | `/fix-data.md` |
| **Frontend** | `/fix-frontend.md` |
| **Structure** | `/fix-structure.md` |

**Need help?** Run `/help-validation.md` to see all available commands.

Which domain should I help you fix first?
```

#### 1.2 Backend Validation Workflow (`validate-backend.md`)

**Purpose**: Run only backend validators for focused debugging.

```markdown
# CORA Backend Validation

Run backend-specific validators only.

## 1. Run Backend Validators
```bash
if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found. Are you in the project root?"
    exit 1
fi

python3 ./validation/cora-validate.py --validators api-tracer,cora-compliance,role-naming 2>&1 || {
    echo "ERROR: Validation failed. Check Python 3 and dependencies."
    exit 1
}
```

## 2. Analyze Results
Focus on:
- Lambda deployment issues (source_code_hash, runtime, layers)
- API Gateway routing (route docstrings, method matching)
- Authorization configuration (authorizer attachment)
- Role naming compliance (CORA role standards)

## 3. Present Results with Dual-Path Guidance
Show errors categorized by type, then provide guidance:

**Option A: Natural Language (Skill Activation)**
- "Fix the Lambda errors" - for deployment/configuration issues
- "Fix the API routing" - for Gateway/route issues
- "Fix the authorizer" - for authorization problems

**Option B: Direct Workflow (Guaranteed)**
- `/fix-backend.md` - loads backend expertise directly

## 4. Remediation
When you request a fix, the `cora-toolkit-validation-backend` skill will activate 
and guide you through the Template-First workflow using `/fix-and-sync.md`.

If the skill doesn't activate, use `/fix-backend.md` as a guaranteed fallback.
```

#### 1.3 Frontend Validation Workflow (`validate-frontend.md`)

**Purpose**: Run only frontend validators.

```markdown
# CORA Frontend Validation

Run frontend-specific validators only.

## 1. Run Frontend Validators
```bash
if [ ! -f "./validation/cora-validate.py" ]; then
    echo "ERROR: Validation script not found. Are you in the project root?"
    exit 1
fi

python3 ./validation/cora-validate.py --validators a11y,frontend-compliance 2>&1 || {
    echo "ERROR: Validation failed. Check Python 3 and dependencies."
    exit 1
}
```

## 2. Analyze Results
Focus on:
- Section 508 accessibility compliance (alt text, labels, contrast)
- CORA UI standards (Sidebar, AppShell, ModuleLayout)
- Next.js patterns (App Router, Server/Client components)

## 3. Present Results with Dual-Path Guidance
Show errors categorized by type, then provide guidance:

**Option A: Natural Language (Skill Activation)**
- "Fix the accessibility errors" - for Section 508/WCAG issues
- "Fix the UI compliance" - for CORA component pattern issues

**Option B: Direct Workflow (Guaranteed)**
- `/fix-frontend.md` - loads frontend expertise directly

## 4. Remediation
When you request a fix, the `cora-toolkit-validation-frontend` skill will activate 
and guide you through the Template-First workflow.

If the skill doesn't activate, use `/fix-frontend.md` as a guaranteed fallback.
```

#### 1.4 Fix and Sync Workflow (`fix-and-sync.md`)

**Purpose**: Automate the Template-First fast iteration pattern.

```markdown
# Fix and Sync Workflow

This workflow automates the Template-First pattern for fast iteration.

**Usage**: `/fix-and-sync.md <filename>`

## 1. Locate Template Source
Find the template file that corresponds to the provided filename:

```bash
FILENAME="<filename>"
TEMPLATE=$(find templates/ -name "$FILENAME" -type f 2>/dev/null | head -1)

if [ -z "$TEMPLATE" ]; then
    echo "ERROR: Template not found for '$FILENAME'"
    echo "Search path: templates/"
    echo "Try: find templates/ -name '*partial-name*' -type f"
    exit 1
fi

echo "Found template: $TEMPLATE"
```

## 2. Apply Fix to Template
Edit the template file with the required fix.

## 3. Sync to Test Project
Determine the test project path from `memory-bank/activeContext.md` and sync:

```bash
# Read project path from activeContext.md or use parameter
./scripts/sync-fix-to-project.sh <project-path> <filename>
```

## 4. Deploy if Backend
If this is a Lambda file, deploy:

```bash
cd <project-infra-path> && ./scripts/deploy-lambda.sh <module>/<lambda>
```

## 5. Re-validate
Run the relevant validator to confirm the fix:

```bash
./validation/cora-validate.py --validators <relevant-validator>
```
```

#### 1.5 Help Validation Workflow (`help-validation.md`)

**Purpose**: Discoverability - list all available validation commands.

```markdown
# CORA Validation Help

This workflow lists all available validation commands and their usage.

## Available Workflows

| Command | Purpose |
|---------|---------|
| `/validate.md` | Run full validation suite, see all errors |
| `/validate-backend.md` | Run backend validators only (Lambda, API, Auth) |
| `/validate-frontend.md` | Run frontend validators only (A11y, UI) |
| `/fix-backend.md` | Get backend fix guidance (Lambda, API Gateway) |
| `/fix-data.md` | Get database fix guidance (Schema, Naming, RLS) |
| `/fix-frontend.md` | Get frontend fix guidance (Accessibility, UI) |
| `/fix-structure.md` | Get structure fix guidance (Imports, Files) |
| `/fix-and-sync.md <file>` | Fix template and sync to test project |
| `/help-validation.md` | Show this help |

## Quick Start

1. **Run validation**: `/validate.md`
2. **Review errors**: Grouped by domain (Backend, Data, Frontend, Structure)
3. **Fix issues**: Say "Fix the [domain] errors" or use `/fix-[domain].md`
4. **Re-validate**: Run `/validate.md` again to confirm fixes

## Skill Activation

Skills provide deep expertise and activate automatically when you say:
- **Backend**: "Fix the Lambda errors", "API routing issue", "authorizer problem"
- **Data**: "Fix the database naming", "schema error", "RLS policy"
- **Frontend**: "Fix the accessibility errors", "a11y issue", "WCAG"
- **Structure**: "Fix the import violations", "module boundaries"

If skills don't activate, use the `/fix-*.md` workflows directly.

## Troubleshooting

**Workflow not found?**
- Ensure `.clinerules/workflows/` exists
- Check that workflows are enabled in Cline Settings → Features

**Skill not activating?**
- Try more specific trigger phrases (see above)
- Use the fallback workflow: `/fix-backend.md`, `/fix-data.md`, etc.
- Check for global skill conflicts (see ADR-012 troubleshooting section)

**Validation script failing?**
- Ensure Python 3 is installed
- Run: `pip install -r validation/requirements.txt`
- Verify you're in the project root directory
```

---

### Phase 1.5: Deterministic Fallback Workflows

These workflows embed the same expertise as skills but are invoked explicitly, guaranteeing the content loads.

#### 1.5.1 Fix Backend Workflow (`fix-backend.md`)

```markdown
# CORA Backend Fix Workflow

This workflow provides backend expertise for fixing Lambda, API Gateway, and authorization issues.

**Use this workflow when:**
- The `cora-toolkit-validation-backend` skill doesn't activate
- You want guaranteed access to backend remediation knowledge

## Lambda Standards (7 Rules)

1. **source_code_hash**: Always use `filebase64sha256(var.lambda_zip)`
2. **Runtime**: Must be `python3.11` (matches org-common layer)
3. **Layers**: Must include `var.org_common_layer_arn`
4. **Lifecycle**: Use `create_before_destroy = true`
5. **Never** use `ignore_changes` on `source_code_hash`
6. **Route Docstrings**: Document routes in module docstring
7. **Authorization**: Use appropriate authorizer per endpoint

For complete reference: [Lambda Deployment Standard](../../../docs/standards/standard_LAMBDA-DEPLOYMENT.md)

## Two-Repo Pattern

| Code Location | Target Repo |
|---------------|-------------|
| `packages/module-*/backend/` | `{project}-stack` |
| `lambdas/authorizer/` | `{project}-infra` |

**NEVER** sync functional module code to the infra repo.

## Remediation Workflow

1. **Identify the template**: Find the source in `templates/`
2. **Fix the template FIRST**: Never fix only the test project
3. **Sync**: Use `/fix-and-sync.md <filename>`
4. **Deploy**: For Lambda changes, run `deploy-lambda.sh`
5. **Verify**: Re-run validation
```

#### 1.5.2 Fix Data Workflow (`fix-data.md`)

```markdown
# CORA Data Fix Workflow

This workflow provides data expertise for fixing database schemas, naming conventions, and RLS policies.

**Use this workflow when:**
- The `cora-toolkit-validation-data` skill doesn't activate
- You want guaranteed access to data remediation knowledge

## Table Naming Standards (ADR-011)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `_cfg_` | Configuration tables | `_cfg_org_settings` |
| `_log_` | Audit/logging tables | `_log_user_actions` |
| `_sys_` | System tables | `_sys_migrations` |
| (none) | Business entities | `organizations`, `users` |

For complete reference: [ADR-011 Table Naming Standards](../../../docs/arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)

## Column Naming

- Use `snake_case` for all columns
- Foreign keys: `{table}_id` (e.g., `org_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`
- Soft delete: `deleted_at`

## RLS Patterns

- Always enable RLS on user-facing tables
- Use `auth.uid()` for user identification
- Test policies with different user contexts

## Migration Workflow

1. Create migration file in `scripts/migrations/`
2. Make idempotent (use `IF NOT EXISTS`)
3. Test in development first
4. Document in migration README
```

#### 1.5.3 Fix Frontend Workflow (`fix-frontend.md`)

```markdown
# CORA Frontend Fix Workflow

This workflow provides frontend expertise for fixing accessibility and UI compliance issues.

**Use this workflow when:**
- The `cora-toolkit-validation-frontend` skill doesn't activate
- You want guaranteed access to frontend remediation knowledge

## Section 508 Accessibility

### Required Elements
- All images need `alt` text
- Form inputs need associated labels
- Interactive elements need keyboard access
- Color contrast must meet WCAG AA (4.5:1)

### Common Fixes
- Add `aria-label` to icon buttons
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Ensure focus indicators are visible
- Add skip links for keyboard navigation

For complete reference: [CORA Frontend Standard](../../../docs/standards/standard_CORA-FRONTEND.md)

## CORA UI Standards

### AppShell Pattern
- Consistent sidebar navigation
- Organization selector in header
- Breadcrumb navigation

### Module Integration
- Use `ModuleLayout` wrapper
- Follow card-based admin patterns
- Respect theme context

## Next.js Patterns

- Use App Router conventions
- Server components by default
- Client components only when needed (`"use client"`)
```

#### 1.5.4 Fix Structure Workflow (`fix-structure.md`)

```markdown
# CORA Structure Fix Workflow

This workflow provides structure expertise for fixing project organization and import issues.

**Use this workflow when:**
- The `cora-toolkit-validation-structure` skill doesn't activate
- You want guaranteed access to structure remediation knowledge

## Two-Repo Pattern

| Repo | Contains | Example |
|------|----------|---------|
| `{project}-infra` | Terraform, deploy scripts, authorizer | `pm-app-infra` |
| `{project}-stack` | Next.js app, CORA modules | `pm-app-stack` |

## Module Structure

```
packages/module-{name}/
├── backend/
│   └── {lambda-name}/
│       └── lambda_function.py
├── frontend/
│   ├── components/
│   └── routes/
├── db/
│   └── schema.sql
└── README.md
```

## Import Restrictions

- Modules should not import from other modules directly
- Use shared packages for common code
- Core modules can be imported by functional modules
- Never import functional module code into core modules

## Route Locations

**CRITICAL**: Routes live at module root, not in `frontend/`:
- ✅ `templates/_modules-functional/{module}/routes/`
- ❌ `templates/_modules-functional/{module}/frontend/routes/`
```

---

### Phase 2: Domain Expert Skills

#### 2.1 Backend Expert (`cora-toolkit-validation-backend`)

**Triggers**: "fix Lambda", "API error", "authorizer issue", "backend validation", "502 error", "source_code_hash"

```yaml
---
name: cora-toolkit-validation-backend
version: "1.0"
description: Fix CORA Lambda deployment errors (source_code_hash, runtime, layers), 
  API Gateway routing issues (502 errors, route mismatches), and authorizer configuration. 
  Activate when seeing Lambda validation failures, API errors, or requests like 
  "fix Lambda errors", "API routing issue", or "authorizer problem".
---
```

**Directory Structure** (Simplified - no duplicate docs):

```
cora-toolkit-validation-backend/
└── SKILL.md                      # Main instructions (references existing docs)
```

**SKILL.md Content**:

```markdown
---
name: cora-toolkit-validation-backend
version: "1.0"
description: Fix CORA Lambda deployment errors (source_code_hash, runtime, layers), API Gateway routing issues (502 errors, route mismatches), and authorizer configuration. Activate when seeing Lambda validation failures, API errors, or requests like "fix Lambda errors", "API routing issue", or "authorizer problem".
---

# CORA Toolkit Backend Expert

✅ **CORA Toolkit Backend Expert activated** - I'll help fix Lambda, API Gateway, and authorization issues.

I provide specialized knowledge for fixing CORA backend issues including Lambda 
functions, API Gateway, authorization, and role naming.

## Lambda Standards (7 Rules)

1. **source_code_hash**: Always use `filebase64sha256(var.lambda_zip)`
2. **Runtime**: Must be `python3.11` (matches org-common layer)
3. **Layers**: Must include `var.org_common_layer_arn`
4. **Lifecycle**: Use `create_before_destroy = true`
5. **Never** use `ignore_changes` on `source_code_hash`
6. **Route Docstrings**: Document routes in module docstring
7. **Authorization**: Use appropriate authorizer per endpoint

For complete reference: [Lambda Deployment Standard](../../../docs/standards/standard_LAMBDA-DEPLOYMENT.md)

## Two-Repo Pattern Enforcement

**CRITICAL**: Before syncing any fix, determine the correct repository:

| Code Location | Target Repo | Example |
|---------------|-------------|---------|
| `packages/module-*/backend/` | `{project}-stack` | Functional Lambda code |
| `lambdas/authorizer/` | `{project}-infra` | Core infrastructure |
| `templates/_modules-core/` | Template only | Copy to appropriate repo |

**NEVER** sync functional module code to the infra repo.

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., schema changes, frontend updates):
1. Complete the backend portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-data.md`, `/fix-frontend.md`, etc.

I do NOT attempt fixes outside the backend domain.

## Remediation Workflow

1. **Identify the template**: Find the source in `templates/`
2. **Fix the template FIRST**: Never fix only the test project
3. **Sync**: Use `/fix-and-sync.md <filename>` or `sync-fix-to-project.sh`
4. **Deploy**: For Lambda changes, run `deploy-lambda.sh`
5. **Verify**: Re-run validation
```

#### 2.2 Data Expert (`cora-toolkit-validation-data`)

**Triggers**: "fix schema", "database naming", "table name", "RLS policy", "ADR-011"

```yaml
---
name: cora-toolkit-validation-data
version: "1.0"
description: Fix CORA database schema errors, table naming violations (ADR-011 standards), 
  Supabase/PostgreSQL patterns, and RLS policies. Activate when seeing schema validation 
  failures, naming convention errors, or requests like "fix database naming", 
  "schema error", "table naming issue", or "RLS policy problem".
---
```

**Directory Structure** (Simplified - no duplicate docs):

```
cora-toolkit-validation-data/
└── SKILL.md                      # Main instructions (references existing docs)
```

**SKILL.md Content**:

```markdown
---
name: cora-toolkit-validation-data
version: "1.0"
description: Fix CORA database schema errors, table naming violations (ADR-011 standards), Supabase/PostgreSQL patterns, and RLS policies. Activate when seeing schema validation failures, naming convention errors, or requests like "fix database naming", "schema error", "table naming issue", or "RLS policy problem".
---

# CORA Toolkit Data Expert

✅ **CORA Toolkit Data Expert activated** - I'll help fix database schemas, naming conventions, and RLS policies.

I provide specialized knowledge for fixing CORA database issues including schema 
design, naming conventions, and RLS policies.

## Table Naming Standards (ADR-011)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `_cfg_` | Configuration tables | `_cfg_org_settings` |
| `_log_` | Audit/logging tables | `_log_user_actions` |
| `_sys_` | System tables | `_sys_migrations` |
| (none) | Business entities | `organizations`, `users` |

For complete reference: [ADR-011 Table Naming Standards](../../../docs/arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)

## Column Naming

- Use `snake_case` for all columns
- Foreign keys: `{table}_id` (e.g., `org_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`
- Soft delete: `deleted_at`

## RLS Patterns

- Always enable RLS on user-facing tables
- Use `auth.uid()` for user identification
- Test policies with different user contexts

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., Lambda code, frontend updates):
1. Complete the database portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-backend.md`, `/fix-frontend.md`, etc.

I do NOT attempt fixes outside the data domain.

## Migration Workflow

1. Create migration file in `scripts/migrations/`
2. Make idempotent (use `IF NOT EXISTS`)
3. Test in development first
4. Document in migration README
```

#### 2.3 Frontend Expert (`cora-toolkit-validation-frontend`)

**Triggers**: "fix accessibility", "UI compliance", "a11y error", "frontend validation", "Section 508", "WCAG"

```yaml
---
name: cora-toolkit-validation-frontend
version: "1.0"
description: Fix CORA frontend accessibility errors (Section 508, WCAG compliance), 
  UI component patterns, and Next.js issues. Activate when seeing a11y validation 
  failures, missing alt text, contrast issues, or requests like "fix accessibility errors", 
  "a11y issue", "UI compliance", or "Section 508 problem".
---
```

**Directory Structure** (Simplified - no duplicate docs):

```
cora-toolkit-validation-frontend/
└── SKILL.md                      # Main instructions (references existing docs)
```

**SKILL.md Content**:

```markdown
---
name: cora-toolkit-validation-frontend
version: "1.0"
description: Fix CORA frontend accessibility errors (Section 508, WCAG compliance), UI component patterns, and Next.js issues. Activate when seeing a11y validation failures, missing alt text, contrast issues, or requests like "fix accessibility errors", "a11y issue", "UI compliance", or "Section 508 problem".
---

# CORA Toolkit Frontend Expert

✅ **CORA Toolkit Frontend Expert activated** - I'll help fix accessibility, UI compliance, and component issues.

I provide specialized knowledge for fixing CORA frontend issues including 
accessibility compliance and UI standards.

## Section 508 Accessibility

### Required Elements
- All images need `alt` text
- Form inputs need associated labels
- Interactive elements need keyboard access
- Color contrast must meet WCAG AA (4.5:1)

### Common Fixes
- Add `aria-label` to icon buttons
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Ensure focus indicators are visible
- Add skip links for keyboard navigation

For complete reference: [CORA Frontend Standard](../../../docs/standards/standard_CORA-FRONTEND.md)

## CORA UI Standards

### AppShell Pattern
- Consistent sidebar navigation
- Organization selector in header
- Breadcrumb navigation

### Module Integration
- Use `ModuleLayout` wrapper
- Follow card-based admin patterns
- Respect theme context

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., API changes, database updates):
1. Complete the frontend portion of the fix
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-backend.md`, `/fix-data.md`, etc.

I do NOT attempt fixes outside the frontend domain.

## Next.js Patterns

- Use App Router conventions
- Server components by default
- Client components only when needed (`"use client"`)
```

#### 2.4 Structure Expert (`cora-toolkit-validation-structure`)

**Triggers**: "fix imports", "file structure", "module organization", "module boundaries"

```yaml
---
name: cora-toolkit-validation-structure
version: "1.0"
description: Fix CORA project structure errors, import violations, and module organization 
  issues. Activate when seeing structure validation failures, cross-module imports, 
  or requests like "fix import violations", "file structure error", or "module boundaries".
---
```

**Directory Structure** (Simplified - no duplicate docs):

```
cora-toolkit-validation-structure/
└── SKILL.md                      # Main instructions (references existing docs)
```

**SKILL.md Content**:

```markdown
---
name: cora-toolkit-validation-structure
version: "1.0"
description: Fix CORA project structure errors, import violations, and module organization issues. Activate when seeing structure validation failures, cross-module imports, or requests like "fix import violations", "file structure error", or "module boundaries".
---

# CORA Toolkit Structure Expert

✅ **CORA Toolkit Structure Expert activated** - I'll help fix project structure, imports, and module organization.

I provide specialized knowledge for fixing CORA project structure and 
organization issues.

## Two-Repo Pattern

Every CORA project uses two repositories:

| Repo | Contains | Example |
|------|----------|---------|
| `{project}-infra` | Terraform, deploy scripts, authorizer | `pm-app-infra` |
| `{project}-stack` | Next.js app, CORA modules | `pm-app-stack` |

## Module Structure

```
packages/module-{name}/
├── backend/
│   └── {lambda-name}/
│       └── lambda_function.py
├── frontend/
│   ├── components/
│   └── routes/
├── db/
│   └── schema.sql
└── README.md
```

## Import Restrictions

- Modules should not import from other modules directly
- Use shared packages for common code
- Core modules can be imported by functional modules
- Never import functional module code into core modules

## Cross-Domain Boundary

If a fix requires changes outside my domain (e.g., code logic, database schema):
1. Complete the structural portion of the fix (file moves, import updates)
2. Document what additional changes are needed
3. Tell the user: "To complete this fix, say 'Fix the [domain] portion'" OR use `/fix-backend.md`, `/fix-data.md`, etc.

I do NOT attempt fixes outside the structure domain.

## Route Locations

**CRITICAL**: Routes live at module root, not in `frontend/`:
- ✅ `templates/_modules-functional/{module}/routes/`
- ❌ `templates/_modules-functional/{module}/frontend/routes/`
```

---

### Phase 3: Integration Testing

#### 3.1 Workflow Testing

| Test | Command | Expected Result |
|------|---------|-----------------|
| Full validation | `/validate.md` | Runs suite, shows categorized results with dual-path options |
| Backend only | `/validate-backend.md` | Runs backend validators only |
| Frontend only | `/validate-frontend.md` | Runs frontend validators only |
| Fix and sync | `/fix-and-sync.md InviteMemberDialog.tsx` | Syncs template to project |
| Validation error handling | `/validate.md` (with broken path) | Shows helpful error message |
| Backend fallback | `/fix-backend.md` | Loads backend expertise directly |
| Data fallback | `/fix-data.md` | Loads data expertise directly |
| Frontend fallback | `/fix-frontend.md` | Loads frontend expertise directly |
| Structure fallback | `/fix-structure.md` | Loads structure expertise directly |
| Help/discovery | `/help-validation.md` | Shows complete command reference |

#### 3.2 Skill Activation Testing

**Critical**: Each skill must output a confirmation message. This is the primary verification mechanism.

| User Input | Expected Skill | Verification | Fallback |
|------------|---------------|--------------|----------|
| "Fix the Lambda timeout error" | `cora-toolkit-validation-backend` | See "✅ **CORA Toolkit Backend Expert activated**" | `/fix-backend.md` |
| "Fix the table naming issue" | `cora-toolkit-validation-data` | See "✅ **CORA Toolkit Data Expert activated**" | `/fix-data.md` |
| "Fix the accessibility error" | `cora-toolkit-validation-frontend` | See "✅ **CORA Toolkit Frontend Expert activated**" | `/fix-frontend.md` |
| "Fix the import violation" | `cora-toolkit-validation-structure` | See "✅ **CORA Toolkit Structure Expert activated**" | `/fix-structure.md` |
| "Fix it" (vague) | None (fallback) | See domain clarification prompt with workflow options | User chooses `/fix-*.md` |
| "Fix all errors" (vague) | None (fallback) | See domain clarification prompt with workflow options | User chooses `/fix-*.md` |

#### 3.3 Activation Failure Scenarios

If a skill does not activate when expected:
1. Check skill description matches user intent
2. Verify skill is enabled in Cline settings
3. Check for global skill with same name taking precedence (see Troubleshooting)
4. Review Cline logs for skill matching details
5. Use the fallback workflow as a guaranteed alternative

---

### Phase 4: Fallback Rule and Error Handling

Add a fallback rule to `.clinerules` for handling vague user intents:

```markdown
## Validation Fix Fallback

When fixing CORA validation errors and the domain is unclear (e.g., user says "fix it" or "fix all errors"):

1. **Do not guess the domain** - Ask the user to specify
2. **Present BOTH options clearly**:
   
   **Natural Language (Skill Activation)**:
   - Backend: "Fix the Lambda errors", "API routing issue"
   - Data: "Fix the database naming", "schema error"
   - Frontend: "Fix the accessibility errors", "a11y issue"
   - Structure: "Fix the import violations", "file structure error"
   
   **Direct Workflow (Guaranteed)**:
   - Backend: `/fix-backend.md`
   - Data: `/fix-data.md`
   - Frontend: `/fix-frontend.md`
   - Structure: `/fix-structure.md`
   
   **Need help?** Run `/help-validation.md`

3. **Reference validation output** - Suggest starting with the domain that has the most errors
4. **Never attempt multi-domain fixes** without explicit user direction for each domain
```

### Phase 4.5: Skill Validation Script

Create `scripts/validate-skills.py` to verify skill structure before deployment:

```python
#!/usr/bin/env python3
"""
Validate CORA skill structure and configuration.

Checks:
- SKILL.md exists in each skill directory
- YAML frontmatter has required fields (name, description, version)
- Description under 1024 characters
- name matches directory name
- Activation confirmation message exists
- Referenced docs exist (via relative paths)
"""

import os
import sys
import yaml
import re
from pathlib import Path

SKILLS_DIR = Path(".clinerules/skills")
MAX_DESCRIPTION_LENGTH = 1024

def validate_skill(skill_dir: Path) -> list[str]:
    """Validate a single skill directory. Returns list of errors."""
    errors = []
    skill_file = skill_dir / "SKILL.md"
    
    if not skill_file.exists():
        errors.append(f"{skill_dir.name}: Missing SKILL.md")
        return errors
    
    content = skill_file.read_text()
    
    # Extract YAML frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        errors.append(f"{skill_dir.name}: Missing YAML frontmatter")
        return errors
    
    try:
        frontmatter = yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        errors.append(f"{skill_dir.name}: Invalid YAML: {e}")
        return errors
    
    # Check required fields
    if "name" not in frontmatter:
        errors.append(f"{skill_dir.name}: Missing 'name' field")
    elif frontmatter["name"] != skill_dir.name:
        errors.append(f"{skill_dir.name}: name '{frontmatter['name']}' doesn't match directory")
    
    if "version" not in frontmatter:
        errors.append(f"{skill_dir.name}: Missing 'version' field")
    
    if "description" not in frontmatter:
        errors.append(f"{skill_dir.name}: Missing 'description' field")
    elif len(frontmatter["description"]) > MAX_DESCRIPTION_LENGTH:
        errors.append(f"{skill_dir.name}: Description exceeds {MAX_DESCRIPTION_LENGTH} chars ({len(frontmatter['description'])} chars)")
    
    # Check for activation confirmation message
    if "✅ **CORA Toolkit" not in content:
        errors.append(f"{skill_dir.name}: Missing activation confirmation message (should contain '✅ **CORA Toolkit')")
    
    return errors

def main():
    if not SKILLS_DIR.exists():
        print(f"Skills directory not found: {SKILLS_DIR}")
        print("This is expected if skills haven't been created yet.")
        sys.exit(0)
    
    all_errors = []
    skill_count = 0
    
    for skill_dir in SKILLS_DIR.iterdir():
        if skill_dir.is_dir():
            skill_count += 1
            errors = validate_skill(skill_dir)
            all_errors.extend(errors)
    
    if skill_count == 0:
        print("No skills found in .clinerules/skills/")
        sys.exit(0)
    
    if all_errors:
        print("Skill validation errors:")
        for error in all_errors:
            print(f"  ❌ {error}")
        sys.exit(1)
    else:
        print(f"✅ All {skill_count} skills validated successfully")
        sys.exit(0)

if __name__ == "__main__":
    main()
```

### Phase 5: Task Integration Documentation

Add guidance for using Cline Tasks with validation workflows:

```markdown
## Task Usage for Validation Fixes

### When to Create a Dedicated Task

| Scenario | Error Threshold | Action |
|----------|-----------------|--------|
| Single-domain, few errors | 1-3 errors in 1 domain | Continue in current conversation |
| Single-domain, many errors | 4+ errors in 1 domain | Consider starting a Task |
| Multi-domain fix session | 2+ errors across 2+ domains | **Create dedicated Task** |
| Interrupted fix session | Any | Resume existing Task |

### How Workflows Suggest Task Creation

After `/validate.md` identifies multi-domain errors, it outputs:

> You have **{X} errors across {N} domains**. This fix session may take multiple conversation turns.
>
> **Recommended**: Start a new Task for checkpoint support:
> "Start a task to fix the validation errors"

### Task Benefits for Validation
- **Checkpoints**: Each template fix creates a restore point
- **Resumability**: Can continue interrupted fix sessions
- **Export**: Document successful fix patterns as markdown
- **Cost Tracking**: Monitor token usage for optimization
```

---

## Success Criteria

- [x] **Directory Structure**: `.cline/workflows/` and `.cline/skills/` created
- [x] **Workflow Execution**: `/validate.md` successfully runs `cora-validate.py`
- [x] **Workflow Error Handling**: Graceful handling when validation script fails
- [x] **Result Categorization**: Errors are grouped by domain correctly
- [x] **Dual-Path Guidance**: Workflows output BOTH skill triggers AND fallback workflow commands
- [x] **Skill Activation**: Correct expert skill activates for domain-specific requests
- [x] **Activation Confirmation**: Each skill outputs activation confirmation message
- [x] **Fallback Workflows**: `/fix-backend.md`, `/fix-data.md`, `/fix-frontend.md`, `/fix-structure.md` load expertise directly
- [x] **Help Workflow**: `/help-validation.md` shows complete command reference
- [x] **Cross-Domain Handoff**: Skills correctly defer to other domains when needed
- [x] **Repo Safety**: `cora-toolkit-validation-backend` correctly identifies Stack vs Infra targets
- [x] **Fast Iteration**: `/fix-and-sync.md` completes template→sync→deploy cycle
- [x] **Fallback Handling**: Vague intents prompt for domain clarification with workflow options
- [x] **No Doc Duplication**: Skills reference existing docs via relative paths
- [x] **Skill Versioning**: All skills include version field
- [ ] **Skill Validation**: `scripts/validate-skills.py` passes for all skills (script not yet created)
- [x] **Task Integration**: Multi-domain fixes suggest Task creation with specific thresholds

---

## Troubleshooting

### Skill Doesn't Activate When Expected

**Symptoms**: User says "Fix the Lambda errors" but doesn't see activation confirmation.

**Diagnosis**:
1. Check if user has a global skill with the same name:
   - macOS/Linux: `ls ~/.cline/skills/`
   - Windows: `dir C:\Users\USERNAME\.cline\skills\`
2. Look for `cora-toolkit-validation-*` directories in global skills
3. If found, the global skill is taking precedence

**Resolution**:
1. Rename or remove the conflicting global skill
2. Or use the fallback workflow: `/fix-backend.md`

### Wrong Skill Activates

**Symptoms**: User asks for backend help but sees "Frontend Expert activated".

**Diagnosis**:
1. Check if the phrasing triggered a different skill
2. Verify skill descriptions don't have overlapping triggers

**Resolution**:
1. Use more specific trigger phrases
2. Or use the explicit fallback workflow

### Workflow Command Not Found

**Symptoms**: `/validate.md` doesn't execute.

**Diagnosis**:
1. Check that `.clinerules/workflows/` exists
2. Verify `validate.md` is in that directory
3. Ensure workflows are enabled in Cline settings

**Resolution**:
1. Create the workflows directory and files
2. Enable workflows in Cline Settings → Features

---

## Revision History

| Date | Change |
|------|--------|
| 2026-01-16 | Initial version (Skill-only approach with routing) |
| 2026-01-16 | **Revised** to Workflow + Skill hybrid after discovering routing was incompatible with Cline architecture |
| 2026-01-16 | **Enhanced** with skill activation guidance, cross-domain patterns, bundled docs structure, and fallback handling |
| 2026-01-16 | **Enhanced** with activation confirmation messages, improved skill descriptions, testing protocol for activation failures, Task integration guidance, and workflow error handling |
| 2026-01-16 | **Enhanced** with deterministic fallback workflows (`/fix-*.md`), distinctive skill naming (`cora-validation-*`), documentation reference strategy (no duplication), and skill validation script |
| 2026-01-16 | **Enhanced** with `/help-validation.md` for discoverability, more distinctive `cora-toolkit-validation-*` naming, Task integration thresholds, troubleshooting section, skill versioning, and improved error handling |

---

## Implementation Status

All core phases have been completed:

1. ✅ Created `.cline/workflows/` directory
2. ✅ Created `.cline/skills/` directory with subdirectories for each skill
3. ✅ Authored workflow files with dual-path guidance and error handling (Phase 1)
4. ✅ Authored `/help-validation.md` for discoverability (Phase 1.5)
5. ✅ Authored fallback fix workflows (`fix-backend.md`, `fix-data.md`, etc.) (Phase 1.5)
6. ✅ Authored skill SKILL.md files with:
   - Version field in frontmatter
   - Activation confirmation messages
   - Enhanced descriptions with specific triggers
   - Cross-domain boundaries with fallback workflow references
   - References to existing docs (no duplication) (Phase 2)
7. ✅ Added fallback rule to `.clinerules` with dual-path options (Phase 4)
8. ⏳ Create `scripts/validate-skills.py` (Phase 4.5) - NOT YET DONE
9. ✅ Task integration documentation (Phase 5)
10. ✅ Tested integration - All 13 validators passing with `--template-mode`

### Additional Fixes Implemented (plan_toolkit-validation-fixes.md)

- ✅ Import Validator: Fixed org_common path discovery for templates
- ✅ Schema Validator: Added static schema parsing (`--static` flag)
- ✅ Orchestrator: Added `--template-mode` flag
- ✅ DB Naming Validator: Fixed module import and filtered utility scripts

### Files Created

**Workflows** (`.cline/workflows/`):
- `validate.md` - Main entry point
- `validate-backend.md` - Backend validators only
- `validate-frontend.md` - Frontend validators only
- `fix-backend.md` - Backend remediation
- `fix-data.md` - Data remediation
- `fix-frontend.md` - Frontend remediation
- `fix-structure.md` - Structure remediation
- `fix-and-sync.md` - Template-first fix workflow
- `help-validation.md` - Command reference

**Skills** (`.cline/skills/`):
- `cora-toolkit-validation-backend/SKILL.md`
- `cora-toolkit-validation-data/SKILL.md`
- `cora-toolkit-validation-frontend/SKILL.md`
- `cora-toolkit-validation-structure/SKILL.md`

**Validation Enhancements**:
- `validation/schema-validator/static_schema_parser.py` - NEW
- `validation/schema-validator/cli.py` - Added `--static` flag
- `validation/import_validator/signature_loader.py` - Fixed toolkit path
- `validation/db-naming-validator/cli.py` - Fixed import + filtering
- `validation/cora-validate.py` - Added `--template-mode` flag

## Remaining Work

1. Create `scripts/validate-skills.py` validation script (Phase 4.5)
2. Document in toolkit README
