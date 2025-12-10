# CORA Project Boilerplate Guide

**Status:** 📋 Phase 1 Documentation  
**Created:** December 10, 2025  
**Purpose:** Define the complete structure and requirements for CORA-compliant projects

---

## Overview

Every CORA project consists of **two repositories** that work together:

| Repository        | Purpose                | Primary Contents                             |
| ----------------- | ---------------------- | -------------------------------------------- |
| `{project}-infra` | Infrastructure as Code | Terraform, deploy scripts, authorizer lambda |
| `{project}-stack` | Application Code       | Next.js app, CORA modules, validation        |

This guide defines the required structure, files, and patterns for each repository.

---

## Quick Start

### Creating a New CORA Project

```bash
# Using the toolkit script (when available)
./scripts/create-cora-project.sh my-app

# This creates:
# - my-app-infra/  (Infrastructure repository)
# - my-app-stack/  (Application repository)
```

### Project Naming Convention

- Use lowercase, hyphenated names: `my-app`, `customer-portal`, `analytics-hub`
- Avoid underscores and camelCase
- Keep names short but descriptive (2-3 words max)

---

## Infra Repository Structure

### `{project}-infra/` Required Structure

```
{project}-infra/
├── .clinerules                     # AI agent instructions
├── .gitignore                      # Git ignore patterns
├── README.md                       # Project overview
├── project.json                    # CORA project configuration
│
├── bootstrap/                      # One-time setup scripts
│   ├── bootstrap_tf_state.sh       # Create S3 backend for Terraform
│   └── bootstrap_tf_state_{project}_admin.sh  # (optional) Admin bootstrap
│
├── envs/                           # Environment-specific Terraform
│   ├── dev/
│   │   ├── main.tf                 # Dev environment resources
│   │   ├── variables.tf            # Variable definitions
│   │   ├── providers.tf            # AWS provider config
│   │   ├── backend.tf              # S3 backend config
│   │   └── backend.hcl             # Backend variables
│   ├── stg/                        # Staging environment (same structure)
│   └── prd/                        # Production environment (same structure)
│
├── modules/                        # Reusable Terraform modules
│   ├── modular-api-gateway/        # API Gateway configuration
│   ├── secrets/                    # AWS Secrets Manager
│   ├── github-oidc-role/           # GitHub Actions OIDC
│   └── {feature-modules}/          # Feature-specific infra
│
├── lambdas/                        # Lambda source code (infra-owned)
│   └── api-gateway-authorizer/     # Custom authorizer
│
├── scripts/                        # Automation scripts
│   ├── build-cora-modules.sh       # Build module lambdas
│   ├── deploy-cora-modules.sh      # Deploy module lambdas
│   └── deploy-terraform.sh         # Apply Terraform
│
├── docs/                           # Infrastructure documentation
│   └── {ADRs, guides, etc.}
│
├── memory-bank/                    # AI context files
│   ├── README.md
│   ├── activeContext.md
│   └── progress.md
│
└── .github/                        # GitHub Actions
    └── workflows/
        ├── deploy-dev.yml
        ├── deploy-stg.yml
        └── deploy-prd.yml
```

### Required Terraform Modules

| Module                | Purpose                         | Required |
| --------------------- | ------------------------------- | -------- |
| `modular-api-gateway` | API Gateway with CORA routes    | ✅ Yes   |
| `secrets`             | AWS Secrets Manager integration | ✅ Yes   |
| `github-oidc-role`    | GitHub Actions deployment role  | ✅ Yes   |
| `{feature-modules}`   | Feature-specific infrastructure | Per need |

### Environment Configuration

Each environment (`dev`, `stg`, `prd`) requires:

```hcl
# variables.tf - Required variables
variable "environment" {
  description = "Environment name (dev, stg, prd)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

# Feature flags for CORA modules
variable "enable_kb_module" {
  description = "Enable Knowledge Base module"
  type        = bool
  default     = false
}

variable "enable_ai_module" {
  description = "Enable AI module"
  type        = bool
  default     = true
}
```

---

## Stack Repository Structure

### `{project}-stack/` Required Structure

