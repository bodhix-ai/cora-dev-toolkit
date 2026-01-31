# ADR-019 Auth Standardization - Safe Deployment Guide

**Date:** 2026-01-30  
**Status:** Production-Ready  
**Risk Level:** Medium (requires careful phased deployment)

## Overview

This guide ensures **zero-downtime deployment** of ADR-019 auth standardization changes to production systems.

## ⚠️ Critical: Deployment Order Matters!

**DO NOT** deploy these changes all at once! Follow the phased approach below.

---

## What Changed

### 1. Database Functions (ADDS 3 new, KEEPS old ones untouched)

**Added (new names to avoid conflicts):**
- `check_sys_admin(p_user_id UUID)` - New parameterized version
- `check_org_admin(p_user_id UUID, p_org_id UUID)` - New parameterized version  
- `check_ws_admin(p_user_id UUID, p_ws_id UUID)` - New standard name

**Kept (for backward compatibility - old RLS policies):**
- `is_sys_admin(TEXT)` - Old function used by RLS policies
- `is_org_admin(TEXT, TEXT)` - Old function used by RLS policies
- `is_ws_admin_or_owner(UUID, UUID)` - Old function used by RLS policies

**⚠️ Important:** Using `check_*` names (not `is_*`) avoids conflicts with existing functions!

### 2. org-common Helper Functions

**Updated:**
- `check_sys_admin(user_id)` - Now calls `check_sys_admin(p_user_id)` RPC
- `check_org_admin(user_id, org_id)` - Now calls `check_org_admin(p_user_id, p_org_id)` RPC
- `check_ws_admin(user_id, ws_id)` - Now calls `check_ws_admin(p_user_id, p_ws_id)` RPC

### 3. Lambda Code

**Updated:**
- `module-chat/backend/lambdas/chat-session/lambda_function.py` - Uses new helper pattern
- `get_user_from_event()` in org-common - Now extracts `org_id` from authorizer context

---

## 🚀 Phase 1: Database Migration (Safe - No Downtime)

**Duration:** 5 minutes  
**Risk:** Low  
**Reversible:** Yes (functions can be dropped if needed)

### Actions:

1. **Run the migration:**
   ```bash
   # Connect to production database
   psql -h <prod-db-host> -U <prod-user> -d <prod-database> \
     -f templates/_modules-core/module-access/db/migrations/20260130_adr019_auth_rpcs.sql
   ```

2. **Verify functions exist:**
   ```sql
   -- Check new functions
   SELECT proname FROM pg_proc WHERE proname IN ('check_sys_admin', 'check_org_admin', 'check_ws_admin');
   
   -- Verify old functions still exist (important for RLS policies!)
   SELECT proname FROM pg_proc WHERE proname IN ('is_sys_admin', 'is_org_admin', 'is_ws_admin_or_owner');
   ```

3. **Test functions work:**
   ```sql
   -- Replace with actual user/org/workspace UUIDs from your database
   SELECT check_sys_admin('user-uuid-here'::uuid);
   SELECT check_org_admin('user-uuid-here'::uuid, 'org-uuid-here'::uuid);
   SELECT check_ws_admin('user-uuid-here'::uuid, 'ws-uuid-here'::uuid);
   ```

**✅ Success Criteria:**
- All 3 new `check_*` functions return `true` or `false` (not errors)
- Old `is_*` functions still exist (for RLS policies)
- Current production lambdas still work

**🛑 If This Fails:**
- New functions may have been created but aren't callable
- Check `GRANT EXECUTE` was applied
- Rollback: `DROP FUNCTION check_sys_admin(UUID); DROP FUNCTION check_org_admin(UUID, UUID); DROP FUNCTION check_ws_admin(UUID, UUID);`

---

## 🔧 Phase 2: Update org-common Layer (Safe - Backward Compatible)

**Duration:** 30 minutes  
**Risk:** Low  
**Reversible:** Yes (can redeploy previous version)

### Actions:

1. **Rebuild org-common layer:**
   ```bash
   cd ~/code/bodhix/testing/test-ws-XX/ai-sec-stack/packages/module-access/backend
   ./build.sh
   ```

2. **Deploy org-common layer:**
   ```bash
   cd ~/code/bodhix/testing/test-ws-XX/ai-sec-infra
   ./scripts/deploy-lambda-layer.sh org-common dev
   ```

3. **Verify layer version updated:**
   ```bash
   aws lambda list-layer-versions --layer-name org-common-dev --region us-east-1
   ```

**✅ Success Criteria:**
- New layer version published
- Layer includes updated `check_ws_admin()` function
- Old layer version still available (can rollback if needed)

**🛑 If This Fails:**
- Build errors: Check Python syntax in `org_common/__init__.py`
- Deploy errors: Check AWS permissions
- Rollback: Point lambdas back to previous layer version

---

## 🚢 Phase 3: Deploy Updated Lambdas (Phased Rollout)

**Duration:** 1-2 hours  
**Risk:** Medium  
**Reversible:** Yes (redeploy previous versions)

### Order of Deployment:

**Start with low-risk modules first:**

1. **module-chat** (already updated in templates)
2. **module-kb** (if using org admin routes)
3. **module-eval** (if using org admin routes)
4. **Other modules** as needed

### Per-Lambda Deployment:

```bash
cd ~/code/bodhix/testing/test-ws-XX/ai-sec-infra

# Example: Deploy chat-session lambda
./scripts/deploy-lambda.sh module-chat/chat-session
```

### Verification After Each Deployment:

1. **Check lambda logs:**
   ```bash
   aws logs tail /aws/lambda/pm-app-dev-chat-session --follow
   ```

