# CORA Versioning Standard

**Created:** January 27, 2026  
**Status:** Draft  
**Related:** Admin Standardization S3b

---

## Overview

CORA uses **two-level semantic versioning** to enable independent evolution of the platform and its modules while maintaining compatibility.

```
┌─────────────────────────────────────────────────────────────┐
│                    CORA Toolkit v0.1.0                      │
│  (Platform: shell, shared packages, infra templates, etc.)  │
├─────────────────────────────────────────────────────────────┤
│  module-access v0.2.0  │  module-ai v0.1.0  │  ...          │
│  module-ws v0.1.0      │  module-kb v0.3.0  │  ...          │
│  module-mgmt v0.1.0    │  module-chat v0.2.0│  ...          │
│  module-eval v0.4.0    │  module-voice v0.1.0│              │
└─────────────────────────────────────────────────────────────┘
```

---

## Semantic Versioning Format

Both toolkit and modules follow **MAJOR.MINOR.PATCH** format.

### Toolkit Version

| Component | Increment When | Example |
|-----------|----------------|---------|
| **MAJOR** | Breaking changes to core APIs, database schema migrations required, inter-module contract changes | `0.x.x` → `1.0.0` when stable |
| **MINOR** | New modules added, new validators, new features that don't break existing functionality | `0.1.x` → `0.2.0` for admin route standardization |
| **PATCH** | Bug fixes, documentation updates, validation rule tweaks, accessibility fixes | `0.1.0` → `0.1.1` for typo fix |

**Current Version:** `0.1.0` (pre-stable, significant development remaining)

**Version History:**
- `0.1.0` (2026-01-27) - Initial toolkit release with versioning system

**Path to 1.0:**
- Complete admin standardization
- Complete WS plugin architecture
- All validators passing (0 errors)
- SSO integrations stable
- Production-ready documentation

---

### Module Version

| Component | Increment When | Example |
|-----------|----------------|---------|
| **MAJOR** | Breaking API changes, database schema changes for this module, interface changes affecting dependents | `0.x.x` → `1.0.0` |
| **MINOR** | New features, new endpoints, new UI pages, new admin functionality | `0.4.x` → `0.5.0` (e.g., citations feature) |
| **PATCH** | Bug fixes, styling changes, accessibility fixes, documentation | `0.4.0` → `0.4.1` |

**Current Module Versions:**

| Module | Version | Status | Notes |
|--------|---------|--------|-------|
| module-access | 0.2.0 | Stable | Admin standardization complete |
| module-ai | 0.1.0 | Alpha | SSO integrations pending |
| module-ws | 0.1.0 | Alpha | Plugin architecture in progress |
| module-mgmt | 0.1.0 | Alpha | Admin routes being standardized |
| module-kb | 0.3.0 | Beta | Core features complete |
| module-chat | 0.2.0 | Beta | Basic chat functional |
| module-eval | 0.4.0 | Beta | TypeScript + a11y fixes complete |
| module-voice | 0.1.0 | Alpha | Early development |

---

## Dependency Tracking

### Dependency Types

| Type | Symbol | Meaning | Example |
|------|--------|---------|---------|
| **Required** | `REQ` | Module won't function without this dependency | module-eval requires module-ws |
| **Optional** | `OPT` | Enhanced features if available, uses ModuleGate pattern | module-eval optionally uses module-kb |
| **Toolkit** | `TK` | Depends on toolkit shell/shared packages | All modules require toolkit >= min version |

---

### Module Dependency Matrix

