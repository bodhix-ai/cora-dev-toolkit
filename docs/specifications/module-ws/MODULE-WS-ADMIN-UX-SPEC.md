# Workspace Module - Admin UX Specification

**Module Name:** module-ws  
**Parent Spec:** [MODULE-WS-SPEC.md](./MODULE-WS-SPEC.md)  
**Status:** Draft  
**Last Updated:** December 31, 2025

---

## 1. Admin Personas

### 1.1 Platform Administrator

**Role:** `platform_admin`

**Description:** System administrator responsible for platform-wide configuration and module management across all organizations.

**Goals:**
- Configure workspace module behavior globally
- Customize navigation labels for branding ("Workspaces" → "Audits", etc.)
- Enable/disable workspace features (favorites, tags, colors)
- Monitor workspace usage across organizations
- Manage module health and performance

**Pain Points:**
- Need to update configuration without code changes
- Limited visibility into cross-organization usage
- Difficulty enforcing consistent module behavior

**Technical Proficiency:** High

**Access Level:** Platform-wide

**Usage Frequency:** Weekly to Monthly

---

### 1.2 Platform Owner

**Role:** `platform_owner`

**Description:** Platform owner with highest level of access, responsible for overall platform governance and configuration.

**Goals:**
- All Platform Administrator capabilities
- Approve major configuration changes
- Set default configurations for new organizations
- Access audit logs and compliance reports

**Technical Proficiency:** High

**Access Level:** Platform-wide (highest)

**Usage Frequency:** Monthly

---

### 1.3 Organization Administrator

**Role:** `org_admin`

**Description:** Organization-level administrator who manages workspaces within their organization.

**Goals:**
- View all workspaces in the organization
- Monitor workspace activity and membership
- Clean up unused or orphaned workspaces
- Manage workspace lifecycle (archive, restore, delete)
- View workspace statistics and reports

**Pain Points:**
- Cannot see workspaces they're not members of
- Limited bulk management capabilities
- No visibility into workspace resource usage

**Technical Proficiency:** Medium to High

**Access Level:** Organization-scoped

**Usage Frequency:** Weekly

---

### 1.4 Organization Owner

**Role:** `org_owner`

**Description:** Organization owner with full control over organization settings and resources.

**Goals:**
- All Organization Administrator capabilities
- Override workspace permissions if needed
- Permanently delete workspaces
- Access organization-level audit logs

**Technical Proficiency:** Medium to High

**Access Level:** Organization-scoped (highest within org)

**Usage Frequency:** Weekly to Monthly

---

## 2. Admin Use Cases

### AUC-1: Configure Workspace Module

**Actor:** Platform Administrator, Platform Owner  
**Preconditions:** User has platform_admin or platform_owner role  
**Trigger:** User clicks "Workspace Configuration" card on Platform Admin dashboard

**Main Flow:**
1. User opens Platform Admin dashboard
2. User sees "Workspace Configuration" card among other module cards
3. User clicks the "Workspace Configuration" card
4. System navigates directly to workspace module configuration page
5. System displays tabbed interface:
   - **Configuration Tab** (default): All module settings on one page
     - Navigation labels (singular/plural)
     - Navigation icon
     - Feature toggles (favorites, tags, colors)
     - Default color and settings
   - **Usage Summary Tab**: Cross-organization workspace usage statistics
6. User modifies configuration settings
7. User clicks "Save Configuration"
8. System validates and saves configuration
9. Configuration takes effect immediately

**Note:** The module card appears as a standalone card on the Platform Admin dashboard. Every module gets its own admin card. The configuration page uses a tabular format so there isn't any additional navigation required to fully configure the module.

**Postconditions:** Workspace module configuration is updated globally

---

### AUC-2: View Organization Workspaces (Admin)

**Actor:** Organization Administrator, Organization Owner  
**Preconditions:** User has org_admin or org_owner role  
**Trigger:** User navigates to Organization Admin → Workspaces

**Main Flow:**
1. User opens Organization Admin dashboard
2. User clicks "Workspaces" in admin navigation
3. System displays all workspaces in organization (including ones user is not a member of)
4. User can view:
   - Workspace name, status, member count
   - Owner(s) and creation date
   - Last activity date
   - Storage/resource usage (if available)
5. User can filter by status (active, archived, deleted)
6. User can search by name or owner

**Postconditions:** Admin has visibility into all organization workspaces

---

