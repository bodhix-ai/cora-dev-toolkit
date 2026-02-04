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
| Auth Standardization | `context-auth-standardization.md` | Centralized auth library | **P0** 🔴 Critical |
| Module-Voice Development | `context-module-voice.md` | Voice interview features | - |
| Module-KB Development | `context-module-kb.md` | Knowledge base features | - |
| Federal Use Cases Portfolio | `context-federal-use-cases.md` | Federal government documentation | - |

---

## Current Priority Order (January 30, 2026)

1. **Auth Standardization (Critical)** - Centralized library + migrate chat module (broken)
2. **Clean Project Baseline** - Achieve 0-error baseline
3. **WS Plugin Architecture S3** - Dynamic module configuration (deferred, S1-S2 complete)
4. **Module-Eval Citations** - Complete citations implementation (unblocked, awaiting capacity)
5. **Test Project Resource Isolation** - Parallel test environments

**Recent Completions:**
- ✅ Admin Standardization S4 (Admin routes + Module Toggle, auth issues discovered)
- ✅ Error Remediation S1-S4 (430→121 errors, 72% reduction)
- ✅ WS Plugin Architecture S1-S2 (ADR-017, module availability)

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

**Updated:** January 30, 2026 (Added Federal Use Cases initiative)
