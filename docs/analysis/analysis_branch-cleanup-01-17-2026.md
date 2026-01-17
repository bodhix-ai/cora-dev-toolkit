# Git Branch Cleanup Recommendations

**Date:** January 17, 2026  
**Current Focus:** Integration, testing, and fixing modules: kb, chat, voice, & eval  
**Related Efforts:** Workflow optimization, functional module registry

## Branch Inventory Summary

### Local Branches (10)
- `chore/tooling-and-standards-updates`
- `feature/module-chat-fresh`
- `feature/module-chat-implementation`
- `feature/module-eval-fresh`
- `feature/module-eval-implementation`
- `feature/module-kb-fresh`
- `feature/module-kb-implementation`
- `fix/module-ws-authentication-and-routes` ✅ **MERGED TO MAIN**
- `main`
- `module-voice-dev` ⭐ **CURRENT BRANCH**

### Remote Branches (17)
- All local branches plus:
- `remotes/origin/feat/module-ui-integration`
- `remotes/origin/feature/ai-platform-authentication-guide`
- `remotes/origin/feature/functional-module-registry`
- `remotes/origin/feature/module-ws-implementation`
- `remotes/origin/fix/ai-enablement-bugs`
- `remotes/origin/fix/module-ws-deployment-issues`

## Analysis: -fresh vs -implementation Branches

### Branch Divergence Analysis

| Module | -implementation ahead | -fresh ahead | Status |
|--------|----------------------|--------------|--------|
| **kb** | 78 commits | 3 commits | Significantly diverged |
| **chat** | 79 commits | 2 commits | Significantly diverged |
| **eval** | 89 commits | 1 commit | Significantly diverged |

### Last Update Timestamps

| Branch | Last Updated | Status |
|--------|-------------|---------|
| `feature/module-kb-fresh` | Jan 15, 17:36 | 10 min AFTER -implementation |
| `feature/module-kb-implementation` | Jan 15, 17:26 | Older |
| `feature/module-chat-fresh` | Jan 15, 17:34 | 7 min AFTER -implementation |
| `feature/module-chat-implementation` | Jan 15, 17:27 | Older |
| `feature/module-eval-fresh` | Jan 15, 17:39 | BEFORE -implementation |
| `feature/module-eval-implementation` | Jan 16, 17:37 | ✅ Most recent |
| `module-voice-dev` | Jan 16, 21:37 | ✅ Most active |

### Key Findings

1. **NOT exact duplicates** - The `-fresh` branches have diverged from `-implementation`
2. **Implementation branches are primary** - They are 78-89 commits ahead
3. **Fresh branches have minimal unique work** - Only 1-3 commits each
4. **Unusual pattern** - Some `-fresh` branches were updated AFTER their `-implementation` counterparts, suggesting possible cherry-picking or documentation updates

## Recommendations

### 🔴 PRIORITY 1: Investigate -fresh Branches Before Deletion

**Action Required:** Before deleting `-fresh` branches, verify their unique commits don't contain valuable work.

```bash
# Check unique commits in each -fresh branch
git log feature/module-kb-implementation..feature/module-kb-fresh --oneline
git log feature/module-chat-implementation..feature/module-chat-fresh --oneline
git log feature/module-eval-implementation..feature/module-eval-fresh --oneline
```

**Decision criteria:**
- If commits are only documentation/specification updates → Cherry-pick to -implementation, then delete -fresh
- If commits contain code changes → Merge or cherry-pick to -implementation, then delete -fresh
- If commits are duplicates or irrelevant → Delete -fresh branches

**Recommended deletion commands (after verification):**
```bash
# Local deletion
git branch -d feature/module-kb-fresh
git branch -d feature/module-chat-fresh
git branch -d feature/module-eval-fresh

# Remote deletion (if applicable)
git push origin --delete feature/module-kb-fresh
git push origin --delete feature/module-chat-fresh
git push origin --delete feature/module-eval-fresh
```

### 🟡 PRIORITY 2: Standardize Module Branch Naming

**Issue:** `module-voice-dev` lacks the `feature/` prefix used by other module development branches.

**Recommendation:** Rename to match convention (if git supports branch renaming).

```bash
# Rename local branch
git branch -m module-voice-dev feature/module-voice-dev

# Delete old remote branch and push new one
git push origin --delete module-voice-dev
git push origin feature/module-voice-dev
git push --set-upstream origin feature/module-voice-dev
```

