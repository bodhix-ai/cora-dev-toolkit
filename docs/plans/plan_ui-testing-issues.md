# Plan: UI Testing Issues - Admin Pages

**Created:** January 28, 2026  
**Status:** 🔴 Active - Discovering issues during admin page testing  
**Test Environment:** ai-mod (~/code/bodhix/testing/test-admin/)

---

## Executive Summary

**Total Issues:** 6 | **Open:** 6 | **In Progress:** 0 | **Resolved:** 0 | **Blocked:** 0

### Issues at a Glance

| # | Title | Status | Severity | Category | Page/Endpoint |
|---|-------|--------|----------|----------|---------------|
| 1 | Chat Admin Endpoints 401 | 🔴 Open | High | Deployment | `/admin/sys/chat/*` |
| 2 | KB Creation API Client Error | 🔴 Open | Medium | Frontend Bug | `/admin/sys/kb` |
| 3 | Voice Admin Access Denied | 🔴 Open | High | Authorization | `/admin/sys/voice` |
| 4 | Eval AI Prompts 404 | 🔴 Open | Medium | Route Mismatch | `/admin/sys/eval` (AI Prompts tab) |
| 5 | Access AI Config 404 | 🔴 Open | Medium | Route Mismatch | `/admin/sys/access/orgs/{id}` (AI Config tab) |
| 6 | AI Models Tab 400 | 🔴 Open | Medium | Backend Logic | `/admin/sys/ai` (Models tab) |

### Issue Categories

| Category | Count | Issues |
|----------|-------|--------|
| **Deployment** | 1 | #1 (module-chat not deployed) |
| **Route Mismatches** | 2 | #4 (eval AI models), #5 (access AI config) |
| **Authorization** | 1 | #3 (voice sys_owner denied) |
| **Frontend Bugs** | 1 | #2 (KB API client) |
| **Backend Logic** | 1 | #6 (AI models 400 error) |

### Root Cause Analysis

**Primary Issue:** Test project (ai-mod) was created BEFORE Sprint 3b Sessions 4-13 were completed. Missing:
- Module-chat deployment (Sessions 12-13)
- Route standardization updates to dependent components (Sessions 4-8)
- Authorization pattern fixes (Session 14b)
- API client initialization fixes
- Backend parameter validation

**Pattern:** Sprint 3b standardized admin routes (ADR-018), but many dependent components weren't updated to use the new patterns.

### Recommended Resolution Strategy

**Systematic Fix Approach:**
1. Fix all 6 template issues in batch (2-3 hours)
2. Sync ALL fixes to test project
3. Deploy once via Terraform
4. Comprehensive retest of all admin pages

**Alternative:** Recreate test project from updated templates (faster, cleaner slate)

---

## Detailed Issue Tracking

### Adding New Issues

When discovering new issues, add them to both:
1. **Executive Summary** table above
2. **Detailed Issue Tracking** section below

Use the next sequential issue number and follow the standard issue template.

---

## Known Issues

### Issue 1: Chat Admin Endpoints - 401 Unauthorized

**Status:** 🔴 Open  
**Severity:** High  
**Discovered:** 2026-01-28 20:10

**Affected Endpoints:**
- `GET /admin/sys/chat/config` - 401
- `GET /admin/sys/chat/analytics` - 401
- `GET /admin/sys/chat/analytics/usage` - 401
- `GET /admin/sys/chat/analytics/tokens` - 401
- `GET /admin/sys/chat/sessions?limit=100` - 401

**Symptoms:**
- Frontend makes API calls
- All return 401 Unauthorized (not 403 Forbidden)
- Routes exist in infrastructure/outputs.tf
- Lambda handlers exist in chat-session Lambda

**Root Cause Hypothesis:**
1. Module-chat Lambda not deployed to AWS
2. API Gateway routes not created/deployed
3. Routes not connected to Lambda integration

**Investigation Steps:**
- [ ] Check if chat-session Lambda exists in AWS
- [ ] Check if API Gateway has these routes
- [ ] Check when module-chat was last deployed
- [ ] Check if Terraform state includes module-chat routes

