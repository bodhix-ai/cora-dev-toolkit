# Validation Tools - Implementation Guide for CORA Projects

**Purpose:** Import and implement the 3 validation tools in any CORA-aligned project  
**Date Created:** November 25, 2025  
**Version:** 1.0

---

## 🤖 For AI Agents (Cline, Copilot, etc.)

**This guide is designed to be used by AI agents along with the validation scripts.**

**How to use this guide:**

1. **Provide this guide + the validation scripts to the AI:**

   ```
   Guide: module-development-toolkit/docs/VALIDATION-TOOLS-IMPLEMENTATION-GUIDE.md
   Scripts: pm-app-stack/scripts/validation/ (entire directory)
   ```

2. **The AI should:**

   - Copy the 3 tool directories (`schema-validator/`, `import-validator/`, `api-tracer/`) to the target project
   - Read the target project's structure to understand module organization
   - Update configuration files with target-project-specific values:
     - `FUNCTION_SIGNATURES` in `backend_validator.py`
     - `EXEMPTED_FILES` in `frontend_validator.py`
     - Module path patterns if structure differs
   - Test each tool to ensure it works with the new project
   - Set up pre-commit hooks and CI/CD workflows

3. **What gets adapted automatically:**

   - Module names (tools auto-detect all modules in `packages/*/`)
   - Database schema (schema validator introspects Supabase directly)
   - API routes (API tracer parses actual Terraform files)

4. **What requires manual configuration:**
   - Backend function signatures (`FUNCTION_SIGNATURES` dictionary)
   - Frontend auth exemptions (`EXEMPTED_FILES` list)
   - Supabase credentials (environment variables)
   - Project-specific paths (if different from standard CORA structure)

**Key insight:** The validation tools are already generic and designed for CORA architecture. The AI's job is to configure them for the specific project's function signatures and exemptions.

---

## Overview

This guide shows how to implement the Phase 1 Validation Tools in any CORA-aligned project. These tools validate:

1. **Schema Validation** - Database queries against Supabase schema
2. **Import Validation** - Backend function signatures & frontend auth independence
3. **API Tracing** - Full stack API contracts (Frontend → Gateway → Lambda)

---

## Prerequisites

**Your project must have:**

- CORA module architecture (frontend + backend structure)
- Python 3.11+ for backend Lambda functions
- TypeScript/React for frontend
- Supabase database
- Git repository

**Optional but recommended:**

- GitHub Actions for CI/CD
- Pre-commit hooks support

---

## Step 1: Copy Validation Tools

### 1.1 Copy Tool Directories

From the reference project, copy these directories to your project:

```bash
# Schema Validator
cp -r /path/to/reference-project/pm-app-stack/scripts/validation/schema-validator \
      /path/to/your-project/scripts/validation/

# Import Validator
cp -r /path/to/reference-project/pm-app-stack/scripts/validation/import-validator \
      /path/to/your-project/scripts/validation/

# API Tracer
cp -r /path/to/reference-project/pm-app-stack/scripts/validation/api-tracer \
      /path/to/your-project/scripts/validation/
```

**Your project structure should now have:**

```
your-project/
├── scripts/
│   └── validation/
│       ├── schema-validator/
│       │   ├── cli.py
│       │   ├── validator.py
│       │   ├── schema_inspector.py
│       │   ├── query_parser.py
│       │   ├── fix_proposer.py
│       │   ├── reporter.py
│       │   ├── requirements.txt
│       │   └── README.md
│       ├── import-validator/
│       │   ├── cli.py
│       │   ├── backend_validator.py
│       │   ├── frontend_validator.py
│       │   ├── signature_loader.py
│       │   ├── reporter.py
│       │   ├── requirements.txt
│       │   └── README.md
│       └── api-tracer/
│           ├── cli.py
│           ├── frontend_parser.py
│           ├── gateway_parser.py
│           ├── lambda_parser.py
│           ├── validator.py
│           ├── reporter.py
│           ├── requirements.txt
│           └── README.md
```