### AUC-3: Bulk Archive Workspaces

**Actor:** Organization Administrator, Organization Owner  
**Preconditions:** User has org_admin or org_owner role  
**Trigger:** Admin needs to clean up inactive workspaces

**Main Flow:**
1. User navigates to Organization Admin → Workspaces
2. User applies filter for inactive workspaces (e.g., not updated in 90 days)
3. User selects multiple workspaces via checkboxes
4. User clicks "Bulk Actions" → "Archive Selected"
5. System shows confirmation with workspace list
6. User confirms action
7. System archives all selected workspaces
8. System notifies workspace owners via email (optional)

**Postconditions:** Selected workspaces are archived

---

### AUC-4: Restore Deleted Workspace (Admin Override)

**Actor:** Organization Owner  
**Preconditions:** User has org_owner role, workspace is soft-deleted  
**Trigger:** Admin needs to restore workspace for a user

**Main Flow:**
1. User navigates to Organization Admin → Workspaces → Deleted
2. System displays soft-deleted workspaces with deletion date
3. User clicks "Restore" on target workspace
4. System shows confirmation with membership info
5. User confirms restoration
6. System restores workspace and all members
7. System notifies original owner

**Postconditions:** Workspace is restored, previous members regain access

---

### AUC-5: Force Delete Workspace

**Actor:** Organization Owner  
**Preconditions:** User has org_owner role  
**Trigger:** Admin needs to permanently delete a workspace

**Main Flow:**
1. User navigates to Organization Admin → Workspaces
2. User locates target workspace (active or deleted)
3. User clicks "..." menu → "Permanently Delete"
4. System shows warning about irreversibility
5. System requires typing workspace name to confirm
6. User types name and confirms
7. System permanently deletes workspace and all data
8. System logs action for audit

**Postconditions:** Workspace is permanently deleted, data cannot be recovered

---

### AUC-6: View Workspace Analytics

**Actor:** Organization Administrator, Organization Owner  
**Preconditions:** User has org_admin or org_owner role  
**Trigger:** Admin wants to understand workspace usage

**Main Flow:**
1. User navigates to Organization Admin → Workspaces
2. User clicks "Analytics" tab on the Workspaces management page
3. System displays workspace analytics panel:
   - Total workspaces (active, archived, deleted)
   - Workspaces created over time
   - Most active workspaces (by member count, activity)
   - Orphaned workspaces (no recent activity)
   - Member distribution across workspaces
4. User can filter by date range
5. User can export data as CSV

**Note:** Analytics is a tab within the Org Admin > Workspaces page, not a separate route. This keeps all workspace management functionality in one place with a consistent tabular navigation pattern.

**Postconditions:** Admin has visibility into workspace usage patterns

---

## 3. Admin UI Design

### 3.1 Platform Admin - Module Configuration

**Route:** `/platform-admin/modules/workspace`