**Resolution Steps:**
- [ ] Build module-chat Lambda
- [ ] Copy zips to infra build directory
- [ ] Deploy via Terraform
- [ ] Verify routes in API Gateway
- [ ] Retest endpoints

**Files Involved:**
- `templates/_modules-core/module-chat/backend/lambdas/chat-session/lambda_function.py`
- `templates/_modules-core/module-chat/infrastructure/outputs.tf`
- `templates/_modules-core/module-chat/frontend/lib/api.ts`

---

### Issue 2: KB Creation Error - Missing API Client

**Status:** 🔴 Open  
**Severity:** Medium  
**Discovered:** 2026-01-28 20:13

**Affected Page:**
- `/admin/sys/kb` - Create Knowledge Base modal

**Symptoms:**
- User clicks "Create" button to create new global KB
- Error appears: "Cannot create KB: missing API client"
- Modal does not save/submit

**Root Cause Hypothesis:**
1. Frontend component not importing API client properly
2. API client initialization error
3. Component trying to use undefined/null API client

**Investigation Steps:**
- [ ] Check KB admin page component code
- [ ] Check if API client is imported and initialized
- [ ] Check if this is a template issue or test project specific issue
- [ ] Review similar working components for comparison

**Resolution Steps:**
- [ ] Identify the component with the error
- [ ] Fix API client import/initialization
- [ ] Sync fix to test project
- [ ] Restart dev server
- [ ] Retest KB creation

**Files to Check:**
- `templates/_modules-core/module-kb/routes/admin/sys/kb/page.tsx`
- `templates/_modules-core/module-kb/frontend/components/admin/*`
- `templates/_modules-core/module-kb/frontend/lib/api.ts`

---

## Testing Checklist

### Module-Chat Admin Pages

**Sys Admin (`/admin/sys/chat`):**
- [ ] Settings Tab
  - [ ] GET /admin/sys/chat/config - Load config
  - [ ] PUT /admin/sys/chat/config - Update config
- [ ] Analytics Tab
  - [ ] GET /admin/sys/chat/analytics - Load analytics
  - [ ] GET /admin/sys/chat/analytics/usage - Usage stats
  - [ ] GET /admin/sys/chat/analytics/tokens - Token stats
- [ ] Sessions Tab
  - [ ] GET /admin/sys/chat/sessions - List sessions
  - [ ] GET /admin/sys/chat/sessions/{id} - View session
  - [ ] DELETE /admin/sys/chat/sessions/{id} - Delete session

**Org Admin (`/admin/org/chat`):**
- [ ] Settings Tab
  - [ ] GET /admin/org/chat/config - Load config
  - [ ] PUT /admin/org/chat/config - Update config
- [ ] Analytics Tab
  - [ ] GET /admin/org/chat/analytics - Load analytics
  - [ ] GET /admin/org/chat/analytics/users - User stats
  - [ ] GET /admin/org/chat/analytics/workspaces - Workspace stats
- [ ] Sessions Tab
  - [ ] GET /admin/org/chat/sessions - List sessions
  - [ ] GET /admin/org/chat/sessions/{id} - View session
  - [ ] PUT /admin/org/chat/sessions/{id}/restore - Restore session
  - [ ] DELETE /admin/org/chat/sessions/{id} - Soft delete

### Other Admin Pages (To Be Tested)

**Module-WS:**
- [ ] Sys admin page (`/admin/sys/ws`)
- [ ] Org admin page (`/admin/org/ws`)

**Module-Mgmt:**
- [ ] Sys admin page (`/admin/sys/mgmt`)
- [ ] Org admin page (`/admin/org/mgmt`)

**Module-Access:**
- [ ] Sys admin page (`/admin/sys/access`)
- [ ] Org admin page (`/admin/org/access`)

**Module-AI:**
- [ ] Sys admin page (`/admin/sys/ai`)
- [ ] Org admin page (`/admin/org/ai`)

**Module-KB:**
- [ ] Sys admin page (`/admin/sys/kb`)
- [ ] Org admin page (`/admin/org/kb`)

