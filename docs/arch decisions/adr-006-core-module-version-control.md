# ADR-006: Core Module Version Control Strategy

**Status:** PROPOSED  
**Date:** December 10, 2025  
**Decision:** Pending

---

## Context

CORA has three core modules that every CORA-compliant application requires:

- **module-access** (Tier 1) - Identity & access control
- **module-ai** (Tier 2) - AI provider management
- **module-mgmt** (Tier 3) - Platform management & monitoring

We need to determine how these core modules should be version controlled, distributed, and updated across CORA projects.

---

## Decision Drivers

1. **Maintainability** - How easy is it to maintain and update core modules?
2. **Consistency** - How do we ensure projects stay aligned with CORA standards?
3. **Flexibility** - Can projects customize modules for their specific needs?
4. **Update Path** - How do projects receive improvements and security fixes?
5. **Complexity** - What's the operational overhead?
6. **Independence** - Can projects evolve independently?

---

## Options Analysis

### Option A: Templates in cora-dev-toolkit

```
cora-dev-toolkit/
├── templates/
│   ├── _module-access-template/
│   ├── _module-ai-template/
│   └── _module-mgmt-template/
```

**How it works:**

- Templates are copied into new projects via `create-cora-project.sh`
- Projects own their copy and can modify freely
- Updates require manual sync from toolkit

**Scoring:**

| Criterion       | Score      | Notes                                       |
| --------------- | ---------- | ------------------------------------------- |
| Maintainability | ⭐⭐⭐     | Single source, but no automatic propagation |
| Consistency     | ⭐⭐       | Projects diverge over time                  |
| Flexibility     | ⭐⭐⭐⭐⭐ | Full customization possible                 |
| Update Path     | ⭐⭐       | Manual diff/merge required                  |
| Complexity      | ⭐⭐⭐⭐⭐ | Simplest to understand                      |
| Independence    | ⭐⭐⭐⭐⭐ | Projects fully independent                  |

**Best for:** Small teams, projects with unique requirements, early-stage CORA

---

### Option B: Separate Repos Per Core Module

```
Repositories:
- bodhix-ai/cora-module-access  (v1.2.0)
- bodhix-ai/cora-module-ai      (v1.1.0)
- bodhix-ai/cora-module-mgmt    (v1.3.0)

Project imports via:
- Git submodules, OR
- npm packages (@cora/module-access)
```

**How it works:**

- Each module has independent versioning (semver)
- Projects pin to specific versions
- Updates via version bumps

**Scoring:**

| Criterion       | Score    | Notes                                      |
| --------------- | -------- | ------------------------------------------ |
| Maintainability | ⭐⭐     | 3+ repos to maintain, release coordination |
| Consistency     | ⭐⭐⭐⭐ | Version pins ensure consistency            |
| Flexibility     | ⭐⭐⭐   | Can fork if needed, but lose updates       |
| Update Path     | ⭐⭐⭐⭐ | Semver, changelog, clear upgrade path      |
| Complexity      | ⭐⭐     | Multiple repos, dependency management      |
| Independence    | ⭐⭐⭐   | Pinned versions, but tied to upstream      |

**Best for:** Large organizations, multiple teams, enterprise CORA

---

### Option C: Single cora-core-modules Repo

```
bodhix-ai/cora-core-modules/  (v1.0.0)
├── module-access/
├── module-ai/
└── module-mgmt/

Project imports via:
- Git submodule pointing to cora-core-modules
- Single version for all core modules
```

**How it works:**

- All core modules versioned together
- Atomic updates (all or nothing)
- Single dependency to manage

**Scoring:**