**Layout (Configuration Tab - Default):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Platform Admin > Modules > Workspace                           │
├─────────────────────────────────────────────────────────────────┤
│  [Configuration]  [Usage Summary]                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workspace Module Configuration                                  │
│  Configure workspace module behavior and appearance             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Navigation Labels                                          ││
│  │                                                             ││
│  │  Singular Label *        Plural Label *                     ││
│  │  ┌─────────────────┐    ┌─────────────────┐                ││
│  │  │ Workspace       │    │ Workspaces      │                ││
│  │  └─────────────────┘    └─────────────────┘                ││
│  │                                                             ││
│  │  💡 These labels appear in navigation, headers, and         ││
│  │     throughout the application.                             ││
│  │                                                             ││
│  │  Examples: Workspace/Workspaces, Audit/Audits,             ││
│  │           Campaign/Campaigns, Proposal/Proposals            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Navigation Icon                                            ││
│  │                                                             ││
│  │  ┌─────────────────────────────────────────┐               ││
│  │  │ 📁 WorkspaceIcon                    ▼   │               ││
│  │  └─────────────────────────────────────────┘               ││
│  │                                                             ││
│  │  Preview: [Icon] Workspaces                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Features                                                   ││
│  │                                                             ││
│  │  ☑ Enable Favorites                                        ││
│  │    Allow users to favorite workspaces for quick access     ││
│  │                                                             ││
│  │  ☑ Enable Tags                                              ││
│  │    Allow users to add tags for categorization              ││
│  │                                                             ││
│  │  ☑ Enable Color Coding                                      ││
│  │    Allow users to customize workspace colors               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Defaults                                                   ││
│  │                                                             ││
│  │  Default Color                                              ││
│  │  ┌─────────────────────────────────────────┐               ││
│  │  │ 🔵 #1976d2                         ▼   │               ││
│  │  └─────────────────────────────────────────┘               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Cancel]                            [Save Configuration]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Layout (Usage Summary Tab):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Platform Admin > Modules > Workspace                           │
├─────────────────────────────────────────────────────────────────┤
│  [Configuration]  [Usage Summary]                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workspace Usage Across Organizations    Date: [Last 30 days ▼] │
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │     1,247     │  │      892      │  │      156      │       │
│  │ Total         │  │ Active        │  │ Created       │       │
│  │ Workspaces    │  │ Workspaces    │  │ This Month    │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Usage by Organization                                      ││
│  │                                                             ││
│  │  Organization          │ Total │ Active │ Avg/User │ Trend ││
│  │  ─────────────────────────────────────────────────────────  ││
│  │  Acme Corp             │  245  │   180  │   3.2    │  ↑12% ││
│  │  Global Industries     │  189  │   145  │   2.8    │  ↑8%  ││
│  │  TechStart Inc         │  156  │   134  │   4.1    │  ↑15% ││
│  │  Enterprise Ltd        │  142  │    98  │   2.1    │  ↓3%  ││
│  │  StartupXYZ            │   89  │    72  │   5.2    │  ↑22% ││
│  │                                              [View All →]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │  Workspaces Over Time    │  │  Feature Adoption            ││
│  │  📈 [Line chart showing  │  │                              ││
│  │      workspace growth    │  │  Favorites: ████████░░ 78%   ││
│  │      across all orgs]    │  │  Tags:      ██████░░░░ 62%   ││
│  │                          │  │  Colors:    █████░░░░░ 54%   ││
│  └──────────────────────────┘  └──────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Inactive Workspaces (Platform-wide)          [View All →]  ││
│  │                                                             ││
│  │  • 45 workspaces with no activity > 90 days                 ││
│  │  • 12 workspaces with 0 members                             ││
│  │  • Recommended: Review with org admins                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Export Report as CSV]                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- **Configuration** (default): All module settings on one page
- **Usage Summary**: Cross-organization workspace usage statistics

**Components:**
- `AdminPageHeader` with breadcrumbs
- `Tabs` for Configuration / Usage Summary
- `ConfigurationCard` for each section
- `TextField` for labels
- `IconSelector` for navigation icon
- `Switch` toggles for features
- `ColorPicker` for default color
- `StatsCard` for usage metrics
- `DataTable` for organization usage
- `LineChart` for trends
- `ProgressBar` for feature adoption
- `Button` for save action

---

### 3.2 Organization Admin - Workspace Management

**Route:** `/org-admin/workspaces`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Organization Admin > Workspaces                                │
├─────────────────────────────────────────────────────────────────┤
│  [All Workspaces]  [Analytics]  [Settings]                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  All Organization Workspaces                    [+ New Workspace]│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Search: [🔍 Search by name or owner...]                      ││
│  │ Status: [All ▼]  Created: [Any time ▼]  [Filter]            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ☐ Select All (50 workspaces)          [Bulk Actions ▼]        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☐ │ 🟦 Product Development    │ Active  │ 5 │ John Doe    │││
│  │   │    [engineering][product]  │         │   │ 2 hrs ago  │││
│  ├───┼────────────────────────────┼─────────┼───┼────────────┼┤│
│  │ ☐ │ 🟩 Marketing Campaign     │ Active  │ 3 │ Sarah Smith│││
│  │   │    [marketing]             │         │   │ 1 day ago  │││
│  ├───┼────────────────────────────┼─────────┼───┼────────────┼┤│
│  │ ☐ │ 🟧 Q3 Planning            │Archived │ 8 │ Mike Jones │││
│  │   │    [planning][quarterly]   │         │   │ 30 days    │││
│  ├───┼────────────────────────────┼─────────┼───┼────────────┼┤│
│  │ ☐ │ 🟥 Old Project            │ Deleted │ 2 │ Jane Doe   │││
│  │   │    [deprecated]            │ 25 days │   │ 35 days    │││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Showing 1-50 of 127 workspaces    [◀ Previous] [1][2][3] [Next ▶]│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**
- **All Workspaces** (default): List of all organization workspaces
- **Analytics**: Workspace usage analytics and statistics
- **Settings**: Org-level workspace settings (if any)