```
{project}-stack/
├── .clinerules                     # AI agent instructions
├── .gitignore                      # Git ignore patterns
├── .env.example                    # Environment template
├── README.md                       # Project overview
├── project.json                    # CORA project configuration
├── pnpm-workspace.yaml             # Monorepo workspace config
├── tsconfig.json                   # TypeScript config
├── turbo.json                      # Turborepo config (optional)
│
├── apps/                           # Application packages
│   └── web/                        # Next.js application
│       ├── src/
│       │   ├── app/                # App Router pages
│       │   ├── components/         # Shared components
│       │   ├── contexts/           # React contexts
│       │   ├── hooks/              # Custom hooks
│       │   ├── lib/                # Utilities
│       │   └── types/              # TypeScript types
│       ├── public/
│       ├── package.json
│       └── next.config.js
│
├── packages/                       # CORA modules & shared packages
│   ├── _module-template/           # Template for new modules
│   │
│   ├── api-client/                 # Centralized API client
│   ├── contracts/                  # API contracts (Zod schemas)
│   ├── shared-types/               # Shared TypeScript types
│   │
│   ├── module-access/              # Core: Identity & access control
│   ├── module-ai/                  # Core: AI provider management
│   ├── module-mgmt/                # Core: Platform management
│   │
│   └── module-{feature}/           # Functional modules
│
├── services/                       # Lambda handlers (legacy location)
│   └── {service-handlers}/
│
├── scripts/                        # Build & validation scripts
│   ├── validation/                 # CORA validators
│   └── git-hooks/                  # Git hooks
│
├── tests/                          # E2E and integration tests
│   └── e2e/
│
├── docs/                           # Application documentation
│   ├── architecture/
│   ├── implementation/
│   └── user-guides/
│
├── memory-bank/                    # AI context files
│   ├── README.md
│   ├── activeContext.md
│   └── progress.md
│
└── .github/                        # GitHub Actions
    └── workflows/
        ├── ci.yml
        ├── deploy-dev.yml
        └── deploy-prd.yml
```

### Required Packages

| Package         | Purpose                       | Required |
| --------------- | ----------------------------- | -------- |
| `api-client`    | Centralized API communication | ✅ Yes   |
| `contracts`     | Zod schemas for API contracts | ✅ Yes   |
| `shared-types`  | Shared TypeScript definitions | ✅ Yes   |
| `module-access` | Identity & access control     | ✅ Yes   |
| `module-ai`     | AI provider management        | ✅ Yes   |
| `module-mgmt`   | Platform management           | ✅ Yes   |

---

## Core vs Functional Modules

### Core Modules (Required)

Core modules provide foundational capabilities that all CORA applications need:

| Module          | Tier | Purpose                                     |
| --------------- | ---- | ------------------------------------------- |
| `module-access` | 1    | IDP integration, org context, permissions   |
| `module-ai`     | 2    | AI provider enablement, model configuration |
| `module-mgmt`   | 3    | Lambda management, warming, monitoring      |

**Tier System:**

- **Tier 1:** Zero dependencies on other CORA modules
- **Tier 2:** May depend on Tier 1 modules only
- **Tier 3:** May depend on Tier 1 and 2 modules

### Functional Modules (Per-Feature)

Functional modules implement specific application features:

| Module             | Purpose                     |
| ------------------ | --------------------------- |
| `module-kb`        | Knowledge base management   |
| `module-chat`      | Chat sessions and messaging |
| `module-project`   | Project organization        |
| `module-dashboard` | Analytics and reporting     |
| `module-{custom}`  | Custom feature modules      |

---

## Module Naming Convention

### Pattern

```
module-{purpose}
```

Where `{purpose}` is a **single word** describing the module's main responsibility.

### Valid Examples

- ✅ `module-access` (identity and access)
- ✅ `module-ai` (AI providers)
- ✅ `module-kb` (knowledge base)
- ✅ `module-chat` (messaging)
- ✅ `module-project` (projects)

### Invalid Examples

- ❌ `access-module` (wrong order)
- ❌ `module-knowledge-base` (multi-word)
- ❌ `kb-module` (missing prefix)
- ❌ `moduleKb` (camelCase)

---

## project.json Schema

Both repositories require a `project.json` file at the root:

### Infra Repo project.json

