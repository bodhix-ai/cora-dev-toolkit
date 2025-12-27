# CORA Navigation and Role Standardization Design

**Version:** 1.0  
**Date:** December 24, 2025  
**Status:** Approved - Ready for Implementation

---

## Executive Summary

This document defines the standard navigation patterns and role naming conventions for all CORA projects. It addresses inconsistencies in the current template and establishes patterns based on successful implementations in the career and policy projects.

---

## 1. Role Standardization

### 1.1 Platform-Level Roles (user_profiles.global_role)

| Role | Usage | Set During |
|------|-------|------------|
| `platform_owner` | First user (bootstrap) - full platform control | Scenario 4: Bootstrap |
| `platform_admin` | Platform administrators | Manual assignment (future) |
| `platform_user` | Standard users | Scenarios 1, 2, 3, 5 |

### 1.2 Organization-Level Roles (org_members.role)

| Role | Usage | Set During |
|------|-------|------------|
| `org_owner` | Organization owner - full org control | Bootstrap, Invitations |
| `org_admin` | Organization administrator | Invitations |
| `org_user` | Standard org member | Domain match, Invitations |

### 1.3 Current Issues to Fix

**Profiles Lambda (`lambda_function.py`):**
- ❌ Uses `global_user` → Should be `platform_user`
- ❌ References `global_admin` → Should be `platform_admin`
- ❌ References `global_owner` → Should be `platform_owner`

**Schema Comments (`003-profiles.sql`):**
- ❌ Documents `global_user, global_admin, global_owner, super_admin`
- ✅ Should document `platform_user, platform_admin, platform_owner`

**Validators (`org_common/validators.py`):**
- Check if validator needs updating for new role names

---

## 2. Navigation Architecture

### 2.1 Left Navigation (Main Menu)

**Purpose:** Primary navigation for app-specific features

**Pattern:** Modular composition from CORA modules

**Example Structure:**
```typescript
const appNavigation: NavigationConfig = [
  orgNavigation,      // Dashboard (order: 10)
  resumeNavigation,   // Resumes (order: 20)
  certificationNavigation,  // Certifications (order: 30)
].sort((a, b) => (a.order || 0) - (b.order || 0));
```

**Standard Icons:**
- Dashboard: `DashboardIcon`
- Projects: `FolderIcon` or `WorkIcon`
- Chats: `ChatIcon`
- Knowledge Base: `LibraryBooksIcon`
- Reports: `AssessmentIcon`

**Current Issue:**
- ❌ Settings is in main navigation items
- ✅ Settings should ONLY be in bottom user menu

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

### 2.3 User Menu Items Detail

| Section | Item | Icon | Route | Visibility |
|---------|------|------|-------|------------|
| **User Info** | Avatar, Name, Email | - | - | Always |
| **Organization** | Org list with switcher | `BusinessIcon` | - | Always |
| **Admin** | Platform Admin | `AdminPanelSettingsIcon` | `/admin/platform` | `platform_owner` OR `platform_admin` |
| **Admin** | Org Admin | `BusinessIcon` | `/admin/org` | `org_owner` OR `org_admin` (in current org) |
| **User** | Profile | `PersonIcon` | `/profile` | Always |
| **User** | Settings | `SettingsIcon` | `/settings` | Always |
| **User** | Help | `HelpOutlineIcon` | `/help` | Always (future: configurable) |
| **User** | Documentation | `MenuBookIcon` | `/docs` | Always (future: configurable) |
| **Action** | Sign Out | `LogoutIcon` | - | Always |

---

## 3. MUI Design Standards

### 3.1 Icon Sizes
- Main nav icons: `fontSize="small"` (20px)
- User menu icons: `fontSize="small"` (18px)
- User avatar: 36px (expanded), 24px (collapsed)

### 3.2 Sidebar Dimensions
- Expanded width: 280px
- Collapsed width: 60px
- Mobile drawer: 280px (temporary overlay)

### 3.3 Component Styling

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

## 4. Issues Identified from Testing

### 4.1 Issue #1: Provider Detection
**Current:** `user_auth_ext_ids.provider_name = "clerk"` even when using Okta

**Root Cause:** `detect_auth_provider()` defaults to 'clerk' instead of using the provider from authorizer context

**Fix:** Check `user_info.get('provider')` FIRST before falling back to JWT claim detection

**Location:** `templates/_cora-core-modules/module-access/backend/lambdas/profiles/lambda_function.py`

### 4.2 Issue #2: Settings Menu Duplication
**Current:** Settings appears in both main navigation AND bottom menu

**Fix:** Remove Settings from `navigationItems` array in `Sidebar.tsx`

**Locations:**
- `templates/_project-stack-template/apps/web/components/Sidebar.tsx`

### 4.3 Issue #3: Missing Admin Pages
**Current:** OrganizationSwitcher links to `/admin` and `/admin/platform` but pages don't exist

**Fix:** Create admin page templates

