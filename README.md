# CORA Module Development Toolkit

## Overview

This toolkit provides a comprehensive set of tools, templates, and documentation for developing CORA-compliant modules in the STS Career Stack ecosystem. It includes everything needed to create, test, and validate new modules that meet the Custom Organizational Requirement Architecture (CORA) standards.

## What's Included

- **Module Creation Script**: Automated scaffolding for new CORA-compliant modules
- **Module Template**: 100% CORA-compliant gold standard template
- **Compliance Scripts**: Automated validation tools for frontend, backend, and API compliance
- **ESLint Rules**: Custom linting rules for authentication and navigation patterns
- **Documentation**: Comprehensive guides on CORA standards and best practices
- **Development Tools**: TypeScript error analysis and auto-fix utilities

## Quick Start

### Prerequisites

**Required:**
- Node.js 18+ with pnpm package manager
- Python 3.8+
- Git

**For Full Compliance Checks:**
- AWS credentials (for infrastructure checks)
- Supabase credentials (for database checks)

### Installation

1. **Copy this toolkit to your project directory:**
   ```bash
   cp -r module-development-toolkit /path/to/your/ai-module-project/
   ```

2. **Install Python dependencies:**
   ```bash
   cd module-development-toolkit/config
   pip install -r requirements.txt
   ```

3. **Make scripts executable:**
   ```bash
   chmod +x module-development-toolkit/scripts/*.sh
   ```

### Create Your First Module

```bash
# From your project root (where packages/ directory exists)
./module-development-toolkit/scripts/create-cora-module.sh ai-enablement

# This will create: packages/ai-enablement/ with complete CORA-compliant structure
```

## Directory Structure

```
module-development-toolkit/
├── README.md                           # This file
├── INTEGRATION-GUIDE.md                # Integration instructions
├── scripts/
│   ├── create-cora-module.sh           # Module scaffolding script
│   ├── check-cora-compliance.py        # Full compliance check
│   ├── check-frontend-compliance.ts    # Frontend-specific checks
│   ├── check-api-compliance.py         # API compliance validation
│   ├── analyze-typescript-errors.sh    # Analyze TypeScript errors
│   ├── auto-fix-typescript.sh          # Auto-fix common TypeScript issues
│   ├── type-check-staged.sh            # Type check staged files
│   └── pre-commit-check.sh             # Pre-commit validation
├── templates/
│   └── _module-template/               # Gold standard module template
│       ├── backend/                    # Lambda functions, types, API
│       ├── frontend/                   # Components, hooks, navigation
│       ├── package.json
│       └── README.md
├── config/
│   ├── .eslintrc.cora-auth.js          # Authentication/authorization rules
│   ├── .eslintrc.cora-nav.js           # Navigation linting rules
│   └── requirements.txt                # Python dependencies
└── docs/
    ├── CORA-FRONTEND-STANDARDS.md      # Frontend compliance standards
    ├── CORA-COMPLIANCE-REMEDIATION-LOG.md  # Lessons learned
    ├── CORA-FRONTEND-COMPLIANCE-ASSESSMENT.md  # Assessment methodology
    └── README-CORA-COMPLIANCE.md       # How to use compliance scripts
```

## Core Scripts

### 1. create-cora-module.sh

**Purpose:** Scaffold a new CORA-compliant module from the template.

**Usage:**
```bash
./scripts/create-cora-module.sh <module-name>
```

**Example:**
```bash
./scripts/create-cora-module.sh ai-enablement
```

**What it does:**
1. Copies `templates/_module-template/` to `packages/{module-name}/`
2. Replaces all template placeholders with actual module name
3. Updates package.json with correct module name and dependencies
4. Runs initial CORA compliance check
5. Creates a fully functional, CORA-compliant module structure

**Requirements:**
- Must be run from project root (where `packages/` directory exists)
- Module name should be kebab-case (e.g., `ai-enablement`, `ai-config`)

### 2. check-cora-compliance.py

**Purpose:** Comprehensive CORA compliance check for infrastructure and code.

