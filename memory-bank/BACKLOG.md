# CORA Development Backlog

**Purpose:** Prioritized list of initiatives for team coordination.  
**Updated:** January 24, 2026

---

## How to Use This Document

1. **Find Work:** Check the Prioritized Backlog table below
2. **Check Dependencies:** See if dependencies are resolved
3. **Claim Work:** Add your team name to "Assigned To" column and set status to 🟡 Active
4. **Start Sprint:** Create/update the context file, create plan file, create branch
5. **Complete:** Update status to ✅ Complete when merged to main

---

## Prioritized Backlog

| Priority | Initiative | Context File | Dependencies | Assigned To | Status |
|----------|------------|--------------|--------------|-------------|--------|
| **P1** | WS Plugin Architecture | `context-ws-plugin-architecture.md` | None | - | ⏳ Ready |
| **P2** | Module-Eval Citations | `context-module-eval.md` | P1 (type errors fixed) | - | 🚫 Blocked |
| **P3** | Eval Scoring Quality | `context-module-eval.md` | P2 (citations working) | - | 🚫 Blocked |
| **P4** | Admin Standardization S3 | `context-admin-standardization.md` | None | - | ⏳ Ready |
| - | Module-Voice Phase 2 | `context-module-voice.md` | None | - | ⏳ Ready |
| - | Module-KB Enhancements | `context-module-kb.md` | None | - | ⏳ Ready |

### Status Legend

| Status | Meaning |
|--------|---------|
| ⏳ Ready | No blockers, can be started |
| 🚫 Blocked | Has unresolved dependencies |
| 🟡 Active | Team is actively working on it |
| ✅ Complete | All sprints completed, merged to main |

---

## Dependency Graph

```
P1: WS Plugin Architecture (no dependencies)
    └── P2: Module-Eval Citations (needs P1 type errors fixed)
        └── P3: Eval Scoring Quality (needs citations working to debug)

P4: Admin Standardization S3 (no dependencies, lowest priority)

Independent:
- Module-Voice Phase 2
- Module-KB Enhancements
```

---

## Claiming Work

When a team starts work on an initiative:

1. **Update this file:**
   ```markdown
   | **P1** | WS Plugin Architecture | ... | Team-Alpha | 🟡 Active |
   ```

2. **Update the context file:** Add current sprint info

3. **Create the plan file:** `docs/plans/plan_{sprint}.md`

4. **Create the branch:** Following naming conventions

### Avoid Conflicts

- **Check "Assigned To" before starting** - Don't work on already-claimed initiatives
- **Check context file's "Current Sprint"** - See what branch is active
- **Check modified files in active branches** - Avoid editing same files

---

## Recently Completed

| Initiative | Context File | Completed | Notes |
|------------|--------------|-----------|-------|
| Admin Standardization S2 | `context-admin-standardization.md` | 2026-01-24 | ADR-016 fixes |

---

## Adding New Initiatives

1. Create context file: `memory-bank/context-{initiative}.md`
2. Add to this backlog with appropriate priority
3. Document dependencies
4. Update `activeContext.md` to list the new context file

---

**Maintained by:** All teams (update when claiming or completing work)