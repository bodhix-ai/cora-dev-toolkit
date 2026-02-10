# {{PROJECT_NAME}}-stack

Application code repository for the {{PROJECT_NAME}} CORA application.

## Overview

This repository contains the application code for {{PROJECT_NAME}}, including:

- **Next.js Web App** - Frontend application
- **CORA Modules** - Backend modules with Lambda handlers
- **Shared Packages** - Common types, API client, contracts
- **Tests** - E2E and integration tests

## Repository Structure

```
{{PROJECT_NAME}}-stack/
├── apps/
│   └── web/                      # Next.js application
├── packages/
│   ├── module-access/            # Core: Identity & access control
│   ├── module-ai/                # Core: AI provider management
│   ├── module-mgmt/              # Core: Platform management
│   ├── api-client/               # API client library
│   ├── shared-types/             # TypeScript type definitions
│   └── contracts/                # API contracts
├── scripts/                      # Build and validation scripts
├── tests/                        # E2E tests
└── docs/                         # Documentation
```

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Access to {{PROJECT_NAME}}-infra repository

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Start Development Server

```bash
pnpm dev
```

### 4. Run Tests

```bash
pnpm test
pnpm test:e2e
```

## CORA Modules

### Creating a New Module

```bash
# From cora-dev-toolkit
./scripts/create-cora-module.sh module-name
```

### Module Structure

Each CORA module follows this structure:

```
packages/module-{name}/
├── module.json               # Module metadata
├── README.md                 # Documentation
├── backend/
│   ├── lambdas/              # Lambda handlers
│   └── {name}-common/        # Shared backend code
├── frontend/
│   ├── components/           # React components
│   ├── hooks/                # React hooks
│   └── lib/                  # Frontend utilities
├── infrastructure/           # Terraform definitions
└── db/
    └── schema/               # Database migrations
```

## Development Workflow

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter module-access build
```

### Validation

```bash
# Run all validations
pnpm validate

# Specific validations
pnpm validate:types
pnpm validate:lint
pnpm validate:imports
```

## Deployment

CORA modules are deployed via the infrastructure repository:

```bash
cd ../{{PROJECT_NAME}}-infra
./scripts/build-cora-modules.sh
./scripts/deploy-cora-modules.sh dev
```

## Related Repositories

- [{{PROJECT_NAME}}-infra](../{{PROJECT_NAME}}-infra) - Infrastructure repository
- [cora-dev-toolkit](https://github.com/bodhix-ai/cora-dev-toolkit) - CORA development toolkit

## License

Proprietary - {{ORGANIZATION_NAME}}
