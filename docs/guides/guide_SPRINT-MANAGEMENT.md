# CORA Sprint Management Guide

**Purpose:** Define the standard process for closing completed sprints and starting new ones.  
**Audience:** Developers (Human) and AI Agents.  
**Goal:** Ensure consistent branch management, documentation hygiene, and clear history.  
**Related Standard:** [BRANCHING-STRATEGY](../standards/standard_BRANCHING-STRATEGY.md)

---

## Table of Contents

1. [Documentation Hierarchy Overview](#documentation-hierarchy-overview)
2. [Sprint Closure Process](#sprint-closure-process)
3. [Sprint Start Process](#sprint-start-process)
4. [Initiative Management](#initiative-management)
5. [AI Agent Instructions](#ai-agent-instructions)

---

## Documentation Hierarchy Overview

CORA uses a **3-tier documentation hierarchy** for sprint management:

| Tier | File | Update Frequency | Purpose |
|------|------|------------------|---------|
| **Index** | `memory-bank/activeContext.md` | Rarely | Master index of active initiatives |
| **Initiative** | `memory-bank/context-{initiative}.md` | Per sprint | Tracks branches + plans for one initiative |
| **Sprint** | `docs/plans/plan_{sprint}.md` | During sprint | Detailed checklists |

### The Sprint Triad

Every sprint MUST have these three items:

1. **Branch** - The Git branch where code changes happen
2. **Plan** - The detailed implementation checklist (`docs/plans/plan_*.md`)
3. **Context** - The initiative-level tracker (`memory-bank/context-*.md`)

**Key Principle:** Update the context file per sprint, NOT activeContext.md. The activeContext.md is only updated when adding or removing entire initiatives.

---

## 1. Sprint Closure Process

When a sprint goal is achieved, follow these steps to close the sprint and prepare for merger.

### Step 1.1: Finalize Plan Documentation

1. Update the current plan file in `docs/plans/`:
   - Set **Status** to `✅ COMPLETE`
   - Ensure "Success Criteria" checklist is fully checked
   - Add a "Completion Summary" section if needed

### Step 1.2: Update Initiative Context File

1. **Update** the initiative's context file (`memory-bank/context-{initiative}.md`):
   - Update the Sprint History table with completion date
   - Move "Current Sprint" to historical record
   - Add any session notes or key decisions

```markdown
## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `admin-page-s1` | `plan_admin-page-s1.md` | ✅ Complete | 2026-01-20 |
| S2 | `admin-page-s2` | `plan_admin-page-s2.md` | ✅ Complete | 2026-01-24 |  ← Update this
```

### Step 1.3: Branch Archiving

1. **Create Archive Tags** before merging:

```bash
# Archive tag (always create)
git tag archive/<current-branch> <current-branch>
git push origin archive/<current-branch>

# Module-focus or initiative tag
git tag module/<module-name>/<description> <current-branch>
# OR
git tag initiative/<initiative-name>/<sprint> <current-branch>
git push origin --tags
```

**Examples:**
```bash
# For module-specific work
git tag archive/feature/eval-citations feature/eval-citations
git tag module/eval/citations-implementation feature/eval-citations
git push origin archive/feature/eval-citations module/eval/citations-implementation

# For cross-module initiative work
git tag archive/feature/ws-plugin-types feature/ws-plugin-types
git tag initiative/ws-plugin/types-sprint feature/ws-plugin-types
git push origin archive/feature/ws-plugin-types initiative/ws-plugin/types-sprint
```

### Step 1.4: Archive Plan File

1. **Move** the plan file to the completed directory:

```bash
mv docs/plans/plan_<name>.md docs/plans/completed/plan_<name>.md
```

2. **Commit** the file move:

```bash
git add docs/plans/completed/
git add docs/plans/
git commit -m "docs: archive completed plan for <sprint-goal>"
git push
```

### Step 1.5: Create Pull Request

1. Create a PR merging the sprint branch into `main`
2. Include:
   - Summary of completed features
   - Verification steps performed
   - Link to the initiative context file
   - Reference to the archived plan file location

### Step 1.6: Post-Merge Cleanup

1. After PR is merged:

```bash
git checkout main
git pull origin main
git branch -d <branch-name>  # Delete local branch
```

**Note:** Do NOT update `activeContext.md` for sprint completion - only update the initiative's context file.

---

## 2. Sprint Start Process

Start a new sprint for the next phase of work within an initiative.

### Step 2.1: Ensure Initiative Context Exists

1. Check if a context file exists for your initiative:
   - `memory-bank/context-module-{name}.md` for single-module work
   - `memory-bank/context-{initiative-name}.md` for cross-module work

2. If no context file exists, create one (see [Initiative Management](#initiative-management))

### Step 2.2: Create New Branch

1. Checkout `main` and pull latest changes:

```bash
git checkout main
git pull origin main
```

2. Create a new branch for the new sprint:

```bash
git checkout -b <feature-or-fix>/<initiative>-<sprint-goal>
# Examples:
git checkout -b feature/ws-plugin-types
git checkout -b fix/eval-scoring-quality
git checkout -b admin-page-s3
```

### Step 2.3: Create New Plan

1. Create a new plan file in `docs/plans/` following the naming standard:
   - **Planning Sprint:** `plan_s0-<initiative>.md` (scope analysis and planning)
   - **First Sprint:** `plan_s1-<initiative>.md` (initial implementation)
   - **Follow-on Sprints:** `plan_s2-<initiative>.md`, `plan_s3-<initiative>.md`, etc.
   
   Examples:
   - `docs/plans/plan_s0-auth-standardization.md` (analysis sprint)
   - `docs/plans/plan_s1-auth-standardization.md` (org admin sprint)
   - `docs/plans/plan_s2-ws-plugin.md` (types implementation)

2. **Plan Content Requirements:**
   - **Status:** `🟡 IN PROGRESS`
   - **Branch:** `<branch-name>`
   - **Context:** Link to initiative context file
   - **Scope:** Explicitly define what is IN SCOPE and OUT OF SCOPE
   - **Implementation Steps:** Checklist of tasks
   - **Success Criteria:** Verifiable goals

### Step 2.4: Update Initiative Context File

1. **Update** the initiative's context file:
   - Add the new sprint to the Sprint History table
   - Update the "Current Sprint" section

```markdown
## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `admin-page-s1` | `plan_admin-page-s1.md` | ✅ Complete | 2026-01-20 |
| S2 | `admin-page-s2` | `plan_admin-page-s2.md` | ✅ Complete | 2026-01-24 |
| S3 | `admin-page-s3` | `plan_admin-page-s3.md` | 🟡 Active | - |  ← Add this

## Current Sprint

- **Branch:** `admin-page-s3`
- **Plan:** `docs/plans/plan_admin-page-s3.md`
- **Focus:** Outstanding admin features for multiple modules
```

### Step 2.5: Initial Commit

1. Commit the plan file and context updates:

```bash
git add docs/plans/plan_<name>.md
git add memory-bank/context-<initiative>.md
git commit -m "docs: create plan for <sprint-goal> sprint"
git push -u origin <branch-name>
```

---

## 3. Initiative Management

### Creating a New Initiative

When starting work that will span multiple sprints, create an initiative context file.

#### Step 3.1: Determine Initiative Scope

| Scope | Context File Name | When to Use |
|-------|-------------------|-------------|
| Single Module | `context-module-{name}.md` | Work on one module only |
| Cross-Module | `context-{initiative-name}.md` | Work spanning multiple modules |
| Platform/Admin | `context-{scope}.md` | Platform-wide changes |

#### Step 3.2: Create Context File

Create `memory-bank/context-{initiative}.md` with this structure:

```markdown
# Context: {Initiative Name}

**Created:** {Date}
**Primary Focus:** {Brief description}

## Initiative Overview

{Description of what this initiative aims to accomplish}

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `{branch}` | `plan_{name}.md` | 🟡 Active | - |

## Current Sprint

- **Branch:** `{branch-name}`
- **Plan:** `docs/plans/plan_{name}.md`
- **Focus:** {Sprint goal description}

## Key Decisions

- {Link to relevant ADRs}

## Session Log

### {Date} - {Brief title}
{Brief notes on significant sessions}
```

#### Step 3.3: Update activeContext.md

**Only when adding a NEW initiative**, update `memory-bank/activeContext.md`:

```markdown
## Active Initiatives

| Initiative | Context File | Primary Focus |
|------------|--------------|---------------|
| {New Initiative} | `context-{name}.md` | {Brief description} |  ← Add this
```

### Closing an Initiative

When all sprints in an initiative are complete:

1. Update the initiative's context file with final status
2. Move context file to `memory-bank/completed/` (or keep for reference)
3. Remove from `activeContext.md` Active Initiatives table
4. Add to "Recently Completed" section if maintaining history

---

## 4. AI Agent Instructions

**For AI Agents:** When asked to "close sprint", "start next phase", or manage sprints:

### On Sprint Closure

1. **Verify Completion:** Ensure all tasks in the current plan are marked complete
2. **Update Context File:** Update the initiative's context file (NOT activeContext.md)
3. **Archive Plan:** Move plan to `docs/plans/completed/`
4. **Create Tags:** Create archive and module/initiative tags
5. **Prepare PR:** Create PR with proper summary

### On Sprint Start

1. **Check Context:** Identify the initiative's context file
2. **Create Branch:** Follow naming conventions
3. **Create Plan:** Create detailed plan file
4. **Update Context:** Add sprint to initiative's context file
5. **Confirm:** Report back the branch name, plan location, and context file

### On Initiative Creation

1. **Determine Scope:** Single module vs cross-module
2. **Create Context File:** Use proper template
3. **Update Index:** Add to activeContext.md (only for new initiatives)
4. **Create First Sprint:** Follow sprint start process

### Critical Rules

- **Never delete a plan file** - Always move to `docs/plans/completed/`
- **Never update activeContext.md for sprint changes** - Only for initiative add/remove
- **Always maintain Sprint Triad** - Branch + Plan + Context for every sprint
- **Keep context file current** - Update with each sprint start/close

---

## Quick Reference

### Sprint Closure Checklist

- [ ] Plan status set to ✅ COMPLETE
- [ ] Context file Sprint History updated
- [ ] Archive tags created and pushed
- [ ] Plan file moved to `completed/`
- [ ] PR created with proper summary
- [ ] Branch deleted after merge

### Sprint Start Checklist

- [ ] Initiative context file exists (create if needed)
- [ ] Branch created from latest main
- [ ] Plan file created with proper structure
- [ ] Context file updated with new sprint
- [ ] Initial commit pushed

### Files Updated Per Sprint

| Action | Context File | Plan File | activeContext.md |
|--------|--------------|-----------|------------------|
| Sprint Start | ✅ Update | ✅ Create | ❌ No change |
| Sprint Close | ✅ Update | ✅ Move to completed | ❌ No change |
| New Initiative | ✅ Create | ✅ Create | ✅ Update |
| Close Initiative | ✅ Final update | ❌ Already archived | ✅ Remove |

---

**Document Status:** ✅ Active  
**Last Updated:** January 24, 2026