# ADR-008: Sidebar and Organization Selector Standard for Next.js + MUI

**Status:** Draft  
**Date:** December 22, 2025  
**Decision Makers:** Engineering Team  
**Scope:** CORA Development Toolkit Templates

---

## Context and Problem Statement

The ai-sec test project experienced redirect loops related to organization state management. Investigation revealed three different patterns across our CORA projects:

1. **policy (pm-app)** - Legacy monolith mid-migration to CORA
2. **career (sts-career)** - Brand new CORA project
3. **ai-sec** - Test project created from cora-dev-toolkit templates

We need to define a **standard, repeatable pattern** for:
- Left sidebar navigation
- Organization selector (bottom-left menu)
- Organization state management
- User authentication state integration

This standard must be based on **Next.js App Router**, **MUI**, and **NextAuth** best practices.

---

## Analysis of Existing Patterns

### Pattern 1: Policy App (Legacy Migration)

**Components:**
- `Sidebar.tsx` - Full-featured MUI Drawer with navigation, recent items, org switcher
- `OrganizationSwitcher.tsx` - Comprehensive switcher with user menu, settings, admin links
- `OrgStateSyncProvider.tsx` - **Bridges CORA context ↔ Zustand store**
- Uses **BOTH** `useOrganizationContext()` (CORA) AND `useOrganizationStore()` (Zustand)

**Characteristics:**
```tsx
// OrgStateSyncProvider.tsx (STOPGAP for migration)
useEffect(() => {
  if (isOrgContextLoading || isZustandLoading || isSyncing.current) return;
  
  const coraOrg = currentOrganization || null;
  const zustandOrgId = zustandOrg?.id || null;
  
  if (coraOrg && coraOrg.orgId !== zustandOrgId) {
    isSyncing.current = true;
    setSelectedOrganization(mappedOrg); // Sync CORA → Zustand
    isSyncing.current = false;
  }
}, [currentOrganization, zustandOrg]);
```

**Why This Pattern Exists:**
- Legacy code uses Zustand
- CORA modules use context
- Sync provider prevents state desync during gradual migration
- **NOT recommended for new projects**

**Pros:**
- Works for gradual migration
- Prevents state desync

**Cons:**
- Complex dual state system
- Sync provider is additional code to maintain
- Can cause subtle bugs if sync fails

---

### Pattern 2: Career App (Brand New CORA)

**Components:**
- `Header.tsx` - Simple top navigation (NO sidebar!)
- `OrganizationSwitcher.tsx` - Clean, minimal switcher
- `useOrganizationStore.ts` - **Simple Zustand store** (no backend persistence)
- Uses `useOrganizationContext()` from CORA

**Characteristics:**
```tsx
// OrganizationSwitcher.tsx
const { currentOrganization, organizations, switchOrganization, isLoading } =
  useOrganizationContext(); // CORA context

// useOrganizationStore.ts (Zustand - SIMPLE)
switchOrganization: async (orgId: string, accessToken?: string) => {
  const org = get().organizations.find((o) => o.id === orgId);
  if (!org) throw new Error("Organization not found");
  
  // Just update local state - NO backend persistence
  get().setCurrentOrganization(org);
},

fetchOrganizations: async (accessToken?: string) => {
  const client = createAuthenticatedClient(accessToken);
  const response = await client.get<{success: boolean; data: Organization[]}>("/orgs");
  
  set({ organizations: response.data || [] });
  
  // Set current to first org - NOT persisted across sessions
  if (response.data.length > 0) {
    get().setCurrentOrganization(response.data[0]);
  }
}
```

**Layout Pattern:**
- NO left sidebar
- Header-based navigation
- Organization switcher in header
- Comment: "Not persisted across sessions for security"

**Pros:**
- Simple, clean code
- No dual state management complexity
- Header-based navigation (modern pattern)

**Cons:**
- No sidebar (may not fit all use cases)
- Org selection not persisted (UX consideration)
- Still uses Zustand (why?)

**Questions:**
- How do `useOrganizationContext()` and `useOrganizationStore()` work together?
- Is Zustand being phased out?

---

### Pattern 3: ai-sec (Test Project - BROKEN)

**Components:**
- Uses `useOrganizationStore()` (Zustand) from app
- Uses `useOrganizationContext()` (CORA) from module-access
- **NO sync provider** to bridge them
- Complex organization store with backend persistence

**Characteristics:**
```tsx
// organizationStore.ts (COMPLEX)
loadOrganizations: async (token: string, profile: Profile) => {
  // 200+ lines of complex logic
  // Parses org_members, checks owner_id
  // Auto-selects from profile.current_org_id OR localStorage OR first org
  // Persists to backend AND localStorage
  // Lots of logging and edge cases
}
```

**Problem:**
- CORA context and Zustand store are OUT OF SYNC
- No sync provider to bridge them
- Components using Zustand don't see org from CORA
- Causes API calls with missing org context
- API returns 401 → `cora-client.ts` redirects to `/auth/signin`
- **REDIRECT LOOP**

---

## Industry Best Practices Research

### Next.js App Router + Auth State Management

