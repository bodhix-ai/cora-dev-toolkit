# CORA Standard: Admin Page Architecture

**Version:** 2.0  
**Category:** Frontend (01)  
**Status:** ✅ APPROVED  
**Created:** February 6, 2026  
**Supersedes:** `01_std_front_ADMIN-COMPONENTS.md`, `01_std_front_ADMIN-CARD-PATTERN.md`  
**Related ADRs:** [ADR-004](../arch%20decisions/ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md), [ADR-015](../arch%20decisions/ADR-015-ADMIN-PAGE-AUTH-PATTERN.md), [ADR-016](../arch%20decisions/ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md), [ADR-019a](../arch%20decisions/ADR-019a-AUTH-FRONTEND.md)  
**Validators:** api-tracer (component metadata check)

---

## Purpose

This standard defines the complete architecture for CORA admin pages, covering:
1. **Admin Page Structure** - How pages are built (component delegation pattern)
2. **Platform Admin Dashboard** - How modules integrate into the central dashboard
3. **Authorization Scopes** - System, organization, and workspace admin patterns

**Goals:**
- **Consistency** - Every admin page follows the same architecture
- **Scalability** - Admin UIs can grow complex without refactoring
- **Encapsulation** - Modules own their admin logic AND UI
- **Traceability** - Validators can verify all admin routes are used
- **Maintainability** - Admin UI fixes benefit all projects

---

## Table of Contents

