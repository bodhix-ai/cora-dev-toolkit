# CORA Platform Admin Card Standard

**Version:** 1.0  
**Date:** December 24, 2025  
**Status:** ✅ Standard  
**Related Documents:** 
- [standard_NAVIGATION-AND-ROLES.md](./standard_NAVIGATION-AND-ROLES.md)
- [standard_CORA-FRONTEND.md](./standard_CORA-FRONTEND.md)

---

## 1. Overview

The Platform Admin Card pattern allows modules to "plug in" administration interfaces to the central Platform Admin page (`/admin/platform`). This ensures that platform-level configuration remains modular and decentralized while providing a unified experience for administrators.

### 1.1 Purpose

- **Decentralized Administration**: Modules own their own admin interfaces.
- **One Card Per Module**: Each module exports exactly ONE admin card for platform administration.
- **Unified Discovery**: All module admin tools are discoverable from a single dashboard.
- **Consistent UX**: All admin cards and pages follow the same design patterns.
- **Role-Based Access**: Restricted to `platform_owner` and `platform_admin`.
- **No Main Menu**: Core modules (module-access, module-ai, module-mgmt) do NOT have main menu items.

---

## 2. Architecture

### 2.1 The Pattern

```
Platform Admin Page (/admin/platform)
├── Imports admin cards from enabled modules
├── Displays cards in responsive grid layout
└── Each card links to module's admin page

Module (e.g., module-access)
├── frontend/
│   ├── adminCard.tsx           (Exports AdminCardConfig)
│   ├── components/admin/       (Admin UI components)
│   │   └── OrgMgmt.tsx
│   └── index.ts                (Exports adminCard)
└── apps/web/app/admin/[module]/ (Next.js Route)
    └── page.tsx                (Imports and renders component)
```

### 2.2 Data Flow

1. **Discovery**: `PlatformAdminPage` imports `[module]AdminCard` from module packages.
2. **Navigation**: User clicks card → navigates to `href` (e.g., `/admin/organizations`).
3. **Execution**: Admin page loads module component (e.g., `OrgMgmt`).
4. **API**: Component talks to module's Lambda endpoints via authenticated client.

---

## 3. Implementation Requirements

### 3.1 Admin Card Definition

Every module providing platform administration MUST export an `adminCard.tsx` file.

**Location:** `packages/[module-name]/frontend/adminCard.tsx`

**Code Pattern:**

```typescript
import React from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

/**
 * Module Admin Card
 */
export const myModuleAdminCard: AdminCardConfig = {
  id: "my-module-admin",
  title: "Module Administration", // Use functional name: "Access Control", "AI Enablement", etc.
  description: "Configure settings and manage resources for this module",
  icon: <SettingsIcon sx={{ fontSize: 48 }} />,
  href: "/admin/access", // Single word or acronym: access, ai, mgmt, chat, kb
  color: "primary.main", // or secondary.main, error.main, etc.
  order: 50, // See ordering conventions below
};
```

**Admin Card Naming Conventions:**
- **Card Title**: Use functional, descriptive name (e.g., "Access Control", "AI Enablement", "Platform Management")
- **Route (href)**: Single word or acronym ONLY
  - ✅ Good: `/admin/access`, `/admin/ai`, `/admin/mgmt`, `/admin/chat`, `/admin/kb`
  - ❌ Bad: `/admin/access-control`, `/admin/ai-enablement`, `/admin/platform-mgmt`

**Ordering Conventions:**
- **10-19**: Core platform (Access Control, Organizations)
- **20-29**: Intelligence (AI Enablement, Models)
- **30-39**: Infrastructure (Platform Management, System)
- **40-49**: Content & Knowledge
- **50+**: Application-specific modules

**Module Examples:**
- `module-access` → "Access Control" → `/admin/access` (order: 10)
- `module-ai` → "AI Enablement" → `/admin/ai` (order: 20)
- `module-mgmt` → "Platform Management" → `/admin/mgmt` (order: 30)

### 3.2 Module Exports

The admin card MUST be exported from the module's main entry point.

**Location:** `packages/[module-name]/frontend/index.ts`

```typescript
// Admin Card
export { myModuleAdminCard } from "./adminCard";

// Admin Component (for the route page)
export { MyModuleAdmin } from "./components/admin/MyModuleAdmin";
```

