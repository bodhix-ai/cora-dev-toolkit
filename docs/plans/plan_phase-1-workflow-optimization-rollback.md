# Phase 1 Workflow Optimization - Rollback Plan

**Status:** ✅ Complete  
**Created:** January 16, 2026  
**Related:** `docs/plans/plan_cora-workflow-optimization.md`

---

## Executive Summary

Phase 1 of the CORA workflow optimization introduced three blocking-issue fixes to reduce test environment creation time from 15-20 minutes to ~10 minutes. This document provides rollback procedures if any issues arise.

**Fixes Implemented:**
1. ✅ SKIP_VALIDATION flag - Bypass validator false positives
2. ✅ Authorizer build automation - Include in module builds
3. ✅ Database migration idempotency - Support re-runs without errors

**Expected Time Savings:** ~13 minutes per test environment creation

---

## Changes Made

### 1. SKIP_VALIDATION Flag

**Files Modified:**
- `templates/_project-infra-template/scripts/build-cora-modules.sh`
- `templates/_project-infra-template/scripts/deploy-all.sh`

**Changes:**
```bash
# Added environment variable with conditional validation
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"

if [ "$SKIP_VALIDATION" = "true" ]; then
  echo "[INFO] Skipping validation (SKIP_VALIDATION=true)"
else
  # Run validation
  python3 "$TOOLKIT_ROOT/validation/import_validator/validator.py" ...
fi
```

**Rollback Procedure:**
1. Remove SKIP_VALIDATION checks from both scripts
2. Always run validation (original behavior)
3. Document known false positives for manual override

**Rollback Impact:**
- Users must manually skip validation when false positives occur
- Adds 5-8 minutes to build time when validators fail
- No data loss or corruption risk

---

### 2. Authorizer Build Automation

**Files Modified:**
- `templates/_project-infra-template/scripts/build-cora-modules.sh`

**Changes:**
```bash
# Added authorizer build after module builds
echo "[INFO] Building authorizer Lambda..."
if [ -d "$INFRA_ROOT/lambdas/api-gateway-authorizer" ]; then
    cd "$INFRA_ROOT/lambdas/api-gateway-authorizer"
    if [ -f "build.sh" ]; then
        bash build.sh
    fi
fi
```

**Rollback Procedure:**
1. Remove authorizer build section from build-cora-modules.sh
2. Document manual step: `cd lambdas/api-gateway-authorizer && bash build.sh`
3. Update pre-deploy-check.sh to remind users

**Rollback Impact:**
- Users must manually build authorizer (adds 1-2 minutes)
- Deployment fails if forgotten (adds 3-5 minutes to debug)
- No functional impact once built

---

### 3. Database Migration Idempotency

**Files Modified:**
- 41 schema files across all modules in `templates/_modules-core/*/db/schema/*.sql`

**Changes Applied:**

**Pattern 1: CREATE TABLE IF NOT EXISTS**
```sql
-- Before:
CREATE TABLE public.kb_bases (...);

-- After:
CREATE TABLE IF NOT EXISTS public.kb_bases (...);
```

**Pattern 2: CREATE INDEX IF NOT EXISTS**
```sql
-- Before:
CREATE INDEX kb_bases_org_id_idx ON public.kb_bases(org_id);

-- After:
CREATE INDEX IF NOT EXISTS kb_bases_org_id_idx ON public.kb_bases(org_id);
```

**Pattern 3: DROP POLICY/TRIGGER IF EXISTS**
```sql
-- Before:
CREATE POLICY "kb_bases_sys_admin_all" ON public.kb_bases ...;

-- After:
DROP POLICY IF EXISTS "kb_bases_sys_admin_all" ON public.kb_bases;
CREATE POLICY "kb_bases_sys_admin_all" ON public.kb_bases ...;
```

**Rollback Procedure:**
1. Use `scripts/make-schemas-idempotent.sh --reverse` to revert changes
2. Or restore from git: `git checkout HEAD~1 -- templates/_modules-core/*/db/schema/`
3. Note: Original .sql.bak files preserved during migration

**Rollback Impact:**
- Migration re-runs will fail with "already exists" errors
- Requires database cleanup between test runs
- No data loss (policies/tables remain functional)

**Backup Files:**
All 41 modified files have .sql.bak backups created during migration:
```bash
# List backups
find templates/_modules-core -name "*.sql.bak"

# Restore specific file
cp file.sql.bak file.sql
```

---

## Rollback Decision Matrix

| Scenario | Recommended Action | Urgency |
|----------|-------------------|---------|
| Validator breaks builds | Rollback fix #1 (SKIP_VALIDATION) | High |
| Authorizer build issues | Rollback fix #2 (automation) | Medium |
| Migration corruption | Rollback fix #3 (idempotency) | High |
| Performance regression | Measure impact, keep fixes | Low |
| All fixes cause issues | Full rollback | Critical |

---

## Full Rollback Procedure

If all Phase 1 changes must be reverted:

### Step 1: Revert Code Changes
```bash
cd /Users/aaron/code/bodhix/cora-dev-toolkit

# Revert build scripts
git checkout HEAD~3 -- templates/_project-infra-template/scripts/build-cora-modules.sh
git checkout HEAD~3 -- templates/_project-infra-template/scripts/deploy-all.sh

# Revert schema files
git checkout HEAD~3 -- templates/_modules-core/*/db/schema/
```

### Step 2: Restore .bak Files (Alternative)
```bash
# If git history is unclear, use .bak files
find templates/_modules-core -name "*.sql.bak" | while read backup; do
    original="${backup%.bak}"
    cp "$backup" "$original"
    echo "Restored: $original"
done
```