2. **Test org admin routes:**
   ```bash
   # Use your API testing tool (Postman, curl, etc.)
   curl -X GET "https://your-api.execute-api.us-east-1.amazonaws.com/dev/admin/org/chat/config" \
     -H "Authorization: Bearer <token>"
   ```

3. **Monitor for errors:**
   - No "function not found" errors
   - No authorization failures for valid org admins
   - Response times normal

**✅ Success Criteria Per Lambda:**
- Lambda uses new org-common layer version
- Org admin routes return correct results
- No errors in CloudWatch logs
- Latency acceptable (should be similar or better)

**🛑 If Lambda Fails:**
- Check CloudWatch logs for RPC errors
- Verify database functions exist (`\df is_*` in psql)
- Rollback: `./scripts/deploy-lambda.sh module-X/lambda-name --version previous`

---

## 🧹 Phase 4: Cleanup (Optional - Low Priority)

**Duration:** 15 minutes  
**Risk:** Low  
**When:** After ALL lambdas migrated and stable for 1+ weeks

### Actions:

1. **Create cleanup migration:**
   ```sql
   -- File: 20260215_cleanup_old_ws_admin_function.sql
   -- Drop old function after migration complete
   DROP FUNCTION IF EXISTS is_ws_admin_or_owner(UUID, UUID);
   ```

2. **Run cleanup:**
   ```bash
   psql -h <prod-db-host> -U <prod-user> -d <prod-database> \
     -f 20260215_cleanup_old_ws_admin_function.sql
   ```

**✅ Success Criteria:**
- Old function dropped
- No lambdas reference `is_ws_admin_or_owner` in logs
- All org admin routes still work

---

## 🔍 Verification Checklist

### Before Starting:
- [ ] All changes committed to `auth-standardization-s1` branch
- [ ] Database migration file reviewed
- [ ] org-common changes reviewed
- [ ] Lambda changes reviewed
- [ ] Backup of production database taken

### Phase 1 Complete:
- [ ] Database migration ran successfully
- [ ] 3 new functions exist in database
- [ ] Old `is_ws_admin_or_owner` still exists
- [ ] Test queries return expected results

### Phase 2 Complete:
- [ ] org-common layer rebuilt
- [ ] New layer version deployed
- [ ] Layer includes updated helper functions

### Phase 3 Complete:
- [ ] All lambdas deployed with new code
- [ ] All org admin routes tested
- [ ] No errors in CloudWatch logs
- [ ] Monitoring shows normal performance

### Phase 4 Complete (Optional):
- [ ] Old function dropped from database
- [ ] No references to old function in logs
- [ ] System stable for 1+ weeks

---

## 🚨 Rollback Plan

### If Phase 1 Fails (Database):
```sql
-- Drop new functions
DROP FUNCTION IF EXISTS check_sys_admin(UUID);
DROP FUNCTION IF EXISTS check_org_admin(UUID, UUID);
DROP FUNCTION IF EXISTS check_ws_admin(UUID, UUID);
```

### If Phase 2 Fails (org-common):
```bash
# Revert to previous layer version
aws lambda update-function-configuration \
  --function-name <lambda-name> \
  --layers arn:aws:lambda:region:account:layer:org-common:PREVIOUS_VERSION
```

### If Phase 3 Fails (Lambda):
```bash
# Redeploy previous lambda code
git checkout <previous-commit>
./scripts/deploy-lambda.sh module-X/lambda-name
```

---

## 📊 Monitoring & Alerts

### What to Watch:

1. **CloudWatch Logs:**
   - Search for: "function not found", "check_sys_admin", "check_org_admin", "RPC error"
   - Alert if error rate > 1% for 5 minutes

2. **API Gateway Metrics:**
   - 5xx errors should remain at baseline
   - Latency p99 should not increase >50ms

3. **Database Performance:**
   - RPC function execution time < 10ms average
   - No increase in database CPU/memory

### Success Metrics:

- ✅ 0 "function not found" errors
- ✅ Org admin auth latency < 50ms
- ✅ Zero production incidents related to auth

---

## 🎯 Timeline Summary

| Phase | Duration | Risk | Downtime |
|-------|----------|------|----------|
| 1. Database Migration | 5 min | Low | None |
| 2. org-common Layer | 30 min | Low | None |
| 3. Lambda Deployments | 1-2 hrs | Medium | None* |
| 4. Cleanup (optional) | 15 min | Low | None |
| **Total** | **~2-3 hrs** | **Low-Med** | **Zero** |

*Zero downtime because old and new functions coexist during migration

---

## 🤝 Team Communication

### Before Starting:
- [ ] Notify team of deployment window
- [ ] Assign deployment lead
- [ ] Have database admin on standby
- [ ] Have rollback plan reviewed

### During Deployment:
- [ ] Update team in Slack/Teams after each phase
- [ ] Report any issues immediately
- [ ] Monitor alerts continuously

### After Completion:
- [ ] Send completion notification
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned

---

## ✅ Final Checklist

**Before declaring success:**

1. [ ] All phases completed without errors
2. [ ] All org admin routes tested and working
3. [ ] No error spikes in monitoring
4. [ ] Performance metrics normal
5. [ ] Team notified of completion
6. [ ] Documentation updated

**Migration is complete when:**
- All lambdas use new ADR-019 helper functions
- All org admin routes return correct results
- System stable for 24+ hours
- No auth-related errors in logs

---

## 📚 Reference

- **ADR:** `docs/arch decisions/ADR-019-AUTH-STANDARDIZATION.md`
- **Migration:** `templates/_modules-core/module-access/db/migrations/20260130_adr019_auth_rpcs.sql`
- **Schema:** `templates/_modules-core/module-access/db/schema/008-auth-rpcs.sql`
- **org-common:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/__init__.py`

---

**Questions? Issues?**  
Contact: Platform team or DevOps lead