**Usage:**
```bash
python scripts/check-cora-compliance.py [options]
```

**Options:**
- `--module <name>`: Check specific module only
- `--skip-infra`: Skip infrastructure checks
- `--verbose`: Show detailed output

**Example:**
```bash
# Check all modules
python scripts/check-cora-compliance.py

# Check specific module
python scripts/check-cora-compliance.py --module ai-enablement

# Check without infrastructure validation
python scripts/check-cora-compliance.py --skip-infra
```

**What it checks:**
- Backend Lambda functions exist and are properly configured
- Infrastructure resources (API Gateway, Lambda, DynamoDB)
- Organization context usage patterns
- Type safety (no `any` types)
- RBAC enforcement
- Pagination in AWS API calls

**Output:**
- Compliance score (target: 90%+ backend, 95%+ frontend)
- Detailed findings with severity levels
- Actionable recommendations

**Requirements:**
- Python 3.8+
- boto3 (for AWS checks)
- supabase (for database checks)
- AWS credentials configured
- Supabase credentials in environment variables

### 3. check-frontend-compliance.ts

**Purpose:** Frontend-specific CORA compliance validation.

**Usage:**
```bash
npx ts-node scripts/check-frontend-compliance.ts [module-name]
```

**Example:**
```bash
# Check all frontend code
npx ts-node scripts/check-frontend-compliance.ts

# Check specific module
npx ts-node scripts/check-frontend-compliance.ts ai-enablement
```

**What it checks:**
- "use client" directive on all hooks
- Organization context via hooks (never as parameter)
- Zero `any` types in TypeScript
- Proper component structure
- Navigation integration
- Accessibility compliance

**Target:** 95%+ compliance score

### 4. check-api-compliance.py

**Purpose:** API-specific compliance validation.

**Usage:**
```bash
python scripts/check-api-compliance.py [module-name]
```

**What it checks:**
- CORS headers match Lambda requirements
- Proper error handling
- Response format consistency
- Authentication/authorization patterns
- API Gateway configuration

### 5. TypeScript Development Tools

**analyze-typescript-errors.sh**
```bash
./scripts/analyze-typescript-errors.sh
```
Analyzes TypeScript compilation errors and provides categorized output.

**auto-fix-typescript.sh**
```bash
./scripts/auto-fix-typescript.sh [module-name]
```
Automatically fixes common TypeScript issues.

**type-check-staged.sh**
```bash
./scripts/type-check-staged.sh
```
Type checks only staged files (useful for pre-commit hooks).

**pre-commit-check.sh**
```bash
./scripts/pre-commit-check.sh
```
Runs comprehensive pre-commit validation (linting, type checking, tests).

## CORA Compliance Standards

### Key Requirements

#### 1. Organization Context
- **DO:** Use hooks (`useOrganizationContext`) for org access
- **DON'T:** Pass `orgId` as function parameter
- **Why:** Ensures consistent context management across the application

```typescript
// ✅ CORRECT
import { useOrganizationContext } from '@sts-career/shared-types';

function MyComponent() {
  const { organizationId } = useOrganizationContext();
  // Use organizationId...
}

// ❌ INCORRECT
function MyComponent({ orgId }: { orgId: string }) {
  // Don't pass orgId as parameter
}
```

#### 2. TypeScript Type Safety
- **Zero tolerance for `any` types**
- Use specific types or generics
- Properly type all function parameters and return values

```typescript
// ✅ CORRECT
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ INCORRECT
function getUser(id: any): any {
  // ...
}
```

#### 3. "use client" Directive
- Required for all frontend components using React hooks
- Must be first line of file

```typescript
// ✅ CORRECT
"use client";

import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  // ...
}
```

#### 4. RBAC Enforcement
- All API endpoints must validate permissions
- Use `check_permission()` from org_common
- Never trust client-side permission checks alone

#### 5. Import Paths
- **Packages:** Use relative imports only (`../../`, `./`)
- **Apps:** Can use path aliases (`@/`, `@sts-career/`)