### Step 3: Document Manual Workflow
Update `.clinerules` with manual steps:
- Run validation manually with skip on false positives
- Build authorizer manually before deployment
- Clean database between test runs

### Step 4: Notify Users
Update `memory-bank/context-module-kb.md`:
- Mark Phase 1 as REVERTED
- Document manual workarounds
- Link to this rollback document

---

## Partial Rollback Procedures

### Rollback Fix #1 Only (SKIP_VALIDATION)

```bash
# Remove SKIP_VALIDATION logic from build scripts
git diff HEAD~3 templates/_project-infra-template/scripts/build-cora-modules.sh
# Manually remove only the SKIP_VALIDATION sections

# Keep authorizer automation and idempotent migrations
```

### Rollback Fix #2 Only (Authorizer Automation)

```bash
# Remove authorizer build section
git diff HEAD~2 templates/_project-infra-template/scripts/build-cora-modules.sh
# Manually remove only the authorizer build section

# Keep SKIP_VALIDATION and idempotent migrations
```

### Rollback Fix #3 Only (Idempotent Migrations)

```bash
# Restore all .sql.bak files
cd /Users/aaron/code/bodhix/cora-dev-toolkit
./scripts/make-schemas-idempotent.sh --reverse

# Keep SKIP_VALIDATION and authorizer automation
```

---

## Known Issues and Workarounds

### Issue 1: SKIP_VALIDATION Too Broad
**Symptom:** Real errors bypass validation  
**Workaround:** Set `SKIP_VALIDATION=false` and manually review errors  
**Fix:** Improve validator signature loader to eliminate false positives

### Issue 2: Authorizer Build Adds Time
**Symptom:** Build takes longer even when authorizer unchanged  
**Workaround:** Add timestamp check to skip if code unchanged  
**Fix:** Implement build caching (Phase 4)

### Issue 3: Idempotent Migrations Hide Real Issues
**Symptom:** Schema errors silently ignored  
**Workaround:** Check migration output for warnings  
**Fix:** Add explicit logging for skipped operations

---

## Testing Validation

Before declaring rollback successful:

### Test 1: Fresh Project Creation
```bash
./scripts/create-cora-project.sh --input setup.config.test-rollback.yaml
# Should succeed without Phase 1 fixes
```

### Test 2: Validator Runs
```bash
cd test-project/ai-sec-infra
./scripts/build-cora-modules.sh
# Validation should run (may fail on false positives)
```

### Test 3: Manual Authorizer Build
```bash
cd test-project/ai-sec-infra/lambdas/api-gateway-authorizer
bash build.sh
# Should build successfully
```

### Test 4: Migration Re-run Fails
```bash
cd test-project/ai-sec-infra
./scripts/run-database-migrations.sh
# Should fail with "already exists" errors (expected)
```

---

## Communication Plan

### If Rollback Required

**Notify:**
- Development team via Slack/email
- Update `memory-bank/activeContext.md`
- Update `CHANGELOG-WORKFLOW-OPTIMIZATION.md`

**Message Template:**
```
⚠️ Phase 1 Workflow Optimization Rollback

The following changes have been reverted due to [REASON]:
- [x] SKIP_VALIDATION flag
- [x] Authorizer build automation  
- [x] Database migration idempotency

Manual workflow is restored. See:
- docs/plans/plan_phase-1-workflow-optimization-rollback.md
- .clinerules (updated with manual steps)

Impact: Test environment creation returns to 15-20 minute baseline.
```

---

## Success Criteria for Rollback

Rollback is successful when:
- ✅ Fresh project creation works without Phase 1 fixes
- ✅ All builds complete (even if slow or manual)
- ✅ Deployments succeed with manual steps
- ✅ No data corruption or loss
- ✅ Documentation updated with manual workflow
- ✅ Team notified and trained on manual steps

---

## Prevention for Future Phases

**Lessons Learned from Phase 1:**
1. Always create .bak files before bulk modifications
2. Test rollback procedure before deploying fixes
3. Implement feature flags for easy disable
4. Keep manual documentation current alongside automation

**Applied to Phase 2+:**
- All automation scripts have `--manual-mode` flag
- State files include rollback information
- Each phase tested in isolation before integration

---

## Appendix

### A. Git Commit References

| Fix | Commit | Date | Files Changed |
|-----|--------|------|---------------|
| SKIP_VALIDATION | [hash] | Jan 16, 2026 | build-cora-modules.sh, deploy-all.sh |
| Authorizer automation | [hash] | Jan 16, 2026 | build-cora-modules.sh |
| Idempotent migrations | [hash] | Jan 16, 2026 | 41 schema files |

### B. Related Documents

- `docs/plans/plan_cora-workflow-optimization.md` - Master plan
- `memory-bank/context-module-kb.md` - Session history
- `.clinerules` - Workflow instructions

### C. Backup File Locations

```bash
# Schema backups
templates/_modules-core/module-access/db/schema/*.sql.bak
templates/_modules-core/module-ai/db/schema/*.sql.bak
templates/_modules-core/module-chat/db/schema/*.sql.bak
templates/_modules-core/module-kb/db/schema/*.sql.bak
templates/_modules-core/module-mgmt/db/schema/*.sql.bak
templates/_modules-functional/module-ws/db/schema/*.sql.bak

# Git history
git log --oneline --graph -- templates/_project-infra-template/scripts/
```

---

**Document Status:** ✅ Complete  
**Last Updated:** January 16, 2026  
**Next Review:** After Phase 1 user testing completes