| Criterion       | Score      | Notes                              |
| --------------- | ---------- | ---------------------------------- |
| Maintainability | ⭐⭐⭐⭐   | Single repo, atomic releases       |
| Consistency     | ⭐⭐⭐⭐⭐ | All projects on same version       |
| Flexibility     | ⭐⭐       | Can't update modules independently |
| Update Path     | ⭐⭐⭐⭐⭐ | Single version bump, simple        |
| Complexity      | ⭐⭐⭐⭐   | One submodule/package              |
| Independence    | ⭐⭐       | Tied to core-modules version       |

**Best for:** Strict standardization, coordinated releases, platform teams

---

### Option D: Hybrid (Templates + Shared Library)

```
cora-dev-toolkit/
├── templates/
│   ├── _module-access-template/  (structure only)
│   ├── _module-ai-template/      (structure only)
│   └── _module-mgmt-template/    (structure only)

npm package: @cora/core (v1.0.0)
├── access/   (shared auth logic, hooks, types)
├── ai/       (shared AI logic, hooks, types)
└── mgmt/     (shared platform logic, hooks, types)
```

**How it works:**

- Templates provide project structure (copied once)
- Shared logic lives in npm package (versioned)
- Projects get structure flexibility + shared code updates

**Scoring:**

| Criterion       | Score    | Notes                                        |
| --------------- | -------- | -------------------------------------------- |
| Maintainability | ⭐⭐⭐   | Two things to maintain (templates + package) |
| Consistency     | ⭐⭐⭐⭐ | Core logic consistent via package            |
| Flexibility     | ⭐⭐⭐⭐ | Structure customizable, core logic shared    |
| Update Path     | ⭐⭐⭐⭐ | npm update for shared code                   |
| Complexity      | ⭐⭐     | Most complex setup                           |
| Independence    | ⭐⭐⭐⭐ | Balance of shared + custom                   |

**Best for:** Mature CORA ecosystem, large-scale deployments

---

### Option E: Fork-Based Open Source Model

```
bodhix-ai/cora-core-modules/  (upstream - authoritative)
├── module-access/
├── module-ai/
├── module-mgmt/
└── CONTRIBUTING.md

Projects fork/copy from upstream:
├── pm-app-stack/packages/module-*     (customized)
├── project-2-stack/packages/module-*  (customized)
└── project-3-stack/packages/module-*  (customized)
```

**How it works:**

- Central repo contains authoritative codebase
- Projects fork/copy modules at a specific version
- Projects customize freely for their needs
- Enhancements flow back via PR process
- Open source governance (CONTRIBUTING.md)

**Scoring:**

| Criterion       | Score      | Notes                                                 |
| --------------- | ---------- | ----------------------------------------------------- |
| Maintainability | ⭐⭐⭐⭐   | Central repo well-maintained, projects own their code |
| Consistency     | ⭐⭐⭐     | Projects can stay in sync if disciplined              |
| Flexibility     | ⭐⭐⭐⭐⭐ | Full customization, projects decide what to sync      |
| Update Path     | ⭐⭐⭐     | Manual but structured process                         |
| Complexity      | ⭐⭐⭐⭐   | Moderate - familiar open source model                 |
| Independence    | ⭐⭐⭐⭐⭐ | Projects fully independent                            |
| Community Value | ⭐⭐⭐⭐   | Enhancements benefit all projects                     |

**Best for:** 5+ projects, shared improvements, familiar open source workflow

See [Option E Detailed Documentation](./adr-006-option-e-fork-model.md) for full workflow details.

---

## Comparison Matrix

