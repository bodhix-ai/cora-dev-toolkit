# CORA Navigation and Role Standard

**Version:** 1.0  
**Date:** December 24, 2025  
**Status:** ✅ Standard - Permanent Reference

---

## Purpose

This document defines the permanent standards for navigation patterns and role naming conventions in all CORA projects. This is a reference document that should NOT be archived.

---

## 1. Role Standardization

### 1.1 Platform-Level Roles (user_profiles.global_role)

| Role | Usage | Set During |
|------|-------|------------|
| `platform_owner` | First user (bootstrap) - full platform control | Scenario 4: Bootstrap |
| `platform_admin` | Platform administrators | Manual assignment |
| `platform_user` | Standard users | Scenarios 1, 2, 3, 5 |

### 1.2 Organization-Level Roles (org_members.role)

| Role | Usage | Set During |
|------|-------|------------|
| `org_owner` | Organization owner - full org control | Bootstrap, Invitations |
| `org_admin` | Organization administrator | Invitations |
| `org_user` | Standard org member | Domain match, Invitations |

---

## 2. Navigation Architecture

### 2.1 Left Navigation (Main Menu)

**Purpose:** Primary navigation for app-specific features

**Pattern:** Modular composition from CORA modules

**Core Module Exception:** Core modules (module-access, module-ai, module-mgmt) do NOT have main menu items. They provide admin functionality accessed via Platform Admin dashboard.

**Example Structure:**
```typescript
const appNavigation: NavigationConfig = [
  orgNavigation,      // Dashboard (order: 10) - from org-module
  resumeNavigation,   // Resumes (order: 20) - from resume-module
  certificationNavigation,  // Certifications (order: 30) - from cert-module
].sort((a, b) => (a.order || 0) - (b.order || 0));
```

**Standard Icons:**
- Dashboard: `DashboardIcon`
- Projects: `FolderIcon` or `WorkIcon`
- Chats: `ChatIcon`
- Knowledge Base: `LibraryBooksIcon`
- Reports: `AssessmentIcon`

**IMPORTANT:** Settings should NEVER be in main navigation. It belongs only in the bottom user menu.

---

### 2.2 User Menu (Bottom Menu)

**Purpose:** User account, organization switching, settings, and admin access

**Component:** OrganizationSwitcher (or UserMenu)

**Structure:**
```
┌─────────────────────────────────────┐
│ [Avatar] John Doe                   │
│          john@acme.com              │
├─────────────────────────────────────┤ ← Divider
│ 🏢 Acme Corp           ✓            │  Organization Section
│ 🏢 Beta Inc                         │
├─────────────────────────────────────┤ ← Divider
│ 🛡️ Platform Admin                   │  Admin Section (conditional)
│ 🏛️ Org Admin                        │  Admin Section (conditional)
├─────────────────────────────────────┤ ← Divider
│ 👤 Profile                          │  User Section
│ ⚙️ Settings                         │
│ ❓ Help                             │
│ 📖 Documentation                    │
├─────────────────────────────────────┤ ← Divider
│ 🚪 Sign Out                         │  Action Section
└─────────────────────────────────────┘
```

### 2.3 User Menu Items Standard

| Section | Item | Icon | Route | Visibility |
|---------|------|------|-------|------------|
| **User Info** | Avatar, Name, Email | - | - | Always |
| **Organization** | Org list with switcher | `BusinessIcon` | - | Always |
| **Admin** | Platform Admin | `AdminPanelSettingsIcon` | `/admin/platform` | `platform_owner` OR `platform_admin` |
| **Admin** | Org Admin | `BusinessIcon` | `/admin/org` | `org_owner` OR `org_admin` (in current org) |
| **User** | Profile | `PersonIcon` | `/profile` | Always |
| **User** | Settings | `SettingsIcon` | `/settings` | Always |
| **User** | Help | `HelpOutlineIcon` | `/help` | Always (configurable) |
| **User** | Documentation | `MenuBookIcon` | `/docs` | Always (configurable) |
| **Action** | Sign Out | `LogoutIcon` | - | Always |

---

## 3. Platform Admin Card Pattern

### 3.1 Overview

Platform admin pages use a **modular card pattern** where each CORA module can provide an admin card for platform-level configuration.

**Key Principles:**
- Each module owns its admin card
- Cards are imported and displayed on `/admin/platform` page
- Cards are ordered by the `order` property
- Platform-level configuration only (not user features)

### 3.2 Admin Card Structure

Each module can export an `adminCard.tsx` file with:

```typescript
import { AdminCardConfig } from "@{{PROJECT_NAME}}/shared-types";
import IconComponent from "@mui/icons-material/IconName";

export const moduleNameAdminCard: AdminCardConfig = {
  id: "module-name-admin",
  title: "Module Name", // Functional name: "Access Control", "AI Enablement", etc.
  description: "Platform-level administration for this module",
  icon: <IconComponent sx={{ fontSize: 48 }} />,
  href: "/admin/access", // Single word/acronym: access, ai, mgmt, chat, kb
  color: "primary.main",
  order: 50,
  context: "platform", // NEW: "platform" or "organization"
  requiredRoles: ["platform_owner", "platform_admin"], // NEW: replaces superAdminOnly
};
```

### 3.3 Module Admin Card Ownership

**One Card Per Module:** Each module exports exactly ONE admin card.

| Module | Card Name | Purpose | Route | Order |
|--------|-----------|---------|-------|-------|
| module-access | Access Control | Manage organizations, users, identity providers | `/admin/access` | 10 |
| module-ai | AI Enablement | Configure AI providers, models, and settings | `/admin/ai` | 20 |
| module-mgmt | Platform Management | Lambda warming, performance, storage, costs | `/admin/mgmt` | 30 |
| module-knowledge | Knowledge Management | Platform-level knowledge config | `/admin/kb` | 40 |
| module-chat | Chat Management | Platform-level chat config | `/admin/chat` | 50 |
| module-resume | Resume Management | Platform-level resume config | `/admin/resume` | 60 |

### 3.4 Card Order Convention

- **10-19:** Core platform features (org, access, auth)
- **20-29:** AI/ML and intelligence features
- **30-39:** Performance and infrastructure
- **40-49:** Content and knowledge
- **50+:** Application-specific features

---

## 4. MUI Design Standards

### 4.1 Icon Sizes
- Main nav icons: `fontSize="small"` (20px)
- User menu icons: `fontSize="small"` (18px)
- User avatar: 36px (expanded), 24px (collapsed)
- Admin card icons: 48px

### 4.2 Sidebar Dimensions
- Expanded width: 280px
- Collapsed width: 60px
- Mobile drawer: 280px (temporary overlay)

### 4.3 Component Styling

**Menu Item:**
```tsx
<MenuItem sx={{ 
  borderRadius: '6px', 
  mx: 0.5, 
  my: 0.5,
  '&:hover': { bgcolor: 'action.hover' }
}}>
```

**Section Divider:**
```tsx
<Divider sx={{ my: 1 }} />
```

**Active State:**
```tsx
selected={pathname === item.href}
sx={{
  '&.Mui-selected': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
  }
}}
```

---

## 5. Performance Requirements

### 5.1 Returning User Login (Scenario 1)
**Target:** < 120ms response time for `/profiles/me`

**Requirements:**
- Use database function `get_profile_by_idp_user()` for single-query lookup
- Index on `external_identities(external_id, provider_name)`
- Index on `user_profiles(user_id)`

### 5.2 Navigation Rendering
**Target:** < 50ms to render navigation items

**Requirements:**
- Navigation config sorted once on app load
- Icons loaded as static imports (not dynamic)
- Role checks use boolean flags, not repeated array searches

---

## 6. Testing Requirements

All CORA projects must support these 5 login scenarios:

### Scenario 1: Returning User (Standard Authorization)
- User logs in successfully
- Provider name correctly set in database
- Dashboard loads with performance < 120ms
- User menu shows correct admin options based on role

### Scenario 2: First-Time Invited User
- User logs in with email matching invitation
- User assigned to invited org with correct role
- `org_members.role` set correctly (org_user, org_admin, or org_owner)
- Invitation marked as accepted

### Scenario 3: First-Time Domain User
- User logs in with email domain matching org's allowed_domain
- User assigned to matched org
- `org_members.role` set to org_user

### Scenario 4: Bootstrap (First User)
- "Platform Admin" org created automatically
- `user_profiles.global_role` set to `platform_owner`
- `org_members.role` set to `org_owner`
- User menu shows BOTH Platform Admin and Org Admin options

### Scenario 5: Denied Access
- User logs in but has no invite/domain match
- `user_profiles.global_role` set to `platform_user`
- `user_profiles.requires_invitation` set to TRUE
- "Contact Admin" message displayed

---

## 7. References

- [User Authentication and Provisioning](./user-authentication-and-provisioning.md)
- [ADR-007: CORA Auth Shell Standard](../ADR-007-CORA-AUTH-SHELL-STANDARD.md)
- [ADR-008: Sidebar and Org Selector Standard](../ADR-008-SIDEBAR-AND-ORG-SELECTOR-STANDARD.md)

---

**Document Version:** 1.0  
**Created:** December 24, 2025  
**Status:** ✅ Standard - Permanent Reference  
**Maintained By:** CORA Development Team
