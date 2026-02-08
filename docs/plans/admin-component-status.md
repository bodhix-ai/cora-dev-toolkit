# Admin Component Status

**Created:** February 6, 2026 - Session 20
**Status:** Inventory Complete

---

## Summary

- **Components Needed:** 16 total (8 org + 8 sys)
- **Components Exist:** 4 (25%)
- **Components Missing:** 12 (75%)

---

## Existing Components (4) ✅

| Component | Module | Location | Status |
|-----------|--------|----------|--------|
| `OrgAccessAdmin` | module-access | `module-access/frontend/components/admin/` | ✅ Exists |
| `OrgAiAdmin` | module-ai | `module-ai/frontend/components/admin/` | ✅ Exists |
| `OrgChatAdmin` | module-chat | `module-chat/frontend/components/admin/` | ✅ Exists |
| `SysChatAdmin` | module-chat | `module-chat/frontend/components/admin/` | ✅ Exists |

---

## Missing Components (12) ❌

### Core Modules (8 missing)

| Component | Module | Page Waiting | Priority |
|-----------|--------|--------------|----------|
| `SysAccessAdmin` | module-access | `/admin/sys/access/page.tsx` | High |
| `SysAiAdmin` | module-ai | `/admin/sys/ai/page.tsx` | High |
| `OrgKbAdmin` | module-kb | `/admin/org/kb/page.tsx` | High |
| `SysKbAdmin` | module-kb | `/admin/sys/kb/page.tsx` | High |
| `OrgMgmtAdmin` | module-mgmt | `/admin/org/mgmt/page.tsx` | High |
| `SysMgmtAdmin` | module-mgmt | `/admin/sys/mgmt/page.tsx` | **BROKEN** |
| `OrgWsAdmin` | module-ws | `/admin/org/ws/page.tsx` | Medium |
| `SysWsAdmin` | module-ws | `/admin/sys/ws/page.tsx` | Medium |

### Functional Modules (4 missing)

| Component | Module | Page Waiting | Priority |
|-----------|--------|--------------|----------|
| `OrgEvalAdmin` | module-eval | `/admin/org/eval/page.tsx` | Medium |
| `SysEvalAdmin` | module-eval | `/admin/sys/eval/page.tsx` | Medium |
| `OrgVoiceAdmin` | module-voice | `/admin/org/voice/page.tsx` | Low |
| `SysVoiceAdmin` | module-voice | `/admin/sys/voice/page.tsx` | Low |

---

## ⚠️ CRITICAL ISSUE

**`/admin/sys/mgmt/page.tsx` is BROKEN!**

The page tries to import and render `<SysMgmtAdmin />`, but this component **does not exist**.

Only `SysMgmtModulesAdmin` exists in module-mgmt, which handles module configuration but NOT the full management page functionality (warming, monitoring, etc.).

**Resolution needed:**
1. Create `SysMgmtAdmin` component that integrates:
   - Module configuration (from `SysMgmtModulesAdmin`)
   - Lambda warming management
   - Performance monitoring
   - Storage management
   - Cost tracking

---

## Page Compliance Status

### Compliant Pages (2 of 16 = 13%) ✅

1. `/admin/org/access/page.tsx` → Uses `<OrgAccessAdmin />` ✅
2. `/admin/org/ai/page.tsx` → Uses `<OrgAiAdmin />` ✅

### Broken Pages (1 of 16 = 6%) 🔴

1. `/admin/sys/mgmt/page.tsx` → Tries to use non-existent `<SysMgmtAdmin />` 🔴

### Need Migration (13 of 16 = 81%) ⚠️

All other pages use hooks directly and need component delegation pattern.

---

## Migration Strategy

### Phase 1: Fix Broken Page (Priority 1)
1. Create `SysMgmtAdmin` component in module-mgmt
2. Integrate existing `SysMgmtModulesAdmin` functionality
3. Add warming/monitoring/storage/cost features

### Phase 2: Convert Existing Page Logic to Components (Priority 2)
For pages that have substantial logic already implemented:
1. Extract page logic into component
2. Add @routes metadata
3. Update page to render component only

**Candidates:**
- `/admin/org/kb/page.tsx` → Create `OrgKbAdmin` (substantial logic exists)
- `/admin/sys/kb/page.tsx` → Create `SysKbAdmin` (substantial logic exists)
- `/admin/org/chat/page.tsx` → Verify `OrgChatAdmin` matches page implementation
- `/admin/sys/chat/page.tsx` → Verify `SysChatAdmin` matches page implementation

### Phase 3: Create Simple Components (Priority 3)
For pages with minimal logic:
1. Create skeleton component
2. Add @routes metadata
3. Implement basic admin UI

**Candidates:**
- Access, AI, Mgmt, WS, Eval, Voice pages

---

## Component Creation Template

```typescript
/**
 * [Org/Sys] [Module] Admin Component
 * 
 * @routes
 * - METHOD /admin/[org|sys]/[module]/[path] - Description
 * - METHOD /admin/[org|sys]/[module]/[path] - Description
 */
'use client';

import React from 'react';
import { useUser, useOrganizationContext, useRole } from '@{{PROJECT_NAME}}/module-access';
import { CircularProgress, Box, Alert } from '@mui/material';

export function [OrgSys][Module]Admin() {
  // Auth hooks
  const { profile, loading, isAuthenticated } = useUser();
  const { isOrgAdmin } = useRole(); // or isSysAdmin
  const { currentOrganization } = useOrganizationContext(); // org-level only
  
  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Auth checks
  if (!isAuthenticated || !profile) {
    return (
      <Box p={4}>
        <Alert severity="error">You must be logged in to access this page.</Alert>
      </Box>
    );
  }
  
  if (!isOrgAdmin) { // or !isSysAdmin
    return (
      <Box p={4}>
        <Alert severity="error">You do not have permission to access this page.</Alert>
      </Box>
    );
  }
  
  // Component implementation
  return (
    <Box>
      {/* Admin UI here */}
    </Box>
  );
}
```

---

## Next Actions

1. **Immediate:** Fix broken sys/mgmt page (create SysMgmtAdmin)
2. **Short-term:** Convert KB and Chat pages (extract existing logic)
3. **Medium-term:** Create remaining components (access, mgmt, ws, eval, voice)
4. **Validation:** Run auth validator after each migration to confirm compliance