```
                    Depends On →
                    ┌─────┬─────┬─────┬─────┬─────┬─────┐
                    │acces│ ai  │ ws  │mgmt │ kb  │chat │
        ┌───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-    │  -  │  -  │  -  │  -  │  -  │  -  │
        │access     │     │     │     │     │     │     │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-ai  │ REQ │  -  │  -  │  -  │  -  │  -  │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-ws  │ REQ │  -  │  -  │  -  │  -  │  -  │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
Module  │module-    │ REQ │ OPT │ OPT │  -  │  -  │  -  │
        │mgmt       │     │     │     │     │     │     │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-kb  │ REQ │  -  │ REQ │  -  │  -  │  -  │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-    │ REQ │ REQ │ REQ │  -  │ OPT │  -  │
        │chat       │     │     │     │     │     │     │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-    │ REQ │  -  │ REQ │  -  │ OPT │  -  │
        │eval       │     │     │     │     │     │     │
        ├───────────┼─────┼─────┼─────┼─────┼─────┼─────┤
        │module-    │ REQ │ REQ │ REQ │  -  │  -  │  -  │
        │voice      │     │     │     │     │     │     │
        └───────────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

**Key:**
- `-` = No dependency
- `REQ` = Required dependency
- `OPT` = Optional dependency (enhanced functionality)

---

### Dependency Details

#### module-access (Foundation)
- **Dependencies:** None
- **Dependents:** All other modules
- **Reason:** Provides authentication, authorization, user/org management

#### module-eval (Example Plugin)
- **Required Dependencies:**
  - `module-access >= 0.1.0` - User auth and org scoping
  - `module-ws >= 0.1.0` - Workspace plugin context
- **Optional Dependencies:**
  - `module-kb >= 0.3.0` - Knowledge base grounding for evaluations
- **Reason for KB Optional:** Eval can work without KB (file upload mode), but KB enables grounding mode

---

## Version Tracking Files

### Toolkit Level

```
cora-dev-toolkit/
├── VERSION                           # Current toolkit version
│   Content: "0.1.0"
│
├── CHANGELOG.md                      # Toolkit-level changes
│   Follows Keep a Changelog format
│
└── templates/
    └── _modules-core/
        └── module-registry.yaml      # All module versions + dependencies
```

---

### Project Level

```
{project}-stack/
└── .cora-version.yaml               # Version snapshot for this project
```

**Format:**
```yaml
# CORA Toolkit Version Tracking
toolkit_version: "0.1.0"
created_date: "2026-01-27"
last_synced: "2026-01-27"

# Module versions in this project
modules:
  module-access: "0.2.0"
  module-ai: "0.1.0"
  module-ws: "0.1.0"
  module-mgmt: "0.1.0"
  module-kb: "0.3.0"
  module-chat: "0.2.0"
  module-eval: "0.4.0"
  module-voice: "0.1.0"

# Project-specific modules (not from toolkit)
custom_modules: []
```

---

## Compatibility Rules

### Rule 1: Toolkit Compatibility
- A module requires `min_toolkit_version`
- Project must have `toolkit_version >= min_toolkit_version`

**Example:**
```yaml
# module-eval in module-registry.yaml
min_toolkit_version: "0.1.0"

# Project .cora-version.yaml
toolkit_version: "0.1.0"  # ✅ Compatible
```

---

### Rule 2: Dependency Compatibility
- If Module A depends on Module B, project must include compatible version of Module B

**Example:**
```yaml
# module-eval dependencies
dependencies:
  - module: module-ws
    type: required
    min_version: "0.1.0"

# Project must have:
modules:
  module-ws: "0.1.0"  # ✅ Compatible (>= 0.1.0)
  # or
  module-ws: "0.2.0"  # ✅ Also compatible
```

---

### Rule 3: Breaking Changes
- MAJOR version changes indicate breaking changes
- Dependents may need updates

**Example:**
```yaml
# module-access breaking_changes
breaking_changes:
  "0.2.0":
    - "Sidebar component interface changed"
    - "Affects: module-mgmt (admin cards)"

# When upgrading module-access to 0.2.0:
# - Must also upgrade module-mgmt to version that supports new interface
```

---

## Upgrade Scenarios

### Scenario A: Module-Only Upgrade

**Situation:** Project wants module-eval v0.5.0, stays on toolkit v0.1.0

```bash
# 1. Check module-registry.yaml
module-eval:
  version: "0.5.0"
  min_toolkit_version: "0.1.0"  # ✅ Compatible with project's toolkit

