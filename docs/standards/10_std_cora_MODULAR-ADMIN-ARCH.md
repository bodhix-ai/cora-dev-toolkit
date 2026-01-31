# CORA Modular Administration Architecture Standard

**Version:** 1.1  
**Date:** December 26, 2025  
**Status:** ✅ Standard  
**Related Documents:** 
- [standard_ADMIN-CARD-PATTERN.md](./standard_ADMIN-CARD-PATTERN.md)
- [standard_NAVIGATION-AND-ROLES.md](./standard_NAVIGATION-AND-ROLES.md)
- [standard_CORA-FRONTEND.md](./standard_CORA-FRONTEND.md)

---

## 1. Overview

The Modular Administration Architecture enables CORA modules to automatically expose administration interfaces without requiring changes to the core application. This standard defines how Platform Admin and Organization Admin features are separated, discovered, and rendered.

### 1.1 Core Principles

1. **Module Ownership**: Modules own their admin interfaces
2. **Automatic Discovery**: Admin features are discovered automatically via exports
3. **Clear Separation**: Platform Admin and Org Admin are distinct contexts
4. **Role-Based Access**: Strict enforcement of sys_owner, sys_admin, org_owner, org_admin roles
5. **Consistent UX**: All admin interfaces follow the same patterns
6. **One Card Per Module**: Each module exports exactly ONE admin card per context
7. **Tabbed Admin Pages**: Use MUI Tabs to consolidate features within each admin page

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Menu (Sidebar)                     │
├─────────────────────────────────────────────────────────────┤
│  👤 User Settings                                           │
│  📊 Profile                                                  │
│  ─────────────────────────────────────────────────────────  │
│  🏢 Organization Admin  ← Visible to org_admin, org_owner   │
│  🌐 System Admin        ← Visible to sys_admin, sys_owner   │
│  ─────────────────────────────────────────────────────────  │
│  🚪 Sign Out                                                │
└─────────────────────────────────────────────────────────────┘

Platform Admin (/admin/platform)          Org Admin (/admin/org)
├── Access Control (/admin/access)        ├── Organization Settings (/org/settings)
│   └─> Tabs: Orgs, Users, IDP           │   └─> Tabs: Overview, Members, etc.
├── AI Enablement (/admin/ai)             └── [Other org-level cards]
│   └─> Tabs: Providers, Models, Config
├── Platform Management (/admin/mgmt)
│   └─> Tabs: Schedule, Performance, etc.
└── [Other platform cards]
```

---

## 2. Admin Context Separation

### 2.1 Platform Admin Context

**Purpose:** System-wide configuration affecting all organizations

**Access Roles:**
- `sys_owner` - Full platform control
- `sys_admin` - Platform configuration access

**Typical Features:**
- AI provider management (platform-wide)
- AI configuration (default settings)
- Organization CRUD and management
- User management (platform-wide view)
- IDP configuration
- Email domain management (for all orgs)
- Lambda function management
- System monitoring

**URL Pattern:** `/admin/[feature]`

**Example Routes:**
- `/admin/platform` - Platform admin dashboard (card grid)
- `/admin/access` - Access control (Orgs, Users, IDP tabs)
- `/admin/access/orgs/[id]` - Organization details page (sub-page)
- `/admin/ai` - AI enablement (Providers, Models, Config tabs)
- `/admin/mgmt` - Platform management (Schedule, Performance tabs)

### 2.2 Organization Admin Context

**Purpose:** Organization-specific configuration

**Access Roles:**
- `org_owner` - Full organization control
- `org_admin` - Organization configuration access
- `sys_owner` - Can access any organization (elevated privilege)
- `sys_admin` - Can access any organization (elevated privilege)

**Typical Features:**
- Organization settings (name, slug, description)
- Organization member management
- Organization invitations
- Organization branding (future)

**URL Pattern:** `/org/[feature]`

**Example Routes:**
- `/admin/org` - Organization admin dashboard (card grid)
- `/org/settings` - Organization settings (Overview, Members, Invites tabs)

**Note:** Organization-level domain management and AI config are accessed via the platform admin's organization details page (platform admin only).

### 2.3 Access Control Matrix

| Feature | Platform Owner | Platform Admin | Org Owner | Org Admin | Org User |
|---------|----------------|----------------|-----------|-----------|----------|
| Platform Admin Dashboard | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| Access Control Page | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - Organizations Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - Users Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - IDP Config Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| Org Details Page | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - Overview Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - Domains Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| - Members Tab | ✅ Yes* | ✅ Yes* | ✅ Full | ✅ Full | ❌ No |
| - Invites Tab | ✅ Yes* | ✅ Yes* | ✅ Full | ✅ Full | ❌ No |
| - AI Config Tab | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| AI Enablement Page | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| Platform Management | ✅ Full | ✅ Full | ❌ No | ❌ No | ❌ No |
| Org Admin Dashboard | ✅ Yes* | ✅ Yes* | ✅ Full | ✅ Full | ❌ No |
| Org Settings Page | ✅ Yes* | ✅ Yes* | ✅ Full | ✅ Full | ❌ No |

*Platform admins can view/edit any organization's settings

**Key Access Control Rules:**
1. **Org Details - Domains Tab**: Platform admins ONLY (NOT org owners/admins)
2. **Org Details - AI Config Tab**: Platform admins ONLY (NOT org owners/admins)
3. **Org Details - Members/Invites Tabs**: Platform admins OR org owners/admins
4. **Org Settings Page (via /admin/org)**: Org owners/admins for their org, platform admins for any org

---

## 3. AdminCardConfig Interface

### 3.1 TypeScript Definition

```typescript
/**
 * Configuration for an admin card displayed on admin dashboards
 */
