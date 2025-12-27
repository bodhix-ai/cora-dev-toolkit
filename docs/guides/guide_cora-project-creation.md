# CORA Project Creation Guide

**Version:** 1.0  
**Last Updated:** December 14, 2025  
**Status:** Complete & Tested

---

## Overview

This guide walks you through creating a new CORA project from scratch, including all prerequisites, configuration, and validation steps.

**What You'll Create:**

- `{project-name}-infra` - Infrastructure repository (Terraform, AWS)
- `{project-name}-stack` - Application repository (Next.js, packages, modules)
- Complete database schema setup
- Identity provider (IDP) configuration
- All environment files and secrets

**Total Time:** ~30 minutes (first time)

---

## Prerequisites

### Required Software

Install these tools before proceeding:

#### 1. yq - YAML Processor

```bash
brew install yq
```

**Why needed:** Parses `setup.config.yaml` to extract credentials and configuration.

**Verify installation:**

```bash
yq --version
# Should output: yq (https://github.com/mikefarah/yq/) version X.X.X
```

#### 2. PostgreSQL Client (psql)

```bash
brew install postgresql
```

**Why needed:** Executes SQL scripts to create database tables and seed data.

**Verify installation:**

```bash
psql --version
# Should output: psql (PostgreSQL) X.X
```

#### 3. Node.js & pnpm

```bash
# Install Node.js (v18+)
brew install node

# Install pnpm
npm install -g pnpm
```

**Why needed:** Build and run the Next.js application.

**Verify installation:**

```bash
node --version  # Should be v18 or higher
pnpm --version  # Should output version number
```

#### 4. AWS CLI (Optional - for infrastructure deployment)

```bash
brew install awscli
```

**Why needed:** Deploy Terraform infrastructure to AWS.

**Verify installation:**

```bash
aws --version
```

#### 5. Python 3 with venv (Required for validation tools and Lambda builds)

```bash
# Python 3 is typically pre-installed on macOS
# Verify Python 3 is available
python3 --version

# Verify venv module is available (usually included with Python 3)
python3 -m venv --help
```

**Why needed:** 
- Build Lambda function packages
- Run validation tools in isolated environment
- Avoid conflicts with global Python packages

**Verify installation:**

```bash
python3 --version  # Should be Python 3.9 or higher
python3 -m venv --help  # Should display venv help
```

**Note:** The project creation script will automatically create a virtual environment and install all required validation dependencies (boto3, supabase, click, colorama, etc.) in `scripts/validation/.venv`.

#### 6. GitHub CLI (Optional - for repo creation)

```bash
brew install gh
```

**Why needed:** Automatically create GitHub repositories.

**Verify installation:**

```bash
gh --version
```

---

## Step 1: Prepare Your Configuration

### 1.1 Create Setup Configuration File

Create a configuration file for your project:

```bash
cd cora-dev-toolkit/templates/_project-stack-template
cp setup.config.example.yaml setup.config.YOUR-PROJECT.yaml
```

Replace `YOUR-PROJECT` with your actual project name (e.g., `ai-sec`, `my-app`).

### 1.2 Configure Authentication Provider

Edit `setup.config.YOUR-PROJECT.yaml` and set your authentication provider:

#### Option A: Okta Configuration

```yaml
# Auth Provider Selection
auth_provider: okta

# Okta Configuration
auth:
  okta:
    domain: "your-tenant.okta.com"
    client_id: "YOUR_OKTA_CLIENT_ID"
    client_secret: "YOUR_OKTA_CLIENT_SECRET"
    issuer: "https://your-tenant.okta.com/oauth2/default"
    jwks_uri: "https://your-tenant.okta.com/oauth2/default/v1/keys"
```

**Where to get Okta credentials:**

1. Log in to your Okta admin console
2. Go to Applications → Create App Integration
3. Choose "OIDC - OpenID Connect"
4. Select "Web Application"
5. Copy the Client ID and Client Secret
6. Set Sign-in redirect URI: `http://localhost:3000/api/auth/callback/okta`
7. Set Sign-out redirect URI: `http://localhost:3000`

#### Option B: Clerk Configuration

```yaml
# Auth Provider Selection
auth_provider: clerk

# Clerk Configuration
clerk:
  publishable_key: "pk_test_YOUR_KEY"
  secret_key: "sk_test_YOUR_SECRET"
  issuer: "https://your-clerk-domain.clerk.accounts.dev"
```

