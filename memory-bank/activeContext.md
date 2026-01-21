# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **branch-specific context files** to avoid merge conflicts when developing on multiple workstations.

---

## Active Branches & Context Files

| Branch | Context File | Focus Area |
|--------|--------------|------------|
| `admin-pages-standardization` | (this file) | **ACTIVE** - Admin Page Authentication Pattern Standardization |
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

### admin-pages-standardization (ACTIVE)
- **Status:** Admin Page Standardization (🟡 IN PROGRESS - Phase 1: Audit Setup)
- **Plans:** 
  - `docs/plans/plan_admin-page-standardization.md` (ACTIVE)
  - `docs/plans/findings_admin-page-audit.md` (Audit tracking document)
- **Context:** (this file)
- **Focus:** Standardize admin page authentication patterns, UI/layout, and module ownership

**Current Session Progress (Jan 21, 2026):**
- ✅ Branch created from latest main
- ✅ Plan enhanced to include UI/layout standardization (user feedback)
- ✅ Found 19 admin pages across templates (11 in project-stack, 8 in modules)
- ✅ Created audit findings framework with 3 parts: Auth, UI/Layout, Module Ownership
- ✅ **CRITICAL DECISION:** All admin pages MUST be module-owned (not in project-stack-template)
- ✅ Identified 11 orphan pages requiring relocation to modules
- ✅ Proposed module assignments for each orphan

**Next Session Actions:**
1. Verify duplicate pages (project-stack vs module versions)
2. Begin Part A audit: Check authentication patterns for sample pages
3. Begin Part B audit: Document UI/layout patterns for sample pages
4. Investigate `/admin/org/page.tsx` - shell page or belongs to module-ws?
5. Continue building findings document with actual audit data

### eval-optimization
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
| `admin-eval-config-s2` | ✅ Archived | Workspace Doc Eval Implementation & Org Admin Config | 2026-01-20 |

---

## Quick Links

- **Implementation Plans:** `docs/plans/`
- **Standards:** `docs/standards/`
- **Module Templates:** `templates/_modules-functional/`
- **Core Modules:** `templates/_modules-core/`

---

---

**Updated:** January 20, 2026
