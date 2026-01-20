# Sprint Closure Workflow

Automates the process of closing a completed sprint and archiving the branch.

**Usage:** `/sprint-close.md [plan-file]`

**Example:** `/sprint-close.md plan_admin-eval-config-s2.md`

---

## Prerequisites

Before running this workflow, ensure:
- [ ] All sprint tasks are completed
- [ ] All code changes are committed and pushed
- [ ] Plan file success criteria are met

---

## Step 1: Verify Completion

### 1.1: Check Plan Status

```bash
# Read the current plan file
PLAN_FILE="docs/plans/<plan-filename>"

# Verify Status is "COMPLETE" or prompt user to update
# Verify Success Criteria checklist is fully checked
```

**AI Agent Action:** Read the plan file and verify completion. If not complete, ask user to confirm.

---

## Step 2: Create Archive Tags

### 2.1: Determine Module Focus

**AI Agent Action:** Analyze the branch name and plan file to determine the primary module(s):

| Module Pattern | Tag Prefix |
|----------------|------------|
| Contains "access" | `module/access/` |
| Contains "ai" | `module/ai/` |
| Contains "mgmt" | `module/mgmt/` |
| Contains "kb" | `module/kb/` |
| Contains "chat" | `module/chat/` |
| Contains "ws" | `module/ws/` |
| Contains "eval" | `module/eval/` |
| Contains "voice" | `module/voice/` |
| Cross-module or core | `module/shared/` or `core/` |

### 2.2: Create Tags

```bash
# Get current branch name
CURRENT_BRANCH=$(git branch --show-current)

# Create archive tag
git tag "archive/${CURRENT_BRANCH}" "${CURRENT_BRANCH}"

# Create module-focus tag
# Example: module/eval/optimization-sprint
MODULE_TAG="module/<module-name>/<description>"
git tag "${MODULE_TAG}" "${CURRENT_BRANCH}"

# Push both tags
git push origin "archive/${CURRENT_BRANCH}" "${MODULE_TAG}"
```

**AI Agent Action:** 
- Determine appropriate module tag based on branch analysis
- Execute git commands to create and push tags
- Confirm tag creation to user

---

## Step 3: Update Active Context

### 3.1: Read Current Context

```bash
# Read memory-bank/activeContext.md
# Locate the current branch in Active Branches table
```

### 3.2: Archive Branch Entry

**AI Agent Action:** Update `memory-bank/activeContext.md`:

- Move branch from "Active Branches" to "Recently Completed" section
- Update status to "✅ Archived (YYYY-MM-DD)"
- Preserve links to plan and context files for reference

**Example update:**

```markdown
## Recently Completed

| Branch | Status | Focus Area | Completed |
|--------|--------|------------|-----------|
| `admin-eval-config-s2` | ✅ Archived | Eval Config Testing | 2026-01-20 |
```

### 3.3: Commit Context Update

```bash
git add memory-bank/activeContext.md
git commit -m "docs: archive ${CURRENT_BRANCH} in activeContext"
git push
```

---

## Step 4: Archive Plan File

### 4.1: Move Plan to Completed

```bash
PLAN_FILE="docs/plans/<plan-filename>"
COMPLETED_PLAN="docs/plans/completed/<plan-filename>"

# Move the plan file
mv "${PLAN_FILE}" "${COMPLETED_PLAN}"

# Commit the move
git add docs/plans/completed/
git add docs/plans/  # Records deletion
git commit -m "docs: archive completed plan for <sprint-goal>"
git push
```

**AI Agent Action:**
- Execute the move command
- Verify the plan file is in `docs/plans/completed/`
- Confirm successful archive to user

---

## Step 5: Optional - Create Pull Request

If the sprint work should be merged to main:

```bash
gh pr create \
  --base main \
  --title "feat(<module>): <sprint-goal>" \
  --body "Completed sprint work. See archived plan: docs/plans/completed/<plan-filename>"
```

**AI Agent Action:** Ask user if they want to create a PR.

---

## Step 6: Summary Report

**AI Agent Action:** Present a summary:

```markdown
## ✅ Sprint Closed: <branch-name>

**Tags Created:**
- `archive/<branch-name>`
- `module/<module>/<description>`

**Plan Archived:**
- From: `docs/plans/<plan-filename>`
- To: `docs/plans/completed/<plan-filename>`

**Active Context Updated:**
- Branch marked as archived in `memory-bank/activeContext.md`

**View tags:**
```bash
git tag -l 'archive/*'
git tag -l 'module/<module>/*'
```

**Next Steps:**
- Run `/sprint-start.md <new-branch-name>` to start next sprint
- Or manually: `git checkout main && git pull`
```

---

## Rollback

If something goes wrong:

```bash
# Delete tags
git tag -d archive/<branch-name>
git tag -d module/<module>/<description>
git push origin :refs/tags/archive/<branch-name>
git push origin :refs/tags/module/<module>/<description>

# Restore plan file
mv docs/plans/completed/<plan-filename> docs/plans/<plan-filename>
```

---

## Related Workflows

- `/sprint-start.md` - Start a new sprint
- `/fix-cycle.md` - Fix errors before closing sprint
- `/validate.md` - Validate completion before closing

---

**Reference:** [Sprint Management Guide](../../docs/guides/guide_SPRINT-MANAGEMENT.md)