### 1.3 Configure Supabase

```yaml
# Supabase Configuration
supabase:
  url: "https://your-project.supabase.co"
  anon_key: "YOUR_ANON_KEY"
  service_role_key: "YOUR_SERVICE_ROLE_KEY"
  jwt_secret: "YOUR_JWT_SECRET"

  # Direct PostgreSQL connection (for automatic migrations)
  db:
    host: "aws-0-us-east-1.pooler.supabase.com"
    port: 6543
    name: "postgres"
    user: "postgres.your-project-ref"
    password: "YOUR_DB_PASSWORD"
```

**Where to get Supabase credentials:**

1. Log in to your Supabase dashboard
2. Go to Project Settings → API
3. Copy the Project URL (url)
4. Copy the anon/public key (anon_key)
5. Copy the service_role key (service_role_key)
6. Go to Project Settings → Database
7. Copy the connection pooler host (db.host)
8. Copy the database password (db.password)

### 1.4 Configure AWS (Optional)

```yaml
# AWS Configuration
aws:
  profile: "your-aws-profile"
  region: "us-east-1"
  api_gateway:
    id: "your-api-gateway-id"
    endpoint: "https://your-api-id.execute-api.us-east-1.amazonaws.com"
```

### 1.5 Configure GitHub (Optional)

```yaml
# GitHub Configuration
github:
  owner: "your-github-org"
  repo_stack: "your-project-stack"
  repo_infra: "your-project-infra"
```

---

## Step 2: Prepare Database

### 2.1 Reset Database (Clean Slate)

**Important:** Only do this for a new project or if you want to start fresh!

From Supabase Dashboard SQL Editor:

```sql
-- ⚠️ WARNING: This will delete ALL data in your database!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## Step 3: Create CORA Project

### 3.1 Run Project Creation Script

```bash
cd ~/code/policy/cora-dev-toolkit

./scripts/create-cora-project.sh YOUR-PROJECT \
  --with-core-modules \
  --output-dir ~/code/YOUR-ORG
```

**Replace:**

- `YOUR-PROJECT` - Your project name (lowercase, hyphens allowed)
- `YOUR-ORG` - Output directory for your projects

**Example:**

```bash
./scripts/create-cora-project.sh ai-sec \
  --with-core-modules \
  --output-dir ~/code/sts/security2
```

### 3.2 What the Script Does

The script will automatically:

1. ✅ Create `{project}-infra` and `{project}-stack` directories
2. ✅ Copy all templates and replace placeholders
3. ✅ Create 3 core modules: `module-access`, `module-ai`, `module-mgmt`
4. ✅ Extract credentials from `setup.config.yaml`
5. ✅ Generate `.env` files for web app
6. ✅ Generate `local-secrets.tfvars` for Terraform
7. ✅ Generate validation `.env` files
8. ✅ **Create Python virtual environment** for validation tools
9. ✅ **Install validation dependencies** (boto3, supabase, etc.) in isolated venv
10. ✅ **Create wrapper scripts** for easy validator execution
11. ✅ Consolidate database schemas from all modules
12. ✅ Generate IDP configuration seed file
13. ✅ **Execute database migrations automatically**
14. ✅ **Seed IDP configuration automatically**
15. ✅ Initialize git repositories

### 3.3 Expected Output

```
========================================
  Create CORA Project
========================================

[INFO] Project Name:    ai-sec
[INFO] GitHub Org:      (not specified)
[INFO] AWS Region:      us-east-1
[INFO] Output Dir:      ~/code/sts/security2
[INFO] Create Repos:    false
[INFO] Core Modules:    true
[INFO] Init Git:        true

[STEP] Creating ai-sec-infra...
[INFO] Created /Users/you/code/sts/security2/ai-sec-infra

[STEP] Creating ai-sec-stack...
[INFO] Created /Users/you/code/sts/security2/ai-sec-stack

[STEP] Creating core CORA modules...
[INFO] Creating module-access from core module template...
[INFO] Creating module-ai from core module template...
[INFO] Creating module-mgmt from core module template...

[STEP] Consolidating database schemas from all modules...
[INFO] Found 12 schema files
[INFO] Created consolidated setup-database.sql