**Table Columns:**
- Checkbox (for bulk actions)
- Workspace (icon, name, tags)
- Status (Active, Archived, Deleted + days remaining)
- Members (count)
- Owner (primary owner name)
- Activity (last updated relative time)
- Actions (menu)

**Bulk Actions:**
- Archive Selected
- Restore Selected
- Export Selected
- Permanently Delete (org_owner only)

---

### 3.3 Organization Admin - Workspace Detail

**Route:** `/org-admin/workspaces/{id}`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Organization Admin > Workspaces > Product Development         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────┐  Product Development                    Status: Active │
│  │ 🟦 │  Main product development workspace                     │
│  └─────┘  [engineering] [product]                               │
│           Created by John Doe • Dec 1, 2025                     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Overview]  [Members]  [Activity]  [Danger Zone]               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Overview Tab:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Workspace Details                                          ││
│  │                                                             ││
│  │  Name:         Product Development                          ││
│  │  Description:  Main product development workspace           ││
│  │  Color:        #1976d2 (Blue)                               ││
│  │  Icon:         WorkspaceIcon                                ││
│  │  Tags:         engineering, product                         ││
│  │  Status:       Active                                       ││
│  │                                                             ││
│  │  Created:      Dec 1, 2025 by John Doe                      ││
│  │  Updated:      Dec 31, 2025 by Sarah Smith                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Statistics                                                 ││
│  │                                                             ││
│  │  👥 5 Members    💬 12 Chats    📚 3 KBs    🔄 2 Workflows ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**

1. **Overview Tab**
   - Workspace metadata
   - Statistics (members, associated resources)
   - Quick actions for admin

2. **Members Tab**
   - Full member list with roles
   - Add/remove members (admin override)
   - Change roles

3. **Activity Tab**
   - Recent activity log
   - Audit trail (who changed what, when)

4. **Danger Zone Tab**
   - Archive/Unarchive workspace
   - Force delete (permanent)
   - Transfer ownership

---

### 3.4 Workspace Analytics Tab

**Route:** `/org-admin/workspaces` (Analytics tab)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Organization Admin > Workspaces                                │
├─────────────────────────────────────────────────────────────────┤
│  [All Workspaces]  [Analytics]  [Settings]                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Workspace Analytics                 Date Range: [Last 30 days ▼]│
│                                                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │     127       │  │      45       │  │      12       │       │
│  │ Total         │  │ Active        │  │ Created       │       │
│  │ Workspaces    │  │ This Month    │  │ This Month    │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Workspaces Created Over Time                               ││
│  │  📈 [Chart: Line graph showing workspace creation trend]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐│
│  │  Status Distribution     │  │  Most Active Workspaces      ││
│  │  🥧 [Pie chart]          │  │  1. Product Dev (45 actions) ││
│  │    Active: 82 (65%)      │  │  2. Marketing (32 actions)   ││
│  │    Archived: 35 (27%)    │  │  3. Engineering (28 actions) ││
│  │    Deleted: 10 (8%)      │  │  4. Sales Team (21 actions)  ││
│  └──────────────────────────┘  └──────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Inactive Workspaces (No activity > 90 days)                ││
│  │                                                  [View All]  ││
│  │  • Old Q2 Project (120 days) - Consider archiving           ││
│  │  • Test Workspace (95 days) - Consider deleting             ││
│  │  • Legacy Planning (92 days) - Consider archiving           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [Export as CSV]                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Note:** Analytics is displayed as a tab within the main Workspaces management page, keeping all workspace-related admin functions in one location without requiring additional navigation levels.

---

## 4. Admin Card Design

### 4.1 Platform Admin Card

**Location:** Platform Admin Dashboard

**Note:** This card appears as a standalone card on the Platform Admin dashboard alongside other module cards. Clicking it navigates directly to the module configuration page.

**Design:**
```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │       📁 (48px icon)            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Workspace Configuration                │
│                                         │
│  Configure workspace module behavior,   │
│  navigation labels, and feature flags   │
│                                         │
│  [Configure →]                          │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
// frontend/adminCard.tsx
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import type { AdminCardConfig } from '@ai-sec/shared-types';

export const wsAdminCard: AdminCardConfig = {
  id: 'ws-platform-admin',
  title: 'Workspace Configuration',
  description: 'Configure workspace module behavior, navigation labels, and feature flags',
  icon: <WorkspacesIcon sx={{ fontSize: 48 }} />,
  href: '/platform-admin/modules/workspace',
  color: 'primary.main',
  order: 100,
  context: 'platform',
  requiredRoles: ['platform_owner', 'platform_admin']
};
```