# 2. Check dependencies
dependencies:
  - module-access >= 0.1.0  # ✅ Project has 0.2.0
  - module-ws >= 0.1.0      # ✅ Project has 0.1.0
  - module-kb >= 0.3.0 (optional)  # ✅ Project has 0.3.0

# 3. Sync module files
$ ./scripts/sync-module-to-project.sh module-eval ~/code/project-stack

# 4. Update .cora-version.yaml
modules:
  module-eval: "0.5.0"  # Updated
  # Other modules unchanged
```

---

### Scenario B: Toolkit Upgrade

**Situation:** Toolkit v0.2.0 released with breaking shell changes

```bash
# 1. Check what changed
$ cat CHANGELOG.md
## [0.2.0]
### Breaking Changes
- Shared workspace-plugin API changed
- Modules require updates: module-ws, module-eval, module-voice

# 2. Check which modules need updates
$ cat module-registry.yaml
module-ws:
  version: "0.2.0"
  min_toolkit_version: "0.2.0"  # Requires new toolkit

module-eval:
  version: "0.5.0"
  min_toolkit_version: "0.2.0"  # Requires new toolkit

# 3. Upgrade project (bundles toolkit + affected modules)
$ ./scripts/upgrade-cora-project.sh ~/code/project --toolkit-version 0.2.0
# This would upgrade:
# - Toolkit shell/shared packages
# - module-ws to 0.2.0
# - module-eval to 0.5.0
# - module-voice to 0.2.0
```

---

### Scenario C: Foundation Module Breaks Dependents

**Situation:** module-access v0.3.0 changes Sidebar interface

```bash
# 1. Check breaking_changes in module-registry.yaml
module-access:
  version: "0.3.0"
  breaking_changes:
    "0.3.0":
      - "Sidebar navigation item interface changed"
      - "Affects: module-mgmt, all modules with nav items"

# 2. Check dependents
dependents:
  - module-ai
  - module-ws
  - module-mgmt  # ⚠️ Has admin cards, needs update
  - module-kb
  - module-chat
  - module-eval
  - module-voice

# 3. Required upgrade bundle
$ ./scripts/upgrade-cora-project.sh ~/code/project --module-bundle access-0.3.0
# Upgrades:
# - module-access to 0.3.0
# - module-mgmt to 0.2.0 (compatible with new Sidebar)
# - Warns about other modules to review
```

---

## Module Registry Schema

```yaml
# templates/_modules-core/module-registry.yaml

toolkit_version: "0.1.0"

modules:
  - name: module-access
    version: "0.2.0"
    type: core
    tier: 1
    min_toolkit_version: "0.1.0"
    
    # What this module depends on
    dependencies: []
    
    # What depends on this module
    dependents:
      - module-ai
      - module-ws
      - module-mgmt
      - module-kb
      - module-chat
      - module-eval
      - module-voice
    
    # Breaking changes per version
    breaking_changes:
      "0.2.0":
        - "Sidebar component interface changed"
        - "Affects: module-mgmt (admin cards)"
    
    # Version history
    changelog: |
      0.2.0 (2026-01-27) - Admin standardization complete
        - Sidebar ModuleGate integration
        - Admin page patterns established
        - ADR-015 and ADR-016 implementation
      0.1.0 (2026-01-15) - Initial release
        - Core authentication and authorization
        - User/org/role management
        - NextAuth integration
  
  - name: module-eval
    version: "0.4.0"
    type: functional
    tier: null
    min_toolkit_version: "0.1.0"
    
    dependencies:
      - module: module-access
        type: required
        min_version: "0.1.0"
        reason: "User authentication and org scoping"
      
      - module: module-ws
        type: required
        min_version: "0.1.0"
        reason: "Workspace plugin context for workspace scoping"
      
      - module: module-kb
        type: optional
        min_version: "0.3.0"
        reason: "Knowledge base grounding for evaluations"
    
    dependents: []  # Nothing depends on eval (leaf module)
    
    breaking_changes:
      # None yet (still < 1.0.0)
    
    changelog: |
      0.4.0 (2026-01-26) - TypeScript + Accessibility fixes
        - All 46 TypeScript errors resolved
        - Section 508 / WCAG 2.1 Level AA compliant
        - 60 validation errors fixed
      0.3.0 (2026-01-20) - Citations infrastructure
        - Citation tracking in evaluations
        - Document metadata support
      0.2.0 (2026-01-15) - Scoring UI improvements
        - Editable scores
        - Status options
      0.1.0 (2026-01-10) - Initial release
        - Core evaluation engine
        - Q&A mode
        - Basic scoring