---

## Step 2: Install Dependencies

### 2.1 Install Python Dependencies

```bash
# Schema Validator
cd scripts/validation/schema-validator
pip install -r requirements.txt

# Import Validator
cd ../import-validator
pip install -r requirements.txt

# API Tracer
cd ../api-tracer
pip install -r requirements.txt
```

---

## Step 3: Configure for Your Project

### 3.1 Update Module Paths (if needed)

The tools auto-detect CORA module structure, but if your structure differs:

**Backend Lambda location:** Tools expect `packages/*/backend/lambdas/*/lambda_function.py`

If different, update in:

- `import-validator/backend_validator.py` - Line ~40 (LAMBDA_PATTERNS)
- `api-tracer/lambda_parser.py` - Line ~30 (file search patterns)

**Frontend location:** Tools expect `packages/*/frontend/**/*.{ts,tsx}`

If different, update in:

- `import-validator/frontend_validator.py` - Line ~50 (FRONTEND_PATTERNS)
- `api-tracer/frontend_parser.py` - Line ~30 (file search patterns)

### 3.2 Configure org_common Function Signatures

The import validator needs to know your backend function signatures.

**Edit:** `scripts/validation/import-validator/backend_validator.py`

Find the `FUNCTION_SIGNATURES` dictionary (~line 30) and update with your functions:

```python
FUNCTION_SIGNATURES = {
    # Your org_common functions
    "org_common.db.find_one": {
        "required": ["table", "filters"],
        "optional": ["select", "error_if_not_found"],
        "deprecated": []
    },
    "org_common.db.find_many": {
        "required": ["table"],
        "optional": ["select", "filters", "order", "limit"],
        "deprecated": ["order_by"]  # If you have deprecated params
    },
    # Add all your org_common functions...
}
```

### 3.3 Configure Frontend Auth Exemptions

The frontend validator checks for auth independence. Set which files are allowed to import auth providers:

**Edit:** `scripts/validation/import-validator/frontend_validator.py`

Find the `EXEMPTED_FILES` list (~line 25) and update:

```python
EXEMPTED_FILES = [
    "apps/web/components/ClientProviders.tsx",  # Your auth provider wrapper
    "apps/web/app/sign-in/page.tsx",           # Your sign-in page
    "apps/web/app/sign-up/page.tsx",           # Your sign-up page
    # Add any other files that legitimately need auth imports
]
```

---

## Step 4: Set Up Environment Variables

### 4.1 Create .env File (Local Development)

Create `.env` in your project root:

```bash
# Supabase Configuration (for schema validation)
SUPABASE_URL="your-project-url.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Important:** Add `.env` to `.gitignore` - never commit credentials!

### 4.2 Verify Configuration

Test that environment variables are loaded:

```bash
cd scripts/validation/schema-validator
python3 cli.py check-credentials
```

Expected output: `✅ All required environment variables are configured.`

---

## Step 5: Test Validation Tools

### 5.1 Test Schema Validator

```bash
cd scripts/validation/schema-validator
python3 cli.py --path ../../packages/ --output text
```

**Expected:** Reports validation status for all Lambda database queries

**If fails:**

- Check Supabase credentials
- Verify Lambda file paths
- Check that org_common patterns match your code

### 5.2 Test Import Validator (Backend)

```bash
cd scripts/validation/import-validator
python3 cli.py validate --path ../../packages/ --backend --output summary
```

**Expected:** Validates all Lambda function calls

**If fails:**

- Update `FUNCTION_SIGNATURES` with your functions
- Check Lambda file paths

### 5.3 Test Import Validator (Frontend)

```bash
cd scripts/validation/import-validator
python3 cli.py validate --path ../../packages/ --frontend --output summary
```

**Expected:** Validates frontend auth independence

**If fails:**

- Update `EXEMPTED_FILES` with your auth integration files
- Check frontend file paths

### 5.4 Test API Tracer

```bash
cd scripts/validation/api-tracer
python3 cli.py --path ../.. --output text 2>&1 | head -100
```

**Expected:** Parses frontend API calls, gateway routes, Lambda handlers

**If fails:**

- Check that frontend API client files exist
- Check that API Gateway route definitions exist
- Verify Lambda handler structure

---

## Step 6: Set Up Pre-Commit Hooks

### 6.1 Copy Pre-Commit Hook

Copy the reference pre-commit hook:

```bash
cp /path/to/reference-project/pm-app-stack/scripts/git-hooks/pre-commit \
   scripts/git-hooks/pre-commit

