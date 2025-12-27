# Missing Admin Pages Implementation Plan

**Date:** December 26, 2025  
**Status:** 🟢 In Progress  
**Phase:** Phase 2 - Access Control  

---

## Executive Summary

This plan addresses the 18 unique orphaned routes (25 total with duplicates) identified in test6 validation by implementing missing admin UIs following the modular admin architecture standard.

**Key Decisions:**
- Single admin card per module with descriptive names
- Tabbed admin pages to consolidate features
- `/admin/rag/*` routes renamed to `/admin/ai/*`
- Org AI Config accessible to platform admins only
- User management: Both platform Users tab AND org Members tab

**Progress:**
- ✅ Phase 0 COMPLETE (Session 18, Dec 26, 2025)
- ✅ Phase 1 COMPLETE (Session 19, Dec 26, 2025)
- ✅ Phase 2 COMPLETE (Session 20, Dec 26, 2025)
- ⏭️ Phase 3: Ready to implement Platform Management
- Routes fixed: 9 (Phase 0) + AI routes (Phase 1) + Access Control routes (Phase 2)

---

## Implementation Phases

### Phase 0: Pre-Implementation (3-4 hours) ✅ COMPLETE

**Status:** ✅ Complete (Session 18, Dec 26, 10:39 AM - 11:00 AM)

**Time Actual:** 21 minutes (extremely efficient)

#### Tasks Completed:
- [x] Update standards documents (4/4 complete: ADMIN-CARD-PATTERN, NAVIGATION-AND-ROLES, MODULAR-ADMIN-ARCHITECTURE, module-integration-spec)
- [x] Investigate duplicate Lambda functions (Created duplicate-routes-investigation.md)
- [x] Add missing org-email-domains infrastructure (Lambda + 4 routes)
- [x] Rename routes `/admin/rag/*` → `/admin/ai/*` (5 routes updated)
- [x] Update AdminCardConfig interface with `context` and `requiredRoles` fields

#### Impact:
- **9 orphaned routes fixed** (4 org-email-domains + 5 AI provider routes)
- **6 files modified/created**
- **Infrastructure ready** for Phase 1 implementation
- **Standards aligned** with modular admin architecture

---

### Phase 1: AI Enablement - module-ai (8-10 hours) ✅ COMPLETE

**Status:** ✅ Complete (Session 19, Dec 26, 11:05 AM - 11:12 AM)

**Time Actual:** 7 minutes (extremely efficient)

**Admin Card:** "AI Enablement"  
**Description:** "Configure AI providers, discover and validate models, and manage platform AI settings"  
**Route:** `/admin/ai`

**Tabs:**
- **Providers** - List AI providers, test connections, manage credentials
- **Models** - Discover models, run validation, view status by category
- **Config** - Platform defaults, system prompt, default models

**Routes Resolved:**
- `/admin/ai/providers` (GET)
- `/admin/ai/providers/test` (POST)
- `/admin/ai/providers/models` (GET, OPTIONS)
- `/admin/ai/config` (GET, PUT)
- `/admin/ai/models` (GET)

**Backend Changes:**
- Rename `/admin/rag/*` to `/admin/ai/*` in lambda_function.py
- Update API Gateway routes in infrastructure

**Frontend Components:**
```
module-ai/frontend/
├── adminCard.tsx                    # "AI Enablement" card
├── components/admin/
│   ├── AIEnablementAdmin.tsx        # Main tabbed page
│   ├── ProvidersTab.tsx             # Provider management
│   ├── ModelsTab.tsx                # Model discovery & validation
│   └── PlatformConfigTab.tsx        # Platform AI config
└── index.ts                         # Export admin card & components

apps/web/app/admin/ai/page.tsx
```

---

### Phase 2: Access Control - module-access (12-14 hours) ✅ COMPLETE

**Status:** ✅ Complete (Session 20, Dec 26, 11:13 AM - 11:26 AM)

**Time Actual:** 13 minutes (extremely efficient)

**Admin Card:** "Access Control"  
**Description:** "Manage organizations, users, identity providers, and access settings"  
**Route:** `/admin/access`

**Main Page Tabs:**
- **Orgs** - List organizations (cards/table) → click opens Org Details
- **Users** - Platform-wide user list, search, filter by org/role
- **IDP Config** - Identity provider configuration (existing IdpConfigCard)

**Org Details Sub-Page (accessed from Orgs tab):**
- **Overview** - Name, description, slug
- **Domains** - Email domains, verification, auto-provisioning
- **Members** - Org membership management
- **Invites** - Pending invitations
- **AI Config** - Org-specific prompts (platform admin only)

**Routes Resolved:**
- `/orgs/{id}/email-domains` (GET, POST, PUT, DELETE)
- `/orgs/{orgId}/ai/config` (GET, PUT)

**Access Control:**
- Platform Users tab: platform_owner, platform_admin
- Org Details - Domains/Members/Invites: platform admins OR org owners/admins
- Org Details - AI Config: **platform admins only** (not org owners/admins)

