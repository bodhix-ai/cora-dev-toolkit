# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **initiative-scoped context files** to avoid merge conflicts when developing on multiple workstations.

**Key Principle:** Update initiative context files per sprint, NOT this file. This file is only updated when adding/removing entire initiatives.

---

## Active Initiatives

| Initiative | Context File | Primary Focus | Priority |
|------------|--------------|---------------|----------|
| Mono-Repo Deployment & App Runner | `context-monorepo-deployment.md` | Consolidate repos + deploy web app | **P0** 🔴 Critical |
| Error Remediation & Clean Baseline | `context-error-remediation.md` | Eliminate validation errors | **P1** ⏸️ Paused |
| WS Plugin Architecture | `context-ws-plugin-architecture.md` | Module integration patterns | **P1** |
| Module-Eval Development | `context-module-eval.md` | Eval features (citations, scoring) | P2, P3 |
| Auth Standardization | `context-auth-standardization.md` | Centralized auth library | ✅ Complete |
| Evaluation Optimization | `context-eval-optimization.md` | Business Analyst Workbench for prompt optimization | **P2-P3** |
| Module-Voice Development | `context-module-voice.md` | Voice interview features | - |
| Module-KB Development | `context-module-kb.md` | Knowledge base features | - |

---

## Current Priority Order (February 9, 2026)

1. **Mono-Repo Deployment S1 (Active)** - Phase 1: Template structure creation (zero-impact on existing projects)
2. **Error Remediation S9 (Paused)** - Silver certification target (<100 errors) - deferred to prioritize deployment
3. **WS Plugin Architecture S5** - Tab ordering, module metrics (S1-S4 complete)
4. **Module-Eval Citations** - Complete citations implementation (unblocked, awaiting capacity)
5. **Test Project Resource Isolation** - Parallel test environments

**Recent Completions:**
- ✅ Error Remediation S8 (February 9, 2026 - 507→204 errors (-59.8%), Frontend + Code Quality validator fixes)
- ✅ Error Remediation S7 (February 8, 2026 - Admin thin wrapper migration, 98.5% compliance)
- ✅ Auth Standardization S1-S3 (February 2026 - 312 permission errors fixed, 100% ADR-019 compliance)
- ✅ WS Plugin Architecture S4 (February 2026 - Left nav filtering, DB naming compliance)
- ✅ Error Remediation S1-S6 (571→422 errors, 26% reduction post-S6)

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

**Updated:** February 9, 2026 (S8 Complete, S9 Paused, Mono-Repo S1 Started)