**⚠️ Note:** This will require updating any CI/CD pipelines, pull requests, or documentation that reference `module-voice-dev`.

### 🟡 PRIORITY 3: Standardize Branch Suffix (-implementation → -dev)

**Issue:** Module branches use `-implementation` suffix while `module-voice-dev` uses shorter `-dev`.

**Recommendation:** Rename for consistency and brevity.

```bash
# KB module
git branch -m feature/module-kb-implementation feature/module-kb-dev
git push origin --delete feature/module-kb-implementation
git push origin feature/module-kb-dev

# Chat module
git branch -m feature/module-chat-implementation feature/module-chat-dev
git push origin --delete feature/module-chat-implementation
git push origin feature/module-chat-dev

# Eval module
git branch -m feature/module-eval-implementation feature/module-eval-dev
git push origin --delete feature/module-eval-implementation
git push origin feature/module-eval-dev

# Voice module (combine with PRIORITY 2)
git branch -m module-voice-dev feature/module-voice-dev
git push origin --delete module-voice-dev
git push origin feature/module-voice-dev
```

**After all renames, standard naming convention:**
```
feature/module-{name}-dev
```

### 🟢 PRIORITY 4: Delete Merged Branches

**Branch identified:** `fix/module-ws-authentication-and-routes` has been merged into main.

```bash
# Safe to delete locally
git branch -d fix/module-ws-authentication-and-routes

# Check if remote exists and delete
git push origin --delete fix/module-ws-authentication-and-routes
```

### 📋 PRIORITY 5: Review Additional Branches for Cleanup

**Branches to review:**

1. **`chore/tooling-and-standards-updates`**
   - Check if work is complete and can be merged or deleted
   
2. **`fix/ai-enablement-bugs`** (remote only)
   - Determine if this fix is complete or still needed

3. **`fix/module-ws-deployment-issues`** (remote only)
   - Determine if this fix is complete or still needed

4. **`feature/module-ws-implementation`** (remote only)
   - Check relationship to workspace module work
   - Consider if should follow naming convention (feature/module-ws-dev)

5. **`feat/module-ui-integration`** (remote only)
   - Related to workflow optimization efforts
   - Check if should be merged or continue development

6. **`feature/functional-module-registry`** (remote only)
   - Directly related to current focus
   - Check status and integration needs

7. **`feature/ai-platform-authentication-guide`** (remote only)
   - Check if documentation is complete or in progress

## Recommended Action Plan

### Phase 1: Investigation (Do this first)
1. ✅ Review unique commits in `-fresh` branches
2. ✅ Determine if any work needs to be preserved
3. ✅ Cherry-pick or merge valuable commits to `-implementation` branches

### Phase 2: Cleanup (After Phase 1)
1. ✅ Delete `-fresh` branches (local and remote)
2. ✅ Delete merged `fix/module-ws-authentication-and-routes` branch

### Phase 3: Standardization (Can be done in parallel with Phase 2)
1. ✅ Rename `module-voice-dev` → `feature/module-voice-dev`
2. ✅ Rename `-implementation` branches to `-dev` suffix

### Phase 4: Audit (Lower priority)
1. ✅ Review and clean up additional branches listed in Priority 5
2. ✅ Document any branches that should remain for future work

## Impact on Other Workstations

### When Remote Branches Are Deleted

**What happens:**
- Other workstations retain their local copy of the branch
- Git will show the branch as "gone" on the remote
- Next `git fetch --prune` or `git pull` will show: `[deleted] (was abc123)`

**Impact on developers:**

| Scenario | What They See | Action Required |
|----------|---------------|-----------------|
| **Not currently on deleted branch** | `warning: remote ref does not exist` on fetch | Safe to delete local copy: `git branch -d branch-name` |
| **Currently on deleted branch** | Can continue working locally | Must create new remote branch or switch branches |
| **Have uncommitted work** | Local changes preserved | Safe - local work unaffected |
| **Try to push** | `error: failed to push some refs` | Must create new remote or abandon branch |

**Commands for developers to clean up:**

```bash
# 1. Fetch and prune deleted remote branches
git fetch --prune

# 2. See which local branches have deleted remotes
git branch -vv | grep ': gone]'

# 3. Delete local branches that track deleted remotes
git branch -d branch-name  # Safe delete (only if merged)
git branch -D branch-name  # Force delete (loses unmerged work!)
```

### When Remote Branches Are Renamed

**What happens:**
- The old remote branch is deleted
- A new remote branch with different name is created
- Other workstations have orphaned local branches

