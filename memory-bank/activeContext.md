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

### admin-eval-config-s2 (ACTIVE)
- **Status:** Workspace Doc Eval Implementation (🔄 IN PROGRESS)
- **Plans:** 
  - `docs/plans/plan_workspace-doc-eval-implementation.md` (ACTIVE)
  - `docs/plans/plan_admin-eval-config-s2.md` (Sprint tracking)
- **Context:** See `context-module-eval.md`

### ws-crud-kbs-embeddings
- **Status:** Module-KB TypeScript Type Error Fixes
- **Context:** See `context-module-kb.md`

### module-voice-dev
- **Status:** Module-Voice Specifications
- **Context:** See `context-module-voice.md`

### main
- **Status:** Toolkit maintenance and standards

---

## Quick Links

- **Implementation Plans:** `docs/plans/`
- **Standards:** `docs/standards/`
- **Module Templates:** `templates/_modules-functional/`
- **Core Modules:** `templates/_modules-core/`

---

---

**Updated:** January 19, 2026