| Criterion       | A: Templates | B: Separate Repos | C: Single Repo | D: Hybrid | E: Fork Model |
| --------------- | ------------ | ----------------- | -------------- | --------- | ------------- |
| Maintainability | ⭐⭐⭐       | ⭐⭐              | ⭐⭐⭐⭐       | ⭐⭐⭐    | ⭐⭐⭐⭐      |
| Consistency     | ⭐⭐         | ⭐⭐⭐⭐          | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐  | ⭐⭐⭐        |
| Flexibility     | ⭐⭐⭐⭐⭐   | ⭐⭐⭐            | ⭐⭐           | ⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐    |
| Update Path     | ⭐⭐         | ⭐⭐⭐⭐          | ⭐⭐⭐⭐⭐     | ⭐⭐⭐⭐  | ⭐⭐⭐        |
| Complexity      | ⭐⭐⭐⭐⭐   | ⭐⭐              | ⭐⭐⭐⭐       | ⭐⭐      | ⭐⭐⭐⭐      |
| Independence    | ⭐⭐⭐⭐⭐   | ⭐⭐⭐            | ⭐⭐           | ⭐⭐⭐⭐  | ⭐⭐⭐⭐⭐    |
| Community Value | -            | -                 | -              | -         | ⭐⭐⭐⭐      |
| **Total**       | **22**       | **18**            | **22**         | **21**    | **28**        |

---

## Use Case Recommendations

### If you have ONE CORA project (pm-app)

→ **Option A: Templates** - Simplest, full control, no external dependencies

### If you plan 2-5 CORA projects

→ **Option C: Single Repo** - Easy consistency, atomic updates, manageable

### If you plan 5+ CORA projects or multi-team

→ **Option E: Fork Model** - Familiar open source workflow, enhancements flow back upstream

### If core modules will be customized heavily per project

→ **Option E: Fork Model** - Full ownership with structured contribution process

### If core modules should stay standard across projects

→ **Option C: Single Repo** - Enforced consistency

### If you want community-style contribution process

→ **Option E: Fork Model** - PR-based contributions, central review, shared improvements

---

## Current State Analysis

Looking at pm-app-stack's current structure:

- `packages/org-module/` → would become module-access
- `packages/ai-enablement-module/` + `packages/ai-config-module/` → would become module-ai
- `packages/lambda-mgmt-module/` → would become module-mgmt

These are currently **embedded in the project** (Option A pattern).

---

## Recommendation

**For immediate implementation (Phase 4-6):** Start with **Option A (Templates)**

**Rationale:**

1. pm-app is currently the only CORA project
2. Templates are already being created
3. Lowest complexity to get started
4. Can evolve to Option C or D later if needed

**Future Evolution Path:**

```
Phase 4-6: Option A (Templates in cora-dev-toolkit)
    ↓
When 2nd project starts: Evaluate Option C (single repo)
    ↓
When 3+ projects: Consider Option D (hybrid)
```

**Migration would be:**

1. Extract core module code into cora-core-modules repo
2. Update templates to reference shared package
3. Retrofit existing projects

---

## Decision

**Selected Option:** Option E (Fork-Based Open Source Model) - Simplified

**Rationale:**

1. Planning for 5+ CORA projects requires shared foundation
2. Projects need full customization flexibility
3. Enhancements should flow back via PR process
4. Familiar open source governance model

**Initial Simplifications (Phase 1):**

- No automated sync tooling (UPSTREAM_VERSION.md, LOCAL_CHANGES.md) initially
- No cora-cli sync commands initially
- New projects still created from centralized code
- Manual coordination for contributions back upstream

**Future Enhancements (When Needed):**

- Add UPSTREAM_VERSION.md tracking
- Add LOCAL_CHANGES.md documentation
- Build cora-cli sync tooling
- Automated upstream notification workflows

---

## Consequences

### If Option A (Templates):

- ✅ Can proceed immediately with Phase 4-6
- ✅ No new repos needed
- ⚠️ pm-app and future projects may diverge
- 📋 Add "sync from toolkit" process to project maintenance

### If Option C (Single Repo):

- ✅ Creates cora-core-modules repo now
- ✅ All projects stay in sync
- ⚠️ More upfront work
- 📋 Need submodule management in projects

---

## References

- [CORA Development Toolkit Plan](./cora-development-toolkit-plan.md)
- [CORA Core Modules Specification](./cora-core-modules.md)
- [Two-Repo Pattern](./cora-project-boilerplate.md)
