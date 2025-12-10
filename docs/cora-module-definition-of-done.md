# CORA Module Definition of Done

**Status:** 📋 Phase 1 Documentation  
**Created:** December 10, 2025  
**Purpose:** Define certification criteria and validation checklist for CORA modules

---

## Overview

This document defines the **Definition of Done (DoD)** for CORA modules. A module is considered complete and ready for production when it passes all validation checks and meets all certification criteria.

The checklist is designed to be:

- **AI-Executable** - Automated validators can check most criteria
- **Phase-Based** - Progress can be tracked incrementally
- **Comprehensive** - Covers all aspects of module quality

---

## Certification Levels

| Level      | Requirements                                      | Badge |
| ---------- | ------------------------------------------------- | ----- |
| **Bronze** | Basic structure, module.json, builds successfully | 🥉    |
| **Silver** | + Documentation, tests, validation passes         | 🥈    |
| **Gold**   | + Full integration, production-ready              | 🥇    |

---

## Phase-Based Completion Criteria

### Phase 1: Foundation (Bronze Level) 🥉

Basic module structure and configuration.

#### Checklist

- [ ] **1.1 Directory Structure**

  - [ ] Module directory follows naming convention: `module-{purpose}`
  - [ ] Required directories exist: `backend/`, `frontend/`, `db/`, `docs/`
  - [ ] `module.json` exists at root
  - [ ] `README.md` exists at root

- [ ] **1.2 module.json Configuration**

  - [ ] Valid JSON syntax
  - [ ] Required fields present: `name`, `version`, `description`
  - [ ] `tier` field specified (1, 2, or 3 for core; omit for functional)
  - [ ] `dependencies.modules` array defined
  - [ ] `dependencies.packages` array defined
  - [ ] `provides.database.tables` array defined
  - [ ] `provides.lambdas` array defined
  - [ ] `provides.routes` array defined
  - [ ] `provides.frontend.components` array defined
  - [ ] `provides.frontend.hooks` array defined
  - [ ] `provides.frontend.contexts` array defined

- [ ] **1.3 Build Verification**
  - [ ] TypeScript compiles without errors
  - [ ] Backend Python syntax valid
  - [ ] No missing imports
  - [ ] Package can be built: `pnpm build`

---

### Phase 2: Implementation (Silver Level) 🥈

Complete implementation with tests and documentation.

#### Checklist

- [ ] **2.1 Backend Implementation**

  - [ ] Common layer exists: `backend/{module}-common/`
  - [ ] `__init__.py` exports public API
  - [ ] Lambda handlers exist for all routes in module.json
  - [ ] Error handling follows CORA patterns
  - [ ] Logging implemented with correlation IDs

- [ ] **2.2 Database Schema**

  - [ ] SQL migrations exist in `db/schema/`
  - [ ] Migrations are numbered sequentially (001-, 002-, etc.)
  - [ ] RLS policies applied
  - [ ] Seed data exists if needed (`db/seed/`)
  - [ ] All tables in module.json have corresponding migrations

- [ ] **2.3 Frontend Implementation**

  - [ ] All components in module.json exist
  - [ ] All hooks in module.json exist
  - [ ] All contexts in module.json exist
  - [ ] Components follow accessibility standards
  - [ ] TypeScript types exported from `index.ts`

- [ ] **2.4 Testing**

  - [ ] Backend unit tests exist: `backend/tests/`
  - [ ] Frontend unit tests exist (if applicable)
  - [ ] E2E tests exist: `tests/e2e/`
  - [ ] Test coverage meets minimum threshold (80%)
  - [ ] All tests pass: `pnpm test`

- [ ] **2.5 Documentation**
  - [ ] `README.md` includes module overview
  - [ ] `docs/api-reference.md` documents all routes
  - [ ] `docs/integration-guide.md` explains usage
  - [ ] Code comments for complex logic
  - [ ] Type definitions are documented

---

### Phase 3: Integration (Gold Level) 🥇

Full integration and production readiness.

#### Checklist

- [ ] **3.1 API Integration**

  - [ ] All routes registered in API Gateway
  - [ ] Routes follow CORA patterns (RESTful, consistent)
  - [ ] Request validation using Zod schemas
  - [ ] Response validation using Zod schemas
  - [ ] Error responses follow API standard

- [ ] **3.2 Infrastructure**

  - [ ] Lambda configuration in `infrastructure/lambda-config.tf`
  - [ ] IAM permissions defined and minimal
  - [ ] Environment variables documented
  - [ ] Secrets properly referenced (no hardcoded values)

- [ ] **3.3 Validation**

  - [ ] Structure validation passes
  - [ ] Import validation passes (no circular deps)
  - [ ] Portability validation passes (no hardcoded values)
  - [ ] Accessibility validation passes
  - [ ] Full CORA validation: `cora-validate.py --mode=module`

- [ ] **3.4 Production Readiness**

  - [ ] Error handling covers edge cases
  - [ ] Rate limiting considered (if applicable)
  - [ ] Caching strategy documented (if applicable)
  - [ ] Performance tested under load
  - [ ] Security review completed

- [ ] **3.5 Integration Verification**
  - [ ] Works with all declared dependencies
  - [ ] Does not break dependent modules
  - [ ] Navigation integration complete
  - [ ] Context providers properly nested
  - [ ] E2E integration tests pass

---

## Validation Commands

### Quick Validation

