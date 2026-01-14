# Functional Module Integration & Registry Plan

**Status:** ✅ **COMPLETE**  
**Date Started:** January 1, 2026  
**Date Completed:** January 1, 2026  
**Purpose:** Define architecture for integrating functional modules and managing dependencies via a registry system.

**Completion Note:** All 4 phases completed across Sessions 57-60. Module-WS successfully deployed and validated.

---

## Executive Summary

As CORA expands from core modules to 15+ functional modules, the current `create-cora-project.sh` script and `setup.config.yaml` pattern will become unmanageable. This plan proposes a **Module Registry** system and **Modular Configuration** architecture to decouple module selection from the project creation logic.

---

## 1. Problem Statement

- **Configuration Bloat:** `setup.config.yaml` will grow indefinitely as new modules are added.
- **Tight Coupling:** `create-cora-project.sh` has hardcoded logic for each module.
- **Dependency Hell:** No formal system to enforce dependencies (e.g., `module-chat` requires `module-ai`).
- **Discovery:** Hard to know which modules are available and what they do.

---

## 2. Proposed Architecture

### 2.1 Module Registry

A central registry file defining all available modules and their metadata.

**File:** `templates/_modules-core/module-registry.yaml`

```yaml
registry_version: "1.0"
last_updated: "2026-01-01"

core_modules_path: "templates/_modules-core"
functional_modules_path: "templates/_modules-functional"

modules:
  # ===== CORE MODULES (Tier 1-3) =====
  module-access:
    type: core
    tier: 1
    name: "Access & Identity Management"
    required: true
    dependencies: []
    config_file: module.config.yaml
    
  module-ai:
    type: core
    tier: 2
    name: "AI Provider Management"
    required: true
    dependencies: [module-access]
    config_file: module.config.yaml
    
  module-mgmt:
    type: core
    tier: 3
    name: "Platform Management"
    required: true
    dependencies: [module-access]
    config_file: module.config.yaml
  
  # ===== FUNCTIONAL MODULES =====
  module-ws:
    type: functional
    tier: null
    name: "Workspace Management"
    required: false
    dependencies: [module-access]
    config_file: module.config.yaml
    description: "Multi-tenant workspace management with favorites, tags, and RBAC"
    
  module-kb:
    type: functional
    name: "Knowledge Base"
    required: false
    dependencies: [module-access, module-ai]
    description: "RAG-based knowledge base with vector search"
```

### 2.2 Modular Configuration

Each module will provide its own configuration template, which is merged into the project configuration only when enabled.

**File:** `templates/_modules-functional/module-ws/module.config.yaml`

```yaml
workspace_module:
  nav_label_singular: "Workspace"
  nav_label_plural: "Workspaces"
  enable_favorites: true
  default_retention_days: 30
```

**Main Config:** `templates/_project-stack-template/setup.config.example.yaml`

```yaml
modules:
  enabled:
    - module-ws
    # - module-kb
```

### 2.3 Dependency Resolution

The project creation script will:
1. Read the list of enabled modules.
2. Check `module-registry.yaml`.
3. Recursively resolve dependencies (e.g., enabling `module-chat` automatically pulls in `module-ai`).
4. Validate no conflicts exist.

### 2.4 Seed File Generation

Instead of hardcoded functions in `create-cora-project.sh`, the script will iterate through enabled modules and look for a standard seeding hook or script provided by the module itself (e.g., `scripts/seed.sh` inside the module template).

---

## 3. Implementation Steps

### Phase 1: Folder Restructuring ✅ COMPLETE (Session 57)
- ✅ Separated `_modules-core` and `_modules-functional`
- ✅ Updated `create-cora-project.sh` to support new paths
- ✅ Moved 254 files preserving git history
- ✅ Published branch and merged to main

### Phase 2: Registry Implementation ✅ COMPLETE (Session 58)
- ✅ Created `module-registry.yaml` with all current modules
- ✅ Added `yq` dependency check to scripts
- ✅ Implemented dependency resolution logic in bash
- ✅ Added validation for module compatibility
- ✅ Merged to main

### Phase 3: Config Merging ✅ COMPLETE (Session 59)
- ✅ Created `module.config.yaml` for all core modules (access, ai, mgmt)
- ✅ Created `module.config.yaml` for module-ws
- ✅ Updated `create-cora-project.sh` to merge module configs
- ✅ Generated consolidated config at `apps/web/config/cora-modules.config.yaml`
- ✅ Merged to main

### Phase 4: Module-WS Integration Testing ✅ COMPLETE (Session 60)
- ✅ Added `module-ws` to registry with proper dependencies
- ✅ Fixed database schema issues (person_id → user_id)
- ✅ Fixed Lambda API calls (call_rpc() → rpc())
- ✅ Created build script for Lambda packaging
- ✅ Added Terraform module declaration
- ✅ Fixed API routes schema (added public attribute)
- ✅ Created deployment requirements guide
- ✅ Successfully deployed 2 Lambda functions and 12 API routes
- ✅ Verified module-ws installs and deploys correctly

---

## 4. Completion Summary

**All Phases Complete:** ✅  
**Total Sessions:** 4 (Sessions 57-60)  
**Total Time:** ~8 hours  
**Total Files Changed:** ~20 files (~2000+ lines)

### Deliverables Completed

1. **New Directory Structure**
   - `templates/_modules-core/` - Core modules (access, ai, mgmt)
   - `templates/_modules-functional/` - Functional modules (ws, future modules)

2. **Module Registry System**
   - `templates/_modules-core/module-registry.yaml` - Central registry
   - Dependency resolution logic
   - Module validation

3. **Configuration Merging**
   - Individual `module.config.yaml` files per module
   - Automatic merging into `apps/web/config/cora-modules.config.yaml`
   - Module-specific settings preserved

4. **Module-WS Deployment**
   - First functional module successfully deployed
   - Build script created
   - Terraform integration working
   - Database schemas validated
   - Lambda functions operational
   - API routes provisioned

### Key Achievements

- ✅ Scalable architecture for 15+ functional modules
- ✅ Dependency resolution prevents configuration errors
- ✅ Module discovery via registry
- ✅ Template-first workflow maintained
- ✅ End-to-end deployment validated

### Documentation Created

- `docs/guides/guide_MODULE-BUILD-AND-DEPLOYMENT-REQUIREMENTS.md`
- `docs/plans/plan_module-ui-integration.md` (for future work)
- Updated `memory-bank/activeContext.md`

---

## 5. Future Work

### Immediate (Separate PRs)
1. **Module UI Integration** - Implement dynamic navigation and admin cards (3-4 hours)
2. **Terraform Auto-Registration** - Eliminate manual module declaration (partially complete)
3. **Module Template Validation** - Automated checks before deployment

### Long-Term
1. Additional functional modules (kb, chat, project, dashboard)
2. Module versioning system
3. Module marketplace/registry UI
4. Automated integration testing suite

---

**Final Status:** ✅ **ALL PHASES COMPLETE**  
**PR:** #12 (Module-WS Deployment Fixes & Infrastructure Improvements)  
**Next Work:** Module UI Integration (separate PR)