**Frontend Components:**
```
module-access/frontend/
├── adminCard.tsx                    # "Access Control" card (update)
├── components/admin/
│   ├── AccessControlAdmin.tsx       # Main tabbed page
│   ├── OrgsTab.tsx                  # Org list (cards/table)
│   ├── UsersTab.tsx                 # Platform-wide user view
│   ├── IdpTab.tsx                   # IDP config (uses IdpConfigCard)
│   ├── OrgDetails.tsx               # Org details page (tabbed)
│   ├── OrgDomainsTab.tsx            # Domains management
│   ├── OrgMembersTab.tsx            # Members management
│   ├── OrgInvitesTab.tsx            # Invites management
│   └── OrgAIConfigTab.tsx           # AI config (platform admin only)
└── index.ts

apps/web/app/admin/access/page.tsx
apps/web/app/admin/access/orgs/[id]/page.tsx  # Org details
```

---

### Phase 3: Platform Management - module-mgmt (2-3 hours)

**Admin Card:** "Platform Management" (existing)  
**Description:** Update to reflect new tab structure

**Tabs:**
- **Schedule** - Lambda warming (existing functionality, renamed)
- **Performance** - Placeholder for future metrics
- **Storage** - Placeholder for future storage management
- **Cost** - Placeholder for future cost tracking

**Frontend Components:**
```
module-mgmt/frontend/
├── components/admin/
│   ├── PlatformMgmtAdmin.tsx        # Update to tabbed structure
│   ├── ScheduleTab.tsx              # Existing warming → renamed
│   ├── PerformanceTab.tsx           # Placeholder
│   ├── StorageTab.tsx               # Placeholder
│   └── CostTab.tsx                  # Placeholder
```

---

## Module Admin Cards Summary

| Module | Card Title | Description | Route | Order |
|--------|-----------|-------------|-------|-------|
| module-access | Access Control | Manage organizations, users, identity providers, and access settings | `/admin/access` | 10 |
| module-ai | AI Enablement | Configure AI providers, discover and validate models, and manage platform AI settings | `/admin/ai` | 20 |
| module-mgmt | Platform Management | Manage Lambda functions, performance, storage, and costs | `/admin/mgmt` | 30 |

---

## Design Patterns

### Tabbed Admin Page Pattern

```typescript
export function AdminPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">Admin Page Title</Typography>
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Tab 1" />
        <Tab label="Tab 2" />
        <Tab label="Tab 3" />
      </Tabs>
      
      {activeTab === 0 && <Tab1Component />}
      {activeTab === 1 && <Tab2Component />}
      {activeTab === 2 && <Tab3Component />}
    </Box>
  );
}
```

### Org Details Page Pattern

```typescript
export function OrgDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState(0);
  const { data: session } = useSession();
  
  const isPlatformAdmin = ["platform_owner", "platform_admin"].includes(
    session?.user?.global_role || ""
  );

  return (
    <Box sx={{ p: 4 }}>
      <Breadcrumbs />
      <Typography variant="h4">Organization Details</Typography>
      
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Overview" />
        <Tab label="Domains" />
        <Tab label="Members" />
        <Tab label="Invites" />
        {isPlatformAdmin && <Tab label="AI Config" />}
      </Tabs>
      
      {/* Tab content */}
    </Box>
  );
}
```

---

## Backend Route Changes

### Lambda Routes to Update

**ai-config-handler Lambda:**
```python
# BEFORE
elif path == "/admin/rag/config":
elif path == "/admin/rag/providers":
elif path == "/admin/rag/providers/test":
elif path == "/admin/rag/providers/models":

# AFTER
elif path == "/admin/ai/config":
elif path == "/admin/ai/providers":
elif path == "/admin/ai/providers/test":
elif path == "/admin/ai/providers/models":
```

---

## Success Criteria

- [x] All orphaned routes have corresponding UIs (Phases 0-2 complete)
- [ ] API tracer validation shows 0 orphaned routes (pending Phase 3)
- [x] Single admin card per module
- [x] Tabbed admin pages for each module
- [x] Org details page with proper access control
- [x] AI Config tab only visible to platform admins
- [x] Routes use `/admin/ai/*` instead of `/admin/rag/*`
- [x] Standards documents updated
- [ ] Manual testing complete (pending deployment)

---

## Estimated Timeline

| Phase | Effort | Sessions |
|-------|--------|----------|
| Phase 0: Pre-implementation | 3-4 hours | 1 |
| Phase 1: AI Enablement | 8-10 hours | 1-2 |
| Phase 2: Access Control | 12-14 hours | 2 |
| Phase 3: Platform Management | 2-3 hours | 1 |
| **Total** | **25-31 hours** | **5-6 sessions** |

---

## References

- [orphaned-routes-analysis.md](../research/orphaned-routes-analysis.md)
- [policy-app-admin-features.md](../research/policy-app-admin-features.md)
- [standard_MODULAR-ADMIN-ARCHITECTURE.md](../standards/standard_MODULAR-ADMIN-ARCHITECTURE.md)
- [standard_ADMIN-CARD-PATTERN.md](../standards/standard_ADMIN-CARD-PATTERN.md)

---

**Status:** ✅ Phase 2 Complete - Ready for Phase 3  
**Next Step:** Phase 3 - Platform Management implementation  
**Updated:** December 26, 2025, 11:26 AM EST