**New Pages Needed:**
- `/admin/platform` - Platform admin dashboard
- `/admin/org` - Organization admin dashboard
- `/settings` - User settings page
- `/profile` - User profile page

---

## 5. Implementation Plan

### Phase 1: Role Standardization

**Files to Modify:**

1. **`templates/_cora-core-modules/module-access/backend/lambdas/profiles/lambda_function.py`**
   - Replace `'global_user'` → `'platform_user'` (3 occurrences)
   - Replace `'global_admin'` → `'platform_admin'` (2 occurrences in validation)
   - Replace `'global_owner'` → `'platform_owner'` (1 occurrence in validation)

2. **`templates/_cora-core-modules/module-access/db/schema/003-profiles.sql`**
   - Update comment: `'Global role: platform_user, platform_admin, platform_owner'`

3. **`templates/_cora-core-modules/module-access/backend/layers/org-common/python/org_common/validators.py`**
   - Check `validate_global_role()` function for role validation
   - Update to accept new role names

### Phase 2: Fix Provider Detection

**File:** `templates/_cora-core-modules/module-access/backend/lambdas/profiles/lambda_function.py`

**Change `detect_auth_provider()` function:**
```python
def detect_auth_provider(user_info: Dict[str, Any]) -> str:
    """
    Detect the authentication provider from JWT claims.
    
    Args:
        user_info: User info from JWT claims
        
    Returns:
        'okta' or 'clerk' based on JWT claim patterns
    """
    # First, check if provider was explicitly passed from authorizer
    if user_info.get('provider'):
        return user_info['provider']
    
    # Fallback: Detect from JWT claims
    issuer = user_info.get('iss', '')
    if 'okta' in issuer.lower():
        return 'okta'
    
    if user_info.get('ver') == '1':
        return 'okta'
    
    if 'azp' in user_info:
        return 'clerk'
    
    # Default to okta if unable to detect
    logger.warning(f"Unable to detect auth provider from JWT claims, defaulting to okta. Claims: {list(user_info.keys())}")
    return 'okta'
```

### Phase 3: Navigation Updates

**1. Remove Settings from Main Navigation**

**File:** `templates/_project-stack-template/apps/web/components/Sidebar.tsx`

```typescript
const navigationItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <DashboardIcon />,
  },
  // Remove Settings from here
];
```

**2. Update OrganizationSwitcher with Admin Section**

**File:** `templates/_project-stack-template/apps/web/components/OrganizationSwitcher.tsx`

Add after organization list:
```tsx
{/* Admin Section */}
{(profile?.globalRole === 'platform_owner' || profile?.globalRole === 'platform_admin') && (
  <MenuItem onClick={() => navigate('/admin/platform')}>
    <ListItemIcon>
      <AdminPanelSettingsIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText primary="Platform Admin" />
  </MenuItem>
)}

{/* Check current org membership role */}
{currentOrganization && (currentOrganization.role === 'org_owner' || currentOrganization.role === 'org_admin') && (
  <MenuItem onClick={() => navigate('/admin/org')}>
    <ListItemIcon>
      <BusinessIcon fontSize="small" />
    </ListItemIcon>
    <ListItemText primary="Org Admin" />
  </MenuItem>
)}

{/* Show divider only if admin section was shown */}
{((profile?.globalRole === 'platform_owner' || profile?.globalRole === 'platform_admin') || 
  (currentOrganization && (currentOrganization.role === 'org_owner' || currentOrganization.role === 'org_admin'))) && (
  <Divider sx={{ my: 1 }} />
)}

{/* Add Profile before Settings */}
<MenuItem onClick={() => navigate('/profile')}>
  <ListItemIcon>
    <PersonIcon fontSize="small" />
  </ListItemIcon>
  <ListItemText primary="Profile" />
</MenuItem>

{/* Settings - already exists */}
{/* Help - add if not present */}
{/* Documentation - add if not present */}
```

### Phase 4: Create Admin and Settings Pages

**1. Platform Admin Page**
**File:** `templates/_project-stack-template/apps/web/app/admin/platform/page.tsx`

```tsx
import { Card, CardContent, Typography } from '@mui/material';

export default function PlatformAdminPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>Platform Admin</Typography>
      <Card>
        <CardContent>
          <Typography>Platform administration features</Typography>
          {/* Future: Org creation, user management, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
```

**2. Org Admin Page**
**File:** `templates/_project-stack-template/apps/web/app/admin/org/page.tsx`

```tsx
import { Card, CardContent, Typography } from '@mui/material';

export default function OrgAdminPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>Organization Admin</Typography>
      <Card>
        <CardContent>
          <Typography>Organization administration features</Typography>
          {/* Future: Member management, settings, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
```

**3. Settings Page**
**File:** `templates/_project-stack-template/apps/web/app/settings/page.tsx`

```tsx
import { Card, CardContent, Typography } from '@mui/material';

export default function SettingsPage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Card>
        <CardContent>
          <Typography>User settings</Typography>
          {/* Future: Preferences, notifications, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
```