**Module-Eval:**
- [ ] Sys admin page (`/admin/sys/eval`)
- [ ] Org admin page (`/admin/org/eval`)

**Module-Voice:**
- [ ] Sys admin page (`/admin/sys/voice`)
- [ ] Org admin page (`/admin/org/voice`)

---

## Resolution Workflow

### Standard Fix Pattern

For each issue:

1. **Investigate**
   - Identify root cause
   - Check templates vs. test project
   - Verify deployment status

2. **Fix Templates**
   - Update template files
   - Test locally if possible

3. **Sync to Test Project**
   - Use `sync-fix-to-project.sh` for source files
   - Use `sync-infra-to-project.sh` for infrastructure files

4. **Build & Deploy**
   - Build affected modules
   - Copy zips to infra repo
   - Deploy via Terraform

5. **Verify**
   - Check Lambda deployment
   - Check API Gateway routes
   - Retest endpoint
   - Update checklist

6. **Document**
   - Update issue status
   - Record resolution
   - Note any patterns

---

## Deployment Commands Reference

```bash
# Sync Lambda code
./scripts/sync-fix-to-project.sh ~/code/bodhix/testing/test-admin/ai-mod-stack "module-chat/backend/lambdas/chat-session/lambda_function.py"

# Build module
cd ~/code/bodhix/testing/test-admin/ai-mod-stack/packages/module-chat/backend
bash build.sh

# Copy to infra
cp .build/*.zip ~/code/bodhix/testing/test-admin/ai-mod-infra/build/module-chat/

# Deploy
cd ~/code/bodhix/testing/test-admin/ai-mod-infra
./scripts/deploy-terraform.sh dev

# Verify Lambda
aws lambda get-function-configuration \
  --function-name ai-mod-dev-chat-chat-session \
  --region us-east-1 \
  --profile ai-sec-nonprod

# Check API Gateway routes
aws apigatewayv2 get-routes \
  --api-id <api-id> \
  --region us-east-1 \
  --profile ai-sec-nonprod \
  | jq '.Items[] | select(.RouteKey | contains("chat"))'
```

---

### Issue 3: Voice Admin Access Denied for sys_owner

**Status:** 🔴 Open  
**Severity:** High  
**Discovered:** 2026-01-28 20:14

**Affected Page:**
- `/admin/sys/voice` - Access denied for `sys_owner` role

**Symptoms:**
- User with `sys_owner` role tries to access `/admin/sys/voice`
- Gets error: "Access Denied - System administrator access required to view this page."
- Page should allow both `sys_admin` AND `sys_owner` roles

**Root Cause Hypothesis:**
1. Authorization check only validates `sys_admin` role
2. Missing check for `sys_owner` role (which should have same/higher privileges)
3. Component using incorrect auth pattern

**Investigation Steps:**
- [ ] Check voice admin page authorization code
- [ ] Check if it uses `isSysAdmin` check only
- [ ] Compare with other sys admin pages that work correctly
- [ ] Check CORA role hierarchy documentation

**Resolution Steps:**
- [ ] Update authorization check to include sys_owner
- [ ] Change from `if (!isSysAdmin)` to `if (!isSysAdmin && !isSysOwner)`
- [ ] Sync fix to test project
- [ ] Restart dev server
- [ ] Retest with sys_owner role

**Files to Check:**
- `templates/_modules-functional/module-voice/routes/admin/sys/voice/page.tsx`
- Compare with: `templates/_modules-core/module-mgmt/routes/admin/sys/mgmt/page.tsx` (working example)

**Expected Behavior:**
- Sys admin pages should allow BOTH `sys_admin` and `sys_owner` roles
- `sys_owner` has all privileges of `sys_admin` plus additional owner-level controls

---

### Issue 4: Eval AI Prompts Tab - 404 Route Not Found

**Status:** 🔴 Open  
**Severity:** Medium  
**Discovered:** 2026-01-28 20:16

**Affected Page:**
- `/admin/sys/eval` - AI Prompts tab