```bash
# Validate single module
python scripts/validation/cora-validate.py --mode=module --path=packages/module-{name}

# Output: PASS/FAIL with details
```

### Full Validation Suite

```bash
# Run all validators
pnpm run validate:module packages/module-{name}

# This runs:
# 1. Structure validation
# 2. Import validation
# 3. Portability validation
# 4. TypeScript compilation
# 5. Unit tests
# 6. Lint checks
```

### Certification Report

```bash
# Generate certification report
python scripts/validation/cora-validate.py --mode=certify --path=packages/module-{name}

# Outputs: certification-report.md
```

---

## Certification Report Template

When a module completes all phases, generate this certification report:

```markdown
# Module Certification Report

**Module:** module-{name}
**Version:** 1.0.0
**Certification Date:** YYYY-MM-DD
**Certification Level:** 🥇 Gold / 🥈 Silver / 🥉 Bronze

## Summary

| Category       | Status | Score |
| -------------- | ------ | ----- |
| Structure      | ✅     | 10/10 |
| Implementation | ✅     | 15/15 |
| Testing        | ✅     | 10/10 |
| Documentation  | ✅     | 8/10  |
| Integration    | ✅     | 12/12 |
| **Total**      | ✅     | 55/57 |

## Phase Results

### Phase 1: Foundation ✅

- [x] Directory structure valid
- [x] module.json complete
- [x] Build successful

### Phase 2: Implementation ✅

- [x] Backend complete (5/5 handlers)
- [x] Frontend complete (4/4 components)
- [x] Database migrations (3 tables)
- [x] Tests passing (45/45)

### Phase 3: Integration ✅

- [x] API routes registered
- [x] Infrastructure configured
- [x] Validation passing
- [x] Production ready

## Validation Results
```

✅ structure-validator: PASS
✅ import-validator: PASS
✅ portability-validator: PASS
✅ a11y-validator: PASS (0 violations)
✅ schema-validator: PASS

```

## Notes

- Module ready for production deployment
- No known issues or limitations
- Recommended for inclusion in module registry

## Certified By

Automated validation: cora-validate.py v1.0.0
Manual review: [Reviewer Name] (if applicable)
```

---

## Common Validation Failures

### Structure Issues

| Issue                       | Solution                                     |
| --------------------------- | -------------------------------------------- |
| Missing `module.json`       | Create from template, fill required fields   |
| Invalid directory structure | Add missing directories: backend/, frontend/ |
| Wrong naming convention     | Rename to `module-{single-word}`             |

### Implementation Issues

| Issue             | Solution                                     |
| ----------------- | -------------------------------------------- |
| Missing exports   | Add to `index.ts` / `__init__.py`            |
| Handler not found | Create handler for each route in module.json |
| Type errors       | Fix TypeScript types, run `tsc --noEmit`     |

### Integration Issues

| Issue                 | Solution                                           |
| --------------------- | -------------------------------------------------- |
| Circular dependencies | Refactor to break cycles, use dependency injection |
| Hardcoded values      | Replace with environment variables                 |
| Route not registered  | Add to API Gateway configuration                   |

---

## Automated Validation Rules

### Structure Validator Rules

```yaml
required_files:
  - module.json
  - README.md

required_directories:
  - backend
  - frontend
  - db
  - docs

module_json_required_fields:
  - name
  - version
  - description
  - dependencies
  - provides
```

### Portability Validator Rules

```yaml
forbidden_patterns:
  - pattern: "pm-app-"
    message: "Hardcoded project prefix detected"

  - pattern: "us-east-1"
    message: "Hardcoded AWS region detected"
    allow_in:
      - ".tf"
      - "terraform"

  - pattern: '\d{12}'
    message: "Possible AWS account ID detected"
    context: "12-digit number"
```

### Import Validator Rules

```yaml
tier_rules:
  tier_1:
    allowed_dependencies: []
  tier_2:
    allowed_dependencies: ["module-access"]
  tier_3:
    allowed_dependencies: ["module-access", "module-ai"]

forbidden_imports:
  - from: "packages/*"
    to: "services/*"
    message: "Modules should not import from legacy services"
```

---

## Progressive Certification

Modules can achieve certification progressively:

```
📋 Not Started
    ↓
🥉 Bronze (Basic structure)
    ↓
🥈 Silver (Full implementation + tests)
    ↓
🥇 Gold (Production ready)
```

### Tracking in module.json

```json
{
  "name": "module-kb",
  "version": "1.0.0",
  "certification": {
    "level": "silver",
    "date": "2025-12-10",
    "validator_version": "1.0.0"
  }
}
```

---

## Definition of Done Summary

A CORA module is **DONE** when:

1. ✅ All Phase 1 (Foundation) items complete
2. ✅ All Phase 2 (Implementation) items complete
3. ✅ All Phase 3 (Integration) items complete
4. ✅ Automated validation passes
5. ✅ Certification report generated
6. ✅ Documentation reviewed
7. ✅ Ready for production deployment

---

## Related Documentation

- [cora-project-boilerplate.md](./cora-project-boilerplate.md) - Project structure
- [cora-core-modules.md](./cora-core-modules.md) - Core module specifications
- [cora-documentation-standards.md](./cora-documentation-standards.md) - Documentation guidelines
- [cora-validation-guide.md](./cora-validation-guide.md) - Validation framework details

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** Phase 1 Complete
