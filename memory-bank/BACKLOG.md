# CORA Development Backlog

**Purpose:** Prioritized list of initiatives for team coordination.  
**Updated:** January 27, 2026

---

## How to Use This Document

1. **Find Work:** Check the Prioritized Backlog table below
2. **Check Dependencies:** See if dependencies are resolved
3. **Claim Work:** Add your team name to "Assigned To" column and set status to 🟡 Active
4. **Start Sprint:** Create/update the context file, create plan file, create branch
5. **Complete:** Update status to ✅ Complete when merged to main

---

## Prioritized Backlog

This table is the **small, prioritized, team-coordination surface**. It should stay short.

**New columns (Jan 2026):**
- **Lane**: helps teams pick work that won’t collide
- **Impact**: why this is prioritized
- **Conflict Risk**: expected merge-conflict risk (mostly based on how “shared” the touched files are)

| Priority | Lane | Initiative | Context File | Dependencies | Impact | Conflict Risk | Assigned To | Status |
|----------|------|------------|--------------|--------------|--------|---------------|-------------|--------|
| **P0** | E (Auth) | **Auth Standardization S1-S3** | `context-auth-standardization.md` | None | **Blocking Bug Fix**: Fixes broken chat admin + standardizes fragile auth patterns across 8 modules | **High** (shared auth lib + all modules) | - | ✅ Complete |
| **P1** | A (WS/Types) | **WS Plugin Architecture S1** | `context-ws-plugin-architecture.md` | None | Unblocks functional modules as plugins; resolves ws type errors | **Medium** (shared types + module-ws) | - | ✅ Complete |
| **P1** | D (Tooling) | **Clean Project Baseline (Error-Free)** | `context-error-remediation.md` | WS Plugin Architecture S1-S2 ✅, Admin Standardization (Complete) | Establishes 0-error baseline; major progress: 430→121 errors (72% reduction) via Error Remediation S1-S4, S5 active (869→807 target) | **Medium** (touches many modules for fixes) | - | 🟡 Active |
| **P1** | D (Tooling) | **Test Project Resource Isolation** | *(new context needed)* | None | Enables parallel test environments (prevents AWS resource name collisions) | **Low/Medium** (scripts + infra vars) | - | ⏳ Ready |
| **P2** | B (Eval Delivery) | **Module-Eval Citations** | `context-module-eval.md` | P1 WS Plugin Architecture (types/interfaces stable) | Enables debugging/scoring work; improves eval explainability | **Medium** (module-eval frontend/backend) | - | 🚫 Blocked |
| **P3** | B (Eval Delivery) | **Eval Scoring Quality** | `context-module-eval.md` | P2 Citations working | Can’t reliably debug scoring without citations | **Medium** (module-eval) | - | 🚫 Blocked |
| **P3** | E (Auth/Identity) | **OIDC Provider Multi-Env** | *(new context needed)* | None | Removes recurring deploy friction (`EntityAlreadyExists`), enables multi-env rollout | **Medium** (infra templates + deploy scripts) | - | ⏳ Ready |
| **P3** | F (UI Standards) | **UI Library Compliance (core leftovers)** | *(new context needed)* | Admin Standardization S3 (recommended sequencing) | Completes MUI compliance in core modules (module-access/module-mgmt) | **High** (shared layout/components) | - | ⏳ Ready |
| **P4** | D (Tooling) | **CORA Workflow Optimization (Phases 3–5)** | *(new context needed)* | P1 Test Project Resource Isolation (recommended) | Compounding productivity win across all future work | **Medium** (scripts touched by many) | - | ⏳ Ready |
| - | B (Modules) | Module-Voice Phase 2 | `context-module-voice.md` | None | Continue module delivery when capacity available | Medium | - | ⏳ Ready |
| - | B (Modules) | Module-KB Enhancements | `context-module-kb.md` | None | Continue module delivery when capacity available | Medium | - | ⏳ Ready |

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
P0: Auth Standardization (active, critical)
    └── P1: Clean Project Baseline (needs stable auth patterns)

P1: Admin Standardization (Complete)
    └── P1: Clean Project Baseline (unblocked)

P1: WS Plugin Architecture S1-S2 ✅ Complete
    └── P2: Module-Eval Citations (unblocked, ready when capacity available)
        └── P3: Eval Scoring Quality (needs citations working to debug)

P1: Test Project Resource Isolation (no dependencies)
    └── P4: CORA Workflow Optimization (recommended after resource isolation)

Independent:
- Module-Voice Phase 2
- Module-KB Enhancements
- OIDC Provider Multi-Env
- UI Library Compliance (recommended after Admin Standardization)
```

---

## Work Lanes (Parallelization Guide)

Use lanes to reduce merge conflicts across teams:

- **Lane A (WS/Types):** module-ws + shared plugin interfaces
- **Lane B (Module Delivery):** module-eval / module-voice / module-kb feature work
- **Lane D (Tooling):** scripts, workflows, test environment automation
- **Lane E (Auth/Identity):** NextAuth/Cognito/OIDC/authorizer
- **Lane F (UI/Admin UX & Standards):** shared admin pages, layout, UI standards

**Rule of thumb:** Don’t run two initiatives in the same lane concurrently unless they touch disjoint files.

---

## Backlog Pool (Not Yet Prioritized)

These plans exist in `docs/plans/backlog/` but are not currently in the top priority table above.
They can be pulled into the prioritized table when capacity opens up.

| Initiative | Suggested Lane | Notes / Likely Touch Points | Conflict Risk |
|------------|----------------|-----------------------------|---------------|
| Audit Column Compliance | C (Data) | Many module schema files + RLS + validators | **High** (many shared schema files) |
| DB Naming Migration | C (Data) | Schema renames + lambdas + validator whitelist removal | **High** |
| Cognito + External IDP Migration | E (Auth) | NextAuth providers/adapters + infra (Cognito) | **High** |
| Modular Terraform Refactor | G (Infra Perf) | Large infra restructure; long running | **Medium/High** |
| Tabbed Interface Standard Retrofit | F (UI Standards) | Many UI pages with tabs | **Medium** |
| AI Platform Seeding Strategy | H (AI Platform) | create-cora-project + module-ai schema seeding | **Medium** |
| AI Operations Monitoring | H (AI Platform) | org_common logging + new tables + admin pages | **Medium** |
| Validation Remediation | D (Tooling) | validators + templates across repo | **Medium/High** |

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
| Auth Standardization S1-S3 | `context-auth-standardization.md` | 2026-02-02 | 100% ADR-019 compliance across all 8 modules (Layer 1 + Layer 2). Fixed 312 permission errors. |
| Admin Standardization S4 | `context-admin-standardization.md` | 2026-01-30 | Full admin route standardization, version tracking, UI testing. Transferred to Auth Standardization. |
| Error Remediation S1-S4 | `context-error-remediation.md` | 2026-01-27 | 430→121 errors (72% reduction): TypeScript, API Tracer, Accessibility, Frontend Compliance, Next.js Routing, Admin Auth |
| WS Plugin Architecture S1-S2 | `context-ws-plugin-architecture.md` | 2026-01-25 | ADR-017 implementation, module availability integration, 100% compliance |

---

## Adding New Initiatives

1. Create context file: `memory-bank/context-{initiative}.md`
2. Add to this backlog with appropriate priority
3. Document dependencies
4. Update `activeContext.md` to list the new context file

---

**Maintained by:** All teams (update when claiming or completing work)