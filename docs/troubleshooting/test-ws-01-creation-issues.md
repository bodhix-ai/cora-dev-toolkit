# Test Project Creation Issues - test-ws-01

**Date:** January 1, 2026  
**Test Run:** `create-cora-project.sh ai-sec --with-core-modules --output-dir ~/code/sts/test-ws-01`  
**Status:** ❌ Failed with multiple errors

## Issues Identified

### 1. ❌ Wrong Core Modules Directory Path (CRITICAL)

**Location:** `scripts/create-cora-project.sh` line 653

**Current Code:**
```bash
CORE_MODULES_DIR="${TOOLKIT_ROOT}/templates/_cora-core-modules"
```

**Actual Directory:**
```
templates/_modules-core/
```

**Impact:**
- Script looks for `_cora-core-modules` but directory is named `_modules-core`
- Never finds actual core module templates
- Falls back to generic `_module-template/`
- Generic template creates dummy `entity` tables with `REFERENCES public.org(id)`
- **But `org` table doesn't exist** (actual table is `orgs` in module-access)
- Database migration fails with: `ERROR: relation "public.org" does not exist`

**Evidence from Terminal:**
```
[INFO] Creating module-access from generic template...
[INFO] Creating module-ai from generic template...
[INFO] Creating module-mgmt from generic template...
```

Should have said "from core module template"!

**Fix:**
```bash
CORE_MODULES_DIR="${TOOLKIT_ROOT}/templates/_modules-core"
```

---

### 2. ❌ Bash 3.x Compatibility Issues

**Location:** `scripts/create-cora-project.sh` lines 269-270, 280

**Current Code (Line 269-270):**
```bash
local -n enabled_modules_ref=$1  # Nameref - bash 4+ only
local -n resolved_modules_ref=$2  # Nameref - bash 4+ only
```

**Current Code (Line 280):**
```bash
local -A processed_modules  # Associative array - bash 4+ only
```

**Impact:**
- macOS ships with bash 3.2 by default
- These features require bash 4.0+
- Script fails with:
  ```
  local: -n: invalid option
  local: -A: invalid option
  ```
- Dependency resolution fails
- Config merging fails (reports "Merged 0 module configurations")

**Fix Strategy:**
Replace namerefs and associative arrays with bash 3.x compatible alternatives:
- Use `eval` for indirect variable references (instead of `local -n`)
- Use indexed arrays with delimited strings (instead of `local -A`)

---

### 3. ❌ Database Schema Dependency Order

**Root Cause:** Issue #1 causes generic templates to be used

**Generic Template Problem:**
- `templates/_module-template/db/schema/001-entity-table.sql` references `public.org`
- But actual table is `public.orgs` (plural) in module-access
- And it hasn't been created yet when entity tables are processed

**Actual Schema (Correct):**
- `module-access/db/schema/002-orgs.sql` creates `public.orgs` ✅
- Dependencies properly ordered: 000→001→002→003→...

**Database Error:**
```
psql:/Users/aaron/code/sts/test-ws-01/ai-sec-stack/scripts/setup-database.sql:52: 
ERROR:  relation "public.org" does not exist
STATEMENT:  CREATE TABLE IF NOT EXISTS public.entity (
  ...
  org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
  ...
);
```

**Fix:**
Once Issue #1 is fixed (correct directory path), the proper core module schemas will be used and this error will disappear.

---

## Fix Priority

1. **Fix directory path** (`_cora-core-modules` → `_modules-core`) ← **HIGHEST PRIORITY**
2. **Fix bash compatibility** (remove bash 4+ features) ← **HIGH PRIORITY**
3. **Test fix** with new project creation ← **REQUIRED**

---

## Expected Results After Fix

✅ Script finds actual core module templates  
✅ Creates modules from `_modules-core/module-*` directories  
✅ Uses proper schema files with `orgs` table  
✅ Database migration succeeds  
✅ Config merging works correctly  
✅ Reports "Merged 3 module configurations" (access, ai, mgmt)

---

## Testing Plan

After applying fixes:

```bash
# From cora-dev-toolkit
cd ~/code/bodhix/cora-dev-toolkit

# Test with new output directory
bash scripts/create-cora-project.sh ai-sec-test \
  --with-core-modules \
  --output-dir ~/code/sts/test-ws-02

# Verify:
# 1. Modules created from core templates (not generic)
# 2. Database migration succeeds
# 3. Config merging reports 3+ modules merged
# 4. No bash compatibility errors
```

---

## Files to Fix

1. `scripts/create-cora-project.sh`
   - Line 653: Change `_cora-core-modules` → `_modules-core`
   - Lines 269-280: Rewrite `resolve_module_dependencies()` for bash 3.x
   - Lines 250-340: Review `merge_module_configs()` for bash 3.x compatibility

---

## Related Files (For Reference)

**Correct Core Module Schemas:**
- `templates/_modules-core/module-access/db/schema/000-default-privileges.sql`
- `templates/_modules-core/module-access/db/schema/001-external-identities.sql`
- `templates/_modules-core/module-access/db/schema/002-orgs.sql` ← **Creates `orgs` table**
- `templates/_modules-core/module-access/db/schema/003-profiles.sql`
- (etc.)

**Problematic Generic Template:**
- `templates/_module-template/db/schema/001-entity-table.sql` ← **References `org` (wrong)**

---

## Status

- [x] Issues identified
- [ ] Fixes applied to templates
- [ ] Tested with new project creation
- [ ] Verified database migration succeeds
- [ ] Verified config merging works
- [ ] Documented resolution

**Next Step:** Apply fixes to `scripts/create-cora-project.sh`