export interface AdminCardConfig {
  /** Unique identifier for the card */
  id: string;
  
  /** Display title */
  title: string;
  
  /** Brief description of functionality */
  description: string;
  
  /** MUI icon component */
  icon: React.ReactElement;
  
  /** Route to navigate to when clicked */
  href: string;
  
  /** MUI theme color */
  color: string;
  
  /** Display order (10-19: core, 20-29: intelligence, 30+: features) */
  order: number;
  
  /** Admin context this card belongs to */
  context: "platform" | "organization";
  
  /** Required roles to see this card */
  requiredRoles: ("sys_owner" | "sys_admin" | "org_owner" | "org_admin")[];
  
  /** Optional badge text (e.g., "NEW", "BETA") */
  badge?: string;
  
  /** Optional badge color */
  badgeColor?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
}
```

### 3.2 Module Export Pattern

**Rule:** Each module exports exactly ONE admin card per context.

**File:** `packages/[module-name]/frontend/adminCard.tsx`

```typescript
import React from "react";
import SecurityIcon from "@mui/icons-material/Security";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SettingsIcon from "@mui/icons-material/Settings";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

/**
 * Platform Admin Card - Access Control (module-access)
 * Single card with tabs: Orgs, Users, IDP Config
 */
export const accessControlAdminCard: AdminCardConfig = {
  id: "access-control",
  title: "Access Control",
  description: "Manage organizations, users, identity providers, and access settings",
  icon: <SecurityIcon sx={{ fontSize: 48 }} />,
  href: "/admin/access",
  color: "primary.main",
  order: 10,
  context: "platform",
  requiredRoles: ["sys_owner", "sys_admin"],
};

/**
 * Platform Admin Card - AI Enablement (module-ai)
 * Single card with tabs: Providers, Models, Config
 */
export const aiEnablementAdminCard: AdminCardConfig = {
  id: "ai-enablement",
  title: "AI Enablement",
  description: "Configure AI providers, discover and validate models, and manage platform AI settings",
  icon: <SmartToyIcon sx={{ fontSize: 48 }} />,
  href: "/admin/ai",
  color: "secondary.main",
  order: 20,
  context: "platform",
  requiredRoles: ["sys_owner", "sys_admin"],
};