**4. Profile Page**
**File:** `templates/_project-stack-template/apps/web/app/profile/page.tsx`

```tsx
import { Card, CardContent, Typography } from '@mui/material';

export default function ProfilePage() {
  return (
    <div>
      <Typography variant="h4" gutterBottom>User Profile</Typography>
      <Card>
        <CardContent>
          <Typography>User profile information</Typography>
          {/* Future: Edit name, email, avatar, etc. */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Phase 5: Copy to Test3 and Test

1. Copy all template changes to `~/code/sts/test3/` projects
2. Rebuild Lambda layers and deploy
3. Test all 5 login scenarios

---

## 6. Testing Plan

### Scenario 1: Returning User (Standard Authorization)
**Expected:**
- ✅ User logs in successfully
- ✅ Provider name correctly set in database
- ✅ Dashboard loads
- ✅ User menu shows correct admin options based on role
- ✅ Performance < 120ms

### Scenario 2: First-Time Invited User
**Expected:**
- ✅ User logs in with email matching invitation
- ✅ User assigned to invited org with correct role
- ✅ `org_members.role` set correctly (org_user, org_admin, or org_owner)
- ✅ Invitation marked as accepted
- ✅ User menu shows org admin option if role is org_admin or org_owner

### Scenario 3: First-Time Domain User
**Expected:**
- ✅ User logs in with email domain matching org's allowed_domain
- ✅ User assigned to matched org
- ✅ `org_members.role` set to org_user
- ✅ User menu does NOT show admin options

### Scenario 4: Bootstrap (First User)
**Expected:**
- ✅ "Platform Admin" org created automatically
- ✅ `user_profiles.global_role` set to `platform_owner`
- ✅ `org_members.role` set to `org_owner`
- ✅ User menu shows BOTH Platform Admin and Org Admin options
- ✅ User can access `/admin/platform` page

### Scenario 5: Denied Access
**Expected:**
- ✅ User logs in but has no invite/domain match
- ✅ `user_profiles.global_role` set to `platform_user`
- ✅ `user_profiles.requires_invitation` set to TRUE
- ✅ "Contact Admin" message displayed
- ✅ `provisioning_denied` event logged in user_auth_log

---

## 7. Performance Requirements

### 7.1 Returning User Login (Scenario 1)
**Target:** < 120ms response time for `/profiles/me`

**Optimization:**
- Use database function `get_profile_by_idp_user()` for single-query lookup
- Index on `external_identities(external_id, provider_name)`
- Index on `user_profiles(user_id)`

### 7.2 Navigation Rendering
**Target:** < 50ms to render navigation items

**Optimization:**
- Navigation config sorted once on app load
- Icons loaded as static imports (not dynamic)
- Role checks use boolean flags, not repeated array searches

---

## 8. Future Enhancements

### 8.1 Configurable Menu Items
**Feature:** Platform owners can configure which optional menu items are visible

**Implementation:**
```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (setting_key, setting_value) VALUES
  ('user_menu_items', '{"help": true, "documentation": true, "upgrade": false}');
```

### 8.2 Custom Branding
**Feature:** Configurable app icon and name

**Implementation:**
- Add `platform_settings` entry for logo URL
- Add `platform_settings` entry for app name
- Update Sidebar component to read from settings

---

## 9. Files Modified Summary

### Templates
1. `_cora-core-modules/module-access/backend/lambdas/profiles/lambda_function.py`
2. `_cora-core-modules/module-access/db/schema/003-profiles.sql`
3. `_cora-core-modules/module-access/backend/layers/org-common/python/org_common/validators.py` (if exists)
4. `_project-stack-template/apps/web/components/Sidebar.tsx`
5. `_project-stack-template/apps/web/components/OrganizationSwitcher.tsx`
6. `_project-stack-template/apps/web/app/admin/platform/page.tsx` (NEW)
7. `_project-stack-template/apps/web/app/admin/org/page.tsx` (NEW)
8. `_project-stack-template/apps/web/app/settings/page.tsx` (NEW)
9. `_project-stack-template/apps/web/app/profile/page.tsx` (NEW)

### Test Project (for validation)
- Copy all changes to `~/code/sts/test3/ai-sec-stack/` and `~/code/sts/test3/ai-sec-infra/`

---

## 10. Success Criteria

1. ✅ All role values standardized to `platform_*` and `org_*` naming
2. ✅ Provider detection correctly identifies Okta vs other IDPs
3. ✅ Settings appears ONLY in bottom user menu, not main navigation
4. ✅ Admin section visible only to users with admin roles
5. ✅ All 5 login scenarios work without errors
6. ✅ Admin pages accessible and render correctly
7. ✅ New project created from templates works on first run

---

**Document Version:** 1.0  
**Created:** December 24, 2025  
**Status:** ✅ Approved - Ready for Implementation