#### 6. Infrastructure Standards
- All infrastructure must be defined in Terraform
- No manual AWS console changes
- Terraform-only workflow prevents drift

### Compliance Targets

- **Frontend:** 95%+ compliance
- **Backend:** 90%+ compliance
- **Overall Module:** Pass all critical checks

## Module Template Structure

The `_module-template` provides a complete, working module structure:

```
_module-template/
├── backend/
│   ├── lambdas/
│   │   ├── MODULE_NAME_create.py      # Create operation
│   │   ├── MODULE_NAME_read.py        # Read operation
│   │   ├── MODULE_NAME_update.py      # Update operation
│   │   ├── MODULE_NAME_delete.py      # Delete operation
│   │   └── MODULE_NAME_list.py        # List operation
│   ├── types/
│   │   └── MODULE_NAME_types.py       # Backend type definitions
│   └── README.md
├── frontend/
│   ├── components/
│   │   ├── MODULE_NAMEList.tsx        # List view component
│   │   ├── MODULE_NAMEDetail.tsx      # Detail view component
│   │   └── MODULE_NAMEForm.tsx        # Form component
│   ├── hooks/
│   │   └── useMODULE_NAMEData.ts      # Data fetching hook
│   ├── api/
│   │   └── MODULE_NAMEApi.ts          # API client
│   ├── types/
│   │   └── index.ts                   # Frontend type definitions
│   ├── navigation/
│   │   └── MODULE_NAMENavConfig.ts    # Navigation configuration
│   └── index.ts                       # Public exports
├── package.json                        # Package configuration
├── tsconfig.json                       # TypeScript configuration
└── README.md                           # Module documentation
```

### Key Features

1. **CRUD Operations:** Complete backend implementation for all CRUD operations
2. **Type Safety:** Shared types between frontend and backend
3. **React Components:** Ready-to-use components following best practices
4. **API Client:** Fully typed API client with error handling
5. **Navigation:** Integrated navigation configuration
6. **Hooks:** Custom React hooks for data management
7. **100% CORA Compliant:** Passes all compliance checks

## Environment Setup

### Required Environment Variables

For full compliance checking, set these environment variables:

```bash
# AWS Credentials (for infrastructure checks)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Supabase Credentials (for database checks)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"
export SUPABASE_SERVICE_KEY="your-service-key"
```

### Optional Configuration

```bash
# Compliance check thresholds (defaults shown)
export CORA_FRONTEND_THRESHOLD="95"
export CORA_BACKEND_THRESHOLD="90"

# Skip infrastructure checks if not available
export SKIP_INFRA_CHECKS="true"
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: CORA Compliance Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          npm install -g pnpm
          pnpm install
          pip install -r module-development-toolkit/config/requirements.txt
          
      - name: Run CORA Compliance Checks
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: |
          python module-development-toolkit/scripts/check-cora-compliance.py
          npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
```