**Symptoms:**
- User selects "AI Prompts" tab on eval admin page
- Frontend calls: `GET /admin/ai/models`
- Returns: 404 Not Found
- Route doesn't follow ADR-018 standard

**Root Cause Hypothesis:**
1. Frontend using legacy route `/admin/ai/models`
2. Should use standard route: `/admin/sys/ai/models`
3. Module-eval component not updated after module-ai route standardization

**Investigation Steps:**
- [ ] Check eval admin component AI Prompts tab code
- [ ] Identify which API call is being made
- [ ] Verify correct route is `/admin/sys/ai/models`
- [ ] Check if module-ai has this route

**Resolution Steps:**
- [ ] Update eval component to use correct route
- [ ] Change `/admin/ai/models` to `/admin/sys/ai/models`
- [ ] Sync fix to test project
- [ ] Restart dev server
- [ ] Retest AI Prompts tab

**Files to Check:**
- `templates/_modules-functional/module-eval/routes/admin/sys/eval/page.tsx`
- `templates/_modules-functional/module-eval/frontend/components/admin/*`
- `templates/_modules-core/module-ai/infrastructure/outputs.tf` (verify correct route exists)

**Note:** Module-ai routes were standardized in Sprint 3b Session 7. This eval component likely wasn't updated to use the new standard routes.

---

### Issue 5: Access Orgs AI Config Tab - 404 Route Not Found

**Status:** 🔴 Open  
**Severity:** Medium  
**Discovered:** 2026-01-28 20:18

**Affected Page:**
- `/admin/sys/access/orgs/{orgId}` - AI Config tab

**Symptoms:**
- User views organization detail page
- Selects "AI Config" tab
- Frontend calls: `GET /admin/sys/ai/orgs/{orgId}/config`
- Returns: 404 Not Found
- Route doesn't exist in API Gateway

**Root Cause Hypothesis:**
1. Frontend using non-existent route pattern
2. Should use: `/admin/sys/ai/config?orgId={orgId}` or similar
3. Or backend needs this org-specific AI config route added
4. Component not updated after route standardization

**Investigation Steps:**
- [ ] Check access orgs detail page AI Config tab component
- [ ] Check what route pattern module-ai supports for org-specific config
- [ ] Verify if this route exists in module-ai outputs.tf
- [ ] Determine correct route pattern for org-specific AI config

**Resolution Steps:**
- [ ] Identify correct route pattern
- [ ] Update frontend component to use correct route
- [ ] OR add missing route to module-ai if needed
- [ ] Sync fix to test project
- [ ] Restart dev server
- [ ] Retest AI Config tab

**Files to Check:**
- `templates/_project-stack-template/apps/web/app/admin/sys/access/orgs/[id]/page.tsx`
- `templates/_modules-core/module-ai/infrastructure/outputs.tf`
- `templates/_modules-core/module-ai/frontend/lib/api.ts`

---

## Progress Tracking

**Issues Discovered:** 5  
**Issues Resolved:** 0  
**Issues In Progress:** 5  
**Issues Blocked:** 0

**Issue Categories:**
- **Deployment:** 1 (module-chat not deployed)
- **Route Mismatches:** 2 (eval AI models, access AI config)
- **Authorization:** 1 (voice sys_owner access denied)
- **Frontend Bugs:** 1 (KB API client)

**Pattern Recognition:**
Many issues stem from incomplete route standardization (ADR-018) across modules. Components are using legacy route patterns that were updated in Sprint 3b Sessions 4-8 but dependent components weren't updated.

**Recommended Approach:**
1. **Pause UI testing** - Document all discovered issues first
2. **Fix all template issues systematically** - Batch fix by category
3. **Deploy all fixes at once** - Single deployment cycle
4. **Resume comprehensive UI testing** - Test all admin pages thoroughly

**Priority Order for Fixes:**
1. Deploy module-chat (Issue 1) - Blocking all chat admin features
2. Fix route mismatches (Issues 4, 5) - Update to ADR-018 standard routes
3. Fix authorization (Issue 3) - Add sys_owner role support
4. Fix KB API client (Issue 2) - Investigate component initialization

---

**Updated:** January 28, 2026