### 4.2 Organization Admin Card

**Location:** Organization Admin Dashboard

**Design:**
```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐    │
│  │       📁 (48px icon)            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Workspace Management                   │
│                                         │
│  View and manage all organization       │
│  workspaces, members, and analytics     │
│                                         │
│  127 workspaces • 45 active             │
│                                         │
│  [Manage →]                             │
└─────────────────────────────────────────┘
```

**Implementation:**
```typescript
// frontend/orgAdminCard.tsx
import WorkspacesIcon from '@mui/icons-material/Workspaces';
import type { AdminCardConfig } from '@ai-sec/shared-types';

export const wsOrgAdminCard: AdminCardConfig = {
  id: 'ws-org-admin',
  title: 'Workspace Management',
  description: 'View and manage all organization workspaces, members, and analytics',
  icon: <WorkspacesIcon sx={{ fontSize: 48 }} />,
  href: '/org-admin/workspaces',
  color: 'primary.main',
  order: 200,
  context: 'organization',
  requiredRoles: ['org_owner', 'org_admin'],
  stats: async (orgId) => {
    const { total, active } = await getWorkspaceStats(orgId);
    return `${total} workspaces • ${active} active`;
  }
};
```

---

## 5. Module Registration

### 5.1 Admin Card Registration

```typescript
// frontend/index.ts
export { wsAdminCard } from './adminCard';
export { wsOrgAdminCard } from './orgAdminCard';

// Module registration in module.json
{
  "name": "module-ws",
  "version": "1.0.0",
  "adminCards": {
    "platform": ["wsAdminCard"],
    "organization": ["wsOrgAdminCard"]
  },
  "routes": {
    "platform-admin": ["/platform-admin/modules/workspace"],
    "org-admin": ["/org-admin/workspaces", "/org-admin/workspaces/:id"]
  }
}

// Note: Analytics is now a tab within /org-admin/workspaces, not a separate route
```

### 5.2 Health Check Endpoint

```python
# backend/lambdas/workspace/health.py

def handle_health_check():
    """Health check for module-mgmt monitoring"""
    return {
        'module': 'module-ws',
        'version': '1.0.0',
        'status': 'healthy',
        'checks': {
            'database': check_database_connection(),
            'tables': check_tables_exist(['workspace', 'ws_member', 'ws_favorite', 'ws_config'])
        },
        'metrics': {
            'total_workspaces': get_total_workspace_count(),
            'active_workspaces': get_active_workspace_count()
        },
        'timestamp': datetime.utcnow().isoformat()
    }
```

---

## 6. Configuration API

### 6.1 Get Configuration

```
GET /api/ws/config
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nav_label_singular": "Workspace",
    "nav_label_plural": "Workspaces",
    "nav_icon": "WorkspaceIcon",
    "enable_favorites": true,
    "enable_tags": true,
    "enable_color_coding": true,
    "default_color": "#1976d2",
    "updated_at": "2025-12-31T12:00:00Z",
    "updated_by": "uuid"
  }
}
```

**Permissions:**
- All authenticated users can read configuration

### 6.2 Update Configuration

```
PUT /api/ws/config
```

**Request Body:**
```json
{
  "nav_label_singular": "Audit",
  "nav_label_plural": "Audits",
  "nav_icon": "AssessmentIcon",
  "enable_favorites": true,
  "enable_tags": false,
  "enable_color_coding": true,
  "default_color": "#ff5722"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nav_label_singular": "Audit",
    "nav_label_plural": "Audits",
    "nav_icon": "AssessmentIcon",
    "enable_favorites": true,
    "enable_tags": false,
    "enable_color_coding": true,
    "default_color": "#ff5722",
    "updated_at": "2025-12-31T12:00:00Z",
    "updated_by": "uuid"
  }
}
```

**Permissions:**
- Only `platform_owner` and `platform_admin` can update configuration

