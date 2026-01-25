# Active Context - CORA Development Toolkit

## Multi-Workstation Context Management

This repository uses **initiative-scoped context files** to avoid merge conflicts when developing on multiple workstations.

**Key Principle:** Update initiative context files per sprint, NOT this file. This file is only updated when adding/removing entire initiatives.

---

## Active Initiatives

| Initiative | Context File | Primary Focus | Priority |
|------------|--------------|---------------|----------|
| WS Plugin Architecture | `context-ws-plugin-architecture.md` | Module integration patterns | **P1** |
| Module-Eval Development | `context-module-eval.md` | Eval features (citations, scoring) | P2, P3 |
| Admin Standardization | `context-admin-standardization.md` | Admin page patterns | P4 |
| Module-Voice Development | `context-module-voice.md` | Voice interview features | - |
| Module-KB Development | `context-module-kb.md` | Knowledge base features | - |

---

## Current Priority Order (January 24-26, 2026)

1. **WS Plugin Architecture** - Fix type errors, establish plugin pattern
2. **Module-Eval Citations** - Complete citations implementation
3. **Eval Scoring Quality** - Investigate and fix scoring issues
4. **Admin Standardization** - Outstanding admin features (lowest priority)

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

**Updated:** January 24, 2026