[STEP] Generating IDP configuration seed file...
[INFO] Created seed-idp-config.sql for Okta

[STEP] Setting up validation environment...
[INFO] Creating Python virtual environment at scripts/validation/.venv...
[INFO] ✅ Virtual environment created
[INFO] Installing validation dependencies in virtual environment...
[INFO] ✅ Validation dependencies installed
[INFO] Created activation script: scripts/validation/activate-venv.sh
[INFO] Created wrapper script: scripts/validation/run-validators.sh
[INFO] Created .gitignore for validation directory
[INFO] 📦 Validation environment setup complete!
[INFO]    To activate: source scripts/validation/activate-venv.sh
[INFO]    To run validators: ./scripts/validation/run-validators.sh

[STEP] Running database migrations...
[INFO] Executing setup-database.sql...
[INFO] ✅ Database schema created successfully
[INFO] Executing seed-idp-config.sql...
[INFO] ✅ IDP configuration seeded successfully
[INFO] 🎉 Database migrations completed successfully!

========================================
  Project Created Successfully
========================================
```

---

## Step 4: Verify Database Setup

### 4.1 Check Tables Created

From Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected:** You should see 20+ tables including:

- `platform_idp_config`
- `platform_idp_audit_log`
- `platform_module_registry`
- `users`
- `organizations`
- And more...

### 4.2 Verify IDP Configuration

```sql
-- Check IDP is configured
SELECT provider_type, is_active, is_configured, display_name, config
FROM platform_idp_config
WHERE is_active = true;
```

**Expected Output:**

```
provider_type | is_active | is_configured | display_name | config
--------------+-----------+---------------+--------------+--------
okta          | true      | true          | Okta         | {"client_id": "...", "issuer": "..."}
```

---

## Step 5: Build and Deploy

### 5.1 Install Dependencies

```bash
cd ~/code/YOUR-ORG/YOUR-PROJECT-stack
pnpm install
```

### 5.2 Build CORA Modules

```bash
./scripts/build-cora-modules.sh
```

**Expected Output:**

```
[BUILD] Building module-access...
[BUILD] Building module-ai...
[BUILD] Building module-mgmt...
[SUCCESS] All modules built successfully
```

### 5.3 Deploy CORA Modules (Optional)

```bash
./scripts/deploy-cora-modules.sh
```

This uploads Lambda functions to S3 and registers modules in the database.

### 5.4 Deploy Terraform Infrastructure (Optional)

```bash
cd ~/code/YOUR-ORG/YOUR-PROJECT-infra

# Bootstrap Terraform state (first time only)
./bootstrap/bootstrap_tf_state.sh

# Deploy infrastructure
./scripts/deploy-terraform.sh dev
```

---

## Step 6: Start Development Server

### 6.1 Start Next.js Dev Server

```bash
cd ~/code/YOUR-ORG/YOUR-PROJECT-stack
./scripts/start-dev.sh
```

**Expected Output:**

```
[start-dev] ensuring port 3000 is free...
[start-dev] starting dev server on port 3000...

> YOUR-PROJECT-web@ dev
> next dev

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Ready in 2.2s
```

### 6.2 Test Authentication

1. **Open browser:** `http://localhost:3000`
2. **Expected:** Redirect to `/api/auth/signin`
3. **Click:** "Sign in with Okta" (or Clerk)
4. **Enter:** Your credentials
5. **Expected:** OAuth callback with PKCE & state validation
6. **Expected:** ✅ **Successful authentication!**
7. **Expected:** Redirect to home page
8. **Expected:** Authenticated session loaded

---

## Troubleshooting

### Issue: "yq not found"

**Solution:**

```bash
brew install yq
```

Then re-run the project creation script.

### Issue: "psql not found"

**Solution:**

```bash
brew install postgresql
```

Then re-run the project creation script.

### Issue: "seed-idp-config.sql not generated"

**Cause:** The `auth_provider` field might be missing or `yq` failed to parse the YAML.

**Solution:**

1. Check that `setup.config.YOUR-PROJECT.yaml` has `auth_provider: okta` at the top level
2. Verify yq is installed: `yq --version`
3. Test yq parsing: `yq '.auth_provider' setup.config.YOUR-PROJECT.yaml`
4. Re-run project creation

