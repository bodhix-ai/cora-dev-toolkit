# CORA Standard: Branching and Merging Strategy

**Version:** 1.0  
**Status:** Active  
**Last Updated:** January 17, 2026  
**Related Guides:** [BRANCHING-WORKFLOW](../guides/guide_BRANCHING-WORKFLOW.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Branch Naming Convention](#branch-naming-convention)
4. [Lifecycle Strategies](#lifecycle-strategies)
5. [Pull Request Standards](#pull-request-standards)
6. [Anti-Patterns](#anti-patterns)

---

## Overview

This standard defines the **Feature Branch Workflow** used for all CORA development. It ensures code stability, clear history, and safe collaboration across new module development and existing module enhancements.

### Why This Standard Exists

Consistent branching ensures that:
1.  **Main is always stable**: The `main` branch must always be deployable.
2.  **Work is isolated**: New features or fixes don't break the stable baseline until verified.
3.  **History is clean**: Feature branches are deleted after merge, keeping the repository tidy.
4.  **Reviews are focused**: Pull Requests (PRs) encompass a specific, reviewable unit of work.

---

## Core Principles

1.  **Main is Source of Truth**: All work starts from `main` and ends in `main`.
2.  **One Branch = One Goal**: Each branch should address a single feature, fix, or milestone.
3.  **Short-Lived Branches**: Branches should be merged and deleted as soon as the work is complete and validated.
4.  **PR-Only Merges**: Never push directly to `main`. All changes must pass through a Pull Request.
5.  **Sync Often**: Long-lived feature branches must regularly pull changes from `main` to avoid "merge hell."

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

---

## Lifecycle Strategies

### 1. New Module Development (Long-Running Feature)

Developing a new CORA module (e.g., `module-voice`) is a large effort. While the branch may be long-lived, it should be merged at logical **Milestones**.

**Strategy:**
*   **Branch Name**: `feature/module-{name}-dev`
*   **Workflow**:
    1.  Create branch from `main`.
    2.  **Milestone 1: Scaffolding & Provisioning**: Create template, DB schema, basic infra. Ensure it provisions correctly. **Merge to main.**
    3.  **Milestone 2: Core Backend**: Implement Lambdas and business logic. Sync from `main`. **Merge to main.**
    4.  **Milestone 3: Frontend & UI**: Implement UI components. Sync from `main`. **Merge to main.**
    5.  **Milestone 4: Validation & Polish**: Fix validation errors (Sprint 1, Sprint 2). **Merge to main.**

**Why Merge in Stages?**
*   Prevents massive, unreviewable PRs.
*   Allows other team members to use/test the stable parts of the module.
*   Reduces merge conflict risk.

### 2. Existing Module Enhancements (Short-Lived Feature)

Adding a feature to an existing, stable module.

**Strategy:**
*   **Branch Name**: `feature/module-{name}-{feature-name}`
*   **Workflow**:
    1.  Create branch from `main`.
    2.  Implement the specific feature (e.g., "Add export to CSV").
    3.  Validate locally.
    4.  PR and Merge.
    5.  **Delete Branch**.

### 3. Validation Fixes / Bug Fixes (Sprint-Based)

Fixing validation errors or bugs, often grouped by Sprint or Category.

**Strategy:**
*   **Branch Name**: `fix/module-{name}-validation-sprint-{n}` or `fix/module-{name}-{category}`
*   **Workflow**:
    1.  Create branch from `main`.
    2.  Fix a set of errors (e.g., "All CORA Compliance errors").
    3.  Sync fix to test project (`sync-fix-to-project.sh`).
    4.  Run validation to confirm.
    5.  PR and Merge.
    6.  **Delete Branch**.
    7.  Start new branch for next Sprint/Category.

---

## Pull Request Standards

Every PR must have:
1.  **Clear Title**: Follows conventional commits (e.g., `feat(voice): Add recording controls`).
2.  **Summary**: What changed and why.
3.  **Validation Results**: Proof that it works (e.g., "Validation: 0 errors", "Tested in: test-voice").
4.  **Related Issues/Docs**: Links to plans or ADRs.

---

## Anti-Patterns

### ❌ Long-Lived "Mega-Branches"
**Don't**: Keep a branch open for 3 months until the entire module is "perfect".
**Do**: Merge when stable milestones are reached (e.g., "Schema Verified", "Basic API Working").

### ❌ "Syncing" by Merging Main into Feature
**Don't**: Merge `main` into your feature branch blindly if you plan to squash-merge later.
**Do**: Use `git pull origin main` (rebase preference if team allows) to keep up to date.

### ❌ Fixing unrelated things
**Don't**: Fix a CSS bug in `module-chat` while working in `feature/module-voice`.
**Do**: Create a separate `fix/` branch for the unrelated issue.

---

**Document Status:** ✅ Active  
**Review Cycle:** As needed
