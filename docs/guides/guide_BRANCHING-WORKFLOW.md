# CORA Guide: Branching and Workflow Execution

**Standard:** [BRANCHING-STRATEGY](../standards/standard_BRANCHING-STRATEGY.md)  
**Related:** [SPRINT-MANAGEMENT](guide_SPRINT-MANAGEMENT.md)  
**Tools:** Git, GitHub CLI (`gh`)

---

## Overview

This guide provides step-by-step instructions for executing the CORA Branching Strategy. Whether you are building a new module, adding a feature, fixing a bug, or working on a cross-module initiative, follow these workflows to ensure safe and efficient development.

---

## Quick Start: Which Workflow?

| Situation | Workflow | Context File |
|-----------|----------|--------------|
| New module development | [Workflow 2: New Module](#workflow-2-new-module-development) | `context-module-{name}.md` |
| Cross-module initiative | [Workflow 5: Initiative](#workflow-5-cross-module-initiative) | `context-{initiative}.md` |
| Single feature on existing module | [Workflow 3: Feature](#workflow-3-single-feature-short-lived) | Existing module context |
| Validation/bug fixes | [Workflow 1: Fix](#workflow-1-fixing-validation-errors) | Existing module context |
| Emergency production fix | [Workflow 4: Hotfix](#workflow-4-emergency-hotfix) | N/A |

---

## Workflow 1: Fixing Validation Errors (Sprint-Based)

The most common workflow for ongoing maintenance and validation repairs.

### 1. Check Initiative Context

Identify the context file for your work:

```bash
# Check existing context files
ls memory-bank/context-*.md

# Use existing module context or create one
# e.g., memory-bank/context-module-voice.md
```

### 2. Start from Main

```bash
git checkout main
git pull origin main
```

### 3. Create Fix Branch

```bash
# Pattern: fix/module-{name}-{description}
git checkout -b fix/module-voice-sprint-1
```

### 4. Create or Update Plan

```bash
# Create plan file
touch docs/plans/plan_module-voice-validation-s1.md
```

Plan content:
```markdown
# Plan: Module-Voice Validation Sprint 1

**Status:** 🟡 IN PROGRESS
**Branch:** `fix/module-voice-sprint-1`
**Context:** `memory-bank/context-module-voice.md`

## Scope
- Fix CORA compliance errors
- Resolve TypeScript type issues

## Implementation Steps
- [ ] Fix error category A
- [ ] Fix error category B
- [ ] Run validation
```

### 5. Update Context File

Add the sprint to your initiative's context file:

```markdown
## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `fix/module-voice-sprint-1` | `plan_module-voice-validation-s1.md` | 🟡 Active | - |
```

### 6. The Fix Loop

Iterate on the fix:

1. **Modify Template Code**: Edit files in `templates/`
2. **Sync to Test Project**:
   ```bash
   ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-voice/ai-sec-stack <file>
   ```
3. **Verify**: Run validation or manual tests
4. **Repeat** until fixed

### 7. Commit and Push

```bash
git add .
git commit -m "fix(module-voice): Resolve CORA compliance errors (Sprint 1)"
git push -u origin fix/module-voice-sprint-1
```

### 8. Close Sprint

Follow the [Sprint Closure Process](guide_SPRINT-MANAGEMENT.md#sprint-closure-process).

---

## Workflow 2: New Module Development

For long-running development of a new module spanning multiple sprints.

### 1. Create Initiative Context File

Create `memory-bank/context-module-{name}.md`:

```markdown
# Context: Module-Voice Development

**Created:** January 24, 2026
**Primary Focus:** Voice interview functionality

## Initiative Overview

Implement voice recording, transcription, and interview features for CORA workspaces.

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `feature/module-voice-scaffold` | `plan_module-voice-scaffold.md` | 🟡 Active | - |

## Current Sprint

- **Branch:** `feature/module-voice-scaffold`
- **Plan:** `docs/plans/plan_module-voice-scaffold.md`
- **Focus:** Initial scaffolding and database schema
```

### 2. Update activeContext.md

Add to the Active Initiatives table (only once, when creating initiative):

```markdown
## Active Initiatives

| Initiative | Context File | Primary Focus |
|------------|--------------|---------------|
| Module-Voice Development | `context-module-voice.md` | Voice interview functionality |
```

### 3. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/module-voice-scaffold
```

### 4. Development Milestones

Develop in phases, each with its own branch and plan:

**Sprint 1: Scaffolding**
```bash
# Branch: feature/module-voice-scaffold
# Plan: plan_module-voice-scaffold.md
git add .
git commit -m "feat(voice): Initial scaffold and DB schema"
# Close sprint, merge to main
```

**Sprint 2: Backend**
```bash
# Branch: feature/module-voice-backend
# Plan: plan_module-voice-backend.md
git checkout main && git pull
git checkout -b feature/module-voice-backend
git add .
git commit -m "feat(voice): Lambda functions and API"
# Close sprint, merge to main
```

**Sprint 3: Frontend**
```bash
# Branch: feature/module-voice-frontend
# Continue pattern...
```

### 5. Track All Sprints in Context

Keep the context file updated with each sprint:

```markdown
## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `feature/module-voice-scaffold` | `plan_module-voice-scaffold.md` | ✅ Complete | 2026-01-24 |
| S2 | `feature/module-voice-backend` | `plan_module-voice-backend.md` | ✅ Complete | 2026-01-26 |
| S3 | `feature/module-voice-frontend` | `plan_module-voice-frontend.md` | 🟡 Active | - |
```

---

## Workflow 3: Single Feature (Short-Lived)

For adding a feature to an existing, stable module.

### 1. Use Existing Context File

Check the module's existing context file:
```bash
cat memory-bank/context-module-eval.md
```

### 2. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/module-eval-citations
```

### 3. Create Plan and Update Context

```bash
# Create plan
touch docs/plans/plan_eval-citations.md

# Update context file - add to Sprint History
```

### 4. Implement and Merge

```bash
# Implement
git add .
git commit -m "feat(eval): Add citations modal"

# PR and Merge
gh pr create --base main --title "feat(eval): Citations modal"
```

### 5. Cleanup

```bash
git checkout main
git pull origin main
git branch -d feature/module-eval-citations
```

Update context file with completion date.

---

## Workflow 4: Emergency Hotfix

For critical bugs in `main` that block others.

```bash
# 1. Branch
git checkout main
git pull
git checkout -b hotfix/fix-broken-build

# 2. Fix & Push
# ... make fix ...
git commit -am "fix: Resolve build error"
git push origin hotfix/fix-broken-build

# 3. Fast PR
gh pr create --base main --title "fix: Critical build repair" --label "hotfix"
```

**Note:** Hotfixes don't require full context/plan process - speed is priority.

---

## Workflow 5: Cross-Module Initiative

For work spanning multiple modules (e.g., WS Plugin Architecture).

### 1. Create Initiative Context File

Create `memory-bank/context-{initiative-name}.md`:

```markdown
# Context: WS Plugin Architecture

**Created:** January 24, 2026
**Primary Focus:** Module integration patterns for workspaces

## Initiative Overview

Define and implement the architecture for functional modules (kb, chat, voice, eval) 
to integrate with workspace (ws) as plugins. Includes type definitions, config 
inheritance, and module registration.

## Modules Affected

- module-ws (host)
- module-kb (plugin)
- module-chat (plugin)
- module-voice (plugin)
- module-eval (plugin)

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `feature/ws-plugin-types` | `plan_ws-plugin-types.md` | 🟡 Active | - |

## Current Sprint

- **Branch:** `feature/ws-plugin-types`
- **Plan:** `docs/plans/plan_ws-plugin-types.md`
- **Focus:** Fix TypeScript type errors, define plugin interfaces

## Key Decisions

- ADR-XXX: WS Plugin Architecture (pending)
```

### 2. Update activeContext.md

```markdown
## Active Initiatives

| Initiative | Context File | Primary Focus |
|------------|--------------|---------------|
| WS Plugin Architecture | `context-ws-plugin-architecture.md` | Module integration patterns |
```

### 3. Plan Sprints by Concern

Cross-module initiatives should plan sprints by **concern**, not by module:

```
Initiative: WS Plugin Architecture
├── Sprint 1: Type Definitions (fixes current errors)
├── Sprint 2: Config Inheritance Pattern
├── Sprint 3: Module Registration System
└── Sprint 4: Migration of Existing Modules
```

### 4. Execute Each Sprint

Each sprint follows the standard Sprint Triad (Branch + Plan + Context):

```bash
# Sprint 1
git checkout -b feature/ws-plugin-types
# Create plan_ws-plugin-types.md
# Do work, close sprint

# Sprint 2
git checkout main && git pull
git checkout -b feature/ws-plugin-config
# Create plan_ws-plugin-config.md
# Do work, close sprint
```

### 5. Use Initiative Tags

When archiving cross-module work:

```bash
git tag archive/feature/ws-plugin-types feature/ws-plugin-types
git tag initiative/ws-plugin/types-sprint feature/ws-plugin-types
git push origin --tags
```

---

## Cheatsheet

| Action | Command |
| :--- | :--- |
| **Start New** | `git checkout main && git pull && git checkout -b {branch}` |
| **Sync Fix** | `./scripts/sync-fix-to-project.sh {stack_path} {file}` |
| **Create PR** | `gh pr create --base main` |
| **View PRs** | `gh pr list` |
| **Update Branch** | `git pull --rebase origin main` |
| **Delete Branch** | `git branch -d {branch}` |
| **Create Tag** | `git tag archive/{branch} {branch}` |
| **Push Tags** | `git push origin --tags` |

---

## Tips for Success

### Branch Hygiene
- **Commit Messages**: Use Conventional Commits (`feat:`, `fix:`, `docs:`)
- **Small PRs**: A PR with 5 files is reviewed in 10 minutes. A PR with 50 files sits for 3 days.
- **Sync Often**: Run `git pull origin main` daily if you are on a long-lived branch.

### Context Management
- **One Initiative = One Context File**: Don't mix initiatives in a single context file
- **Update Context Per Sprint**: Always update after starting/closing a sprint
- **Don't Touch activeContext.md**: Only update when adding/removing entire initiatives

### Sprint Discipline
- **Always Create Plan First**: Before coding, have a plan file
- **Track Progress**: Keep plan checklists updated
- **Close Properly**: Follow the closure process for every sprint

---

**Document Status:** ✅ Active  
**Last Updated:** January 24, 2026