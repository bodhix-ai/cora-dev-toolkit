# CORA Project Creation Guide

## Overview

This guide explains how to create a new CORA project using the `create-cora-project.sh` script.

## Prerequisites

- `yq` (YAML processor): `brew install yq`
- `git` (if using `--init-git`)
- `gh` CLI (if using `--create-repos`): Install from https://cli.github.com/
- `openssl` (for secret generation)
- `python3` (for validation setup)

## Directory Structure

CORA projects use a two-repo pattern:
- `{project}-infra` - Infrastructure as Code (Terraform)
- `{project}-stack` - Application Code (Next.js, modules)

These repos are typically organized under a parent directory:

```
project-name/
├── ai-sec-infra/     # or {project}-infra
└── ai-sec-stack/     # or {project}-stack
```

## 🚨 CRITICAL: Create Parent Directory FIRST

**Before running the creation script, you MUST create the parent directory:**

```bash
# 1. Create parent directory FIRST
mkdir -p ~/code/sts/my-project

# 2. THEN run the creation script
cd ~/code/bodhix/cora-dev-toolkit
./scripts/create-cora-project.sh my-project --with-core-modules --output-dir ~/code/sts

# 3. Move repos into parent directory
cd ~/code/sts
mv my-project-infra my-project/ai-sec-infra
mv my-project-stack my-project/ai-sec-stack
```

### Why This Matters

If you skip step 1 (creating the parent directory), you'll end up with:
```
~/code/sts/
├── my-project-infra/    # ❌ Repos at top level, not organized
└── my-project-stack/    # ❌ Harder to manage
```

Instead of the correct structure:
```
~/code/sts/
└── my-project/           # ✅ Parent directory organizes both repos
    ├── ai-sec-infra/     # ✅ Infrastructure repo
    └── ai-sec-stack/     # ✅ Application repo
```

## Basic Usage

```bash
./scripts/create-cora-project.sh <project-name> [OPTIONS]
```

### Required Arguments

- `<project-name>` - Name of the project (e.g., "my-app")
  - Must start with a lowercase letter
  - Can contain only lowercase letters, numbers, and hyphens

### Common Options

- `--with-core-modules` - Include the 3 core CORA modules (module-access, module-ai, module-mgmt)
- `--output-dir <path>` - Directory to create projects in (default: current directory)
- `--org <name>` - GitHub organization/owner
- `--region <region>` - AWS region (default: us-east-1)
- `--create-repos` - Create GitHub repositories (requires `gh` CLI and `--org`)
- `--no-git` - Don't initialize git repositories
- `--dry-run` - Preview what would be created

## Complete Example

```bash
# 1. Create parent directory
mkdir -p ~/projects/my-app

# 2. Navigate to toolkit
cd ~/code/bodhix/cora-dev-toolkit

# 3. Create project
./scripts/create-cora-project.sh my-app \
  --with-core-modules \
  --org mycompany \
  --region us-east-1 \
  --output-dir ~/projects

# 4. Organize repos
cd ~/projects
mv my-app-infra my-app/ai-sec-infra
mv my-app-stack my-app/ai-sec-stack

# 5. Verify structure
ls -la my-app/
# Should show:
#   ai-sec-infra/
#   ai-sec-stack/
```

## What Gets Created

### Infrastructure Repo (`{project}-infra`)

```
my-app-infra/
├── envs/
│   └── dev/
│       ├── main.tf              # Main infrastructure config
│       ├── variables.tf         # Input variables
│       ├── backend.tf           # Terraform state backend
│       └── local-secrets.tfvars # Credentials (gitignored)
├── modules/                     # Reusable Terraform modules
├── lambdas/                     # Lambda function code
├── scripts/                     # Deployment scripts
└── bootstrap/                   # State backend setup
```

### Application Repo (`{project}-stack`)

```
my-app-stack/
├── apps/
│   └── web/                    # Next.js application
├── packages/
│   ├── module-access/          # Core module (if --with-core-modules)
│   ├── module-ai/              # Core module (if --with-core-modules)
│   ├── module-mgmt/            # Core module (if --with-core-modules)
│   ├── api-client/             # Shared API client
│   ├── contracts/              # OpenAPI contracts
│   └── shared-types/           # Shared TypeScript types
├── scripts/
│   ├── validation/             # CORA validators
│   ├── setup-database.sql      # Consolidated DB schema
│   └── seed-idp-config.sql     # IDP configuration
└── setup.config.example.yaml   # Configuration template
```

## Post-Creation Steps

### 1. Configure Project

Copy the example config and fill in your credentials:

```bash
cd ~/projects/my-app/ai-sec-stack
cp setup.config.example.yaml setup.config.my-app.yaml
# Edit setup.config.my-app.yaml with your values
```

### 2. Bootstrap Infrastructure

Set up Terraform state backend:

```bash
cd ~/projects/my-app/ai-sec-infra
./scripts/bootstrap/bootstrap_tf_state.sh
```

### 3. Deploy Infrastructure

```bash
cd ~/projects/my-app/ai-sec-infra
./scripts/deploy-terraform.sh dev
```

### 4. Set Up Database

```bash
cd ~/projects/my-app/ai-sec-stack

# Option 1: Using Supabase CLI (recommended)
supabase db push scripts/setup-database.sql
supabase db push scripts/seed-idp-config.sql

# Option 2: Using psql
psql "postgresql://..." -f scripts/setup-database.sql
psql "postgresql://..." -f scripts/seed-idp-config.sql
```

### 5. Install Dependencies & Build

```bash
cd ~/projects/my-app/ai-sec-stack
pnpm install
pnpm build
```

## Advanced Usage

### Creating with GitHub Repos

```bash
# Requires gh CLI and authentication
./scripts/create-cora-project.sh my-app \
  --with-core-modules \
  --org mycompany \
  --create-repos \
  --output-dir ~/projects
```

This will:
1. Create local repositories
2. Initialize git
3. Create remote GitHub repositories
4. Push initial commit

### Dry Run (Preview)

```bash
./scripts/create-cora-project.sh my-app \
  --with-core-modules \
  --dry-run
```

Shows what would be created without making changes.

## Troubleshooting

### "Directory already exists" Error

The script won't overwrite existing directories. Remove them first:

```bash
rm -rf ~/projects/my-app-infra ~/projects/my-app-stack
```

### Missing Dependencies

Install required tools:

```bash
# macOS
brew install yq gh python3

# Verify installations
yq --version
gh --version
python3 --version
```

### Validation Errors After Creation

The script runs validation automatically. Common issues:

- **Schema Validator Errors** - Missing `.env` file (expected, fill in credentials)
- **API Tracer Errors** - Infrastructure not deployed yet (expected)
- **Portability Errors** - Hardcoded values in example files (acceptable in examples)

## Next Steps

1. Review `.clinerules` in both repositories for AI-actionable instructions
2. Follow the CORA Module Definition of Done for core modules
3. Configure your IDP (Okta or Clerk) credentials
4. Deploy infrastructure and test the application

## Support

- Review `memory-bank/README.md` in the toolkit for current context
- Check `docs/CORA-DEVELOPMENT-TOOLKIT-PLAN.md` for implementation roadmap
- For issues, use `/reportbug` in Cline chat