1. [Admin Page Structure](#1-admin-page-structure)
2. [Platform Admin Dashboard](#2-platform-admin-dashboard)
3. [Authorization Scopes](#3-authorization-scopes)
4. [Component Naming](#4-component-naming)
5. [Route Metadata](#5-route-metadata)
6. [Validation Rules](#6-validation-rules)
7. [Migration Guide](#7-migration-guide)

---

## 1. Admin Page Structure

### 1.1 The Component Delegation Pattern

**Rule:** ALL admin pages MUST import and render a module-provided admin component.

```typescript
// ✅ CORRECT: Standard pattern for all admin pages
import { OrgModuleAdmin } from '@{{PROJECT_NAME}}/module-{name}';

export default function OrgModuleAdminPage() {
  return <OrgModuleAdmin />;
}
```

```typescript
// ❌ WRONG: Direct API calls in admin pages
import { useUser } from '@{{PROJECT_NAME}}/module-access';

export default function OrgModuleAdminPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/admin/org/module/data').then(...); // ❌ NO
  }, []);
  
  return <div>...</div>;
}
```

**No exceptions. Simple or complex, all admin pages use components.**

### 1.2 Why Component Delegation?

**Benefits:**
1. **Predictable Pattern** - Every admin page looks the same
2. **Less Boilerplate** - No repeated auth/loading/error logic in pages
3. **Type Safety** - Module exports typed components
4. **Easy Maintenance** - Fix bug once, all projects benefit
5. **Automatic Updates** - Module updates propagate to all projects
6. **Better Testing** - Test component once, not every page

**Smart Components, Dumb Pages:**
- **Pages** - Thin wrappers that just render components
- **Components** - Contain all logic (auth, data fetching, UI)

### 1.3 Root Layout Provider Hierarchy (REQUIRED)

**CRITICAL:** Admin pages CANNOT function without the correct provider hierarchy in the root layout.

**Error if missing:** `useUser must be used within UserProvider`

**Required Location:** `apps/web/app/layout.tsx` (or `app/layout.tsx` in stack repo)

**Provider Hierarchy:**
```tsx
import { AuthProvider, UserProviderWrapper } from '@{{PROJECT_NAME}}/module-access';
import OrgProviderWrapper from '../components/OrgProviderWrapper';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); // Get server-side session
  
  return (
    <html lang="en">
      <body>
        <AuthProvider session={session}>
          <UserProviderWrapper>
            <OrgProviderWrapper>
              {children}
            </OrgProviderWrapper>
          </UserProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
```

**Provider Responsibilities:**

| Provider | Purpose | What It Provides |
|----------|---------|------------------|
| **AuthProvider** | Auth system wrapper (Okta/Clerk) | Session state, auth config |
| **UserProviderWrapper** | Bridges auth to user context | `useUser()` hook access |
| **OrgProviderWrapper** | Organization context | `useOrganizationContext()` hook access |

**Without this hierarchy:**
- Admin pages throw `useUser must be used within UserProvider`
- `useOrganizationContext()` fails
- Auth checks cannot execute
- Application is non-functional

**Troubleshooting:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `useUser must be used within UserProvider` | UserProviderWrapper missing from root layout | Add UserProviderWrapper to app/layout.tsx |
| `useOrganizationContext must be used within OrgProvider` | OrgProviderWrapper missing | Add OrgProviderWrapper to app/layout.tsx |
| Infinite loading on admin pages | AuthProvider not receiving session prop | Pass `session` prop to AuthProvider |
| Build error: Module not found '@project/module-access' | Module packages not built | Run `pnpm run build` at monorepo root |

**Monorepo Build Requirement:**

In monorepo projects, module packages MUST be built before the web app can import them:

```bash
# Build all packages (required before first run)
cd /path/to/project-stack
pnpm run build

# Or build incrementally
pnpm --filter=module-access build
pnpm --filter=api-client build
```

**Symptom if packages not built:** `useUser must be used within UserProvider` even though layout is correct.

---

## 2. Platform Admin Dashboard

### 2.1 The Admin Card System

The Platform Admin dashboard (`/admin/platform`) displays cards from enabled modules, providing a unified entry point for system administration.

**Architecture:**
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

### 2.2 Admin Card Definition

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
  title: "Module Administration", // Functional name: "Access Control", "AI Enablement"
  description: "Configure settings and manage resources for this module",
  icon: <SettingsIcon sx={{ fontSize: 48 }} />,
  href: "/admin/access", // Single word: access, ai, mgmt, chat, kb
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

### 2.3 Module Exports

The admin card MUST be exported from the module's main entry point.

**Location:** `packages/[module-name]/frontend/index.ts`

```typescript
// Admin Card (for Platform Admin dashboard)
export { myModuleAdminCard } from "./adminCard";

// Admin Components (for route pages)
export { OrgModuleAdmin } from "./components/admin/OrgModuleAdmin";
export { SysModuleAdmin } from "./components/admin/SysModuleAdmin";
```

### 2.4 Admin Component Structure

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

---

## 3. Authorization Scopes

CORA admin pages operate at three scopes:

| Scope | Routes | Auth Check | Context Required |
|-------|--------|------------|------------------|
| **System** | `/admin/sys/*` | `is_sys_admin` | None |
| **Organization** | `/admin/org/*` | `is_org_admin` + `is_org_member` | `orgId` |
| **Workspace** | `/admin/ws/*` | `is_ws_admin` + `is_ws_member` | `orgId` + `wsId` |

**Reference:** See [01_std_front_AUTH.md](./01_std_front_AUTH.md) section 2.4 for the complete BRIGHT LINE context table.

### 3.1 System Admin Pages

**Pattern:**
```typescript
// apps/web/app/admin/sys/{module}/page.tsx
'use client';

import { Sys{Module}Admin } from '@{{PROJECT_NAME}}/module-{module}';

export default function System{Module}AdminPage() {
  return <Sys{Module}Admin />;  // Component checks isSysAdmin internally
}
```

**No context needed** - System admin has platform-wide access.

### 3.2 Organization Admin Pages

**Pattern:**
```typescript
// apps/web/app/admin/org/{module}/page.tsx
'use client';

import { Org{Module}Admin } from '@{{PROJECT_NAME}}/module-{module}';

export default function Organization{Module}AdminPage() {
  return <Org{Module}Admin />;  // Component uses useOrganizationContext() internally
}
```

**Context: orgId** - Component gets it internally via `useOrganizationContext()`.

### 3.3 Workspace Admin Pages

**Pattern:**
```typescript
// apps/web/app/admin/ws/{module}/page.tsx
'use client';

import { Ws{Module}Admin } from '@{{PROJECT_NAME}}/module-{module}';

export default function Workspace{Module}AdminPage() {
  return <Ws{Module}Admin />;  // Component uses workspace context internally
}
```

**Context: orgId + wsId** - Component gets both internally via workspace hooks.

---

## 4. Component Naming

### 4.1 Organization-Level Admin Components

**Pattern:** `Org{Module}Admin`

**Examples:**
- `OrgChatAdmin` - Chat admin for organization scope
- `OrgKbAdmin` - KB admin for organization scope
- `OrgEvalAdmin` - Eval admin for organization scope
- `OrgAccessAdmin` - Access control for organization scope

### 4.2 System-Level Admin Components

**Pattern:** `Sys{Module}Admin`

**Examples:**
- `SysChatAdmin` - Chat admin for system scope
- `SysKbAdmin` - KB admin for system scope
- `SysAiAdmin` - AI admin for system scope
- `SysAccessAdmin` - Access control for system scope

### 4.3 Workspace-Level Admin Components (Rare)

**Pattern:** `Ws{Module}Admin`

**Example:**
- `WsMgmtAdmin` - Workspace management admin

---

## 5. Route Metadata

### 5.1 Route Documentation Requirement

**Every module admin component MUST include a route manifest in its docstring.**

**Format:**
```typescript
/**
 * @component {ComponentName}
 * @routes
 * - {METHOD} {PATH}
 * - {METHOD} {PATH}
 */
```

**Example:**
```typescript
// module-chat/frontend/components/admin/OrgChatAdmin.tsx

/**
 * Organization Chat Admin Component
 * Provides admin interface for managing chat configuration,
 * sessions, and analytics at the organization level.
 *
 * @component OrgChatAdmin
 * @routes
 * - GET /admin/org/chat/config
 * - PUT /admin/org/chat/config
 * - GET /admin/org/chat/sessions
 * - GET /admin/org/chat/sessions/{id}
 * - DELETE /admin/org/chat/sessions/{id}
 * - POST /admin/org/chat/sessions/{id}/restore
 * - GET /admin/org/chat/analytics
 * - GET /admin/org/chat/analytics/users
 * - GET /admin/org/chat/analytics/workspaces
 * - GET /admin/org/chat/messages/{id}
 */
export const OrgChatAdmin = () => {
  // Component implementation
  const config = useOrgChatConfig();
  const sessions = useOrgChatSessions();
  
  return (
    <div>
      {/* Admin UI */}
    </div>
  );
};
```

### 5.2 Why Route Metadata?

**Benefits:**
1. **Traceability** - Validators can match routes to components
2. **Accurate Reports** - No false "orphaned route" errors
3. **Documentation** - Routes documented in code, always up-to-date
4. **Compliance** - Enforced by api-tracer validator

---

## 6. Validation Rules

### 6.1 Validator Checks (api-tracer)

**Check 1: Admin Page Uses Component**
- ❌ ERROR: Admin page makes direct API calls
- ❌ ERROR: Admin page uses raw `fetch()`
- ✅ PASS: Admin page imports and renders module component

**Check 2: Component Has Route Metadata**
- ❌ ERROR: Module component missing `@routes` docstring
- ❌ WARNING: Module component has empty `@routes` section
- ✅ PASS: Module component documents all routes

**Check 3: Routes Match Implementation**
- ❌ WARNING: Documented route not found in API Gateway
- ❌ WARNING: API Gateway route not documented in component
- ✅ PASS: All routes documented and match backend

**Check 4: Context Passing**
- ❌ ERROR: Org-scoped route called without orgId
- ❌ ERROR: Workspace-scoped route called without wsId
- ✅ PASS: All multi-tenant routes pass required context

---

## 7. Migration Guide

### 7.1 For Existing Admin Pages Using Direct API Calls

**Before:**
```typescript
export default function OrgModuleAdminPage() {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    fetch('/api/admin/org/module/config')
      .then(res => res.json())
      .then(data => setConfig(data.data));
  }, []);
  
  return <div>{/* Custom admin UI */}</div>;
}
```

**After:**
```typescript
// 1. Create module component
// packages/module-{name}/frontend/components/admin/OrgModuleAdmin.tsx
/**
 * @component OrgModuleAdmin
 * @routes
 * - GET /admin/org/{module}/config
 * - PUT /admin/org/{module}/config
 */
export const OrgModuleAdmin = () => {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    // Component makes API calls internally
    fetch('/api/admin/org/module/config')
      .then(res => res.json())
      .then(data => setConfig(data.data));
  }, []);
  
  return <div>{/* Admin UI */}</div>;
};

// 2. Export from module
// packages/module-{name}/frontend/index.ts
export { OrgModuleAdmin } from './components/admin/OrgModuleAdmin';

// 3. Update page to use component
// apps/web/app/admin/org/{module}/page.tsx
export default function OrgModuleAdminPage() {
  return <OrgModuleAdmin />; // Now uses component
}
```

### 7.2 Integration Checklist

When adding a new admin interface:

- [ ] Create admin component (e.g., `OrgModuleAdmin.tsx`)
- [ ] Add `@routes` docstring with all API routes
- [ ] Create admin card (`adminCard.tsx`) if Platform Admin integration needed
- [ ] Export both from module `index.ts`
- [ ] Create route page in `apps/web/app/admin/{scope}/{module}/page.tsx`
- [ ] Import and add card to Platform Admin page (if applicable)
- [ ] Verify backend endpoints enforce appropriate role checks
- [ ] Test component in isolation
- [ ] Run api-tracer validation

---

## 8. Common Patterns

### 8.1 Loading States

**Handled by component, not page:**
```typescript
// Component handles loading internally
export const OrgModuleAdmin = () => {
  const { data, loading, error } = useModuleData();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <AdminUI data={data} />;
};
```

### 8.2 Auth Checks by Scope

**IMPORTANT:** Each admin scope has a different pattern. Choose the correct one:

---

#### 8.2.1 System Admin Pattern

**No organization context needed:**
```typescript
// packages/module-{name}/frontend/components/admin/Sys{Module}Admin.tsx
export const SysModuleAdmin = () => {
  // ✅ useUser() provides: loading, authAdapter, isAuthenticated
  const { loading, authAdapter, isAuthenticated } = useUser();
  
  // ✅ useRole() provides: isSysAdmin (NO loading here!)
  const { isSysAdmin } = useRole();
  
  // ✅ Extract token for tabs that need token string
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  
  useEffect(() => {
    if (!authAdapter || !isAuthenticated) {
      setToken(null);
      setTokenLoading(false);
      return;
    }
    authAdapter.getToken().then(setToken).finally(() => setTokenLoading(false));
  }, [authAdapter, isAuthenticated]);
  
  // ✅ Check loading FIRST
  if (loading || tokenLoading) return <CircularProgress />;
  
  // ✅ Then check authorization (sys admin only, no org context)
  if (!isSysAdmin) return <UnauthorizedMessage />;
  
  // ✅ Pass token to child tabs
  return <AdminUI token={token} />;
};
```

**Sys Admin Tab Props:**
```typescript
interface SysSettingsTabProps {
  token: string;  // Token for direct API calls
}
```

---

#### 8.2.2 Organization Admin Pattern

**Requires organization context:**
```typescript
// packages/module-{name}/frontend/components/admin/Org{Module}Admin.tsx
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

export const OrgModuleAdmin = () => {
  // ✅ useUser() provides: loading, authAdapter (CoraAuthAdapter type)
  const { loading, authAdapter } = useUser();
  
  // ✅ useRole() provides: isOrgAdmin (NO loading here!)
  const { isOrgAdmin } = useRole();
  
  // ✅ useOrganizationContext() provides: currentOrganization
  const { currentOrganization } = useOrganizationContext();
  
  // ✅ Check loading FIRST (from useUser, NOT useRole)
  if (loading) return <CircularProgress />;
  
  // ✅ Then check authorization
  if (!isOrgAdmin) return <UnauthorizedMessage />;
  if (!currentOrganization) return <SelectOrganization />;
  
  // ✅ Pass authAdapter AND orgId to child tabs
  return <AdminUI authAdapter={authAdapter} orgId={currentOrganization.orgId} />;
};
```

**Org Admin Tab Props:**
```typescript
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface OrgSettingsTabProps {
  authAdapter: CoraAuthAdapter;  // For API calls (use createCoraAuthenticatedClient(token))
  orgId: string;                  // Organization scope
}
```

**Note:** Use `createCoraAuthenticatedClient(token)` for HTTP calls. The auth adapter provides authentication, not HTTP client methods.

---

#### 8.2.3 Workspace Admin Pattern

**Requires organization AND workspace context:**
```typescript
// packages/module-{name}/frontend/components/admin/Ws{Module}Admin.tsx
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

export const WsModuleAdmin = () => {
  // ✅ useUser() provides: loading, authAdapter (CoraAuthAdapter type)
  const { loading, authAdapter } = useUser();
  
  // ✅ useRole() provides: isWsAdmin (NO loading here!)
  const { isWsAdmin } = useRole();
  
  // ✅ useOrganizationContext() provides: currentOrganization
  const { currentOrganization } = useOrganizationContext();
  
  // ✅ useWorkspaceContext() provides: currentWorkspace
  const { currentWorkspace } = useWorkspaceContext();
  
  // ✅ Check loading FIRST
  if (loading) return <CircularProgress />;
  
  // ✅ Then check authorization
  if (!isWsAdmin) return <UnauthorizedMessage />;
  if (!currentOrganization) return <SelectOrganization />;
  if (!currentWorkspace) return <SelectWorkspace />;
  
  // ✅ Pass authAdapter, orgId, AND wsId to child tabs
  return (
    <AdminUI 
      authAdapter={authAdapter} 
      orgId={currentOrganization.orgId}
      wsId={currentWorkspace.wsId}
    />
  );
};
```

**Workspace Admin Tab Props:**
```typescript
import { CoraAuthAdapter } from "@{{PROJECT_NAME}}/api-client";

interface WsSettingsTabProps {
  authAdapter: CoraAuthAdapter;  // For API calls (use createCoraAuthenticatedClient(token))
  orgId: string;                  // Organization scope
  wsId: string;                   // Workspace scope
}
```

**Note:** Use `createCoraAuthenticatedClient(token)` for HTTP calls. The auth adapter provides authentication, not HTTP client methods.

---

#### Hook Reference by Scope

| Scope | Hooks Required | Props to Pass to Tabs |
|-------|----------------|----------------------|
| **Sys Admin** | `useUser()`, `useRole()` | `token` |
| **Org Admin** | `useUser()`, `useRole()`, `useOrganizationContext()` | `authAdapter` (CoraAuthAdapter), `orgId` |
| **Ws Admin** | `useUser()`, `useRole()`, `useOrganizationContext()`, `useWorkspaceContext()` | `authAdapter` (CoraAuthAdapter), `orgId`, `wsId` |

#### Hook Property Reference

| Hook | Returns | Use For |
|------|---------|---------|
| `useUser()` | `loading`, `authAdapter` (CoraAuthAdapter), `profile`, `isAuthenticated` | Loading state, auth adapter |
| `useRole()` | `isOrgAdmin`, `isSysAdmin`, `isWsAdmin` | Permission checks (NO loading) |
| `useOrganizationContext()` | `currentOrganization`, `orgId` | Org context |
| `useWorkspaceContext()` | `currentWorkspace`, `wsId` | Workspace context |

### 8.3 API Calls

**Component uses module hooks/clients:**
```typescript
// Component uses its own hooks
export const OrgModuleAdmin = () => {
  const config = useOrgModuleConfig();  // From module
  const data = useOrgModuleData();      // From module
  
  return <AdminUI config={config} data={data} />;
};
```

---

## 9. Anti-Patterns

### ❌ Direct API Calls in Page

```typescript
// WRONG: Page makes API calls
export default function OrgModuleAdminPage() {
  const [data, setData] = useState(null);
  
  fetch('/api/admin/org/module/data').then(...); // ❌
  
  return <div>{data}</div>;
}
```

### ❌ Component Without Route Metadata

```typescript
// WRONG: Missing @routes docstring
export const OrgModuleAdmin = () => {
  // Component makes API calls but doesn't document them
  fetch('/api/admin/org/module/data'); // ❌ Not documented
  
  return <div>...</div>;
};
```

### ❌ Incomplete Route Documentation

```typescript
/**
 * @component OrgModuleAdmin
 * @routes
 * - GET /admin/org/module/config
 * // ❌ Missing other routes the component calls
 */
export const OrgModuleAdmin = () => {
  fetch('/api/admin/org/module/config');     // ✅ Documented
  fetch('/api/admin/org/module/data');       // ❌ NOT documented
  fetch('/api/admin/org/module/analytics');  // ❌ NOT documented
  
  return <div>...</div>;
};
```

---

## 10. Design Standards

### 10.1 Admin Cards (Platform Dashboard)

- **Icons**: Use MUI Icons (`@mui/icons-material`). Size `48px` for dashboard cards.
- **Colors**: Use theme colors (`primary.main`, `secondary.main`)
- **Layout**: Grid layout for dashboard (`Grid item xs={12} sm={6} md={4}`)
- **Responsiveness**: Cards must be responsive (mobile-friendly)

### 10.2 Admin Components

- **Tabs**: Use MUI Tabs component for multi-feature admin UIs
- **Feedback**: Use `Alert` for errors and `Snackbar` for success messages
- **Loading**: Use `CircularProgress` or skeletons during data fetch
- **Spacing**: Follow MUI spacing scale (`p: 2`, `p: 3`, `p: 4`)

---

## 11. Backend Requirements

### 11.1 Authorization

System admin endpoints MUST strictly enforce role checks. Only users with appropriate roles should access these endpoints.

**Python Lambda Pattern:**

```python
def lambda_handler(event, context):
    # Single auth check at router
    if path.startswith('/admin/sys/'):
        if not common.check_sys_admin(user_id):
            return common.forbidden_response('System admin required')
    
    elif path.startswith('/admin/org/'):
        org_id = common.get_org_context_from_event(event)
        if not common.check_org_admin(user_id, org_id):
            return common.forbidden_response('Org admin required')
    
    # Handlers contain business logic only - no auth checks
    return handle_route(...)
```

### 11.2 LIST Endpoints

- **System Admin View**: Should return ALL resources across all organizations (if applicable)
- **Organization Admin View**: Should return ONLY resources belonging to the user's organization
- **Workspace Admin View**: Should return ONLY resources in the workspace

---

## 12. Related Standards

- [01_std_front_AUTH](./01_std_front_AUTH.md) - Frontend authorization patterns (includes BRIGHT LINE context table)
- [01_std_front_UI-LIBRARY](./01_std_front_UI-LIBRARY.md) - Material-UI usage, styling
- [03_std_back_AUTH](./03_std_back_AUTH.md) - Backend authorization patterns

---

## 13. Related ADRs

- [ADR-004](../arch%20decisions/ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md) - NextAuth API Client Pattern
- [ADR-015](../arch%20decisions/ADR-015-ADMIN-PAGE-AUTH-PATTERN.md) - Admin Page Auth Pattern
- [ADR-016](../arch%20decisions/ADR-016-ORG-ADMIN-PAGE-AUTHORIZATION.md) - Org Admin Page Authorization
- [ADR-019](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md) - CORA Authorization Standardization (parent)
- [ADR-019a](../arch%20decisions/ADR-019a-AUTH-FRONTEND.md) - Frontend Authorization

---

## Changelog

| Version | Date | Changes |
|---------|------|--------|
| 2.1 | 2026-02-07 | Standardized auth adapter type to `CoraAuthAdapter` from `@api-client` for ALL admin tab components (org, sys, ws scopes). Added note about using `createCoraAuthenticatedClient(token)` for HTTP calls. |
| 2.0 | 2026-02-06 | Merged ADMIN-COMPONENTS and ADMIN-CARD-PATTERN into single comprehensive standard |
| 1.0 | 2026-02-05 | Initial ADMIN-COMPONENTS standard |
| 1.0 | 2025-12-24 | Initial ADMIN-CARD-PATTERN standard |

---

**Maintained by:** CORA Development Team  
**Questions?** See related ADRs for rationale and decision history