### Issue: "Database migrations failed"

**Possible causes:**

- Database credentials incorrect
- PostgreSQL client not installed
- Database not accessible

**Solution:**

1. Verify credentials in `setup.config.YOUR-PROJECT.yaml`
2. Test database connection:
   ```bash
   psql "postgresql://USER:PASSWORD@HOST:6543/postgres" -c "SELECT 1;"
   ```
3. Run migrations manually:
   ```bash
   cd ~/code/YOUR-ORG/YOUR-PROJECT-stack
   source scripts/validation/.env
   psql "$CONNECTION_STRING" -f scripts/setup-database.sql
   psql "$CONNECTION_STRING" -f scripts/seed-idp-config.sql
   ```

### Issue: "Authentication fails after login"

**Possible causes:**

- Environment variables not loaded
- Next.js cache not cleared
- Wrong OAuth redirect URLs

**Solution:**

1. Verify `.env` file exists: `ls apps/web/.env`
2. Check `NEXT_PUBLIC_AUTH_PROVIDER` is set correctly
3. Clear Next.js cache:
   ```bash
   rm -rf apps/web/.next
   ```
4. Restart dev server
5. Check Okta/Clerk dashboard for correct redirect URLs

### Issue: "Module build errors"

**Solution:**

```bash
# Clear all caches and reinstall
rm -rf node_modules
rm -rf apps/web/.next
rm pnpm-lock.yaml
pnpm install
```

### Issue: "pip: command not found" during module build

**Error Message:**
```
[INFO] Building module-mgmt...
Building lambda-mgmt-common Lambda layer...
Installing layer dependencies...
./build.sh: line 41: pip: command not found
```

**Cause:** The build scripts use `pip` but macOS typically only has `pip3` in the PATH.

**Solution:**

Fix the build scripts to use `pip3` instead of `pip`:

```bash
# Replace 'pip install' with 'pip3 install' in all module build scripts
cd YOUR-PROJECT-stack
find packages -name "build.sh" -type f -exec sed -i '' 's/pip install/pip3 install/g' {} \;
```

Then re-run the build:

```bash
cd ../YOUR-PROJECT-infra/scripts
bash build-cora-modules.sh
```

### Issue: "Database hostname does not resolve" (Supabase IPv4 Add-on Required)

**Error Message:**
```
[ERROR] ❌ Failed to execute setup-database.sql
psql: error: could not translate host name "db.xxx.supabase.co" to address: nodename nor servname provided, or not known
```

**Cause:** 

Newer Supabase projects no longer provide free direct PostgreSQL connections from external machines. The database hostname shown in the Supabase Dashboard may not be accessible via `psql`.

**Root Cause:**
- Supabase requires the **IPv4 add-on** ($4/month) for direct database connections
- Without this add-on, the database is only accessible via the Supabase Dashboard SQL Editor
- The DNS entry for the direct connection endpoint does not resolve

**Solutions:**

#### Option A: Run Migrations via Supabase Dashboard (Free)

1. **Copy the migration SQL:**
   ```bash
   cd YOUR-PROJECT-stack
   cat scripts/setup-database.sql | pbcopy
   ```

2. **Run in Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
   - Click "New Query"
   - Paste the SQL (Cmd+V)
   - Click "Run" or press Cmd+Enter
   - Wait for completion (may take 30-60 seconds for large schemas)

3. **Seed IDP Configuration:**
   ```bash
   cat scripts/seed-idp-config.sql | pbcopy
   ```
   - Paste and run in Supabase Dashboard SQL Editor

4. **Verify Success:**
   ```sql
   -- Check tables created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' ORDER BY table_name;
   
   -- Check IDP configuration
   SELECT provider_type, is_active, is_configured 
   FROM platform_idp_config WHERE is_active = true;
   ```

#### Option B: Enable IPv4 Add-on for psql Access (Paid)

1. Go to: Supabase Dashboard → Project Settings → Add-ons
2. Enable "IPv4" add-on ($4/month)
3. This enables direct external database connections via `psql`
4. Re-run the project creation script or migrations

