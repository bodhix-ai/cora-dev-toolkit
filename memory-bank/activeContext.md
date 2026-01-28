# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **initiative-scoped context files** to avoid merge conflicts when developing on multiple workstations.

**Key Principle:** Update initiative context files per sprint, NOT this file. This file is only updated when adding/removing entire initiatives.

---

## Active Initiatives

| Initiative | Context File | Primary Focus | Priority |
|------------|--------------|---------------|----------|
| Error Remediation & Clean Baseline | `context-error-remediation.md` | Eliminate validation errors | **P1** |
| WS Plugin Architecture | `context-ws-plugin-architecture.md` | Module integration patterns | **P1** |
| Module-Eval Development | `context-module-eval.md` | Eval features (citations, scoring) | P2, P3 |
| Admin Standardization | `context-admin-standardization.md` | Version tracking + admin routes | **P1** 🟡 Active |
| Module-Voice Development | `context-module-voice.md` | Voice interview features | - |
| Module-KB Development | `context-module-kb.md` | Knowledge base features | - |

---

## Current Priority Order (January 27, 2026)

1. **Admin Standardization S3b (Active)** - Version tracking + admin route fixes (84 errors) - 🟡 Session 1 Complete
2. **Clean Project Baseline** - Achieve 0-error baseline (currently 121 errors, down from 430)
3. **WS Plugin Architecture S3** - Dynamic module configuration (deferred, S1-S2 complete)
4. **Module-Eval Citations** - Complete citations implementation (unblocked, awaiting capacity)
5. **Test Project Resource Isolation** - Parallel test environments

**Recent Completions:**
- ✅ Error Remediation S1-S4 (430→121 errors, 72% reduction)
- ✅ WS Plugin Architecture S1-S2 (ADR-017, module availability)
- ✅ Admin Standardization S2-S3a (ADR-016, module toggles)

---

## Quick Links

- **Implementation Plans:** `docs/plans/`
- **Standards:** `docs/standards/`
- **Module Templates:** `templates/_modules-functional/`
- **Core Modules:** `templates/_modules-core/`

---

## Documentation Hierarchy

| Tier | File | Update Frequency |
|------|------|------------------|
| **Index** | This file (`activeContext.md`) | Rarely (add/remove initiatives) |
| **Initiative** | `context-{initiative}.md` | Per sprint |
| **Sprint** | `docs/plans/plan_*.md` | During sprint |

**See:** `docs/standards/standard_BRANCHING-STRATEGY.md` for full documentation hierarchy details.

---

**Updated:** January 27, 2026