**Validation:**
- `nav_label_singular`: 1-50 characters
- `nav_label_plural`: 1-50 characters
- `nav_icon`: Valid MUI icon name
- `default_color`: Valid hex color (#RRGGBB)

---

## 7. Admin-Only Endpoints

### 7.1 List All Organization Workspaces (Admin)

```
GET /api/ws/admin/workspaces?orgId={uuid}
```

**Permissions:** `org_admin`, `org_owner`

**Description:** Returns all workspaces in organization, including ones the admin is not a member of.

**Additional Fields:**
- `owner_profile`: Primary owner information
- `resource_counts`: Associated chats, KBs, workflows
- `last_activity`: Most recent activity timestamp

### 7.2 Admin Restore Workspace

```
POST /api/ws/admin/workspaces/{id}/restore
```

**Permissions:** `org_owner` only

**Description:** Restore any soft-deleted workspace, regardless of previous ownership.

### 7.3 Admin Force Delete

```
DELETE /api/ws/admin/workspaces/{id}?force=true
```

**Permissions:** `org_owner` only

**Description:** Permanently delete workspace immediately, bypassing retention period.

**Audit Log:** Creates audit entry with admin user, timestamp, and reason.

### 7.4 Transfer Ownership

```
POST /api/ws/admin/workspaces/{id}/transfer
```

**Request Body:**
```json
{
  "new_owner_id": "uuid"
}
```

**Permissions:** `org_owner` only

**Description:** Transfer primary ownership to another organization member.

---

## 8. Admin Testing Requirements

### 8.1 Platform Admin Tests

```typescript
// platform-admin.test.tsx
describe('Platform Admin - Workspace Configuration', () => {
  it('displays configuration form for platform_admin', async () => {});
  it('displays configuration form for platform_owner', async () => {});
  it('hides configuration from non-platform admins', async () => {});
  it('saves navigation label changes', async () => {});
  it('toggles feature flags', async () => {});
  it('validates color format', async () => {});
  it('shows preview of navigation changes', async () => {});
});
```

### 8.2 Organization Admin Tests

```typescript
// org-admin.test.tsx
describe('Organization Admin - Workspace Management', () => {
  it('displays all org workspaces for org_admin', async () => {});
  it('shows workspaces admin is not member of', async () => {});
  it('filters by status correctly', async () => {});
  it('bulk archives selected workspaces', async () => {});
  it('restores deleted workspace as org_owner', async () => {});
  it('prevents org_admin from force deleting', async () => {});
  it('allows org_owner to force delete', async () => {});
  it('displays analytics dashboard', async () => {});
});
```

### 8.3 Admin Card Tests

```typescript
// admin-cards.test.tsx
describe('Workspace Admin Cards', () => {
  it('shows platform card to platform_admin', () => {});
  it('shows org card to org_admin', () => {});
  it('hides platform card from org users', () => {});
  it('displays correct stats on org card', async () => {});
  it('navigates to correct routes on click', () => {});
});
```

### 8.4 Admin API Tests

```python
# test_admin_endpoints.py

def test_admin_list_all_workspaces():
    """Test org_admin can see all workspaces"""
    pass

def test_admin_list_workspaces_forbidden():
    """Test regular user cannot access admin endpoints"""
    pass

def test_admin_restore_workspace():
    """Test org_owner can restore any workspace"""
    pass

def test_admin_force_delete():
    """Test org_owner can force delete workspace"""
    pass

def test_admin_transfer_ownership():
    """Test org_owner can transfer workspace ownership"""
    pass

def test_config_update_platform_admin():
    """Test platform_admin can update config"""
    pass

def test_config_update_forbidden():
    """Test org_admin cannot update platform config"""
    pass
```

---

## 9. Audit Logging

### 9.1 Admin Actions to Log

| Action | Logged Fields |
|--------|--------------|
| Config Update | changed_fields, old_values, new_values |
| Admin Restore | workspace_id, previous_deleted_at, restored_by |
| Force Delete | workspace_id, workspace_name, deleted_by, reason |
| Transfer Ownership | workspace_id, old_owner, new_owner |
| Bulk Archive | workspace_ids, archived_by, count |

### 9.2 Audit Log Entry Format

```json
{
  "id": "uuid",
  "action": "admin_force_delete",
  "resource_type": "workspace",
  "resource_id": "uuid",
  "actor_id": "uuid",
  "actor_role": "org_owner",
  "org_id": "uuid",
  "details": {
    "workspace_name": "Old Project",
    "reason": "Cleanup of inactive workspace"
  },
  "timestamp": "2025-12-31T12:00:00Z"
}
```

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
