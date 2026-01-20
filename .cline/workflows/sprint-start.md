# Sprint Start Workflow

Automates the process of starting a new sprint with proper branching and documentation.

**Usage:** `/sprint-start.md <new-branch-name> [plan-template]`

**Example:** `/sprint-start.md eval-optimization`

---

## Prerequisites

Before running this workflow, ensure:
- [ ] Previous sprint is closed (or this is the first sprint)
- [ ] You're ready to define the new sprint's scope
- [ ] Main branch is up to date

---

## Step 1: Start from Main

### 1.1: Checkout and Update Main

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Verify we're on main and up to date
git branch --show-current
git status
```

**AI Agent Action:** Execute commands and verify clean state.

---

## Step 2: Create New Branch

### 2.1: Determine Branch Name

**Branch naming convention:**

| Type | Pattern | Example |
|------|---------|---------|
| **New module** | `feature/module-{name}-dev` | `feature/module-voice-dev` |
| **Module enhancement** | `feature/module-{name}-{feature}` | `feature/module-eval-optimization` |
| **Module fix sprint** | `fix/module-{name}-{category}` | `fix/module-kb-validation` |
| **Cross-module** | `feature/{description}` | `feature/api-client-refactor` |

**AI Agent Action:** 
- Analyze the branch name provided by user
- Suggest corrections if it doesn't follow convention
- Ask for confirmation before creating

### 2.2: Create Branch

```bash
NEW_BRANCH="<new-branch-name>"

# Create and switch to new branch
git checkout -b "${NEW_BRANCH}"

# Confirm creation
git branch --show-current
```

---

## Step 3: Create Plan File

### 3.1: Determine Plan Filename

```bash
# Plan filename matches branch name
PLAN_FILE="docs/plans/plan_${NEW_BRANCH}.md"
```

### 3.2: Create Plan from Template

**AI Agent Action:** Create a new plan file with the following structure:

```markdown
# <Sprint Goal Title> - Implementation Plan

**Status**: 🟡 IN PROGRESS  
**Priority**: <HIGH|MEDIUM|LOW>  
**Estimated Duration**: <X hours>  
**Created**: <YYYY-MM-DD>  
**Branch**: `<branch-name>`  
**Dependencies**: <list any dependencies>

---

## Executive Summary

<Brief overview of what this sprint aims to accomplish>

**Current State:**
- ✅ <What's working>
- ❌ <What needs to be done>

**Goal:** <Clear statement of sprint objective>

---

## Scope

### In Scope
- [ ] <Specific deliverable 1>
- [ ] <Specific deliverable 2>
- [ ] <Specific deliverable 3>

### Out of Scope
- <Thing that's NOT being done in this sprint>
- <Thing to defer to future sprint>

---

## Phase 1: <Phase Name> (<estimated time>)

### Step 1.1: <Step Name>

<Description of what to do>

**Actions:**
- [ ] <Specific action>
- [ ] <Specific action>

**Expected Output:** <What should exist after this step>

---

## Success Criteria

- [ ] <Measurable success criterion 1>
- [ ] <Measurable success criterion 2>
- [ ] <Measurable success criterion 3>

---

## Rollback Plan

If something goes wrong:
1. <Step to rollback>
2. <Step to verify>

---

**Document Status:** 🟡 IN PROGRESS  
**Branch:** `<branch-name>`
```

**AI Agent Action:**
- Create plan file with template content
- Fill in branch name, creation date
- Ask user for: priority, estimated duration, and initial scope
- Save plan file

---

## Step 4: Update Active Context

### 4.1: Read Current Context

```bash
# Read memory-bank/activeContext.md
# Identify the Active Branches table
```

### 4.2: Add New Branch Entry

**AI Agent Action:** Update `memory-bank/activeContext.md`:

Add new row to "Active Branches" table:

```markdown
## Active Branches & Context Files

| Branch | Context File | Focus Area |
|--------|--------------|------------|
| `<new-branch>` | `<context-file>` | **ACTIVE** - <Focus description> |
| ... | ... | ... |
```

**Example:**

```markdown
| Branch | Context File | Focus Area |
|--------|--------------|------------|
| `eval-optimization` | `context-module-eval.md` | **ACTIVE** - Eval Optimization (AI Config & Quality) |
```

### 4.3: Update Current Test Environment (if applicable)

If starting a sprint that will use a test project, add/update the section:

```markdown
## Current Test Environment

**Branch:** `<new-branch>`  
**Test Project:** `test-<identifier>`  
**Paths:**
- Stack: `~/code/bodhix/testing/test-<identifier>/ai-sec-stack`
- Infra: `~/code/bodhix/testing/test-<identifier>/ai-sec-infra`

**Focus:** <What's being tested>
```

---

## Step 5: Initial Commit

### 5.1: Add and Commit Files

```bash
# Add plan and context files
git add docs/plans/plan_${NEW_BRANCH}.md
git add memory-bank/activeContext.md

# Commit with descriptive message
git commit -m "docs: create plan for ${NEW_BRANCH} sprint"

# Push to origin
git push -u origin "${NEW_BRANCH}"
```

**AI Agent Action:** Execute git commands and confirm push.

---

## Step 6: Summary Report

**AI Agent Action:** Present a summary:

```markdown
## ✅ Sprint Started: <branch-name>

**Branch Created:**
- Name: `<branch-name>`
- Based on: `main` (commit: <commit-hash>)

**Plan Created:**
- File: `docs/plans/plan_<branch-name>.md`
- Status: 🟡 IN PROGRESS

**Active Context Updated:**
- Branch added to `memory-bank/activeContext.md`

**Next Steps:**
1. Review and refine the plan in `docs/plans/plan_<branch-name>.md`
2. Begin implementation following the plan phases
3. Use `/fix-cycle.md` for iterative fixes
4. Use `/validate.md` to check progress
5. When complete, run `/sprint-close.md` to archive

**Get started:**
```bash
git branch --show-current  # Confirm you're on the new branch
code docs/plans/plan_<branch-name>.md  # Open and refine plan
```
```

---

## Rollback

If you need to abort the sprint start:

```bash
# Switch back to main
git checkout main

# Delete local branch
git branch -D <new-branch>

# Delete remote branch (if already pushed)
git push origin --delete <new-branch>

# Remove plan file
rm docs/plans/plan_<branch-name>.md

# Restore activeContext.md (if committed)
git checkout HEAD~1 memory-bank/activeContext.md
```

---

## Related Workflows

- `/sprint-close.md` - Close the sprint when done
- `/test-module.md` - Create test project for module testing
- `/validate.md` - Validate sprint progress
- `/fix-cycle.md` - Fix issues during sprint

---

**Reference:** [Sprint Management Guide](../../docs/guides/guide_SPRINT-MANAGEMENT.md)