#### Option C: Use Supabase CLI (Free)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push scripts/setup-database.sql
supabase db push scripts/seed-idp-config.sql
```

**Prevention:**

When setting up a new Supabase project for CORA:
1. Either enable the IPv4 add-on from the start
2. Or plan to run all migrations via the Dashboard SQL Editor
3. Update your documentation to reflect your chosen approach

---

## Project Structure

After creation, you'll have:

```
YOUR-PROJECT-infra/
├── bootstrap/
│   └── bootstrap_tf_state.sh
├── envs/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── local-secrets.tfvars (generated)
│   └── prd/
├── modules/
│   ├── app-service/
│   ├── modular-api-gateway/
│   └── secrets/
├── scripts/
│   └── deploy-terraform.sh
└── .env (generated)

YOUR-PROJECT-stack/
├── apps/
│   └── web/
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── middleware.ts
│       └── .env (generated)
├── packages/
│   ├── module-access/
│   │   ├── backend/lambdas/
│   │   ├── frontend/components/
│   │   ├── db/schema/
│   │   └── infrastructure/
│   ├── module-ai/
│   └── module-mgmt/
├── scripts/
│   ├── build-cora-modules.sh
│   ├── deploy-cora-modules.sh
│   ├── start-dev.sh
│   ├── setup-database.sql (generated)
│   ├── seed-idp-config.sql (generated)
│   ├── README-database-setup.md (generated)
│   └── validation/
│       └── .env (generated)
└── pnpm-workspace.yaml
```

---

## Next Steps

After successfully creating your project:

1. **Review generated files** - Check `.env`, `setup-database.sql`, `seed-idp-config.sql`
2. **Configure AWS credentials** - Set up AWS profile for infrastructure deployment
3. **Implement modules** - Follow CORA Module Definition of Done for each module
4. **Set up CI/CD** - Configure GitHub Actions for automated deployments
5. **Add features** - Start building your application on top of the CORA foundation

---

## Quick Reference Commands

```bash
# Create project
./scripts/create-cora-project.sh PROJECT-NAME --with-core-modules --output-dir ~/code/ORG

# Install dependencies
cd ~/code/ORG/PROJECT-stack && pnpm install

# Build modules
./scripts/build-cora-modules.sh

# Deploy modules (optional)
./scripts/deploy-cora-modules.sh

# Deploy infrastructure (optional)
cd ../PROJECT-infra && ./scripts/deploy-terraform.sh dev

# Start dev server
cd ../PROJECT-stack && ./scripts/start-dev.sh

# Open application
open http://localhost:3000
```

---

## Validation Tools

### Running Validators

The project creation script sets up a Python virtual environment with all required dependencies for validation tools.

**Option 1: Use the wrapper script (recommended):**
```bash
cd YOUR-PROJECT-stack
./scripts/validation/run-validators.sh
```

This automatically:
- Activates the virtual environment
- Runs all validators
- Deactivates the virtual environment
- Outputs results

**Option 2: Manual activation:**
```bash
cd YOUR-PROJECT-stack/scripts/validation
source activate-venv.sh

# Now run validators manually
python3 -m structure-validator.cli ../.. --format json
python3 -m api-tracer.cli ../.. --format json
python3 -m schema-validator.cli ../.. --format json

# When done
deactivate
```

**Option 3: Run orchestrator:**
```bash
cd YOUR-PROJECT-stack/scripts/validation
source activate-venv.sh
python3 cora-validate.py project ../..
deactivate
```

### Installed Validation Dependencies

The virtual environment includes:
- **boto3** - AWS SDK for API Gateway querying
- **supabase** - Supabase Python client for schema validation
- **python-dotenv** - Environment variable management
- **click** - CLI framework
- **colorama** - Terminal color output
- **requests** - HTTP library

### Why Virtual Environment?

The virtual environment approach provides:
- **Isolation** - No conflicts with global Python packages
- **Reproducibility** - Same dependencies across all team members
- **Easy management** - Simple to upgrade or reset dependencies
- **Best practice** - Standard Python development workflow

---

## Support

For issues or questions:

- Review troubleshooting section above
- Check CORA documentation in `cora-dev-toolkit/docs/`
- Review `.clinerules` in each repository for AI-actionable guidance

---

**Document Version:** 1.1  
**Last Updated:** December 27, 2025  
**Tested With:** ai-sec project (Okta authentication)  
**New in 1.1:** Virtual environment for validation tools, boto3 dependency
