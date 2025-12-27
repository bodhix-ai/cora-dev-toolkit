# ADR-006 Option E: Fork-Based Open Source Model

**Parent Document:** [ADR-006: Core Module Version Control Strategy](./adr-006-core-module-version-control.md)  
**Status:** PROPOSED  
**Date:** December 10, 2025

---

## Overview

This model treats CORA like an open source project where:

1. **Central repository** contains the authoritative codebase
2. **Projects "fork"** (copy) the codebase to start
3. **Projects customize** independently for their needs
4. **Enhancements flow back** to central repo via PR process
5. **Central maintainers** prioritize and review contributions

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    UPSTREAM (Central)                        │
│                                                              │
│  bodhix-ai/cora-core-modules (v1.0.0)                       │
│  ├── module-access/                                          │
│  ├── module-ai/                                              │
│  ├── module-mgmt/                                            │
│  └── module-kb/  (functional modules can live here too)     │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │ Fork        │ Fork        │ Fork
         ▼             ▼             ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ pm-app     │  │ project-2  │  │ project-3  │
│            │  │            │  │            │
│ Customized │  │ Customized │  │ Customized │
│ modules    │  │ modules    │  │ modules    │
└─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │               │               │
      │  PR upstream  │  PR upstream  │
      └───────────────┴───────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │ Central Review Process  │
         │ - Prioritize            │
         │ - Review                │
         │ - Merge                 │
         └─────────────────────────┘
```

---

## Repository Structure

### Central Repository (Upstream)

```
bodhix-ai/cora-core-modules/
├── README.md
├── CONTRIBUTING.md              # How to contribute back
├── CHANGELOG.md                 # Version history
├── module-access/
│   ├── backend/
│   ├── frontend/
│   ├── db/
│   └── module.json
├── module-ai/
│   └── ...
├── module-mgmt/
│   └── ...
└── shared/                      # Shared utilities, types
    ├── types/
    └── utils/
```

### Project Repository (Fork)

```
pm-app-stack/
├── packages/
│   ├── module-access/           # Copied from upstream, customized
│   │   ├── backend/
│   │   ├── frontend/
│   │   ├── db/
│   │   ├── module.json
│   │   └── LOCAL_CHANGES.md     # Documents project-specific changes
│   ├── module-ai/
│   ├── module-mgmt/
│   └── module-kb/
├── UPSTREAM_VERSION.md          # Tracks which upstream version this forked from
└── ...
```

---

## Workflow Scenarios

### Scenario 1: Starting a New Project

```bash
# Option A: Script-based fork
./scripts/create-cora-project.sh my-new-app

# This copies from cora-core-modules into my-new-app-stack/packages/
# Records the upstream version in UPSTREAM_VERSION.md

# Option B: GitHub template repo
# Create from template on GitHub
```

**UPSTREAM_VERSION.md:**

```markdown
# Upstream Version Tracking

Forked from: bodhix-ai/cora-core-modules
Version: v1.2.0
Date: 2025-12-10

## Sync History

| Date       | From Version | To Version | Notes        |
| ---------- | ------------ | ---------- | ------------ |
| 2025-12-10 | -            | v1.2.0     | Initial fork |
```

### Scenario 2: Project Customization

```bash
# In pm-app-stack
cd packages/module-access

# Make project-specific changes
# Edit files as needed for pm-app requirements

# Document what was changed
echo "## Custom: Added pm-app specific role" >> LOCAL_CHANGES.md
```

**LOCAL_CHANGES.md:**

```markdown
# Local Changes to module-access

This document tracks pm-app-specific changes that diverge from upstream.

## Custom Changes (Not for Upstream)

- Added `PM_ADMIN` role specific to pm-app business logic
- Custom permission: `pm:special:access`

## Potential Upstream Contributions

