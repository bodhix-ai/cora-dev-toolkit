# Admin Pages API Pattern Audit

**Date:** February 5, 2026  
**Total Pages:** 22 admin pages  
**Purpose:** Verify compliance with ADR-004 API Client Pattern  

---

## Audit Results

### ✅ COMPLIANT (21/22 pages)

#### Pattern 1: Direct API Client Usage (3 pages)
- `org/access/page.tsx` - Uses `createAuthenticatedClient` + `createAccessModuleClient`
- `org/kb/page.tsx` - Uses `createAuthenticatedClient` + `createKbModuleClient`
- `sys/kb/page.tsx` - Uses `createAuthenticatedClient` + `createKbModuleClient`

#### Pattern 2: Module Component Usage (18 pages)
These pages import pre-built admin components from modules that handle API calls internally:

**Org Admin Pages:**
- `org/chat/page.tsx` - Uses `<OrgChatAdmin />` from `@module-chat`
- `org/eval/page.tsx` - Uses `<OrgEvalAdmin />` from `@module-eval`
- `org/mgmt/page.tsx` - Uses `<OrgMgmtAdmin />` from `@module-mgmt`
- `org/voice/page.tsx` - Uses `<OrgVoiceAdmin />` from `@module-voice`
- `org/ws/page.tsx` - Uses `<OrgWsAdmin />` from `@module-ws`

**Sys Admin Pages:**
- `sys/access/page.tsx` - Uses `<SysAccessAdmin />` from `@module-access`
- `sys/ai/page.tsx` - Uses `<SysAiAdmin />` from `@module-ai`
- `sys/chat/page.tsx` - Uses `<SysChatAdmin />` from `@module-chat`
- `sys/eval/page.tsx` - Uses `<SysEvalAdmin />` from `@module-eval`
- `sys/mgmt/page.tsx` - Uses `<SysMgmtAdmin />` from `@module-mgmt`
- `sys/voice/page.tsx` - Uses `<SysVoiceAdmin />` from `@module-voice`
- `sys/ws/page.tsx` - Uses `<SysWsAdmin />` from `@module-ws`

**Landing Pages:**
- `admin/page.tsx` - Landing page (no API calls)
- `admin/org/page.tsx` - Landing page (no API calls)
- `admin/sys/page.tsx` - Landing page (no API calls)
- `sys/access/orgs/page.tsx` - List view
- `sys/access/orgs/[id]/page.tsx` - Detail view
- `sys/mgmt/modules/page.tsx` - Module management

---

### ❌ NON-COMPLIANT (1/22 pages)

**`org/ai/page.tsx` - Uses raw `fetch('/api/admin/org/ai/config')`**

---

## Risk Assessment: Fixing Non-Compliant Page

### Low Risk ✅

**Reasons:**
1. **Only ONE file** needs fixing
2. **Same module** has working sys admin page (`sys/ai/page.tsx` uses `<SysAiAdmin />` component)
3. **Pattern exists** - Can follow same approach as other modules
4. **No breaking changes** - Just wrapping existing API calls
5. **Template-only** - Test projects not affected until they pull latest template

### Fix Strategy

**Option A: Use Module Component (RECOMMENDED)**
```typescript
// Convert to use OrgAiAdmin component like other modules
import { OrgAiAdmin } from '@{{PROJECT_NAME}}/module-ai';
```

**Option B: Create Module Client**
```typescript
// If OrgAiAdmin doesn't exist, create client pattern
import { createAuthenticatedClient, createAiModuleClient } from '@{{PROJECT_NAME}}/module-ai';
```

---

## Impact of Fix

### Before Fix:
- Frontend calls: `/api/admin/org/ai/config`
- Backend exposes: `/admin/org/ai/config`
- Validator sees: **MISMATCH** (false positive orphaned route)

### After Fix:
- Frontend uses: Module component or authenticated client
- Backend exposes: `/admin/org/ai/config`
- Validator sees: **MATCH** (module abstraction hides implementation)

---

## Estimated Effort

- **Time:** 15-30 minutes
- **Complexity:** Low (copy pattern from existing pages)
- **Testing:** Verify admin page loads and API calls work

---

## Recommendation

**FIX THE ONE NON-COMPLIANT PAGE**

**Why:**
- Standards compliance (ADR-004)
- Eliminates false positive validator errors
- Minimal risk (only 1 file affected)
- Future-proof (proper abstraction)

**Next Step:** Check if `OrgAiAdmin` component exists in `@module-ai`, if yes use it, if no create proper client pattern.

---

**Audit Complete**  
**Status:** Ready to fix  
**Risk Level:** Low ✅