```

---

## Version Numbering Guidelines

### When to Increment MAJOR (x.0.0)

**Toolkit:**
- Database schema requires migration script
- Core API contracts change (Session, middleware, auth patterns)
- Module interface contracts change (WorkspacePluginContext, etc.)

**Module:**
- Breaking API changes (endpoint paths, request/response shapes)
- Database schema changes for this module's tables
- Interface changes affecting dependents (exports used by other modules)

---

### When to Increment MINOR (0.x.0)

**Toolkit:**
- New module added to registry
- New validator added
- New feature in shared packages (backward compatible)
- New scripts or tooling

**Module:**
- New feature added (new admin page, new API endpoint, new UI component)
- New optional functionality
- Enhanced existing features (backward compatible)

---

### When to Increment PATCH (0.0.x)

**Toolkit:**
- Bug fixes in scripts
- Documentation updates
- Validation rule tweaks (non-breaking)
- Accessibility fixes

**Module:**
- Bug fixes
- Styling/UI polish
- Accessibility fixes
- Documentation updates
- Performance improvements (no API changes)

---

## Version 1.0.0 Criteria

### Toolkit 1.0.0

Achieved when:
- [ ] All core modules stable (1.0.0)
- [ ] All validators passing (0 errors)
- [ ] Admin standardization complete
- [ ] WS plugin architecture complete
- [ ] SSO integrations stable
- [ ] Documentation complete and reviewed
- [ ] At least 2 production projects using toolkit
- [ ] Upgrade path tested across multiple versions

**Estimated:** Q2-Q3 2026

---

### Module 1.0.0

Achieved per module when:
- [ ] All planned features implemented
- [ ] All validators passing for this module
- [ ] Admin pages complete (sys + org)
- [ ] Documentation complete (README, ADMINISTRATION.md, specs)
- [ ] Integration tested with all dependent modules
- [ ] Deployed to production in at least 1 project
- [ ] No known critical bugs

---

## Changelog Format

Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

```markdown
# Module-Eval Changelog

All notable changes to this module will be documented in this file.

## [Unreleased]

### Added
- Nothing yet

## [0.4.0] - 2026-01-26

### Fixed
- 46 TypeScript errors resolved
- Section 508 / WCAG 2.1 Level AA compliance achieved
- 60 validation errors fixed

### Changed
- Improved type safety across all components
- Enhanced accessibility for screen readers

## [0.3.0] - 2026-01-20

### Added
- Citation tracking in evaluation results
- Document metadata support
- Citation UI components

### Changed
- Evaluation data model includes citations array

## [0.2.0] - 2026-01-15

### Added
- Editable scores in evaluation results
- Status options for compliance tracking

### Changed
- Scoring UI with inline editing

## [0.1.0] - 2026-01-10

### Added
- Initial release
- Core evaluation engine
- Q&A mode
- Basic scoring functionality
```

---

## Future Enhancements

### Planned for Future Versions

1. **Automated Compatibility Checking**
   - Script: `check-module-compatibility.sh`
   - Validates dependencies before upgrade
   - Recommends required bundle upgrades

2. **Module Marketplace**
   - Community-contributed modules
   - Approval/testing pipeline
   - Compatibility badges

3. **Automated Upgrade PRs**
   - GitHub Actions creates PR when new version available
   - Includes changelog and migration notes
   - Runs validators to check compatibility

4. **Version Pinning**
   - Projects can pin to specific versions
   - Opt-in to automatic minor/patch upgrades

---

**Maintained by:** CORA Core Team  
**Last Updated:** January 27, 2026  
**Status:** Active Standard