- [ ] Fixed bug in token refresh logic (Issue #123)
- [ ] Added `getOrganizationHierarchy()` utility
```

### Scenario 3: Contributing Enhancement Back Upstream

```bash
# 1. Developer identifies enhancement that should go upstream
# In pm-app-stack, edit LOCAL_CHANGES.md to mark it

# 2. Create the enhancement in upstream repo
cd ~/code/cora-core-modules
git checkout -b feature/org-hierarchy

# 3. Implement the feature cleanly (without project-specific code)
# Edit module-access/...

# 4. Create PR to upstream
git push origin feature/org-hierarchy
# Open PR on GitHub with description

# 5. After PR is merged and released (v1.3.0):
cd ~/code/pm-app-stack
# Sync the specific change from upstream
# (see Scenario 4)
```

### Scenario 4: Syncing Upstream Changes to Project

```bash
# Manual sync process (recommended for control)
cd pm-app-stack/packages/module-access

# View diff between project and upstream
diff -r . ~/code/cora-core-modules/module-access/ --exclude=LOCAL_CHANGES.md

# Selectively apply changes
# For each file that changed upstream:
# - Review the change
# - Decide if it conflicts with local changes
# - Apply or adapt as needed

# Update UPSTREAM_VERSION.md
echo "| 2025-12-15 | v1.2.0 | v1.3.0 | Synced org-hierarchy feature |" >> UPSTREAM_VERSION.md
```

**Automated Sync Tool (Future):**

```bash
# Future: cora-cli tool for easier syncing
cora sync upstream --module module-access --version v1.3.0 --dry-run
cora sync upstream --module module-access --version v1.3.0 --apply
```

---

## Upstream Contribution Process

### CONTRIBUTING.md (in cora-core-modules)

```markdown
# Contributing to CORA Core Modules

## Types of Contributions

### 1. Bug Fixes

- Create issue describing the bug
- Reference which project discovered it
- Submit PR with fix and tests

### 2. New Features

- Create RFC issue first
- Discuss design with maintainers
- Submit PR after approval

### 3. Documentation

- PRs welcome without prior discussion

## Contribution Workflow

1. **Fork** cora-core-modules to your account
2. **Create branch** for your change
3. **Implement** following CORA patterns
4. **Test** in at least one project
5. **Submit PR** with:
   - Clear description
   - Link to issue/RFC
   - Test evidence
6. **Review** - maintainers will review within 1 week
7. **Merge** - after approval and CI pass

## What Makes a Good Upstream Contribution

✅ **DO contribute:**

- Bug fixes applicable to all projects
- Generic features usable across projects
- Performance improvements
- Security enhancements
- Better error handling
- Improved types/documentation

❌ **DON'T contribute:**

- Project-specific business logic
- Custom roles/permissions for one project
- Hardcoded values
- Features only one project needs

## Versioning

We use semantic versioning:

- Patch (1.0.x): Bug fixes
- Minor (1.x.0): New features, backward compatible
- Major (x.0.0): Breaking changes

## Release Schedule

- Patch releases: As needed
- Minor releases: Monthly
- Major releases: Quarterly with migration guide
```

---

## Comparison to Other Options

| Aspect            | Option A (Templates) | Option E (Fork Model) |
| ----------------- | -------------------- | --------------------- |
| Initial setup     | Copy templates       | Fork/copy repository  |
| Customization     | Full freedom         | Full freedom          |
| Upstream sync     | Manual diff          | Structured process    |
| Contributing back | Not expected         | Formal PR process     |
| Version tracking  | None                 | UPSTREAM_VERSION.md   |
| Community benefit | Projects diverge     | Improvements shared   |
| Complexity        | Simple               | Moderate              |

---

## Pros and Cons

### Pros

✅ **Simple initial setup** - Just fork/copy the codebase  
✅ **Full customization** - Projects have complete control  
✅ **Community benefits** - Enhancements flow back to all projects  
✅ **No external dependencies** - Code is local to each project  
✅ **Familiar model** - Developers know open source workflow  
✅ **Gradual evolution** - Can start simple, add process later

### Cons

⚠️ **Manual sync process** - No automatic updates  
⚠️ **Merge conflicts** - When syncing diverged code  
⚠️ **Contribution overhead** - Need to maintain upstream repo  
⚠️ **Discipline required** - Projects must track local changes  
⚠️ **Review bottleneck** - Central team reviews all contributions

---

## Tooling Support

### Current (Minimal Tooling)

```bash
# Manual tracking
# - UPSTREAM_VERSION.md for version tracking
# - LOCAL_CHANGES.md for documenting divergence
# - Manual diff/merge for syncing
```

### Future (Enhanced Tooling)

```bash
# cora-cli commands
cora status                    # Show upstream version, local changes
cora diff upstream            # Show differences from upstream
cora sync upstream v1.3.0     # Sync to specific version
cora contribute module-access # Prepare module for upstream PR
```

### GitHub Actions (Automated Notifications)

```yaml
# In project repo: .github/workflows/check-upstream.yml
name: Check Upstream Updates

on:
  schedule:
    - cron: "0 0 * * 1" # Weekly

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check for upstream updates
        run: |
          CURRENT=$(cat UPSTREAM_VERSION.md | grep "Version:" | cut -d' ' -f2)
          LATEST=$(gh release view --repo bodhix-ai/cora-core-modules --json tagName -q .tagName)
          if [ "$CURRENT" != "$LATEST" ]; then
            gh issue create --title "Upstream update available: $LATEST" \
              --body "cora-core-modules has a new release. Current: $CURRENT, Latest: $LATEST"
          fi
```

---

## Scoring

| Criterion       | Score      | Notes                                                 |
| --------------- | ---------- | ----------------------------------------------------- |
| Maintainability | ⭐⭐⭐⭐   | Central repo well-maintained, projects own their code |
| Consistency     | ⭐⭐⭐     | Projects can stay in sync if disciplined              |
| Flexibility     | ⭐⭐⭐⭐⭐ | Full customization, projects decide what to sync      |
| Update Path     | ⭐⭐⭐     | Manual but structured process                         |
| Complexity      | ⭐⭐⭐⭐   | Moderate - familiar open source model                 |
| Independence    | ⭐⭐⭐⭐⭐ | Projects fully independent                            |
| Community Value | ⭐⭐⭐⭐   | Enhancements benefit all projects                     |
| **Total**       | **28**     | Best overall for 5+ projects with shared improvements |

---

## Recommendation

**Option E is ideal for your stated goals:**

1. ✅ Centrally managed codebase → `cora-core-modules` repo
2. ✅ Projects fork to start → Copy/fork process
3. ✅ Projects customize independently → Full local control
4. ✅ Enhancements flow back → PR process to upstream
5. ✅ Prioritized like open source → CONTRIBUTING.md process

**Migration Path:**

1. Create `bodhix-ai/cora-core-modules` repo
2. Extract core modules from pm-app-stack into it
3. Set up CONTRIBUTING.md and release process
4. pm-app-stack becomes first "fork"
5. Future projects fork from cora-core-modules

---

## Next Steps if Option E Selected

1. **Create `cora-core-modules` repository**
2. **Extract modules from pm-app-stack** (module-access, module-ai, module-mgmt)
3. **Create CONTRIBUTING.md** with contribution guidelines
4. **Set up release process** with semantic versioning
5. **Document sync process** for projects
6. **Update pm-app-stack** to track upstream version
