# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **branch-specific context files** to avoid merge conflicts when developing on multiple workstations.

---

## Active Branches & Context Files

| Branch | Context File | Focus Area |
|--------|--------------|------------|
| `ws-crud-kbs-embeddings` | `context-module-kb.md` | **ACTIVE** - KB Document Processing Sprint |
| `module-voice-dev` | `context-module-voice.md` | Module-Voice (Phase 1.5: Specifications) |
| `feature/module-eval-config` | `context-module-eval.md` | Module-Eval Config Testing (Org admin configuration flow) |
| `feature/module-kb-implementation` | `context-module-kb.md` | Module-KB development |
| `feature/module-eval-implementation` | `context-module-eval.md` | Module-Eval (Phase 9: Frontend Hooks) |
| `main` | (this file) | General toolkit work |

---

## How to Use

1. **Check your branch:** `git branch --show-current`
2. **Open the matching context file** for your branch
3. **Update that file** with session progress (not this one)
4. **This file** stays as a brief index only

---

## Current Branch Status

### feature/module-eval-config
- **Status:** Sprint - Org Admin Config Testing (🔄 IN PROGRESS)
- **Progress:** 0% complete (just started)
- **Context:** See `context-module-eval.md` and `docs/plans/plan_module-eval-config.md`
### ws-crud-kbs-embeddings (ACTIVE)
- **Status:** 🔄 IN PROGRESS - Module-KB TypeScript Type Error Fixes
- **Plans:** 
  - `docs/plans/plan_module-kb-type-fixes.md` (ACTIVE - Session 153)
  - `docs/plans/plan_ws-kb-processing-fix.md` (Previous - Session 152)
- **Context:** See `context-module-kb.md`
- **Current:** Fixing TypeScript type errors (16 errors in 6 files)

### feature/module-eval-implementation
- **Status:** Phase 9 - Frontend Hooks (🔄 IN PROGRESS)
- **Progress:** ~65% complete (Phases 1-8 done)
- **Context:** See `context-module-eval.md`

### main
- **Status:** Toolkit maintenance and standards
- **Last Session:** Session 126 (Module-KB planning)

---

## Quick Links

- **Implementation Plans:** `docs/plans/`
- **Standards:** `docs/standards/`
- **Module Templates:** `templates/_modules-functional/`
- **Core Modules:** `templates/_modules-core/`

---

## Test Environment

**Project:** ai-sec (test-ws-25)

| Repo | Path |
|------|------|
| Stack | `~/code/bodhix/testing/test-ws-25/ai-sec-stack` |
| Infra | `~/code/bodhix/testing/test-ws-25/ai-sec-infra` |

---

**Updated:** January 18, 2026