**Example: `module-voice-dev` → `feature/module-voice-dev`**

**Impact on developers:**

| Scenario | What They See | Action Required |
|----------|---------------|-----------------|
| **Not on renamed branch** | Old branch shows as "gone" | Delete old local branch, checkout new one |
| **Currently on renamed branch** | Can continue working | Must update tracking to new remote name |
| **Have uncommitted work** | Local changes preserved | Can rename local branch to match |
| **Try to push to old name** | `error: failed to push` | Must push to new branch name |

**Commands for developers to update after rename:**

```bash
# Option 1: Rename local branch to match new remote
git branch -m module-voice-dev feature/module-voice-dev
git fetch origin
git branch -u origin/feature/module-voice-dev feature/module-voice-dev

# Option 2: Delete old local, checkout new remote
git checkout main
git branch -d module-voice-dev
git fetch origin
git checkout feature/module-voice-dev

# Option 3: If you have uncommitted work on old branch
git checkout module-voice-dev
git stash
git checkout main
git branch -D module-voice-dev
git fetch origin
git checkout feature/module-voice-dev
git stash pop
```

### Team Communication Strategy

**Before making changes:**

1. **Announce planned branch cleanup** - Give team 24-48 hours notice
2. **Identify active branches** - Ask team which branches they're working on
3. **Provide this guide** - Share cleanup commands with team
4. **Schedule during low-activity period** - Avoid disrupting active work

**Communication template:**

```
Subject: Branch Cleanup - Action Required

We're cleaning up old branches in cora-dev-toolkit on [DATE].

BRANCHES TO BE DELETED:
- feature/module-kb-fresh
- feature/module-chat-fresh
- feature/module-eval-fresh
- fix/module-ws-authentication-and-routes

BRANCHES TO BE RENAMED:
- module-voice-dev → feature/module-voice-dev
- feature/module-kb-implementation → feature/module-kb-dev
- feature/module-chat-implementation → feature/module-chat-dev
- feature/module-eval-implementation → feature/module-eval-dev

IF YOU HAVE LOCAL COPIES:
1. Run: git fetch --prune
2. See cleanup guide: docs/analysis/analysis_branch-cleanup-01-17-2026.md
3. Update your local branches or delete orphaned ones

QUESTIONS: Reply to this thread
```

### Safety Measures

**Before deletion/rename:**

1. ✅ **Verify no open pull requests** on branches to be deleted/renamed
2. ✅ **Check CI/CD pipelines** for branch name references
3. ✅ **Search documentation** for hardcoded branch names
4. ✅ **Backup strategy**: Branches are never truly deleted (commits remain for ~90 days)

**Recovery options if needed:**

```bash
# Find commit SHA of deleted branch
git reflog  # or check GitHub/GitLab branch history

# Recreate deleted branch
git checkout -b branch-name <commit-sha>
git push origin branch-name
```

### Minimal Impact Scenarios

**Safest to delete (minimal impact):**
- ✅ Merged branches (work already in main)
- ✅ Branches with no recent activity (>30 days)
- ✅ Branches with no open PRs
- ✅ Branches not referenced in CI/CD

**Higher impact scenarios:**
- ⚠️ Active development branches (currently checked out on other machines)
- ⚠️ Branches with open PRs
- ⚠️ Branches referenced in automation

## Risk Assessment

| Action | Risk Level | Mitigation |
|--------|-----------|------------|
| Delete -fresh branches | 🟡 Medium | Verify unique commits first, announce to team |
| Delete merged branches | 🟢 Low | Already merged to main |
| Rename branches | 🟡 Medium | Update CI/CD, docs, PRs, notify team |
| Review old branches | 🟢 Low | Investigation only |
| Other workstations affected | 🟡 Medium | Team communication, provide cleanup guide |

## Expected Outcome

After cleanup, the branch structure will be:

### Active Development Branches
- `feature/module-kb-dev`
- `feature/module-chat-dev`
- `feature/module-voice-dev`
- `feature/module-eval-dev`

### Infrastructure/Support Branches
- `feature/functional-module-registry` (if kept)
- `feat/module-ui-integration` (if kept)
- Other branches as determined in audit

### Benefits
- ✅ Consistent naming convention
- ✅ Clearer branch purpose from names
- ✅ Reduced clutter from duplicate/obsolete branches
- ✅ Easier navigation for team members
- ✅ Aligned with current development focus

---

**Next Steps:** Review this document and approve Phase 1 investigation before proceeding with deletions.
