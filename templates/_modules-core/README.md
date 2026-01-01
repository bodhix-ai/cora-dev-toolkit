# CORA Core Modules

**Version:** 1.0.0  
**Status:** Template (will become `bodhix-ai/cora-core-modules` repo)

This repository contains the authoritative implementations of CORA's three core modules. All CORA projects fork/copy from this repository to start their projects.

## Core Modules

| Module          | Purpose                   | Tier | Description                                                |
| --------------- | ------------------------- | ---- | ---------------------------------------------------------- |
| `module-access` | Identity & Access Control | 1    | IDP integration, org context, user context, permissions    |
| `module-ai`     | AI Provider Management    | 2    | Provider enablement, model config, usage monitoring        |
| `module-mgmt`   | Platform Management       | 3    | Lambda management, module registry, performance monitoring |

## Directory Structure

```
cora-core-modules/
├── README.md              # This file
├── CONTRIBUTING.md        # How to contribute back upstream
├── CHANGELOG.md           # Version history
├── module-access/
│   ├── backend/           # Lambda handlers, common code
│   ├── frontend/          # React components, hooks, contexts
│   ├── db/                # Database migrations, RLS policies
│   └── module.json        # Module metadata
├── module-ai/
│   ├── backend/
│   ├── frontend/
│   ├── db/
│   └── module.json
└── module-mgmt/
    ├── backend/
    ├── frontend/
    ├── db/migrations/     # Includes module registry schema
    └── module.json
```

## Tier System

CORA uses a tier system to manage dependencies between core modules:

- **Tier 1 (module-access)**: No dependencies on other modules
- **Tier 2 (module-ai)**: Depends on Tier 1 modules
- **Tier 3 (module-mgmt)**: Depends on Tier 1 and Tier 2 modules

## Using These Modules

### Starting a New CORA Project

```bash
# Use the cora-dev-toolkit to create a new project
cd cora-dev-toolkit
./scripts/create-cora-project.sh my-new-app --with-core-modules

# This copies core modules into your project's packages/ directory
```

### Manual Copy

```bash
# Copy specific modules to your project
cp -r module-access/ ~/code/my-project-stack/packages/module-access/
cp -r module-ai/ ~/code/my-project-stack/packages/module-ai/
cp -r module-mgmt/ ~/code/my-project-stack/packages/module-mgmt/
```

## Module Registry (module-mgmt)

The `module-mgmt` module includes the Module Registry system for runtime control:

- **Database Tables**: `platform_module_registry`, `platform_module_usage`
- **API Endpoints**: `/platform/modules/*`
- **Frontend**: Module admin dashboard, usage analytics

See `module-mgmt/db/migrations/001-platform-module-registry.sql` for the schema.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on contributing enhancements back upstream.

## Version Control Strategy

This repository follows **Option E: Fork-Based Open Source Model**:

1. Projects fork/copy from this upstream repository
2. Projects customize freely for their needs
3. Enhancements flow back via PR process
4. Central maintainers review and merge contributions

See [ADR-006](../docs/adr-006-core-module-version-control.md) for the full decision record.

## References

- [CORA Core Modules Specification](../docs/cora-core-modules.md)
- [Module Definition of Done](../docs/cora-module-definition-of-done.md)
- [Development Toolkit Plan](../docs/cora-development-toolkit-plan.md)
