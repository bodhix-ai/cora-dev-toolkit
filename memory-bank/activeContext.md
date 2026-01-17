# Active Context - CORA Development Toolkit

## Parallel Development Index

This file serves as an index to branch-specific context files for parallel development efforts.

---

## Active Branches

| Branch | Context File | Workstation | Status | Focus |
|--------|--------------|-------------|--------|-------|
| `feature/module-kb-implementation` | [context-module-kb.md](./context-module-kb.md) | WS1 | 🔄 In Progress | Module-KB & Module-Chat deployment |
| `feature/module-eval-implementation` | [context-module-eval.md](./context-module-eval.md) | WS2 | 🔄 In Progress | Module-Eval development |

---

## Branch Context Files

### Module-KB (Workstation 1)
**File:** `memory-bank/context-module-kb.md`
**Current Session:** 131 - Module-KB Full Deployment Pipeline
**Status:** Dev server running at localhost:3000, ready for UAT

**Recent Accomplishments:**
- Module-chat promoted to core module
- Lambda org_common function fixes (execute_rpc → rpc)
- Dev server running for frontend testing

### Module-Eval (Workstation 2)
**File:** `memory-bank/context-module-eval.md`
**Current Session:** See context file
**Status:** In development

---

## Shared Resources

### Test Environments
| Project | Workspace | Stack Path | Infra Path | Branch |
|---------|-----------|------------|------------|--------|
| ai-sec | test-ws-24 | `~/code/bodhix/testing/test-ws-24/ai-sec-stack` | `~/code/bodhix/testing/test-ws-24/ai-sec-infra` | module-kb |

### Core Module Status
| Module | Location | Status |
|--------|----------|--------|
| module-access | `templates/_modules-core/` | ✅ Stable |
| module-ai | `templates/_modules-core/` | ✅ Stable |
| module-chat | `templates/_modules-core/` | 🔄 Session 131 promoted |
| module-kb | `templates/_modules-core/` | 🔄 In Development |
| module-mgmt | `templates/_modules-core/` | ✅ Stable |
| module-eval | `templates/_modules-core/` | 🔄 In Development (WS2) |

### Functional Module Status
| Module | Location | Status |
|--------|----------|--------|
| module-ws | `templates/_modules-functional/` | ✅ Stable |

---

## Quick Reference

### Switching Between Branches
```bash
# Before switching, commit or stash changes
git add -A && git stash  # or git commit

# Switch to module-kb branch
git checkout feature/module-kb-implementation

# Switch to module-eval branch
git checkout feature/module-eval-implementation
```

### Reading Branch Context
```bash
# Module-KB context
cat memory-bank/context-module-kb.md

# Module-Eval context
cat memory-bank/context-module-eval.md
```

---

## Merge Conflict Prevention

To avoid merge conflicts:
1. **Each branch has its own context file** - Don't edit the other branch's context file
2. **This index file is minimal** - Only update status/links, keep details in branch files
3. **Branch-specific session notes** go in the branch context file, not here

---

**Updated:** January 16, 2026