**Recommended Pattern (Next.js docs):**
1. **Server Components** - Use `getServerSession()` for initial data
2. **Client Components** - Use `useSession()` from NextAuth
3. **Context Providers** - Wrap app in `<SessionProvider>`
4. **NO Zustand for auth state** - NextAuth handles it

**Why NO Zustand for Auth:**
- NextAuth session is already global state
- Duplicating in Zustand creates sync issues
- Server Components can't access Zustand
- SSR/hydration complexities

**Source:** https://next-auth.js.org/getting-started/client#usesession

### MUI Sidebar Patterns

**MUI Drawer Recommendations:**
1. **Persistent Drawer** (desktop) - Always visible, content shifts
2. **Temporary Drawer** (mobile) - Overlay, dismissible
3. **Permanent Drawer** - Always visible, content doesn't shift

**Common Pattern:**
```tsx
<Drawer
  variant="permanent"  // Desktop
  sx={{
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
    },
  }}
>
  {/* Sidebar Content */}
</Drawer>

<Drawer
  variant="temporary"  // Mobile
  open={mobileOpen}
  onClose={handleDrawerToggle}
  ModalProps={{ keepMounted: true }}
>
  {/* Same Sidebar Content */}
</Drawer>
```

**Source:** https://mui.com/material-ui/react-drawer/

### Organization Selector in Sidebar

**Common Pattern (SaaS apps):**
- Bottom-left corner of sidebar
- Shows current org + user
- Dropdown menu for:
  - Switch organization
  - User settings
  - Admin (if applicable)
  - Logout

**Examples:**
- Vercel Dashboard
- Linear
- Notion
- Slack

**Structure:**
```
┌─────────────────────┐
│ App Logo            │
├─────────────────────┤
│ Navigation Items    │
│ • Dashboard         │
│ • Projects          │
│ • Settings          │
│                     │
│ (scrollable)        │
│                     │
├─────────────────────┤
│ [Org Selector]      │  ← Bottom left
│ ┌─────────────────┐ │
│ │ Acme Corp  ▾    │ │
│ │ John Doe        │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

## Decision: Recommended Pattern for cora-dev-toolkit

### Core Principles

1. **Single Source of Truth** - Use CORA's `useOrganizationContext()` ONLY
2. **No Zustand for Org State** - Eliminate dual state management
3. **NextAuth for User State** - Use `useSession()` from NextAuth
4. **MUI Drawer for Sidebar** - Permanent (desktop) + Temporary (mobile)
5. **Bottom-left Org Selector** - Standard SaaS pattern

### Architecture

```
Root Layout
├── SessionProvider (NextAuth)
├── AuthProvider (CORA - wraps SessionProvider)
└── UserProviderWrapper (CORA - uses useSession)
    └── OrgProvider (CORA - provides useOrganizationContext)
        └── AppShell
            ├── Sidebar (if not auth page)
            │   ├── Navigation Items
            │   └── OrganizationSwitcher (bottom)
            └── Main Content
```

### State Management Flow

```
NextAuth Session (source of truth)
    ↓
useSession() hook
    ↓
UserProviderWrapper → useProfile() → profile
    ↓
OrgProvider → useOrganizationContext() → {
  currentOrganization,
  organizations,
  switchOrganization
}
    ↓
Components (read from context)
```

**NO Zustand stores for user or org state!**

### Implementation Pattern

#### 1. Sidebar Component (MUI Drawer)

```tsx
// apps/web/components/Sidebar.tsx
"use client";

import { Drawer, List, ListItem, Box, useMediaQuery, useTheme } from "@mui/material";
import { useState } from "react";
import { OrganizationSwitcher } from "./OrganizationSwitcher";

const DRAWER_WIDTH = 280;

