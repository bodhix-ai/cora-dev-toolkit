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
| Evaluation Optimization | `context-eval-optimization.md` | Business Analyst Workbench for prompt optimization | **P2-P3** |
| Module-Voice Development | `context-module-voice.md` | Voice interview features | - |
| Module-KB Development | `context-module-kb.md` | Knowledge base features | - |

---

## Current Priority Order (February 8, 2026)

1. **Error Remediation S7 (Active)** - Admin page thin wrapper migration (completing S6 work)
2. **WS Plugin Architecture S5** - Tab ordering, module metrics (S1-S4 complete)
3. **Module-Eval Citations** - Complete citations implementation (unblocked, awaiting capacity)
4. **Test Project Resource Isolation** - Parallel test environments

**Recent Completions:**
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

**Updated:** February 8, 2026 (Updated Error Remediation to Sprint S7)