/**
 * Org Admin Card - Organization Settings (module-access)
 * Single card with tabs: Overview, Members, Invites
 */
export const organizationSettingsCard: AdminCardConfig = {
  id: "org-settings",
  title: "Organization Settings",
  description: "Configure your organization details and manage members",
  icon: <SettingsIcon sx={{ fontSize: 48 }} />,
  href: "/org/settings",
  color: "primary.main",
  order: 10,
  context: "organization",
  requiredRoles: ["sys_owner", "sys_admin", "org_owner", "org_admin"],
};
```

### 3.3 Module Index Export

**File:** `packages/[module-name]/frontend/index.ts`

```typescript
// Admin Card (singular - one per context)
export { accessControlAdminCard } from "./adminCard";

// Admin Components
export { AccessControlAdmin } from "./components/admin/AccessControlAdmin";
export { OrgDetails } from "./components/admin/OrgDetails";
```

---

## 4. Admin Dashboard Implementation

### 4.1 Platform Admin Dashboard

**File:** `apps/web/app/admin/platform/page.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Box, Typography, Grid, Card, CardActionArea, CardContent, Badge, Chip } from "@mui/material";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

// Import admin cards from all modules (one per module)
import { accessControlAdminCard } from "@{{PROJECT_NAME}}/module-access";
import { aiEnablementAdminCard } from "@{{PROJECT_NAME}}/module-ai";
import { platformMgmtAdminCard } from "@{{PROJECT_NAME}}/module-mgmt";

// Add more module imports as needed

