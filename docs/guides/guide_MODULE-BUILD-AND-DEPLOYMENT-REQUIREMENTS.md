# CORA Module Build and Deployment Requirements

**Version:** 1.0  
**Status:** Active  
**Last Updated:** January 1, 2026  
**Created From:** Lessons learned from module-ws integration (test-ws-01)

## Overview

This guide documents **mandatory technical requirements** for CORA module development that must be followed to ensure successful builds and deployments. These requirements were identified through real-world issues encountered during module development.

## Table of Contents

1. [Backend Build Script Requirements](#backend-build-script-requirements)
2. [org_common API Usage](#org_common-api-usage)
3. [Database Naming Standards](#database-naming-standards)
4. [Pre-Deployment Testing Checklist](#pre-deployment-testing-checklist)
5. [Common Pitfalls](#common-pitfalls)

---

## Backend Build Script Requirements

### 🚨 CRITICAL REQUIREMENT

**Every module with backend Lambda functions MUST have a `backend/build.sh` script.**

### Why This Matters

The CORA build system (`scripts/build-cora-modules.sh`) looks for `backend/build.sh` in each module. If this file doesn't exist, **the module will be silently skipped** during deployment.

### Module-WS Lesson Learned

**Issue:** Module-ws was being skipped during build:
```
[INFO] Building module-ws...
[WARN] No build.sh found for module-ws, skipping
```

**Impact:** Lambda functions were never built, preventing deployment.

**Solution:** Created `backend/build.sh` script → module built successfully.

### Build Script Template

#### For Modules WITHOUT Layers (uses org-common from module-access)

```bash
#!/usr/bin/env bash
# Build script for {module-name} Lambda functions (Zip-Based)
# This module does not have layers - it uses org-common from module-access
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building {module-name} backend (zip-based)...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDAS_DIR="${SCRIPT_DIR}/lambdas"
BUILD_DIR="${SCRIPT_DIR}/.build"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

# Function to build a Lambda function
build_lambda() {
    local lambda_name="$1"
    local lambda_dir="${LAMBDAS_DIR}/${lambda_name}"
    
    if [ ! -d "${lambda_dir}" ]; then
        echo -e "${RED}ERROR: Lambda directory not found: ${lambda_dir}${NC}"
        return 1
    fi
    
    echo "--- Building ${lambda_name} Lambda ---"
    
    local lambda_build_dir="${BUILD_DIR}/${lambda_name}-build"
    mkdir -p "${lambda_build_dir}"
    
    # Copy Lambda function code
    cp "${lambda_dir}/lambda_function.py" "${lambda_build_dir}/"
    
    # Install dependencies if requirements.txt exists
    if [ -f "${lambda_dir}/requirements.txt" ]; then
        pip3 install -r "${lambda_dir}/requirements.txt" -t "${lambda_build_dir}" \
            --platform manylinux2014_x86_64 \
            --python-version 3.11 \
            --implementation cp \
            --only-binary=:all: \
            --upgrade --quiet || true
    fi
    
    # Create zip file
    cd "${lambda_build_dir}"
    zip -q -r "${BUILD_DIR}/${lambda_name}.zip" .
    cd - > /dev/null
    
    # Cleanup build directory
    rm -rf "${lambda_build_dir}"
    
    echo -e "${GREEN}✓ Lambda built: ${BUILD_DIR}/${lambda_name}.zip${NC}"
}

# Build your Lambda functions
build_lambda "entity"  # Replace with your Lambda names
# build_lambda "another" # Add more as needed

echo ""
echo "========================================"
echo "Build Complete!"
echo "========================================"
echo ""
echo "Build artifacts created in: ${BUILD_DIR}"
du -sh "${BUILD_DIR}"/*.zip
echo ""
echo "Build completed successfully!"
```

#### For Modules WITH Custom Layers

See `templates/_modules-core/module-access/backend/build.sh` for a complete example that includes:
- Building custom Lambda layers
- Installing layer dependencies
- Building Lambda functions that use custom layers

### Checklist

- [ ] `backend/build.sh` exists
- [ ] Script is executable (`chmod +x backend/build.sh`)
- [ ] Script builds all Lambda functions in `backend/lambdas/`
- [ ] Script outputs zip files to `backend/.build/`
- [ ] Script has been tested locally

---

## org_common API Usage

### 🚨 CRITICAL REQUIREMENT

**Use the correct function names when calling org_common module functions.**

### Module-WS Lesson Learned

**Issue:** Lambda functions were calling `common.call_rpc()`:
```python
# ❌ WRONG - This function doesn't exist!
result = common.call_rpc('function_name', org_id, params)
```

**Error During Validation:**
```
ERROR: Function 'call_rpc' not found in org_common
```

**Solution:** Changed to `common.rpc()`:
```python
# ✅ CORRECT - This is the actual function name
result = common.rpc('function_name', org_id, params)
```

### org_common API Reference

The org_common layer from module-access provides these functions:

#### `rpc(function_name, org_id, payload, **kwargs)`

Call a stored procedure or RPC function in the database.

**Parameters:**
- `function_name` (str): Name of the database function to call
- `org_id` (str): Organization ID for RLS context
- `payload` (dict): Arguments to pass to the function
- `**kwargs`: Additional optional arguments

**Returns:** Result from the database function

**Example:**
```python
from layers.module_common import common

def lambda_handler(event, context):
    org_id = event['pathParameters']['org_id']
    
    result = common.rpc(
        'get_workspace_members',
        org_id,
        {'workspace_id': workspace_id}
    )
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

#### `get_user_orgs(user_id)`

Get all organizations a user belongs to.

**Parameters:**
- `user_id` (str): User ID

**Returns:** List of organization objects

#### Other Available Functions

See `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/db.py` for the complete API reference.

### Common Mistakes

❌ **WRONG:**
```python
common.call_rpc(...)        # Function doesn't exist
common.execute_rpc(...)     # Function doesn't exist
common.query(...)           # Function doesn't exist
```

✅ **CORRECT:**
```python
common.rpc(...)             # This is the correct function name
```

---

## Database Naming Standards

### 🚨 CRITICAL REQUIREMENT

**Follow CORA database naming standards** as documented in `docs/standards/cora/DATABASE-NAMING-STANDARDS.md`.

### Module-WS Lesson Learned

**Issue 1:** Using wrong column names in RLS policies:
```sql
-- ❌ WRONG - Column is called user_id, not person_id
CREATE POLICY workspace_member_access ON public.workspace
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = workspace.org_id
    AND org_members.person_id = auth.uid()  -- WRONG!
  )
);
```

**Issue 2:** Referencing non-existent columns:
```sql
-- ❌ WRONG - Column org_members.active doesn't exist
AND org_members.active = true  -- This column doesn't exist!
```

**Solution:** Use correct CORA column names:
```sql
-- ✅ CORRECT
CREATE POLICY workspace_member_access ON public.workspace
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_members.org_id = workspace.org_id
    AND org_members.user_id = auth.uid()  -- Correct!
  )
);
```

### Standard Column Names

| ❌ WRONG | ✅ CORRECT | Usage |
|----------|------------|-------|
| `person_id` | `user_id` | Reference to auth.users |
| `member_id` | `user_id` | User reference in org_members |
| `is_active` | Status handled differently | Don't assume active column exists |
| `org_members.active` | Check actual schema | Verify column exists before using |

### Checklist

- [ ] Referenced `docs/standards/cora/DATABASE-NAMING-STANDARDS.md`
- [ ] Used `user_id` for all user references (never `person_id`)
- [ ] Verified all columns exist before using in RLS policies
- [ ] Used `org_id UUID NOT NULL REFERENCES public.org(id)` for org references
- [ ] Followed standard audit columns: `created_at`, `updated_at`, `created_by`, `updated_by`

---

## Pre-Deployment Testing Checklist

### 🚨 CRITICAL REQUIREMENT

**Test module build and deployment BEFORE submitting for review.**

### Module-WS Lesson Learned

Issues discovered only during deployment:
1. Missing build.sh script
2. Incorrect function names in Lambda code
3. Database schema errors

These should have been caught during development testing.

### Mandatory Testing Steps

#### 1. Test Build Script Locally

```bash
# Navigate to module backend directory
cd packages/{module-name}/backend

# Run build script
./build.sh

# Verify artifacts created
ls -lh .build/
```

**Expected Output:**
- All Lambda zip files created in `.build/` directory
- No errors during build
- Artifacts have reasonable file sizes (not 0 bytes)

#### 2. Test Lambda Import Validation

```bash
# From project root
cd path/to/project-stack

# Run import validation
python3 scripts/validation/validate_lambda_imports.py
```

**Expected Output:**
```
✅ All imports are valid!
```

#### 3. Test Database Schema Migration

```bash
# Check SQL syntax
psql -f packages/{module-name}/db/schema/001-tables.sql --dry-run

# Apply to test database
psql $DATABASE_URL -f packages/{module-name}/db/schema/001-tables.sql
```

**Expected Output:**
- No SQL syntax errors
- Tables created successfully
- RLS policies applied without errors

#### 4. Test Full Deployment (End-to-End)

```bash
# From infra directory
cd path/to/project-infra/scripts

# Run full deployment to dev environment
./deploy-all.sh dev
```

**Expected Output:**
- ✅ Module builds successfully
- ✅ Artifacts uploaded to S3
- ✅ Terraform applies without errors
- ✅ Lambda functions deployed

### Testing Checklist

- [ ] Build script executes without errors
- [ ] All Lambda functions build successfully
- [ ] Import validation passes
- [ ] Database schemas apply cleanly
- [ ] Full deployment succeeds in test environment
- [ ] Lambda functions can be invoked (smoke test)

---

## Common Pitfalls

### ❌ Pitfall 1: Missing build.sh

**Symptom:**
```
[WARN] No build.sh found for module-{name}, skipping
```

**Solution:** Create `backend/build.sh` (see template above)

---

### ❌ Pitfall 2: Incorrect org_common API calls

**Symptom:**
```
ERROR: Function 'call_rpc' not found in org_common
```

**Solution:** Use `common.rpc()` instead of `common.call_rpc()`

---

### ❌ Pitfall 3: Wrong database column names

**Symptom:**
```
ERROR: column "person_id" does not exist
ERROR: column org_members.active does not exist
```

**Solution:** 
- Use `user_id` (not `person_id`)
- Verify columns exist before using in RLS policies

---

### ❌ Pitfall 4: Untested build script

**Symptom:** Build fails during deployment

**Solution:** Test `./build.sh` locally before committing

---

### ❌ Pitfall 5: Non-executable build.sh

**Symptom:** Build script not executed

**Solution:** 
```bash
chmod +x backend/build.sh
git add backend/build.sh
git commit -m "Add executable build script"
```

---

## Integration with Module Development Process

This guide supplements `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`:

### Phase 3: Implementation
- **Add:** Build script creation as mandatory step
- **Add:** org_common API usage guidelines
- **Add:** Database naming standards verification

### Phase 4: Validation & Deployment
- **Add:** Pre-deployment testing checklist
- **Add:** Local build verification
- **Add:** Import validation requirement

---

## Quick Reference

### When creating a new module:

1. ✅ Create `backend/build.sh` (use template)
2. ✅ Make it executable (`chmod +x`)
3. ✅ Use `common.rpc()` (not `call_rpc()`)
4. ✅ Use `user_id` (not `person_id`)
5. ✅ Test build locally before committing
6. ✅ Run import validation
7. ✅ Test database migrations
8. ✅ Test full deployment in dev environment

---

## References

- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - Overall development process
- `docs/standards/cora/DATABASE-NAMING-STANDARDS.md` - Database naming conventions
- `templates/_modules-core/module-access/backend/build.sh` - Build script example with layers
- `templates/_modules-functional/module-ws/backend/build.sh` - Build script example without layers
- `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/db.py` - org_common API

---

**Questions or Issues?** Contact the CORA development team or file an issue in the cora-dev-toolkit repository.
