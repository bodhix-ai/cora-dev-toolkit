# Functional Module Integration & Registry Plan

**Status:** 📋 **PLANNED**  
**Date:** January 1, 2026  
**Purpose:** Define architecture for integrating functional modules and managing dependencies via a registry system.

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

### Phase 1: Folder Restructuring (Immediate)
- Separate `_modules-core` and `_modules-functional`.
- Update `create-cora-project.sh` to support new paths.

### Phase 2: Registry Implementation
- Create `module-registry.yaml`.
- Add `yq` dependency check to scripts.
- Implement dependency resolution logic in bash.

### Phase 3: Config Merging
- Create `module.config.yaml` for existing modules.
- Update `create-cora-project.sh` to merge these configs.

### Phase 4: Module-WS Integration
- Add `module-ws` to registry.
- Verify `module-ws` installs correctly via the new system.

---

## 4. Migration Strategy

1. **Restructure Folders:** Move existing modules to new structure (preserve git history if possible).
2. **Update Scripts:** Point to new locations.
3. **Registry:** Introduce registry but maintain backward compatibility for a transition period if needed.

---

**Next Steps:**
1. Execute Phase 1 (Restructuring) immediately.
2. Schedule Phase 2-4 as a follow-up task.