export default function PlatformAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Collect all platform admin cards (one per module)
  const allCards: AdminCardConfig[] = useMemo(() => [
    accessControlAdminCard,
    aiEnablementAdminCard,
    platformMgmtAdminCard,
    // Add more cards from other modules
  ], []);

  // Filter cards by context and user role
  const platformCards = useMemo(() => {
    if (!session?.user) return [];

    const userRole = session.user.sys_role;
    
    return allCards
      .filter(card => card.context === "platform")
      .filter(card => card.requiredRoles.includes(userRole as any))
      .sort((a, b) => a.order - b.order);
  }, [allCards, session]);

  // Permission check
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      const sysRole = session?.user?.sys_role;
      if (!["sys_owner", "sys_admin"].includes(sysRole || "")) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return <Box>Loading...</Box>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Platform Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage system-wide configuration and settings
        </Typography>
      </Box>

      {/* Admin Cards Grid */}
      <Grid container spacing={3}>
        {platformCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.id}>
            <Card
              sx={{
                height: "100%",
                borderLeft: 4,
                borderColor: card.color,
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
            >
              <CardActionArea
                onClick={() => router.push(card.href)}
                sx={{ height: "100%", p: 3 }}
              >
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ color: card.color }}>
                      {card.icon}
                    </Box>
                    {card.badge && (
                      <Chip
                        label={card.badge}
                        color={card.badgeColor || "primary"}
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

### 4.2 Organization Admin Dashboard

**File:** `apps/web/app/admin/org/page.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useOrganizationContext } from "@{{PROJECT_NAME}}/org-module";
import { Box, Typography, Grid, Card, CardActionArea, CardContent, Badge, Chip, Alert } from "@mui/material";
import type { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";

// Import org admin cards from all modules (one per module)
import { organizationSettingsCard } from "@{{PROJECT_NAME}}/module-access";

// Add more module imports as needed

export default function OrgAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { currentOrg, userRole } = useOrganizationContext();

  // Collect all org admin cards (one per module)
  const allCards: AdminCardConfig[] = useMemo(() => [
    organizationSettingsCard,
    // Add more cards from other modules
  ], []);

  // Filter cards by context and user role
  const orgCards = useMemo(() => {
    if (!session?.user || !userRole) return [];

    const isSysAdmin = ["sys_owner", "sys_admin"].includes(
      session.user.sys_role || ""
    );
    const isOrgAdmin = ["org_owner", "org_admin"].includes(userRole);

    if (!isPlatformAdmin && !isOrgAdmin) return [];

    return allCards
      .filter(card => card.context === "organization")
      .filter(card => {
        // Platform admins see all org cards
        if (isPlatformAdmin) return true;
        // Org admins see cards they have permission for
        return card.requiredRoles.some(role => 
          role === userRole ||
          (isSysAdmin && ["sys_owner", "sys_admin"].includes(role))
        );
      })
      .sort((a, b) => a.order - b.order);
  }, [allCards, session, userRole]);

  // Permission check
  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (status === "authenticated") {
      const sysRole = session?.user?.sys_role;
      const isSysAdmin = ["sys_owner", "sys_admin"].includes(sysRole || "");
      const isOrgAdmin = ["org_owner", "org_admin"].includes(userRole || "");
      
      if (!isSysAdmin && !isOrgAdmin) {
        router.push("/");
      }
    }
  }, [status, session, userRole, router]);

  if (status === "loading" || !currentOrg) {
    return <Box>Loading...</Box>;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Organization Administration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure settings for {currentOrg.name}
        </Typography>
      </Box>

      {/* Admin Cards Grid */}
      {orgCards.length > 0 ? (
        <Grid container spacing={3}>
          {orgCards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.id}>
              <Card
                sx={{
                  height: "100%",
                  borderLeft: 4,
                  borderColor: card.color,
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea
                  onClick={() => router.push(card.href)}
                  sx={{ height: "100%", p: 3 }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ color: card.color }}>
                        {card.icon}
                      </Box>
                      {card.badge && (
                        <Chip
                          label={card.badge}
                          color={card.badgeColor || "primary"}
                          size="small"
                        />
                      )}
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info">
          No organization admin features are currently available.
        </Alert>
      )}
    </Box>
  );
}
```

---

## 5. Tabbed Admin Page Pattern

### 5.1 Platform Admin Tabbed Page Example

**File:** `apps/web/app/admin/access/page.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { OrgsTab } from "@{{PROJECT_NAME}}/module-access";
import { UsersTab } from "@{{PROJECT_NAME}}/module-access";
import { IdpTab } from "@{{PROJECT_NAME}}/module-access";

export default function AccessControlPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Access Control
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Manage organizations, users, and identity providers
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Organizations" />
        <Tab label="Users" />
        <Tab label="IDP Config" />
      </Tabs>

      {activeTab === 0 && <OrgsTab />}
      {activeTab === 1 && <UsersTab />}
      {activeTab === 2 && <IdpTab />}
    </Box>
  );
}
```

### 5.2 Organization Details Sub-Page Pattern

**File:** `apps/web/app/admin/access/orgs/[id]/page.tsx`

```typescript
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Box, Typography, Tabs, Tab, Breadcrumbs, Link } from "@mui/material";
import {
  OrgOverviewTab,
  OrgDomainsTab,
  OrgMembersTab,
  OrgInvitesTab,
  OrgAIConfigTab,
} from "@{{PROJECT_NAME}}/module-access";

export default function OrgDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState(0);

  const orgId = params.id as string;

  // Check if user is sys admin
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(
    session?.user?.sys_role || ""
  );

  return (
    <Box sx={{ p: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          onClick={() => router.push("/admin/access")}
          underline="hover"
          color="inherit"
        >
          Access Control
        </Link>
        <Link
          component="button"
          onClick={() => router.push("/admin/access")}
          underline="hover"
          color="inherit"
        >
          Organizations
        </Link>
        <Typography color="text.primary">Organization Details</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom>
        Organization Details
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Domains" />
        <Tab label="Members" />
        <Tab label="Invites" />
        {isSysAdmin && <Tab label="AI Config" />}
      </Tabs>

      {activeTab === 0 && <OrgOverviewTab orgId={orgId} />}
      {activeTab === 1 && <OrgDomainsTab orgId={orgId} />}
      {activeTab === 2 && <OrgMembersTab orgId={orgId} />}
      {activeTab === 3 && <OrgInvitesTab orgId={orgId} />}
      {activeTab === 4 && isSysAdmin && <OrgAIConfigTab orgId={orgId} />}
    </Box>
  );
}
```

**Key Points:**
- Breadcrumbs for navigation back to Organizations tab
- Domains tab visible to platform admins only
- AI Config tab visible to platform admins only
- Members and Invites tabs visible to platform admins OR org owners/admins

---

## 6. Navigation Integration

### 6.1 User Menu Items

**File:** `packages/org-module/frontend/components/layout/SidebarUserMenu.tsx`

```typescript
import { useSession } from "next-auth/react";
import { useOrganizationContext } from "../../contexts/OrgContext";

export function SidebarUserMenu() {
  const { data: session } = useSession();
  const { userRole } = useOrganizationContext();
  
  const sysRole = session?.user?.sys_role;
  const isSysAdmin = ["sys_owner", "sys_admin"].includes(sysRole || "");
  const isOrgAdmin = ["org_owner", "org_admin"].includes(userRole || "");

  return (
    <Menu>
      {/* User Section */}
      <MenuItem onClick={() => router.push("/settings")}>
        <ListItemIcon><SettingsIcon /></ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => router.push("/profile")}>
        <ListItemIcon><PersonIcon /></ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>

      <Divider />

      {/* Admin Section */}
      {isOrgAdmin && (
        <MenuItem onClick={() => router.push("/admin/org")}>
          <ListItemIcon><BusinessIcon /></ListItemIcon>
          <ListItemText>Organization Admin</ListItemText>
        </MenuItem>
      )}
      
      {isSysAdmin && (
        <MenuItem onClick={() => router.push("/admin/platform")}>
          <ListItemIcon><AdminPanelSettingsIcon /></ListItemIcon>
          <ListItemText>Platform Admin</ListItemText>
        </MenuItem>
      )}

      {(isSysAdmin || isOrgAdmin) && <Divider />}

      {/* Sign Out */}
      <MenuItem onClick={() => signOut()}>
        <ListItemIcon><LogoutIcon /></ListItemIcon>
        <ListItemText>Sign Out</ListItemText>
      </MenuItem>
    </Menu>
  );
}
```

---

## 7. Real-World Examples

### 7.1 Example: AI Enablement (Platform Admin)

**Module:** `module-ai`

**Admin Card:**
```typescript
export const aiEnablementAdminCard: AdminCardConfig = {
  id: "ai-enablement",
  title: "AI Enablement",
  description: "Configure AI providers, discover and validate models, and manage platform AI settings",
  icon: <SmartToyIcon sx={{ fontSize: 48 }} />,
  href: "/admin/ai",
  color: "secondary.main",
  order: 20,
  context: "platform",
  requiredRoles: ["sys_owner", "sys_admin"],
};
```

**Tabbed Admin Page:** `apps/web/app/admin/ai/page.tsx`

```typescript
"use client";

import { useState } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import {
  ProvidersTab,
  ModelsTab,
  PlatformConfigTab,
} from "@{{PROJECT_NAME}}/module-ai";

export default function AIEnablementPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Enablement
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Configure AI providers, discover models, and manage platform AI settings
      </Typography>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab label="Providers" />
        <Tab label="Models" />
        <Tab label="Config" />
      </Tabs>

      {activeTab === 0 && <ProvidersTab />}
      {activeTab === 1 && <ModelsTab />}
      {activeTab === 2 && <PlatformConfigTab />}
    </Box>
  );
}
```

**Routes Consolidated:**
- `/admin/ai/providers` (GET, POST, PUT, DELETE) → Providers tab
- `/admin/ai/providers/test` (POST) → Providers tab (test connection button)
- `/admin/ai/providers/models` (GET, OPTIONS) → Models tab
- `/admin/ai/config` (GET, PUT) → Config tab
- `/admin/ai/models` (GET) → Models tab

### 7.2 Example: Email Domain Management (Platform Admin via Org Details)

**Access:** Platform admins only, via organization details page

**Route:** `/admin/access/orgs/[id]` → Domains tab

**Component:** `module-access/frontend/components/admin/OrgDomainsTab.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Box, Card, CardHeader, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, IconButton, Chip, Dialog, TextField, Select, MenuItem,
  FormControl, InputLabel, FormGroup, FormControlLabel, Switch
} from "@mui/material";
import { Add, Edit, Delete, Language, CheckCircle, Warning } from "@mui/icons-material";

interface EmailDomain {
  id: string;
  domain: string;
  verified: boolean;
  auto_provision: boolean;
  default_role: "org_user" | "org_admin" | "org_owner";
  created_at: string;
}

export function OrgDomainsTab({ orgId }: { orgId: string }) {
  const [domains, setDomains] = useState<EmailDomain[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    loadDomains();
  }, [orgId]);

  const loadDomains = async () => {
    const response = await fetch(`/api/orgs/${orgId}/email-domains`);
    const data = await response.json();
    setDomains(data);
  };

  return (
    <Box>
      <Card>
        <CardHeader
          title="Email Domains"
          subheader="Manage verified domains and auto-provisioning settings"
          action={
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setIsAddDialogOpen(true)}
            >
              Add Domain
            </Button>
          }
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Domain</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Auto-Provision</TableCell>
                  <TableCell>Default Role</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Language />
                        {domain.domain}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={domain.verified ? <CheckCircle /> : <Warning />}
                        label={domain.verified ? "Verified" : "Pending"}
                        color={domain.verified ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {domain.auto_provision ? "Enabled" : "Disabled"}
                    </TableCell>
                    <TableCell>{domain.default_role}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                      <IconButton size="small">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        {/* Dialog content */}
      </Dialog>
    </Box>
  );
}
```

**Routes Consolidated:**
- `/orgs/{id}/email-domains` (GET, POST, PUT, DELETE) → Domains tab in Org Details page

---

## 8. Backend Authorization Patterns

### 8.1 Platform Admin Endpoint

```python
def handle_sys_admin_request(event, user_id):
    """System admin endpoints - strict role checking"""
    profile = common.find_one('user_profiles', {'user_id': user_id})
    
    if not profile:
        return common.forbidden_response("User profile not found")
    
    sys_role = profile.get('sys_role')
    if sys_role not in ['sys_owner', 'sys_admin']:
        return common.forbidden_response(
            "System admin access required. Current role: {}".format(sys_role)
        )
    
    # Proceed with platform admin operation
    # ...
```

### 8.2 Organization Admin Endpoint (Mixed Access)

```python
def handle_org_details_request(event, user_id, org_id, tab):
    """Org details endpoints - tab-specific access control"""
    profile = common.find_one('user_profiles', {'user_id': user_id})
    
    if not profile:
        return common.forbidden_response("User profile not found")
    
    sys_role = profile.get('sys_role')
    is_sys_admin = sys_role in ['sys_owner', 'sys_admin']
    
    # System admins can access all tabs
    if is_sys_admin:
        return True
    
    # For non-platform admins, check org membership
    membership = common.find_one('org_members', {
        'user_id': user_id,
        'org_id': org_id
    })
    
    if not membership:
        return common.forbidden_response("Not authorized to access this organization")
    
    # Tab-specific access control for org admins/owners
    org_role = membership.get('role')
    
    if tab in ['domains', 'ai-config']:
        # Domains and AI Config: platform admins ONLY
        return common.forbidden_response("Platform admin access required for this tab")
    
    if tab in ['members', 'invites', 'overview']:
        # Members, Invites, Overview: org admins/owners allowed
        if org_role not in ['org_owner', 'org_admin']:
            return common.forbidden_response(
                "Organization admin access required. Current role: {}".format(org_role)
            )
        return True
    
    return common.forbidden_response("Unknown tab: {}".format(tab))
```

---

## 9. Module Integration Checklist

When adding a new module with admin features:

### Platform Admin Features
- [ ] Create `adminCard.tsx` with ONE platform admin card
- [ ] Set `context: "platform"`
- [ ] Set `requiredRoles: ["sys_owner", "sys_admin"]`
- [ ] Use descriptive functional name (e.g., "Access Control", "AI Enablement")
- [ ] Create tabbed admin component in `frontend/components/admin/`
- [ ] Create tab components for each feature area
- [ ] Export card and components from module `index.ts`
- [ ] Create route page in `apps/web/app/admin/[feature]/page.tsx`
- [ ] Use single-word or acronym route (e.g., `/admin/access`, `/admin/ai`)
- [ ] Import card in `apps/web/app/admin/platform/page.tsx`
- [ ] Add backend authorization checks for system roles
- [ ] Test with sys_admin and sys_owner roles

### Organization Admin Features
- [ ] Create `adminCard.tsx` with ONE org admin card
- [ ] Set `context: "organization"`
- [ ] Set appropriate `requiredRoles` (typically all 4 admin roles)
- [ ] Create tabbed admin component in `frontend/components/admin/`
- [ ] Create tab components for each feature area
- [ ] Export card and components from module `index.ts`
- [ ] Create route page in `apps/web/app/org/[feature]/page.tsx`
- [ ] Import card in `apps/web/app/admin/org/page.tsx`
- [ ] Add backend authorization checks (platform OR org admin)
- [ ] Test with both platform admin and org admin roles

---

## 10. Module Cards Summary

| Module | Card Title | Route | Tabs | Order |
|--------|-----------|-------|------|-------|
| module-access | Access Control | `/admin/access` | Orgs, Users, IDP Config | 10 |
| module-ai | AI Enablement | `/admin/ai` | Providers, Models, Config | 20 |
| module-mgmt | Platform Management | `/admin/mgmt` | Schedule, Performance, Storage, Cost | 30 |

**Organization Details Sub-Page (accessed from Access Control → Orgs tab):**
- Route: `/admin/access/orgs/[id]`
- Tabs: Overview, Domains*, Members, Invites, AI Config*
- *Platform admin only

---

## 11. Card Ordering Convention

Use consistent ordering to create logical groupings:

| Range | Category | Examples |
|-------|----------|----------|
| **10-19** | Core Access & Organization | Access Control (Orgs, Users, IDP) |
| **20-29** | Intelligence & AI | AI Enablement (Providers, Models, Config) |
| **30-39** | Infrastructure & System | Platform Management (Lambdas, Performance) |
| **40-49** | Content & Knowledge | Knowledge Base, Documents, Embeddings |
| **50-59** | Communication | Notifications, Email Templates, Webhooks |
| **60-69** | Security & Compliance | Audit Logs, Policies, Permissions |
| **70+** | Application-Specific | Domain-specific features |

---

## 12. Design Standards

### 12.1 Card Design

- **Icon Size:** `fontSize: 48`
- **Border:** Left border, 4px, colored
- **Hover Effect:** Translate up 4px, increase shadow
- **Color:** Use theme colors from `card.color` property
- **Badge:** Top-right chip for "NEW", "BETA", etc.

### 12.2 Dashboard Layout

- **Grid:** Responsive (xs=12, sm=6, md=4)
- **Spacing:** `spacing={3}` (24px gaps)
- **Padding:** `p: 4` (32px page padding)
- **Header Margin:** `mb: 4` (32px below header)

### 12.3 Typography

- **Dashboard Title:** `variant="h4"`
- **Card Title:** `variant="h6"`
- **Description:** `variant="body2"` with `color="text.secondary"`

### 12.4 Tabbed Pages

- **Tab Bar Margin:** `sx={{ mb: 3 }}`
- **Tab Labels:** Short, descriptive (e.g., "Providers", "Models", "Config")
- **Active Tab:** MUI default styling
- **Tab Content:** Render based on `activeTab` state

---

## 13. Testing Requirements

### 13.1 Manual Testing

For each admin feature:
- [ ] Platform owner can access
- [ ] Platform admin can access
- [ ] Org owner can access (if org feature with permission)
- [ ] Org admin can access (if org feature with permission)
- [ ] Org user CANNOT access
- [ ] Unauthenticated user redirected to signin
- [ ] Card appears in correct dashboard
- [ ] Card appears in correct order
- [ ] Navigation works correctly
- [ ] Tabs render and switch correctly
- [ ] Backend authorization enforced per tab
- [ ] Organization details tabs respect access control

### 13.2 Automated Testing

```typescript
describe("Admin Card Discovery", () => {
  it("should filter platform cards for platform admin", () => {
    const cards = [platformCard, orgCard];
    const filtered = filterCardsByRole(cards, "sys_admin", "platform");
    expect(filtered).toContain(platformCard);
    expect(filtered).not.toContain(orgCard);
  });

  it("should filter org cards for org admin", () => {
    const cards = [platformCard, orgCard];
    const filtered = filterCardsByRole(cards, "org_admin", "organization");
    expect(filtered).toContain(orgCard);
    expect(filtered).not.toContain(platformCard);
  });

  it("should show AI Config tab only to sys admins", () => {
    const tabs = getOrgDetailsTabs("sys_admin");
    expect(tabs).toContain("AI Config");

    const orgAdminTabs = getOrgDetailsTabs("org_admin");
    expect(orgAdminTabs).not.toContain("AI Config");
  });
});
```

---

## 14. Migration Guide

### From Monolithic Admin to Modular

**Step 1:** Identify admin features and consolidate
- List all current admin pages
- Group by module (access, ai, mgmt, etc.)
- Classify as platform or organization admin
- Note required roles for each

**Step 2:** Create consolidated admin cards
- Create ONE `adminCard.tsx` per module per context
- Use descriptive functional names
- Define routes using single word or acronym
- Export from module index

**Step 3:** Convert to tabbed pages
- Create main admin page with MUI Tabs
- Create tab components for each feature area
- Implement tab switching logic
- Create sub-pages where needed (e.g., org details)

**Step 4:** Create dashboard pages
- Implement `/admin/platform/page.tsx`
- Implement `/admin/org/page.tsx`
- Import and display cards (one per module)

**Step 5:** Update navigation
- Add admin menu items to user menu
- Add role-based visibility logic
- Remove old admin navigation

**Step 6:** Test thoroughly
- Test all role combinations
- Verify access control per tab
- Check navigation flows
- Test breadcrumbs and sub-pages

---

## 15. Summary

The Modular Administration Architecture provides:

✅ **Clear Separation** - Platform vs Organization admin contexts  
✅ **Module Ownership** - Modules own their admin features  
✅ **Automatic Discovery** - Cards discovered via exports  
✅ **Role-Based Access** - Strict enforcement of permissions  
✅ **Consistent UX** - Unified patterns across all admin features  
✅ **Scalability** - Easy to add new admin features  
✅ **One Card Per Module** - Simplified admin interface  
✅ **Tabbed Admin Pages** - Consolidated features within each admin page  
✅ **Flexible Sub-Pages** - Organization details with tab-specific access control  

By following this standard, CORA projects maintain a clean, modular, and extensible administration architecture that scales with project complexity.

---

**Standard Version:** 1.1  
**Last Updated:** December 26, 2025  
**Changes in 1.1:**
- Added "One Card Per Module" principle
- Added "Tabbed Admin Pages" principle
- Updated route examples to single-word format (`/admin/ai` instead of `/admin/rag-providers`)
- Added organization details sub-page pattern
- Updated access control matrix for org AI config (platform admin only)
- Added tabbed admin page examples
- Consolidated module cards summary