### Pre-commit Hook Setup

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
./module-development-toolkit/scripts/pre-commit-check.sh
```

## Troubleshooting

### Common Issues

#### 1. Module Creation Fails

**Problem:** `create-cora-module.sh` exits with error.

**Solutions:**
- Ensure you're in the project root directory
- Verify `packages/` directory exists
- Check that module name is kebab-case
- Ensure script has execute permissions: `chmod +x scripts/create-cora-module.sh`

#### 2. Compliance Check Fails to Connect to AWS

**Problem:** `check-cora-compliance.py` can't connect to AWS.

**Solutions:**
- Verify AWS credentials are set: `aws sts get-caller-identity`
- Check AWS region is correct
- Use `--skip-infra` flag to skip infrastructure checks
- Ensure boto3 is installed: `pip install boto3`

#### 3. TypeScript Errors After Module Creation

**Problem:** New module has TypeScript errors.

**Solutions:**
- Run `pnpm install` from project root
- Run `./scripts/auto-fix-typescript.sh module-name`
- Check that peer dependencies are installed
- Verify tsconfig.json extends from base configuration

#### 4. Frontend Compliance Fails

**Problem:** Frontend compliance score below 95%.

**Common Issues:**
- Missing "use client" directives
- Using `any` types
- Passing orgId as parameter
- Incorrect import paths (using aliases in packages)

**Solutions:**
- Run `npx ts-node scripts/check-frontend-compliance.ts module-name --verbose`
- Review specific failures in output
- Consult `docs/CORA-FRONTEND-STANDARDS.md`
- Check examples in existing modules (org-module, certification-module, resume-module)

#### 5. Backend Compliance Fails

**Problem:** Backend compliance score below 90%.

**Common Issues:**
- Missing organization_id validation
- No RBAC permission checks
- Missing pagination in AWS API calls
- Hardcoded values instead of environment variables

**Solutions:**
- Review `backend/lambdas/org_common/` patterns
- Ensure all endpoints call `check_permission()`
- Add pagination to DynamoDB and S3 operations
- Consult `docs/CORA-COMPLIANCE-REMEDIATION-LOG.md`

## Best Practices

### Module Development Workflow

1. **Create Module:** Use `create-cora-module.sh`
2. **Customize Template:** Adapt generated code to your needs
3. **Maintain Compliance:** Run compliance checks frequently
4. **Fix Issues Early:** Don't let compliance debt accumulate
5. **Document Changes:** Update module README.md
6. **Test Thoroughly:** Write tests for all new functionality
7. **Review Before Merge:** Final compliance check before PR

### Code Quality

- **Type Everything:** No `any` types, ever
- **Use Hooks Properly:** Organization context via hooks only
- **Follow Patterns:** Study existing modules for patterns
- **Keep It DRY:** Reuse common utilities from shared packages
- **Document Public APIs:** JSDoc comments on exported functions
- **Handle Errors:** Proper error handling and user feedback

### Testing

- **Unit Tests:** Test individual functions and components
- **Integration Tests:** Test module integration with system
- **E2E Tests:** Test complete user workflows
- **Compliance Tests:** Run before every commit

## Support and Resources

### Documentation

- **CORA Standards:** `docs/CORA-FRONTEND-STANDARDS.md`
- **Remediation Guide:** `docs/CORA-COMPLIANCE-REMEDIATION-LOG.md`
- **Assessment Methods:** `docs/CORA-FRONTEND-COMPLIANCE-ASSESSMENT.md`
- **Script Usage:** `docs/README-CORA-COMPLIANCE.md`

### Learning from Existing Modules

Study these production modules for patterns:

1. **org-module:** Organization management (gold standard)
2. **certification-module:** Complex CRUD with external APIs
3. **resume-module:** File uploads, AI integration, S3

### Key Lessons Learned

From CORA compliance remediation work:

1. Organization context should never be passed as parameter
2. Use hooks (`useOrganizationContext`) for org access
3. Zero tolerance for `any` types
4. "use client" directive required for all frontend hooks using React hooks
5. CORS headers must match Lambda header requirements
6. Pagination required for all AWS API calls
7. Infrastructure drift prevention via Terraform-only workflow
8. Schema baseline critical for multi-environment strategy
9. Migration tracking prevents drift
10. Compliance checks reveal real infrastructure issues

## Version Compatibility

This toolkit is designed for:

- **Node.js:** 18.x or higher
- **Python:** 3.8 or higher
- **TypeScript:** 5.x
- **React:** 18.x
- **Next.js:** 14.x (App Router)
- **AWS SDK (boto3):** 1.28.x or higher
- **Supabase:** 2.x

## License

This toolkit is part of the STS Career Stack project and follows the same license as the main project.

## Contributing

When contributing improvements to this toolkit:

1. Test changes with actual module creation
2. Update documentation to reflect changes
3. Ensure all compliance scripts still work
4. Add examples for new features
5. Update version compatibility if needed

## Changelog

### Version 1.0.0 (Initial Release)
- Complete module creation script
- Full compliance checking suite
- Gold standard module template
- Comprehensive documentation
- TypeScript development tools
- ESLint custom rules
- Python requirements specification
