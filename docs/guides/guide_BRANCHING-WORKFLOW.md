# CORA Guide: Branching and Workflow Execution

**Standard:** [BRANCHING-STRATEGY](../standards/standard_BRANCHING-STRATEGY.md)  
**Tools:** Git, GitHub CLI (`gh`)

---

## Overview

This guide provides step-by-step instructions for executing the CORA Branching Strategy. Whether you are building a new module, adding a feature, or fixing a bug, follow these workflows to ensure safe and efficient development.

---

## Workflow 1: Fixing Validation Errors (Sprint-Based)

This is the most common workflow for ongoing maintenance and validation repairs (like the module-voice validation sprints).

### 1. Start from Main
Always ensure you are starting from a clean, updated `main` branch.

```bash
git checkout main
git pull origin main
```

### 2. Create Fix Branch
Create a branch specific to the problem or sprint.

```bash
# Pattern: fix/module-{name}-{description}
git checkout -b fix/module-voice-sprint-1
```

### 3. The "Fix Loop"
Iterate on the fix:

1.  **Modify Template Code**: Edit files in `templates/`.
2.  **Sync to Test Project**:
    ```bash
    ./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-voice/ai-sec-stack templates/_modules-functional/module-voice/backend/lambdas/voice-sessions/lambda_function.py
    ```
3.  **Verify**: Run validation or manual tests in the test project.
4.  **Repeat** until fixed.

### 4. Commit and Push
Once the fix is verified:

```bash
git add .
git commit -m "fix(module-voice): Resolve CORA compliance errors (Sprint 1)"
git push -u origin fix/module-voice-sprint-1
```

### 5. Create Pull Request
Use the GitHub CLI to create a PR.

```bash
gh pr create --base main --title "fix(module-voice): Validation Sprint 1 fixes" --body "Fixes CORA compliance issues. Validation passed."
```

### 6. Cleanup
After the PR is merged:

```bash
git checkout main
git pull origin main
git branch -d fix/module-voice-sprint-1
```

---

## Workflow 2: New Module Development

For long-running development of a new module (e.g., `module-voice`).

### 1. Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/module-voice-dev
```

### 2. Development Milestones
Develop in phases. Commit often.

```bash
# Scaffold
git add .
git commit -m "feat(voice): Initial scaffold"

# Database
git add .
git commit -m "feat(voice): Database schema"
```

### 3. Sync with Main (Rebase)
If development takes weeks, keep your branch updated to avoid conflicts.

```bash
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git push -f origin feature/module-voice-dev
```

### 4. Merge at Milestones
Don't wait until the end. Merge when a milestone (e.g., Provisioning) is complete.

```bash
gh pr create --base main --title "feat(voice): Milestone 1 - Provisioning"
```

---

## Workflow 3: Emergency Hotfix

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

---

## Tips for Success

*   **Commit Messages**: Use Conventional Commits (`feat:`, `fix:`, `docs:`).
*   **Small PRs**: A PR with 5 files is reviewed in 10 minutes. A PR with 50 files sits for 3 days.
*   **Sync Often**: Run `git pull origin main` daily if you are on a long-lived branch.