```json
{
  "name": "{project}-infra",
  "version": "1.0.0",
  "cora": {
    "version": "1.0.0",
    "type": "infra",
    "project": "{project}",
    "stack_repo": "{project}-stack"
  },
  "environments": {
    "dev": {
      "aws_region": "us-east-1",
      "aws_account_id": "{account-id}",
      "domain": "dev.{project}.example.com"
    },
    "stg": {
      "aws_region": "us-east-1",
      "aws_account_id": "{account-id}",
      "domain": "stg.{project}.example.com"
    },
    "prd": {
      "aws_region": "us-east-1",
      "aws_account_id": "{account-id}",
      "domain": "{project}.example.com"
    }
  },
  "modules": {
    "api_gateway": true,
    "secrets": true,
    "github_oidc": true
  }
}
```

### Stack Repo project.json

```json
{
  "name": "{project}-stack",
  "version": "1.0.0",
  "cora": {
    "version": "1.0.0",
    "type": "stack",
    "project": "{project}",
    "infra_repo": "{project}-infra"
  },
  "core_modules": ["module-access", "module-ai", "module-mgmt"],
  "functional_modules": ["module-kb", "module-chat"],
  "packages": {
    "api-client": true,
    "contracts": true,
    "shared-types": true
  }
}
```

---

## Environment Configuration

### Required Environment Variables

Create `.env.local` (not committed) from `.env.example`:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key

# API Configuration
NEXT_PUBLIC_API_URL=https://api.dev.{project}.example.com

# Database (if applicable)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Feature Flags
ENABLE_KB_MODULE=true
ENABLE_AI_MODULE=true
```

### Environment-Specific Configuration

| Variable              | Dev            | Stg            | Prd         |
| --------------------- | -------------- | -------------- | ----------- |
| `NEXTAUTH_URL`        | localhost:3000 | stg.domain.com | domain.com  |
| `NEXT_PUBLIC_API_URL` | api-dev URL    | api-stg URL    | api-prd URL |
| `LOG_LEVEL`           | debug          | info           | warn        |

---

## Anti-Patterns to Avoid

### ❌ Hardcoded Values

```typescript
// BAD: Hardcoded project name
const API_URL = "https://api.pm-app.example.com";

// GOOD: Environment variable
const API_URL = process.env.NEXT_PUBLIC_API_URL;
```

### ❌ Cross-Repo Dependencies

```typescript
// BAD: Importing from infra repo
import { something } from "../../../pm-app-infra/modules";

// GOOD: Each repo is self-contained
import { something } from "@packages/shared-types";
```

### ❌ Environment-Specific Logic in Code

```typescript
// BAD: Environment logic in code
if (process.env.NODE_ENV === "production") {
  // Different behavior
}

// GOOD: Configuration-driven behavior
const config = getConfig(); // Reads from environment
```

---

## Validation Requirements

Before deployment, projects must pass:

1. **Structure Validation** - Required files and directories exist
2. **Module Validation** - All modules have valid `module.json`
3. **Portability Validation** - No hardcoded project-specific values
4. **Type Validation** - TypeScript compiles without errors
5. **Lint Validation** - ESLint passes with CORA rules

Run validation:

```bash
# From stack repo
pnpm run validate

# Or using toolkit validator
python scripts/validation/cora-validate.py --mode=project
```

---

## Getting Started Checklist

### New Project Setup

- [ ] Run `create-cora-project.sh {project-name}`
- [ ] Configure AWS credentials
- [ ] Run bootstrap script for Terraform state
- [ ] Update `project.json` with actual values
- [ ] Create `.env.local` from `.env.example`
- [ ] Install dependencies (`pnpm install`)
- [ ] Run validation (`pnpm run validate`)
- [ ] Create initial commit
- [ ] Set up CI/CD workflows

### Adding a New Module

- [ ] Copy `_module-template` to `module-{name}`
- [ ] Update `module.json` with module details
- [ ] Implement backend layer
- [ ] Implement frontend components
- [ ] Add API routes to gateway
- [ ] Run module validation
- [ ] Update `project.json` modules list

---

## Related Documentation

- [cora-core-modules.md](./cora-core-modules.md) - Core module specifications
- [cora-module-definition-of-done.md](./cora-module-definition-of-done.md) - Module certification
- [cora-validation-guide.md](./cora-validation-guide.md) - Validation framework
- [cora-documentation-standards.md](./cora-documentation-standards.md) - Documentation guidelines

---

**Document Version:** 1.0  
**Last Updated:** December 10, 2025  
**Status:** Phase 1 Complete
