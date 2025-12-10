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

Where `{purpose}` is a **single word** describing the module's main responsibility.

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
│   ├── CORA-PROJECT-BOILERPLATE.md     # Project creation guide
│   ├── CORA-CORE-MODULES.md            # Core module documentation
│   ├── CORA-MODULE-DEFINITION-OF-DONE.md # Module certification
│   ├── CORA-DOCUMENTATION-STANDARDS.md # Where docs live
│   ├── CORA-VALIDATION-GUIDE.md        # Validation framework
│   └── {existing docs}                 # Backend, frontend, etc.
├── scripts/
│   ├── create-cora-project.sh          # NEW: Create both repos
│   ├── create-cora-module.sh           # Create module from template
│   └── {existing scripts}              # Compliance checks, etc.
├── templates/
│   ├── _project-infra-template/        # NEW: Infra repo template
│   ├── _project-stack-template/        # NEW: Stack repo template
│   └── _module-template/               # Module template
└── validation/
    ├── cora-validate.py                # NEW: Unified orchestrator
    ├── structure-validator/            # NEW: Project/module structure
    ├── portability-validator/          # NEW: Hardcoded value detection
    └── {link to pm-app-stack/scripts/validation/}
```

---

## Implementation Phases

### Phase 1: Documentation Foundation (8 hours)

Create the core documentation that defines CORA standards.

#### Checklist

- [ ] **1.1 CORA-PROJECT-BOILERPLATE.md**

  - [ ] Infra repo structure requirements
  - [ ] Stack repo structure requirements
  - [ ] Core vs feature module designation
  - [ ] Required infrastructure modules
  - [ ] Environment configuration guide
  - [ ] project.json schema definition

- [ ] **1.2 CORA-CORE-MODULES.md**

  - [ ] module-access specification
  - [ ] module-ai specification
  - [ ] module-mgmt specification
  - [ ] Tier system explanation
  - [ ] Dependency graph
  - [ ] Migration guidance from current naming

- [ ] **1.3 CORA-MODULE-DEFINITION-OF-DONE.md**

  - [ ] AI-executable validation checklist
  - [ ] Phase-based completion criteria
  - [ ] Required documentation per module
  - [ ] Certification report template

- [ ] **1.4 CORA-DOCUMENTATION-STANDARDS.md**
  - [ ] Module-level documentation requirements
  - [ ] Repo-level documentation guidelines
  - [ ] Toolkit documentation maintenance
  - [ ] Documentation validation rules

---

### Phase 2: Project Templates (12 hours)

Create templates for bootstrapping new CORA projects.

#### Checklist

- [ ] **2.1 \_project-infra-template/**

  - [ ] bootstrap/bootstrap_tf_state.sh
  - [ ] envs/dev/ (main.tf, variables.tf, outputs.tf)
  - [ ] envs/stg/ (placeholder)
  - [ ] envs/prd/ (placeholder)
  - [ ] modules/modular-api-gateway/
  - [ ] modules/secrets/
  - [ ] modules/github-oidc-role/
  - [ ] lambdas/api-gateway-authorizer/
  - [ ] scripts/build-cora-modules.sh
  - [ ] scripts/deploy-cora-modules.sh
  - [ ] scripts/deploy-terraform.sh
  - [ ] .github/workflows/ (CI/CD templates)
  - [ ] .clinerules
  - [ ] README.md
  - [ ] project.json

- [ ] **2.2 \_project-stack-template/**

  - [ ] apps/web/ (Next.js app shell)
  - [ ] packages/\_module-template/
  - [ ] packages/api-client/
  - [ ] packages/shared-types/
  - [ ] packages/contracts/
  - [ ] scripts/validation/ (link to validators)
  - [ ] scripts/git-hooks/
  - [ ] tests/ (E2E test structure)
  - [ ] docs/ (placeholder structure)
  - [ ] .github/workflows/ (CI/CD templates)
  - [ ] .clinerules
  - [ ] pnpm-workspace.yaml
  - [ ] tsconfig.json
  - [ ] project.json
  - [ ] README.md

- [ ] **2.3 create-cora-project.sh**
  - [ ] Parse project name argument
  - [ ] Create {project}-infra repo
  - [ ] Create {project}-stack repo
  - [ ] Initialize git repos
  - [ ] Set up remote origins
  - [ ] Replace template placeholders
  - [ ] Run initial validation

---

### Phase 3: Validation Framework (8 hours)

Create unified validation orchestration and new validators.

#### Checklist

- [ ] **3.1 cora-validate.py (Unified Orchestrator)**

  - [ ] Module validation mode
  - [ ] Project validation mode
  - [ ] Individual check selection
  - [ ] Report generation (text, json, markdown)
  - [ ] Certification report mode
  - [ ] Integration with existing validators

- [ ] **3.2 structure-validator/**

  - [ ] Project structure validation
  - [ ] Module structure validation
  - [ ] module.json completeness check
  - [ ] Required files verification
  - [ ] Directory convention check

- [ ] **3.3 portability-validator/**

  - [ ] Hardcoded project name detection
  - [ ] Hardcoded AWS region detection
  - [ ] Hardcoded account ID detection
  - [ ] Hardcoded URL detection
  - [ ] Configurable forbidden patterns

- [ ] **3.4 Existing Validator Integration**

  - [ ] a11y-validator wrapper
  - [ ] api-tracer wrapper
  - [ ] import-validator wrapper
  - [ ] schema-validator wrapper

- [ ] **3.5 CI/CD Integration**
  - [ ] GitHub Actions workflow template
  - [ ] Pre-commit hook integration
  - [ ] Validation gate documentation

---

### Phase 4: Module Registry System (12 hours)

Create database-backed module registry for runtime control.

#### Checklist

- [ ] **4.1 Database Schema**

  - [ ] platform_module_registry table
  - [ ] platform_module_usage table
  - [ ] RLS policies
  - [ ] Migration scripts

- [ ] **4.2 Module Registry Lambda (module-mgmt)**

  - [ ] GET /platform/modules - List all modules
  - [ ] GET /platform/modules/{name} - Get module details
  - [ ] PUT /platform/modules/{name} - Update module config
  - [ ] POST /platform/modules/{name}/enable - Enable module
  - [ ] POST /platform/modules/{name}/disable - Disable module

- [ ] **4.3 Frontend Integration**

  - [ ] useModuleRegistry hook
  - [ ] Module-aware navigation
  - [ ] Module admin dashboard
  - [ ] Usage analytics display

- [ ] **4.4 Runtime Behavior**
  - [ ] Navigation filtering by enabled modules
  - [ ] API gateway module check (optional)
  - [ ] Usage tracking middleware

---

### Phase 5: Core Module Templates (16 hours)

Create template implementations for core modules.

#### Checklist

- [ ] **5.1 module-access Template**

  - [ ] Backend layer (access-common)
  - [ ] Lambda handlers (auth operations)
  - [ ] Frontend components (contexts, hooks)
  - [ ] Infrastructure (IAM, Cognito integration points)
  - [ ] Documentation
  - [ ] module.json

- [ ] **5.2 module-ai Template**

  - [ ] Backend layer (ai-common)
  - [ ] Lambda handlers (provider management)
  - [ ] Frontend components (provider config UI)
  - [ ] Infrastructure
  - [ ] Documentation
  - [ ] module.json

- [ ] **5.3 module-mgmt Template**
  - [ ] Backend layer (mgmt-common)
  - [ ] Lambda handlers (function management)
  - [ ] Frontend components (admin dashboard)
  - [ ] Infrastructure
  - [ ] Documentation
  - [ ] module.json

---

### Phase 6: Retrofit & Testing (8 hours)

Apply new standards to existing pm-app project for validation.

#### Checklist

- [ ] **6.1 pm-app-stack Retrofit**

  - [ ] Update module.json files
  - [ ] Add missing documentation
  - [ ] Run full validation suite
  - [ ] Fix any validation errors

- [ ] **6.2 pm-app-infra Retrofit**

  - [ ] Verify project structure
  - [ ] Update project.json
  - [ ] Validate infrastructure modules

- [ ] **6.3 End-to-End Testing**
  - [ ] Create test CORA project
  - [ ] Deploy core modules
  - [ ] Deploy sample functional module
  - [ ] Validate module registry
  - [ ] Document lessons learned

---

## Timeline Estimate

| Phase                             | Estimated Hours | Sessions (~4hr each) |
| --------------------------------- | --------------- | -------------------- |
| Phase 1: Documentation Foundation | 8 hours         | 2 sessions           |
| Phase 2: Project Templates        | 12 hours        | 3 sessions           |
| Phase 3: Validation Framework     | 8 hours         | 2 sessions           |
| Phase 4: Module Registry          | 12 hours        | 3 sessions           |
| Phase 5: Core Module Templates    | 16 hours        | 4 sessions           |
| Phase 6: Retrofit & Testing       | 8 hours         | 2 sessions           |
| **Total**                         | **64 hours**    | **16 sessions**      |

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
2. Update memory-bank files with plan reference
3. Create initial CORA-PROJECT-BOILERPLATE.md structure

### Follow-on Sessions

Use the phase checklists above to track progress. Each session should:

1. Check current checklist state
2. Work on uncompleted items
3. Update checklist progress
4. Document any blockers or changes

---

## References

- [Lambda Mgmt Module Implementation Plan](../../pm-app-stack/docs/implementation/lambda-mgmt-module-implementation-plan.md)
- [CORA Patterns Checklist](./CORA-PATTERNS-CHECKLIST.md)
- [AI Module Development Guide](./AI-MODULE-DEVELOPMENT-GUIDE.md)
- [Validation Tools Guide](./VALIDATION-TOOLS-IMPLEMENTATION-GUIDE.md)

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** Ready for Implementation
