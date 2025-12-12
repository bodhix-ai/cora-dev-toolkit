# CORA Development Toolkit - Implementation Plan

**Status:** 📋 PLANNING COMPLETE - Ready for Implementation  
**Created:** December 10, 2025  
**Purpose:** Define the complete CORA Development Toolkit for building AI-enabled applications

---

## Executive Summary

The CORA Development Toolkit provides everything needed to create, develop, validate, and deploy CORA-compliant applications. This document outlines the complete toolkit implementation plan, including checklists for tracking progress across follow-on sessions.

### Goals

1. **Enable Rapid CORA Project Creation** - New project in < 4 hours with two repos
2. **Standardize Module Development** - Consistent patterns across all CORA projects
3. **Automate Validation** - Catch issues before deployment
4. **Provide Complete Documentation** - AI and human developers can build effectively

---

## CORA Architecture Overview

### Two-Repo Pattern

Every CORA project uses two repositories:

| Repo              | Purpose                | Contains                                     |
| ----------------- | ---------------------- | -------------------------------------------- |
| `{project}-infra` | Infrastructure as Code | Terraform, deploy scripts, authorizer lambda |
| `{project}-stack` | Application Code       | Next.js app, CORA modules, validation        |

### Module Naming Convention

```
module-{purpose}
```

Where `{purpose}` is a **single word** describing the module main responsibility.

### Core vs Functional Modules

| Category       | Modules                                      | Required    |
| -------------- | -------------------------------------------- | ----------- |
| **Core**       | module-access, module-ai, module-mgmt        | ✅ Yes      |
| **Functional** | module-kb, module-chat, module-project, etc. | Per feature |

---

## Module Catalog

### Core Modules (Required for CORA)

| Module            | Purpose                   | Tier | Description                                             |
| ----------------- | ------------------------- | ---- | ------------------------------------------------------- |
| **module-access** | Identity & access control | 1    | IDP integration, org context, user context, permissions |
| **module-ai**     | AI provider management    | 2    | Provider enablement, model config, monitoring           |
| **module-mgmt**   | Platform management       | 3    | Lambda management, warming, performance monitoring      |

### Functional Modules (Per-Feature)

| Module                   | Purpose            | Description                                            |
| ------------------------ | ------------------ | ------------------------------------------------------ |
| **module-kb**            | Knowledge base     | Multi-level KB management (global, org, project, chat) |
| **module-chat**          | Chat & messaging   | Chat sessions, sharing, history                        |
| **module-project**       | Project management | Project organization, membership                       |
| **module-dashboard**     | Dashboard          | Analytics, widgets, recent activity                    |
| **module-resume**        | Resume management  | Resume parsing, storage, templates                     |
| **module-certification** | Certifications     | Certification tracking, verification                   |
| **module-interview**     | AI interviews      | Audio interview, transcription, analysis               |
| **module-doc-analysis**  | Document analysis  | RAG compliance, document evaluation                    |

---

## Toolkit Structure

```
cora-development-toolkit/
├── README.md                           # Toolkit overview
├── INTEGRATION-GUIDE.md                # How to integrate toolkit
├── config/
│   ├── .eslintrc.cora-auth.js          # Auth linting rules
│   ├── .eslintrc.cora-nav.js           # Navigation linting rules
│   └── requirements.txt                # Python dependencies
├── docs/
│   ├── cora-project-boilerplate.md     # Project creation guide
│   ├── cora-core-modules.md            # Core module documentation
│   ├── cora-module-definition-of-done.md # Module certification
│   ├── cora-documentation-standards.md # Where docs live
│   ├── cora-project-setup-guide.md     # AI/human setup workflow
│   └── {existing docs}                 # Backend, frontend, etc.
├── scripts/
│   ├── create-cora-project.sh          # Create both repos
│   ├── create-cora-module.sh           # Create module from template
│   └── {existing scripts}              # Compliance checks, etc.
├── templates/
│   ├── _project-infra-template/        # Infra repo template
│   ├── _project-stack-template/        # Stack repo template
│   └── _module-template/               # Module template
└── validation/
    ├── cora-validate.py                # Unified orchestrator (Phase 3)
    ├── structure-validator/            # Project/module structure (Phase 3)
    ├── portability-validator/          # Hardcoded value detection (Phase 3)
    └── {existing validators}           # a11y, api-tracer, import, schema
```

---

## Implementation Phases

### Phase 1: Documentation Foundation (8 hours) ✅ COMPLETE

Create the core documentation that defines CORA standards.

#### Checklist

- [x] **1.1 cora-project-boilerplate.md**

  - [x] Infra repo structure requirements
  - [x] Stack repo structure requirements
  - [x] Core vs feature module designation
  - [x] Required infrastructure modules
  - [x] Environment configuration guide
  - [x] project.json schema definition