export function Sidebar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo/Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">App Name</Typography>
      </Box>

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, overflowY: "auto" }}>
        <ListItem button>Dashboard</ListItem>
        <ListItem button>Projects</ListItem>
        {/* More items */}
      </List>

      {/* Organization Switcher at Bottom */}
      <OrganizationSwitcher />
    </Box>
  );

  return (
    <>
      {/* Desktop: Permanent Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile: Temporary Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
```

#### 2. Organization Switcher (Bottom Menu)

```tsx
// apps/web/components/OrganizationSwitcher.tsx
"use client";

import { useState } from "react";
import { Box, Menu, MenuItem, Avatar, Typography } from "@mui/material";
import { useOrganizationContext } from "module-access";
import { useProfile } from "module-access";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function OrganizationSwitcher() {
  const { currentOrganization, organizations, switchOrganization } = 
    useOrganizationContext();
  const { profile } = useProfile();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOrgSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    handleClose();
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
      <Box
        onClick={handleClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 1,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Avatar sx={{ width: 32, height: 32 }}>
          {currentOrganization?.name?.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {profile?.full_name || profile?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {currentOrganization?.name || "No organization"}
          </Typography>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 280, mt: 1 },
        }}
      >
        {/* Organization List */}
        {organizations.map((org) => (
          <MenuItem
            key={org.orgId}
            onClick={() => handleOrgSwitch(org.orgId)}
            selected={org.orgId === currentOrganization?.orgId}
          >
            {org.orgName}
          </MenuItem>
        ))}

        <Divider />

        {/* Settings */}
        <MenuItem onClick={() => { router.push("/settings"); handleClose(); }}>
          Settings
        </MenuItem>

        {/* Admin (conditional) */}
        {profile?.global_role === "super_admin" && (
          <MenuItem onClick={() => { router.push("/admin"); handleClose(); }}>
            Admin
          </MenuItem>
        )}

        <Divider />

        {/* Logout */}
        <MenuItem onClick={handleLogout}>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
```

#### 3. AppShell Integration

```tsx
// apps/web/components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { Box } from "@mui/material";
import { Sidebar } from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth pages don't need the shell
  const isAuthPage = pathname.startsWith("/auth/");
  
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Regular pages get full app shell with sidebar
  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
```

#### 4. Root Layout

```tsx
// apps/web/app/layout.tsx
import { AuthProvider, UserProviderWrapper } from "module-access";
import AppShell from "../components/AppShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UserProviderWrapper>
            <AppShell>{children}</AppShell>
          </UserProviderWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## What NOT to Do

### ❌ DON'T: Use Zustand for User or Org State

```tsx
// ❌ WRONG - Creates dual state management
export const useUserStore = create((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));

export const useOrganizationStore = create((set) => ({
  selectedOrganization: null,
  setSelectedOrganization: (org) => set({ selectedOrganization: org }),
}));
```

**Why:** NextAuth + CORA already provide this state. Duplicating in Zustand causes sync issues.

### ❌ DON'T: Create Sync Providers

```tsx
// ❌ WRONG - Band-aid for dual state management
function OrgStateSyncProvider() {
  const { currentOrganization } = useOrganizationContext();
  const { setSelectedOrganization } = useOrganizationStore();
  
  useEffect(() => {
    // Syncing between two state systems = complexity
    setSelectedOrganization(currentOrganization);
  }, [currentOrganization]);
  
  return null;
}
```

**Why:** This is a stopgap for legacy migration, NOT a pattern for new apps.

### ❌ DON'T: Persist Org Selection Client-Side Only

```tsx
// ❌ WRONG - Can cause state desync
localStorage.setItem("selected_org", orgId);
```

**Why:** Org selection should be stored in the user's profile on the backend to sync across devices/sessions.

---

## Migration Guide

### From ai-sec (Current Broken Pattern) → Recommended Pattern

**Steps:**

1. **Remove Zustand Stores**
   ```bash
   rm apps/web/store/organizationStore.ts
   rm apps/web/store/userStore.ts
   ```

2. **Update Components to Use CORA Context**
   ```tsx
   // Before (Zustand)
   const { profile } = useUserStore();
   const { selectedOrganization } = useOrganizationStore();
   
   // After (CORA Context)
   const { profile } = useProfile();
   const { currentOrganization } = useOrganizationContext();
   ```

3. **Add Sidebar Component**
   - Copy recommended `Sidebar.tsx` pattern

4. **Add OrganizationSwitcher Component**
   - Copy recommended `OrganizationSwitcher.tsx` pattern

5. **Update AppShell**
   - Integrate Sidebar
   - Remove any redirect logic (middleware handles it)

6. **Test**
   - Verify no redirect loops
   - Test org switching
   - Test mobile drawer

---

## Consequences

### Positive

- ✅ **Single source of truth** - No state sync issues
- ✅ **Simpler codebase** - Less code to maintain
- ✅ **No redirect loops** - State always consistent
- ✅ **SSR compatible** - Works with Next.js App Router
- ✅ **Industry standard** - Follows Next.js/MUI best practices
- ✅ **Better UX** - Org selection persists across sessions (via backend)

### Negative

- ⚠️ **Breaking change** - Existing code using Zustand must be updated
- ⚠️ **Migration effort** - Policy app will need gradual migration
- ⚠️ **Backend dependency** - Requires profile API to store current_org_id

### Neutral

- 📝 **Documentation needed** - Clear migration guide for existing projects
- 📝 **Examples needed** - Reference implementations in templates

---

## References

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MUI Drawer Component](https://mui.com/material-ui/react-drawer/)
- [React Context vs Zustand](https://kentcdodds.com/blog/application-state-management-with-react)
- ADR-007: CORA Auth Shell Standard
- ADR-004: NextAuth API Client Pattern

---

## Implementation Checklist

For cora-dev-toolkit templates:

- [ ] Create `apps/web/components/Sidebar.tsx` template
- [ ] Create `apps/web/components/OrganizationSwitcher.tsx` template
- [ ] Update `apps/web/components/AppShell.tsx` to integrate Sidebar
- [ ] Remove Zustand store templates (`organizationStore.ts`, `userStore.ts`)
- [ ] Update documentation with new pattern
- [ ] Create migration guide for existing projects
- [ ] Test with ai-sec project
- [ ] Verify no redirect loops
- [ ] Update CORA compliance checker to flag Zustand usage for auth/org state

---

**Status:** Awaiting approval  
**Next Steps:** Review with team, approve pattern, update templates