chmod +x scripts/git-hooks/pre-commit
```

### 6.2 Install Pre-Commit Hook

```bash
# Link to .git/hooks/
ln -sf ../../scripts/git-hooks/pre-commit .git/hooks/pre-commit
```

Or copy directly:

```bash
cp scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 6.3 Update Hook Paths (if needed)

If your project structure differs, edit `.git/hooks/pre-commit`:

Update these lines to match your paths:

- `npm run typecheck` - Your TypeScript check command
- `python3 scripts/validation/import-validator/cli.py ...` - Adjust path if needed
- `python3 scripts/validation/schema-validator/cli.py ...` - Adjust path if needed

### 6.4 Test Pre-Commit Hook

```bash
# Test with empty commit
git commit --allow-empty -m "Test: Pre-commit hook"
```

**Expected:**

```
🔍 Running pre-commit validation checks...

→ Step 1/4: TypeScript type checking...
   ✅ TypeScript check passed

→ Step 2/4: Backend import validation...
   ✅ Backend imports validated

→ Step 3/4: Frontend auth independence validation...
   ✅ Frontend auth independence validated

→ Step 4/4: Schema validation (optional)...
   ⏭️  Supabase credentials not configured, skipping schema validation
      (Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable)

═══════════════════════════════════════════════════════════════════════
✅ All pre-commit validation checks passed!
═══════════════════════════════════════════════════════════════════════
```

---

## Step 7: Set Up CI/CD (GitHub Actions)

### 7.1 Copy Workflow Files

```bash
mkdir -p .github/workflows

# Schema validation workflow
cp /path/to/reference-project/.github/workflows/schema-validation.yml \
   .github/workflows/schema-validation.yml

# You may also have existing validation workflows to update
```

### 7.2 Update Workflow Paths

Edit `.github/workflows/schema-validation.yml`:

Update these paths if your structure differs:

- `paths:` section - Update to match your Lambda file locations
- `cd scripts/validation/schema-validator` - Update if path differs
- `--path packages/` - Update if your packages directory is named differently

### 7.3 Add GitHub Secrets

Go to your GitHub repository:

1. Settings → Secrets and variables → Actions
2. Add secrets:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 7.4 Test CI/CD

Create a test PR:

```bash
git checkout -b test/validation-integration
echo "# Test" >> README.md
git add README.md
git commit -m "Test: Validation workflows"
git push origin test/validation-integration
```

Create PR on GitHub and verify workflows run.

---

## Step 8: Update Documentation

### 8.1 Add to .clinerules (if using Cline AI)

Add this section to your `.clinerules`:

```markdown
# ==========================================

# VALIDATION TOOLS

# ==========================================

## Pre-Commit Hooks

All validators run automatically on commit:

- **TypeScript type checking** - Blocks commits with TS errors
- **Backend import validation** - Validates Lambda function signatures
- **Frontend auth independence** - Ensures CORA auth patterns
- **Schema validation** (optional) - Requires Supabase credentials

To enable schema validation locally:
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

## Manual Validation

Run validators manually:

# Schema validation

python3 scripts/validation/schema-validator/cli.py --path packages/

# Import validation (backend)

python3 scripts/validation/import-validator/cli.py validate --path packages/ --backend

# Import validation (frontend)

python3 scripts/validation/import-validator/cli.py validate --path packages/ --frontend

# API full stack validation

python3 scripts/validation/api-tracer/cli.py --path .

## Documentation

- **Schema Validator**: `scripts/validation/schema-validator/README.md`
- **Import Validator**: See reference project docs
- **API Tracer**: See reference project docs
```

