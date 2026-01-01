# CORA Functional Modules

This directory contains **functional modules** for the CORA ecosystem. These are optional, feature-specific modules that can be enabled or disabled based on project requirements.

## What are Functional Modules?

Functional modules provide specific business capabilities that extend a CORA application. Unlike core modules (module-access, module-ai, module-mgmt) which are required for every CORA project, functional modules are:

- **Optional**: Can be enabled/disabled per project
- **Feature-Specific**: Each provides a distinct business capability
- **Dependent**: May require core modules or other functional modules

## Available Functional Modules

### module-ws (Workspace Management)
Multi-tenant workspace management with role-based access control, favorites, tagging, and administrative oversight.

**Dependencies:** `module-access`

**Use Cases:**
- Project-based collaboration
- Team workspaces
- Organizational segmentation

## Module Structure

Each functional module follows the standard CORA module structure:

```
module-{name}/
├── module.json              # Module metadata
├── README.md               # Module documentation
├── backend/                # Lambda handlers
│   └── lambdas/
├── db/                     # Database schema
│   └── schema/
├── frontend/               # React components
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── types/
└── infrastructure/         # Terraform configuration
```

## Adding a Functional Module to a Project

Functional modules are configured in the project's `setup.config.yaml`:

```yaml
modules:
  enabled:
    - module-ws
    # - module-kb
    # - module-chat
```

The `create-cora-project.sh` script will:
1. Read the enabled modules from the registry
2. Resolve dependencies
3. Copy module code to the project
4. Configure the database schema
5. Set up infrastructure

## Creating a New Functional Module

See the [Module Development Guide](../../docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) for detailed instructions on creating new functional modules.

Quick steps:
1. Use `create-cora-module.sh` to scaffold the module
2. Implement backend, frontend, database, and infrastructure
3. Add module to the registry
4. Test with a CORA project

## Module Registry

All functional modules must be registered in `templates/_modules-core/module-registry.yaml` with:
- Module name and description
- Dependencies
- Configuration options
- Type (functional)

## See Also

- [Core Modules](../templates/_modules-core/README.md)
- [Module Development Process](../../docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Integration Plan](../../docs/plans/plan_functional_module_integration.md)
