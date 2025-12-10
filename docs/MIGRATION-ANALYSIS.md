# CORA Development Toolkit - Migration Analysis

**Date:** December 10, 2025  
**Purpose:** Analyze files to migrate from pm-app repos to create a standalone toolkit

---

## Current State Analysis

### cora-dev-toolkit (Already Has)

The toolkit already has comprehensive content:

| Category       | Files                     | Description                            |
| -------------- | ------------------------- | -------------------------------------- |
| **docs/**      | 23 files                  | CORA standards, patterns, guides, ADRs |
| **scripts/**   | 8 scripts                 | Compliance checking, module creation   |
| **templates/** | 1 template                | `_module-template/` for new modules    |
| **config/**    | ESLint configs            | Auth and nav linting rules             |
| **Root**       | README, INTEGRATION-GUIDE | Main documentation                     |

### Files to Migrate

#### 1. Validation Scripts (FROM: `pm-app-stack/scripts/validation/`)

**Recommendation: MIGRATE (Copy and Adapt)**

| Validator           | Size       | Purpose                                           | Action     |
| ------------------- | ---------- | ------------------------------------------------- | ---------- |
| `a11y-validator/`   | Full suite | Section 508 accessibility validation              | ✅ Migrate |
| `api-tracer/`       | Full suite | API contract validation (frontend↔gateway↔lambda) | ✅ Migrate |
| `import-validator/` | Full suite | Python/TypeScript import validation               | ✅ Migrate |
| `schema-validator/` | Full suite | Database schema validation                        | ✅ Migrate |

**Migration Notes:**

- These validators are project-agnostic and should work for any CORA project
- Need to parameterize any pm-app-specific paths
- Will be integrated via `cora-validate.py` orchestrator (Phase 3 deliverable)

#### 2. Module Template Comparison

**Current Locations:**

- `cora-dev-toolkit/templates/_module-template/` - Toolkit version
- `pm-app-stack/packages/_module-template/` - Stack version

**Recommendation: SYNC to toolkit version as source of truth**

The toolkit version should be the authoritative template. Any improvements made in pm-app-stack should be merged back to the toolkit.

#### 3. pm-app-stack/module-development-toolkit/docs/

**Contents Analysis:**

| File                                       | Size         | Analysis                 | Action                        |
| ------------------------------------------ | ------------ | ------------------------ | ----------------------------- |
| `AI-MODULE-DEVELOPMENT-GUIDE.md`           | 590 bytes    | Stub/symlink placeholder | ❌ Skip (use toolkit version) |
| `API-TRACING-VALIDATION-GUIDE.md`          | 11,560 bytes | **UNIQUE content**       | ✅ Migrate to toolkit         |
| `CORA-PATTERNS-COOKBOOK.md`                | 667 bytes    | Stub/symlink placeholder | ❌ Skip (use toolkit version) |
| `VALIDATION-TOOLS-IMPLEMENTATION-GUIDE.md` | 20,944 bytes | Duplicate of toolkit     | ❌ Skip (already in toolkit)  |
| `frontend.md`                              | 649 bytes    | Stub/symlink placeholder | ❌ Skip (use toolkit version) |

---

## Files to Create (New)

### 1. Project Templates (Phase 2 Deliverable)

These don't exist yet and need to be created:

```
templates/
├── _module-template/          # ✅ EXISTS
├── _project-infra-template/   # 🆕 TO CREATE
│   ├── bootstrap/
│   ├── envs/dev/
│   ├── modules/modular-api-gateway/
│   ├── modules/secrets/
│   ├── lambdas/api-gateway-authorizer/
│   ├── scripts/
│   └── ...
└── _project-stack-template/   # 🆕 TO CREATE
    ├── apps/web/
    ├── packages/
    ├── scripts/validation/
    └── ...
```

### 2. Unified Validation Orchestrator (Phase 3 Deliverable)

```
validation/
├── cora-validate.py           # 🆕 TO CREATE
├── config/
│   └── validator-config.yaml  # 🆕 TO CREATE
├── structure-validator/       # 🆕 TO CREATE
└── portability-validator/     # 🆕 TO CREATE
```

---

## Migration Plan

### Immediate (Before Creating Remote Repo)

1. **Migrate `API-TRACING-VALIDATION-GUIDE.md`**

   - Source: `pm-app-stack/module-development-toolkit/docs/`
   - Target: `cora-dev-toolkit/docs/`

2. **Copy Validation Scripts**
   - Source: `pm-app-stack/scripts/validation/`
   - Target: `cora-dev-toolkit/validation/` (new directory)
   - Note: Create placeholder for orchestrator

### After Repo Created (Follow-on Sessions)

3. **Create Project Templates** (Phase 2)

   - Extract common patterns from pm-app-infra
   - Extract common patterns from pm-app-stack
   - Parameterize for any CORA project

4. **Create Unified Orchestrator** (Phase 3)
   - Wrap migrated validators
   - Add new validators (structure, portability)

---

## Files NOT to Migrate

These files are pm-app-specific and should stay in their repos:

### From pm-app-stack

- `memory-bank/` - Project-specific context
- `packages/{existing-modules}/` - Project-specific modules
- `apps/web/` - Project-specific application
- `services/` - Legacy monolith code
- Project-specific documentation in `docs/`

### From pm-app-infra

- `envs/dev/`, `envs/stg/`, `envs/prd/` - Project-specific environments
- `build/` - Built artifacts
- Project-specific Terraform state

---

## Post-Migration: Update pm-app Repos

After toolkit is in separate repo:

1. **pm-app-stack/module-development-toolkit/**

   - Convert to symlink OR
   - Add README pointing to toolkit repo OR
   - Remove entirely (reference toolkit as submodule)

2. **pm-app-stack/scripts/validation/**

   - Keep as project-specific validators OR
   - Reference toolkit validators via package/symlink

3. **pm-app-stack/.clinerules**
   - Update to reference external toolkit repo

---

## Summary

| Action           | Items                                                 | Priority |
| ---------------- | ----------------------------------------------------- | -------- |
| **Migrate Now**  | `API-TRACING-VALIDATION-GUIDE.md`, validation scripts | High     |
| **Create Now**   | memory-bank/, `.clinerules`                           | High     |
| **Create Later** | Project templates, orchestrator                       | Medium   |
| **Skip**         | Stub files, project-specific content                  | N/A      |

---

**Ready for Migration:** Yes, after copying validation scripts and unique docs.