### 8.2 Update Team Documentation

Add validation tools to your team's development workflow docs:

- How to run validators
- What each validator checks
- How to fix common errors
- How to bypass for emergencies (`git commit --no-verify`)

---

## Step 9: Customize for Your Modules

### 9.1 Different Module Names

If your modules have different names (e.g., `user-module` instead of `org-module`):

**The tools auto-detect all modules in `packages/*/`** - no changes needed!

They scan for:

- `packages/*/backend/lambdas/*/lambda_function.py`
- `packages/*/frontend/**/*.{ts,tsx}`
- `packages/*/infrastructure/outputs.tf`

### 9.2 Different org_common Functions

Update `backend_validator.py` with your org_common function signatures:

```python
FUNCTION_SIGNATURES = {
    # Your custom functions
    "org_common.user.get_user_by_id": {
        "required": ["user_id"],
        "optional": ["include_deleted"],
        "deprecated": []
    },
    # ... more functions
}
```

### 9.3 Different Database Schema

The schema validator introspects your actual Supabase schema automatically - no configuration needed!

It will validate queries against whatever tables/columns exist in your database.

---

## Step 10: Troubleshooting

### Problem: Schema Validator Can't Connect

**Solution:**

```bash
# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
cd scripts/validation/schema-validator
python3 cli.py list-tables
```

### Problem: Import Validator Reports False Positives

**Solution:**
Update `FUNCTION_SIGNATURES` in `backend_validator.py` with your actual function signatures.

### Problem: Frontend Validator Reports Auth Violations

**Solution:**
Update `EXEMPTED_FILES` in `frontend_validator.py` with files that legitimately need auth imports.

### Problem: API Tracer Doesn't Find Routes

**Solution:**
Verify your API Gateway routes are defined in `packages/*/infrastructure/outputs.tf`.

The tracer looks for:

```hcl
output "api_routes" {
  value = [
    {
      method = "GET"
      path   = "/your-route"
      # ...
    }
  ]
}
```

### Problem: Pre-Commit Hook Too Slow

**Solution:**
Schema validation can be slow. You can:

1. Skip it locally: `unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY`
2. Use `git commit --no-verify` for quick commits
3. Rely on CI/CD for schema validation instead

---

## Quick Start Checklist

Use this checklist for rapid implementation:

### Installation

- [ ] Copy validation tool directories to `scripts/validation/`
- [ ] Install Python dependencies (`pip install -r requirements.txt` in each)
- [ ] Create `.env` with Supabase credentials
- [ ] Test each validator runs without errors

### Configuration

- [ ] Update `FUNCTION_SIGNATURES` in `backend_validator.py`
- [ ] Update `EXEMPTED_FILES` in `frontend_validator.py`
- [ ] Verify tools detect your modules correctly

### Git Hooks

- [ ] Copy pre-commit hook to `scripts/git-hooks/`
- [ ] Install hook: `ln -sf ../../scripts/git-hooks/pre-commit .git/hooks/pre-commit`
- [ ] Test hook with empty commit

### CI/CD

- [ ] Copy workflow files to `.github/workflows/`
- [ ] Update workflow paths for your project
- [ ] Add GitHub secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Test with a PR

### Documentation

- [ ] Add validation tools section to `.clinerules`
- [ ] Update team documentation
- [ ] Share validator commands with team

---

## Validation Scope by Tool

### Schema Validator Checks

**What it validates:**

- Lambda database queries match actual Supabase schema
- Table names are correct
- Column names are correct
- Column types match usage

**What it does NOT check:**

- Frontend code
- API Gateway configuration
- TypeScript types

**When to run:**

