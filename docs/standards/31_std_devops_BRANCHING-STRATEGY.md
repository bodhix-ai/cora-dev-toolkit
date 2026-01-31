# CORA Standard: Branching and Merging Strategy

**Version:** 2.0  
**Status:** Active  
**Last Updated:** January 24, 2026  
**Related Guides:** [BRANCHING-WORKFLOW](../guides/guide_BRANCHING-WORKFLOW.md), [SPRINT-MANAGEMENT](../guides/guide_SPRINT-MANAGEMENT.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Documentation Hierarchy](#documentation-hierarchy)
4. [Branch Naming Convention](#branch-naming-convention)
5. [Lifecycle Strategies](#lifecycle-strategies)
6. [Branch Archiving](#branch-archiving)
7. [Pull Request Standards](#pull-request-standards)
8. [Anti-Patterns](#anti-patterns)

---

## Overview

This standard defines the **Feature Branch Workflow** used for all CORA development. It ensures code stability, clear history, and safe collaboration across new module development and existing module enhancements.

### Why This Standard Exists

Consistent branching ensures that:
1.  **Main is always stable**: The `main` branch must always be deployable.
2.  **Work is isolated**: New features or fixes don't break the stable baseline until verified.
3.  **History is clean**: Feature branches are deleted after merge, keeping the repository tidy.
4.  **Reviews are focused**: Pull Requests (PRs) encompass a specific, reviewable unit of work.
5.  **Parallel work is enabled**: Multiple teams can work simultaneously without merge conflicts.

---

## Core Principles

1.  **Main is Source of Truth**: All work starts from `main` and ends in `main`.
2.  **One Branch = One Goal**: Each branch should address a single feature, fix, or milestone.
3.  **One Initiative = Multiple Branches**: Larger initiatives span multiple sprints, each with its own branch.
4.  **Short-Lived Branches**: Branches should be merged and deleted as soon as the work is complete and validated.
5.  **PR-Only Merges**: Never push directly to `main`. All changes must pass through a Pull Request.
6.  **Sync Often**: Long-lived feature branches must regularly pull changes from `main` to avoid "merge hell."

---

## Documentation Hierarchy

CORA uses a **3-tier documentation hierarchy** to enable parallel work across multiple teams while maintaining clear tracking.

### The Three Tiers

| Tier | File | Update Frequency | Purpose |
|------|------|------------------|---------|
| **Index** | `memory-bank/activeContext.md` | Rarely (add/remove projects) | Master index of active initiatives |
| **Initiative/Project** | `memory-bank/context-{initiative}.md` | Per sprint | Tracks branches + plans for one initiative |
| **Sprint Detail** | `docs/plans/plan_{sprint}.md` | During sprint | Detailed checklists, implementation steps |

### The Sprint Triad

Every sprint MUST have these three items:

1. **Branch** - The Git branch where code changes happen
2. **Plan** - The detailed implementation checklist (`docs/plans/plan_*.md`)
3. **Context** - The initiative-level tracker (`memory-bank/context-*.md`)

### Initiative-Scoped Context Files

Context files are scoped to **initiatives**, not just modules. An initiative may span multiple modules.

| Scope | Context File Naming | Example |
|-------|---------------------|---------|
| Single Module | `context-module-{name}.md` | `context-module-voice.md` |
| Cross-Module | `context-{initiative-name}.md` | `context-ws-plugin-architecture.md` |
| Platform/Admin | `context-{scope}.md` | `context-admin-standardization.md` |

### Context File Structure

Each context file MUST contain:

```markdown
# Context: {Initiative Name}

## Initiative Overview
Brief description of the initiative's goal.

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `branch-name-s1` | `plan_name-s1.md` | ✅ Complete | 2026-01-20 |
| S2 | `branch-name-s2` | `plan_name-s2.md` | 🟡 Active | - |
| S3 | `branch-name-s3` | `plan_name-s3.md` | ⏳ Planned | - |

## Current Sprint
- **Branch:** `current-branch-name`
- **Plan:** `docs/plans/plan_current.md`
- **Focus:** Current sprint goal description

## Session Log
Brief notes on significant sessions (not detailed - that's in plans).

## Key Decisions
Links to relevant ADRs or architectural decisions.
```

### activeContext.md as Puppet-Master Index

The `memory-bank/activeContext.md` file serves as a **minimal index** that:

- Lists active context files (not branch details)
- Rarely needs updating (only when adding/removing initiatives)
- Minimizes merge conflicts across teams

**Structure:**

```markdown
# Active Context - CORA Development Toolkit

## Active Initiatives

| Initiative | Context File | Primary Focus |
|------------|--------------|---------------|
| WS Plugin Architecture | `context-ws-plugin-architecture.md` | Module integration patterns |
| Admin Standardization | `context-admin-standardization.md` | Admin page patterns |
| Module-Eval Development | `context-module-eval.md` | Eval features |

## Quick Links
- Implementation Plans: `docs/plans/`
- Standards: `docs/standards/`
```

### Why This Hierarchy?

1. **Parallel Work**: Multiple teams update their own context files without conflicts
2. **Clear Tracking**: Each initiative has a single source of truth for its sprints
3. **Minimal Conflicts**: Index file rarely changes, reducing merge conflicts
4. **Historical Record**: Context files maintain sprint history for reference

---

## Branch Naming Convention

Use the following prefixes to categorize work:

| Prefix | Use Case | Example |
| :--- | :--- | :--- |
| `feature/` | New capabilities, new modules, or substantial changes | `feature/module-voice-dev` |
| `fix/` | Bug fixes, validation repairs, error corrections | `fix/module-voice-validation`, `fix/login-error` |
| `docs/` | Documentation only changes | `docs/update-readme` |
| `chore/` | Maintenance, dependencies, tooling (no prod code change) | `chore/upgrade-deps` |
| `refactor/` | Code restructuring without behavior change | `refactor/api-client` |

### Naming Rules
*   Use lowercase.
*   Use hyphens as separators.
*   Be descriptive but concise.
*   Include the module name if applicable (e.g., `fix/module-voice-schema`).
*   For multi-sprint initiatives, include sprint number (e.g., `admin-page-s3`).

---

## Lifecycle Strategies

### 1. New Module Development (Long-Running Initiative)

Developing a new CORA module (e.g., `module-voice`) is a large effort spanning multiple sprints.

**Strategy:**
*   **Context File**: `memory-bank/context-module-{name}.md`
*   **Branch Pattern**: `feature/module-{name}-{milestone}`
*   **Workflow**:
    1.  Create context file for the initiative.
    2.  **Sprint 1: Scaffolding & Provisioning**: Branch `feature/module-{name}-scaffold`. **Merge to main.**
    3.  **Sprint 2: Core Backend**: Branch `feature/module-{name}-backend`. **Merge to main.**
    4.  **Sprint 3: Frontend & UI**: Branch `feature/module-{name}-frontend`. **Merge to main.**
    5.  **Sprint 4: Validation & Polish**: Branch `fix/module-{name}-validation`. **Merge to main.**

**Each sprint has:**
- Its own branch (merged when complete)
- Its own plan file (moved to `completed/` when done)
- Entry in the context file's Sprint History table

### 2. Cross-Module Initiatives

Work that spans multiple modules (e.g., WS Plugin Architecture).

**Strategy:**
*   **Context File**: `memory-bank/context-{initiative-name}.md`
*   **Branch Pattern**: `feature/{initiative}-{sprint-goal}`
*   **Workflow**:
    1.  Create initiative-scoped context file.
    2.  Plan sprints by concern, not by module.
    3.  Each sprint may touch multiple modules.
    4.  Track all sprints in the context file.

**Example Initiative: WS Plugin Architecture**
```
context-ws-plugin-architecture.md
├── Sprint 1: feature/ws-plugin-types → Type definitions
├── Sprint 2: feature/ws-plugin-config → Config inheritance
├── Sprint 3: feature/ws-module-registration → Module registration
```

### 3. Existing Module Enhancements (Short-Lived Feature)

Adding a feature to an existing, stable module.

**Strategy:**
*   **Branch Name**: `feature/module-{name}-{feature-name}`
*   **Context File**: Use existing module context file
*   **Workflow**:
    1.  Create branch from `main`.
    2.  Implement the specific feature.
    3.  Validate locally.
    4.  PR and Merge.
    5.  **Delete Branch**.
    6.  Update context file sprint history.

### 4. Validation Fixes / Bug Fixes (Sprint-Based)

Fixing validation errors or bugs, often grouped by Sprint or Category.

**Strategy:**
*   **Branch Name**: `fix/module-{name}-{category}` or `fix/{initiative}-s{n}`
*   **Workflow**:
    1.  Create branch from `main`.
    2.  Fix a set of errors (e.g., "All CORA Compliance errors").
    3.  Sync fix to test project (`sync-fix-to-project.sh`).
    4.  Run validation to confirm.
    5.  PR and Merge.
    6.  **Delete Branch**.
    7.  Update context file sprint history.

---

## Branch Archiving

When a branch is completed and merged, archive the branch using Git tags for future reference.

### Tag Naming Convention

**Archive Tag Format:** `archive/<branch-name>`

**Module-Focus Tag Format:** `module/<module-name>/<description>`

**Initiative Tag Format:** `initiative/<initiative-name>/<sprint>`

**Examples:**
```bash
# Archive tag (always create)
git tag archive/admin-page-s2 admin-page-s2
git push origin archive/admin-page-s2

# Module-focus tag (for module-specific work)
git tag module/eval/citations-sprint admin-page-s2
git push origin module/eval/citations-sprint

# Initiative tag (for cross-module work)
git tag initiative/ws-plugin/types-sprint feature/ws-plugin-types
git push origin initiative/ws-plugin/types-sprint
```

### Module-Focus Tags

| Tag Prefix | Scope | When to Use | Example |
|------------|-------|-------------|---------|
| `module/access/*` | module-access | Auth, roles, invites | `module/access/invite-flow` |
| `module/ai/*` | module-ai | AI provider management | `module/ai/bedrock-integration` |
| `module/mgmt/*` | module-mgmt | Platform monitoring | `module/mgmt/dashboard-metrics` |
| `module/kb/*` | module-kb | Knowledge base, RAG | `module/kb/embeddings-fix` |
| `module/chat/*` | module-chat | Chat & messaging | `module/chat/streaming-support` |
| `module/ws/*` | module-ws | Workspace management | `module/ws/member-permissions` |
| `module/eval/*` | module-eval | Evaluation & testing | `module/eval/optimization` |
| `module/voice/*` | module-voice | Voice interviews | `module/voice/recording-controls` |
| `module/shared/*` | Cross-module | Core changes affecting multiple modules | `module/shared/api-patterns` |
| `core/infra/*` | Infrastructure | Terraform, deployment, AWS | `core/infra/lambda-layers` |
| `core/auth/*` | Authentication | Okta, NextAuth, authorizer | `core/auth/jwt-validation` |
| `initiative/*` | Cross-module initiative | Multi-sprint, multi-module work | `initiative/ws-plugin/types` |

### When to Archive

*   **Sprint completion**: When closing a sprint and starting the next one
*   **Feature merge**: After a feature branch is merged to `main`
*   **Branch retirement**: When abandoning a branch that's no longer needed

### Archiving Workflow

See [Sprint Management Guide](../guides/guide_SPRINT-MANAGEMENT.md) for the complete sprint closure workflow.

---

## Pull Request Standards

Every PR must have:
1.  **Clear Title**: Follows conventional commits (e.g., `feat(voice): Add recording controls`).
2.  **Summary**: What changed and why.
3.  **Validation Results**: Proof that it works (e.g., "Validation: 0 errors", "Tested in: test-voice").
4.  **Related Issues/Docs**: Links to plans or ADRs.
5.  **Context Reference**: Link to the initiative context file.

---

## Anti-Patterns

### ❌ Long-Lived "Mega-Branches"
**Don't**: Keep a branch open for 3 months until the entire module is "perfect".
**Do**: Merge when stable milestones are reached (e.g., "Schema Verified", "Basic API Working").

### ❌ "Syncing" by Merging Main into Feature
**Don't**: Merge `main` into your feature branch blindly if you plan to squash-merge later.
**Do**: Use `git pull origin main` (rebase preference if team allows) to keep up to date.

### ❌ Fixing Unrelated Things
**Don't**: Fix a CSS bug in `module-chat` while working in `feature/module-voice`.
**Do**: Create a separate `fix/` branch for the unrelated issue.

### ❌ Mixed-Goal Branches
**Don't**: Combine admin standardization, type fixes, and feature work in one branch.
**Do**: Keep each branch focused on a single goal; use separate branches for different concerns.

### ❌ Updating activeContext.md Frequently
**Don't**: Update `activeContext.md` with every status change or session note.
**Do**: Update the initiative's context file; only update `activeContext.md` when adding/removing initiatives.

---

**Document Status:** ✅ Active  
**Review Cycle:** As needed