- [x] **1.2 cora-core-modules.md**

  - [x] module-access specification
  - [x] module-ai specification
  - [x] module-mgmt specification
  - [x] Tier system explanation
  - [x] Dependency graph
  - [x] Migration guidance from current naming

- [x] **1.3 cora-module-definition-of-done.md**

  - [x] AI-executable validation checklist
  - [x] Phase-based completion criteria
  - [x] Required documentation per module
  - [x] Certification report template

- [x] **1.4 cora-documentation-standards.md**
  - [x] Module-level documentation requirements
  - [x] Repo-level documentation guidelines
  - [x] Toolkit documentation maintenance
  - [x] Documentation validation rules

---

### Phase 2: Project Templates (12 hours) ✅ COMPLETE

Create templates for bootstrapping new CORA projects.

#### Checklist

- [x] **2.1 \_project-infra-template/**

  - [x] bootstrap/bootstrap_tf_state.sh
  - [x] envs/dev/ (main.tf, variables.tf, outputs.tf)
  - [x] envs/stg/ (placeholder)
  - [x] envs/tst/ (placeholder)
  - [x] envs/prd/ (placeholder)
  - [x] modules/modular-api-gateway/
  - [x] modules/secrets/
  - [x] modules/github-oidc-role/
  - [x] lambdas/api-gateway-authorizer/
  - [x] scripts/build-cora-modules.sh
  - [x] scripts/deploy-cora-modules.sh
  - [x] scripts/deploy-terraform.sh
  - [x] .github/workflows/ (CI/CD templates)
  - [x] .clinerules
  - [x] README.md
  - [x] project.json

- [x] **2.2 \_project-stack-template/**

  - [x] apps/web/ (Next.js app shell)
  - [x] packages/\_module-template/
  - [x] packages/api-client/
  - [x] packages/shared-types/
  - [x] packages/contracts/
  - [x] scripts/validation/ (link to validators)
  - [x] scripts/git-hooks/
  - [x] tests/ (E2E test structure)
  - [x] docs/ (placeholder structure)
  - [x] .github/workflows/ (CI/CD templates)
  - [x] .clinerules
  - [x] pnpm-workspace.yaml
  - [x] tsconfig.json
  - [x] project.json
  - [x] README.md

- [x] **2.3 create-cora-project.sh**

  - [x] Parse project name argument
  - [x] Create {project}-infra repo
  - [x] Create {project}-stack repo
  - [x] Initialize git repos
  - [x] Set up remote origins
  - [x] Replace template placeholders
  - [x] Run initial validation
  - [x] --org flag for organization name
  - [x] --with-core-modules flag for core module scaffolding
  - [x] --dry-run flag for preview mode

- [x] **2.4 cora-project-setup-guide.md**
  - [x] AI/human workflow documentation
  - [x] Step-by-step project creation guide
  - [x] Core modules setup instructions
  - [x] Validation and testing guidance

---

### Phase 3: Validation Framework (8 hours) ✅ COMPLETE

Create unified validation orchestration and new validators.

#### Checklist

- [x] **3.1 cora-validate.py (Unified Orchestrator)**

  - [x] Module validation mode
  - [x] Project validation mode
  - [x] Individual check selection
  - [x] Report generation (text, json, markdown)
  - [x] Certification report mode
  - [x] Integration with existing validators

- [x] **3.2 structure-validator/**

  - [x] Project structure validation
  - [x] Module structure validation
  - [x] module.json completeness check
  - [x] Required files verification
  - [x] Directory convention check

- [x] **3.3 portability-validator/**

  - [x] Hardcoded project name detection
  - [x] Hardcoded AWS region detection
  - [x] Hardcoded account ID detection
  - [x] Hardcoded URL detection
  - [x] Configurable forbidden patterns

- [x] **3.4 Existing Validator Integration**

  - [x] a11y-validator wrapper
  - [x] api-tracer wrapper
  - [x] import-validator wrapper
  - [x] schema-validator wrapper

- [x] **3.5 CI/CD Integration**
  - [x] GitHub Actions workflow template
  - [x] Pre-commit hook integration
  - [x] Validation gate documentation

---

### Phase 4: Module Registry System (12 hours) ✅ COMPLETE

Create database-backed module registry for runtime control.

#### Checklist

- [x] **4.1 Database Schema**

  - [x] platform_module_registry table
  - [x] platform_module_usage table
  - [x] RLS policies
  - [x] Migration scripts

- [x] **4.2 Module Registry Lambda (module-mgmt)**

  - [x] GET /platform/modules - List all modules
  - [x] GET /platform/modules/{name} - Get module details
  - [x] PUT /platform/modules/{name} - Update module config
  - [x] POST /platform/modules/{name}/enable - Enable module
  - [x] POST /platform/modules/{name}/disable - Disable module

- [x] **4.3 Frontend Integration**

  - [x] useModuleRegistry hook
  - [x] Module-aware navigation
  - [x] Module admin dashboard
  - [x] Usage analytics display

- [x] **4.4 Runtime Behavior**
  - [x] Navigation filtering by enabled modules
  - [x] API gateway module check (optional)
  - [x] Usage tracking middleware

---

### Phase 5: Core Module Templates (16 hours) ✅ COMPLETE

Create template implementations for core modules.

#### Checklist

- [x] **5.1 module-access Template**

  - [x] Backend layer (access-common)
  - [x] Lambda handlers (auth operations)
  - [x] Frontend components (contexts, hooks)
  - [x] Infrastructure (IAM, Cognito integration points)
  - [x] Documentation
  - [x] module.json

- [x] **5.2 module-ai Template**

  - [x] Backend layer (ai-common)
  - [x] Lambda handlers (provider management)
  - [x] Frontend components (provider config UI)
  - [x] Infrastructure
  - [x] Documentation
  - [x] module.json

- [x] **5.3 module-mgmt Template**
  - [x] Backend layer (mgmt-common)
  - [x] Lambda handlers (function management)
  - [x] Frontend components (admin dashboard)
  - [x] Infrastructure
  - [x] Documentation
  - [x] module.json

---

### Phase 6: Retrofit & Testing (8 hours)

Apply new standards to existing pm-app project for validation.

#### Checklist

- [ ] **6.1 End-to-End Testing**
  - [ ] Create test CORA project
  - [ ] Deploy core modules
  - [ ] Deploy sample functional module
  - [ ] Validate module registry
  - [ ] Document lessons learned

---

## Timeline Estimate

| Phase                             | Estimated Hours | Sessions (~4hr each) | Status      |
| --------------------------------- | --------------- | -------------------- | ----------- |
| Phase 1: Documentation Foundation | 8 hours         | 2 sessions           | ✅ COMPLETE |
| Phase 2: Project Templates        | 12 hours        | 3 sessions           | ✅ COMPLETE |
| Phase 3: Validation Framework     | 8 hours         | 2 sessions           | ✅ COMPLETE |
| Phase 4: Module Registry          | 12 hours        | 3 sessions           | ✅ COMPLETE |
| Phase 5: Core Module Templates    | 16 hours        | 4 sessions           | ✅ COMPLETE |
| Phase 6: Retrofit & Testing       | 8 hours         | 2 sessions           | 🔲 Pending  |
| **Total**                         | **64 hours**    | **16 sessions**      |             |

---

## Success Criteria

### Toolkit Complete When:

1. ✅ New CORA project can be created from templates in < 4 hours
2. ✅ All documentation provides actionable guidance
3. ✅ Validation catches common issues before deployment
4. ✅ Core modules have reference implementations
5. ✅ Module registry provides runtime control
6. ✅ Existing pm-app project passes all validations

### Definition of Done for Each Phase:

- [ ] All checklist items completed
- [ ] Documentation reviewed and accurate
- [ ] Code tested and working
- [ ] No validation errors
- [ ] Updated in this plan

---

## Migration Mapping (pm-app-stack)

Current to new naming for retrofit:

| Current                                 | New            | Action                     |
| --------------------------------------- | -------------- | -------------------------- |
| org-module                              | module-access  | Rename directory + imports |
| ai-enablement-module + ai-config-module | module-ai      | Merge + rename             |
| lambda-mgmt-module                      | module-mgmt    | Rename                     |
| kb-module                               | module-kb      | Rename                     |
| (services/) chat handlers               | module-chat    | Extract + create           |
| (services/) project handlers            | module-project | Extract + create           |

---

## Next Steps

### Immediate (This Session)

1. Create this plan document ✅
2. Update memory-bank files with plan reference ✅
3. Create initial cora-project-boilerplate.md structure ✅

### Follow-on Sessions

Use the phase checklists above to track progress. Each session should:

1. Check current checklist state
2. Work on uncompleted items
3. Update checklist progress
4. Document any blockers or changes

---

## References

- [Lambda Mgmt Module Implementation Plan](../../pm-app-stack/docs/implementation/lambda-mgmt-module-implementation-plan.md)
- [CORA Patterns Checklist](./cora-patterns-checklist.md)
- [AI Module Development Guide](./ai-module-development-guide.md)
- [Validation Tools Guide](./validation-tools-implementation-guide.md)

---

**Document Version:** 1.1  
**Last Updated:** December 10, 2025  
**Status:** Phase 1 & 2 Complete - Ready for Phase 3