- Before committing Lambda changes
- In CI/CD pipeline
- When database schema changes

---

### Import Validator Checks

**Backend validation:**

- Lambda function imports are correct
- Function signatures match org_common definitions
- No deprecated parameters used
- Required parameters provided

**Frontend validation:**

- CORA modules don't import auth providers directly
- Auth state comes from context (UserContext)
- Token retrieval uses authAdapter pattern

**What it does NOT check:**

- Database queries (use Schema Validator)
- API contracts (use API Tracer)

**When to run:**

- Before every commit (fast check)
- When adding new Lambda functions
- When refactoring org_common

---

### API Tracer Checks

**What it validates:**

- Frontend API calls match API Gateway routes
- API Gateway routes have Lambda handlers
- Parameters match across all layers
- HTTP methods match

**What it does NOT check:**

- Response format details (partially)
- Database queries (use Schema Validator)
- Import correctness (use Import Validator)

**When to run:**

- Before deploying changes
- When adding new API endpoints
- When refactoring API contracts

---

## Best Practices

### 1. Run Validators Early and Often

```bash
# Before starting work
pnpm typecheck

# During development (fast checks)
python3 scripts/validation/import-validator/cli.py validate --backend --frontend

# Before committing (all checks run via pre-commit hook)
git commit -m "Your changes"
```

### 2. Fix Errors Systematically

**Priority order:**

1. TypeScript errors (blocks everything)
2. Import errors (prevents deployment)
3. Schema errors (prevents runtime failures)
4. API contract errors (prevents integration issues)

### 3. Use JSON Output for Automation

```bash
# Get machine-readable output
python3 scripts/validation/schema-validator/cli.py --output json > schema-report.json

# Parse with jq
cat schema-report.json | jq '.errors[] | .file + ":" + (.line|tostring) + " - " + .issue'
```

### 4. Bypass Only When Necessary

```bash
# Emergency bypass (use sparingly!)
git commit --no-verify -m "Hotfix: Critical bug"
```

### 5. Keep Signatures Updated

When you add/change org_common functions:

1. Update `FUNCTION_SIGNATURES` in `backend_validator.py`
2. Test validation still works
3. Commit signature changes with the function changes

---

## Support and Troubleshooting

### Common Issues

1. **"ModuleNotFoundError: No module named 'X'"**

   - Install dependencies: `pip install -r requirements.txt`

2. **"Connection refused" (Schema Validator)**

   - Check Supabase credentials
   - Verify network access to Supabase

3. **"No queries found" (Schema Validator)**

   - Verify Lambda files exist in expected locations
   - Check that queries use org_common patterns

4. **Many false positives (Import Validator)**

   - Update `FUNCTION_SIGNATURES` with actual function signatures
   - Check for typos in function names

5. **Hook runs but doesn't block bad commits**
   - Verify hook is executable: `chmod +x .git/hooks/pre-commit`
   - Check hook exit codes (should exit 1 on failure)

### Getting Help

Check these resources:

- Schema Validator README: `scripts/validation/schema-validator/README.md`
- Import Validator README: `scripts/validation/import-validator/README.md`
- API Tracer README: `scripts/validation/api-tracer/README.md`
- Run with `--verbose` flag for debug output

---

## Conclusion

You've now implemented all 3 validation tools in your CORA project! 🎉

**What you have:**

- ✅ Schema validation for database queries
- ✅ Import validation for backend functions
- ✅ Auth independence validation for frontend
- ✅ API contract validation across full stack
- ✅ Pre-commit hooks (automated validation)
- ✅ CI/CD integration (GitHub Actions)

**Next steps:**

1. Test the validators with your actual code
2. Fix any errors they find
3. Share with your team
4. Add to your development workflow

**Remember:** These tools catch errors before deployment, saving hours of debugging time!

---

**Document Version:** 1.0  
**Created:** November 25, 2025  
**Author:** Cline AI Agent  
**Purpose:** Portable implementation guide for CORA validation tools
