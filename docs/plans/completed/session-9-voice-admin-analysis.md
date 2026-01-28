# Session 9: Module-Voice Admin Infrastructure Analysis

**Date:** January 27, 2026  
**Branch:** `admin-page-s3b`  
**Status:** Analysis Complete - Ready for Implementation Decision

---

## Current State

### ✅ What EXISTS:
1. **Admin Page Routes** (Pattern A compliant):
   - `routes/admin/sys/voice/page.tsx` ✅
   - `routes/admin/org/voice/page.tsx` ✅

2. **Admin Page Components**:
   - `frontend/pages/SysVoiceConfigPage.tsx` - UI for platform credential management
   - `frontend/pages/OrgVoiceConfigPage.tsx` - UI for org config management

3. **Backend Lambda Functions**:
   - `voice-sessions` - Session CRUD
   - `voice-configs` - Config CRUD
   - `voice-credentials` - Credential CRUD

4. **Current Data API Routes** (all `/voice/*`):
   - `/voice/sessions/*` - 6 routes
   - `/voice/configs/*` - 5 routes
   - `/voice/credentials/*` - 5 routes

### ❌ What's MISSING:

**NO admin routes exist!** All routes are data API routes (`/voice/*`), not admin routes (`/admin/sys/voice/*` or `/admin/org/voice/*`).

The frontend components have TODO comments:
```typescript
// TODO: Replace with actual API call
// const response = await voiceApi.getCredentials({ scope: 'platform' });
```

---

## Required Work

### 1. Add Admin Routes to outputs.tf

**System Admin Routes** (10 routes):
```
GET    /admin/sys/voice/credentials
GET    /admin/sys/voice/credentials/{id}
POST   /admin/sys/voice/credentials
PUT    /admin/sys/voice/credentials/{id}
DELETE /admin/sys/voice/credentials/{id}
POST   /admin/sys/voice/credentials/{id}/validate
GET    /admin/sys/voice/configs (optional - view platform defaults)
GET    /admin/sys/voice/analytics (optional - system-wide stats)
```

**Org Admin Routes** (10 routes):
```
GET    /admin/org/voice/credentials
GET    /admin/org/voice/credentials/{id}
POST   /admin/org/voice/credentials
PUT    /admin/org/voice/credentials/{id}
DELETE /admin/org/voice/credentials/{id}
GET    /admin/org/voice/configs
GET    /admin/org/voice/configs/{id}
POST   /admin/org/voice/configs
PUT    /admin/org/voice/configs/{id}
DELETE /admin/org/voice/configs/{id}
```

**Total:** 20 admin routes to add

---

### 2. Update Lambda Functions

#### voice-credentials Lambda
- Add sys admin route handler (platform credentials with org_id = NULL)
- Add org admin route handler (uses session org_id, not query param)
- Update module docstring with admin routes
- Add role validation (sys_admin for sys routes, org_admin/org_owner for org routes)

#### voice-configs Lambda
- Add org admin route handler (uses session org_id, not query param)
- Update module docstring with admin routes
- Reuse existing CRUD logic with admin authorization

**Files to Update:**
- `backend/lambdas/voice-credentials/lambda_function.py`
- `backend/lambdas/voice-configs/lambda_function.py`
- `infrastructure/outputs.tf`

---

### 3. Update Frontend API

**Remove TODO comments and implement:**
- `frontend/lib/api.ts` - Add admin API calls
- Connect `SysVoiceConfigPage` to real endpoints
- Connect `OrgVoiceConfigPage` to real endpoints (may already work via existing hooks)

---

## Estimated Effort

| Task | Estimated Time |
|------|----------------|
| Add 20 admin routes to outputs.tf | 1-2 hours |
| Update voice-credentials Lambda | 3-4 hours |
| Update voice-configs Lambda | 2-3 hours |
| Update frontend API | 2-3 hours |
| Testing & validation | 2-3 hours |
| **Total** | **10-15 hours** |

---

## Alternative: Minimal Viable Admin

If 10-15 hours is too much, we could do a **minimal implementation**:

### Phase 1: Sys Admin Credentials Only (4-6 hours)
- Add 5 sys admin credential routes
- Update voice-credentials Lambda for sys admin
- Hook up SysVoiceConfigPage

### Phase 2: Org Admin (defer to later)
- Org configs already work via existing `/voice/configs/*` routes
- Org credentials can be added later

This gets the sys admin page functional (the more critical one) in ~half the time.

---

## Recommendation

**Option A:** Complete implementation (10-15 hours)
- All admin routes added
- Both sys and org admin pages fully functional
- Module-voice achieves 100% admin parity

**Option B:** Minimal viable (4-6 hours)
- Sys admin credentials only
- Org admin uses existing data API routes (works but not standardized)
- Can complete org admin standardization in future sprint

**Option C:** Defer to separate sprint
- Voice is a functional module (optional per-project)
- 6/8 modules already have full admin parity (75% coverage)
- Focus on module-chat instead (similar effort)

**Which option would you prefer?**