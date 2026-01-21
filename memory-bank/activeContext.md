# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **branch-specific context files** to avoid merge conflicts when developing on multiple workstations.

---

## Active Branches & Context Files

| Branch | Context File | Focus Area |
|--------|--------------|------------|
| `ui-enhancements` | (this file) | **ACTIVE** - UI/UX Enhancements (Eval Module) |
| `eval-optimization` | `context-module-eval.md` | Eval Optimization (AI Config & Quality) |
| `module-voice-dev` | `context-module-voice.md` | Module-Voice (Phase 1.5: Specifications) |
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

### eval-optimization (ACTIVE)
- **Status:** Evaluation Optimization (� IN PROGRESS)
- **Plans:** 
  - `docs/plans/plan_eval-optimization.md` (ACTIVE)
- **Context:** See `context-module-eval.md`
- **Test Project:** `test-optim` (will be created)
- **Focus:** Configure AI providers, optimize evaluation processing, investigate org admin page rendering issue

### ws-crud-kbs-embeddings
- **Status:** Module-KB TypeScript Type Error Fixes
- **Context:** See `context-module-kb.md`

### module-voice-dev
- **Status:** Module-Voice Specifications
- **Context:** See `context-module-voice.md`

### main
- **Status:** Toolkit maintenance and standards

---

## Recently Completed

| Branch | Status | Focus Area | Completed |
|--------|--------|------------|-----------|
| `schema-naming-audit` | ✅ Archived | Schema Naming Compliance Audit (eval, chat, kb, voice, ws) | 2026-01-21 |
| `admin-eval-config-s2` | ✅ Archived | Workspace Doc Eval Implementation & Org Admin Config | 2026-01-20 |

---

## Quick Links

- **Implementation Plans:** `docs/plans/`
- **Standards:** `docs/standards/`
- **Module Templates:** `templates/_modules-functional/`
- **Core Modules:** `templates/_modules-core/`

---

---

**Updated:** January 21, 2026