### 3.3 Admin Component Structure

Admin interfaces MUST use Material UI (MUI) components and follow a **tabbed structure** to consolidate features.

**Location:** `packages/[module-name]/frontend/components/admin/MyModuleAdmin.tsx`

**Structure:**
1. **Header**: Page title and description
2. **Tabs**: MUI Tabs component for feature consolidation
3. **Tab Content**: Each tab contains focused functionality
4. **Actions**: Buttons, dialogs, forms within each tab

**Tabbed Structure Pattern:**
```typescript
export function MyModuleAdmin() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4">Module Administration</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Description of module administration
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Feature 1" />
        <Tab label="Feature 2" />
        <Tab label="Feature 3" />
      </Tabs>

      {activeTab === 0 && <Feature1Tab />}
      {activeTab === 1 && <Feature2Tab />}
      {activeTab === 2 && <Feature3Tab />}
    </Box>
  );
}
```

**Code Pattern:**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, Button, ... } from "@mui/material";

interface AdminProps {
  apiClient: any; // Authenticated client
}

export function MyModuleAdmin({ apiClient }: AdminProps) {
  // State for data, loading, errors
  // Effects to fetch data
  
  return (
    <Box>
      <Card>
        <CardHeader 
          title="Module Administration" 
          action={<Button>Create Resource</Button>}
        />
        <CardContent>
          {/* List or Table of resources */}
        </CardContent>
      </Card>
      
      {/* Dialogs for Create/Edit */}
    </Box>
  );
}
```

### 3.4 Route Implementation

The application MUST implement a route page that hosts the admin component.

**Location:** `apps/web/app/admin/[single-word]/page.tsx`

**Route Naming:** Use single word or acronym matching the module's functional area (e.g., `access`, `ai`, `mgmt`).

**Code Pattern:**

```typescript
"use client";

import React from "react";
import { MyModuleAdmin } from "@packages/[module-name]";
import { createAuthenticatedClient } from "@packages/api-client";
import { useSession } from "next-auth/react";

export default function MyModuleAdminPage() {
  const { data: session } = useSession();
  
  // Create authenticated API client
  const apiClient = session?.accessToken 
    ? createAuthenticatedClient(session.accessToken)
    : null;
  
  if (!apiClient) return <Loading />;
  
  return <MyModuleAdmin apiClient={apiClient} />;
}
```

---

## 4. Backend Requirements

### 4.1 Authorization

Platform admin endpoints MUST strictly enforce role checks. Only users with `platform_owner` or `platform_admin` roles should access these endpoints.

**Python Lambda Pattern:**

```python
def handle_admin_action(event, user_id):
    # Get user profile
    profile = common.find_one('user_profiles', {'user_id': user_id})
    
    # Check platform role
    if profile.get('global_role') not in ['platform_owner', 'platform_admin']:
        return common.forbidden_response("Platform admin access required")
        
    # Proceed with admin action
    # ...
```

### 4.2 LIST Endpoints

- **Platform Admin View**: Should return ALL resources across all organizations (if applicable).
- **Regular User View**: Should return ONLY resources belonging to the user's organization(s).

---

## 5. Integration Checklist

When adding a new admin card:

- [ ] Create `adminCard.tsx` in module frontend.
- [ ] Create admin component (e.g., `MyModuleAdmin.tsx`) using MUI.
- [ ] Export both from module `index.ts`.
- [ ] Create route page in `apps/web/app/admin/[slug]/page.tsx`.
- [ ] Import and add card to `apps/web/app/admin/platform/page.tsx`.
- [ ] Verify backend endpoints enforce `platform_admin` role.
- [ ] Verify ordering of the card on the dashboard.

---

## 6. Design Standards

- **Icons**: Use MUI Icons (`@mui/icons-material`). Size `48px` for dashboard cards.
- **Colors**: Use theme colors (`primary.main`, `secondary.main`).
- **Layout**: Grid layout for dashboard (`Grid item xs={12} sm={6} md={4}`).
- **Responsiveness**: Admin pages must be responsive (mobile-friendly).
- **Feedback**: Use `Alert` for errors and `Snackbar` for success messages.
- **Loading**: Use `CircularProgress` or skeletons during data fetch.

---

**Standard Version:** 1.0  
**Last Updated:** December 24, 2025
