# Workspace Module - User UX Specification

**Module Name:** module-ws  
**Parent Spec:** [MODULE-WS-SPEC.md](./MODULE-WS-SPEC.md)  
**Status:** Draft  
**Last Updated:** December 31, 2025

---

## 1. User Personas

### 1.1 Team Member (Workspace User)

**Role:** `ws_user`

**Description:** Regular team member who uses workspaces to access shared resources and collaborate with colleagues.

**Goals:**
- Quickly find and access workspaces they belong to
- View workspace resources (chats, knowledge bases, workflows)
- Favorite frequently used workspaces for quick access
- See who else is in the workspace

**Pain Points:**
- Too many workspaces to scroll through
- Difficulty finding specific workspaces
- Unclear which workspaces are active vs archived

**Technical Proficiency:** Low to Medium

**Usage Frequency:** Daily

---

### 1.2 Team Lead (Workspace Admin)

**Role:** `ws_admin`

**Description:** Team lead who manages workspace settings and collaborates with team members.

**Goals:**
- Update workspace details (name, description, tags)
- Customize workspace appearance (color, icon)
- View team members and their roles
- Archive inactive workspaces

**Pain Points:**
- Cannot add/remove team members (needs owner)
- Limited visibility into workspace activity
- Manual effort to organize workspaces with tags

**Technical Proficiency:** Medium

**Usage Frequency:** Daily to Weekly

---

### 1.3 Project Owner (Workspace Owner)

**Role:** `ws_owner`

**Description:** Project owner with full control over workspace configuration and membership.

**Goals:**
- Create new workspaces for projects/teams
- Add and remove team members
- Assign appropriate roles to members
- Delete workspaces when no longer needed
- Restore accidentally deleted workspaces

**Pain Points:**
- Risk of accidental deletion
- Managing member roles across multiple workspaces
- Maintaining workspace hygiene (archiving old workspaces)

**Technical Proficiency:** Medium to High

**Usage Frequency:** Weekly

---

## 2. Use Cases

### UC-1: Browse Workspaces

**Actor:** Team Member, Team Lead, Project Owner  
**Preconditions:** User is authenticated and member of at least one organization  
**Trigger:** User navigates to Workspaces page

**Main Flow:**
1. User clicks "Workspaces" in sidebar navigation
   - *Note: The sidebar label is configurable by platform admins (e.g., "Workspaces", "Audits", "Campaigns"). The actual label shown is determined by `ws_config.nav_label_plural`.*
2. System displays list of workspaces user belongs to
3. Workspaces are sorted by last updated (favorites first if enabled)
4. User can see workspace name, color, icon, tags, and member count
5. User can filter by favorites, search by name, or filter by tags

**Alternative Flows:**
- A1: No workspaces - System shows empty state with "Create Workspace" CTA
- A2: Many workspaces - System paginates results (100 per page)

**Postconditions:** User can select a workspace to view details

---

### UC-2: Create Workspace

**Actor:** Any organization member  
**Preconditions:** User is member of at least one organization, user has navigated to the workspaces list page  
**Trigger:** User clicks "+ New Workspace" button on the workspaces list page

**Main Flow:**
1. User navigates to the workspaces list page (via sidebar navigation)
2. User clicks "+ New Workspace" button in the page header
3. System displays workspace creation form
4. User enters required workspace name
5. User optionally adds description, selects color, icon, and tags
6. User clicks "Create" button
7. System creates workspace and adds user as owner
8. System navigates to new workspace detail page

**Alternative Flows:**
- A1: Duplicate name - System shows error "Workspace name already exists"
- A2: Validation error - System highlights invalid fields with error messages

**Postconditions:** New workspace exists with user as ws_owner

---

### UC-3: Favorite Workspace

**Actor:** Team Member, Team Lead, Project Owner  
**Preconditions:** User is member of the workspace  
**Trigger:** User clicks favorite (star) icon

**Main Flow:**
1. User clicks star icon on workspace card or detail page
2. System toggles favorite status
3. UI updates to show filled/unfilled star
4. Workspace moves to/from favorites section if "favorites first" is enabled

**Postconditions:** Workspace favorite status is toggled

---

### UC-4: Edit Workspace

**Actor:** Team Lead (ws_admin), Project Owner (ws_owner)  
**Preconditions:** User has ws_admin or ws_owner role  
**Trigger:** User clicks "Edit" on workspace detail page

**Main Flow:**
1. User navigates to workspace detail page
2. User clicks "Edit Workspace" or settings icon
3. System displays edit form with current values
4. User modifies desired fields
5. User clicks "Save Changes"
6. System validates and saves changes
7. System shows success notification

**Alternative Flows:**
- A1: ws_admin tries to change status - Field is disabled with tooltip
- A2: Validation error - System highlights invalid fields

**Postconditions:** Workspace is updated with new values

---

### UC-5: Manage Members

**Actor:** Project Owner (ws_owner)  
**Preconditions:** User has ws_owner role  
**Trigger:** User navigates to Members tab

**Main Flow:**
1. User opens workspace detail page
2. User clicks "Members" tab
3. System displays list of members with roles
4. Owner can:
   - Click "Add Member" to invite new members
   - Change member roles via dropdown
   - Remove members via delete button
5. Changes take effect immediately

**Alternative Flows:**
- A1: Remove last owner - System shows error "Cannot remove last owner"
- A2: Add duplicate member - System shows error "User is already a member"

**Postconditions:** Membership changes are saved

---

### UC-6: Delete Workspace

**Actor:** Project Owner (ws_owner)  
**Preconditions:** User has ws_owner role  
**Trigger:** User clicks "Delete Workspace"

**Main Flow:**
1. User clicks "Delete Workspace" in settings
2. System shows confirmation dialog with retention info
3. User confirms deletion
4. System soft-deletes workspace
5. System shows success message with restore option
6. Workspace disappears from list

**Alternative Flows:**
- A1: User cancels - Dialog closes, no changes
- A2: Permanent delete - Additional confirmation required

**Postconditions:** Workspace is soft-deleted, can be restored within retention period

---

### UC-7: Restore Workspace

**Actor:** Previous Owner (ws_owner)  
**Preconditions:** Workspace was soft-deleted, retention period not expired  
**Trigger:** User accesses deleted workspaces view

**Main Flow:**
1. User navigates to "Deleted Workspaces" (via filter or admin)
2. System displays soft-deleted workspaces with deletion date
3. User clicks "Restore" on desired workspace
4. System restores workspace and all members
5. Workspace appears in active list

**Postconditions:** Workspace and members are restored

---

## 3. User Journeys

### Journey 1: New User Finding Workspaces

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────────────┐
│   Login     │ ──▶ │  Dashboard   │ ──▶ │   Workspaces    │ ──▶ │   Workspace    │
│             │     │              │     │     List        │     │    Detail      │
└─────────────┘     └──────────────┘     └─────────────────┘     └────────────────┘
                           │                      │
                           │                      ▼
                           │              ┌─────────────────┐
                           │              │  Empty State    │
                           │              │ "No workspaces" │
                           │              └─────────────────┘
                           │                      │
                           │                      ▼
                           │              ┌─────────────────┐
                           └─────────────▶│ Create First    │
                                          │   Workspace     │
                                          └─────────────────┘
```

### Journey 2: Owner Managing Workspace

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Workspace   │ ──▶ │   Settings   │ ──▶ │  Edit Details   │
│   Detail    │     │     Tab      │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
      │                   │
      │                   ▼
      │           ┌──────────────┐     ┌─────────────────┐
      │           │   Members    │ ──▶ │  Add Member     │
      │           │     Tab      │     │    Dialog       │
      │           └──────────────┘     └─────────────────┘
      │                   │
      │                   ▼
      │           ┌──────────────┐     ┌─────────────────┐
      │           │   Danger     │ ──▶ │  Delete Dialog  │
      │           │    Zone      │     │                 │
      │           └──────────────┘     └─────────────────┘
      │
      ▼
┌─────────────┐
│  Overview   │
│    Tab      │
└─────────────┘
```

---

## 4. Page Specifications

### 4.1 Workspaces List Page

**Route:** `/workspaces` or `/{nav_label_plural}` (e.g., `/audits`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: "{nav_label_plural}"                    [+ New Workspace] │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Search...] [Favorites ▼] [Tags ▼] [Status ▼]          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ★ Workspace 1│  │   Workspace 2│  │   Workspace 3│          │
│  │   ▓▓▓▓▓▓▓   │  │   ▓▓▓▓▓▓▓   │  │   ▓▓▓▓▓▓▓   │          │
│  │ Description  │  │ Description  │  │ Description  │          │
│  │ [tag1][tag2] │  │ [tag3]       │  │ [tag1][tag4] │          │
│  │ 5 members    │  │ 3 members    │  │ 8 members    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │   Workspace 4│  │   Workspace 5│                             │
│  │   ...        │  │   ...        │                             │
│  └──────────────┘  └──────────────┘                             │
│                                                                  │
│  [Load More] or Pagination                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `PageHeader` with title and "New Workspace" button
- `FilterBar` with search, favorites toggle, tag filter, status filter
- `WorkspaceGrid` with responsive card layout
- `WorkspaceCard` for each workspace
- `Pagination` or infinite scroll
- `EmptyState` when no workspaces

**Data Requirements:**
- Workspaces list with computed fields (is_favorited, user_role, member_count)
- Available tags for filter dropdown
- Workspace config for navigation labels

**States:**
- Loading: Skeleton cards
- Empty: "No workspaces yet" with create CTA
- Error: Error message with retry button
- Filtered empty: "No workspaces match filters" with clear filters CTA

---

### 4.2 Workspace Detail Page

**Route:** `/workspaces/{id}` or `/{nav_label_plural}/{id}`

**Note:** As additional modules are integrated (module-chat, module-kb, module-workflow), they will register additional tabs on this page. For example, a "Chats" tab for module-chat, a "Knowledge Bases" tab for module-kb, etc. The tab structure is extensible to support module-specific functionality within the workspace context.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Workspaces > Product Development                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────┐  Product Development                          [★] [⋮] │
│  │ 🟦 │  Main product development workspace                     │
│  └─────┘  [engineering] [product]                               │
│           5 members • Updated 2 hours ago                       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Overview]  [Members]  [Settings]                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Overview Tab Content:                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Quick Actions                                              ││
│  │  [Start Chat] [Create KB] [New Workflow]                    ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Recent Activity                                            ││
│  │  • New chat created by John (2 hours ago)                   ││
│  │  • KB document updated by Sarah (yesterday)                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**

1. **Overview Tab**
   - Workspace details (description, tags, status)
   - Quick actions (links to related modules)
   - Recent activity (if available)
   - Statistics (member count, resource counts)

2. **Members Tab**
   - Member list with avatars, names, roles
   - Add member button (owner only)
   - Role change dropdown (owner only)
   - Remove member button (owner only, self-remove for others)

3. **Settings Tab** (admin/owner only)
   - Edit workspace form
   - Danger zone (archive, delete)

**Components:**
- `Breadcrumbs` for navigation
- `WorkspaceHeader` with icon, name, description, tags
- `TabNavigation` for switching between tabs
- `MemberList` for members tab
- `WorkspaceForm` for settings tab
- `DangerZone` for delete actions

---

### 4.3 Create/Edit Workspace Dialog

**Trigger:** "New Workspace" button or "Edit" in settings

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Create New Workspace                                      [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Name *                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Product Development                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Description                                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Main product development workspace for Q1 initiatives       ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Color                          Icon                            │
│  ┌──────────────┐              ┌──────────────┐                │
│  │ 🔵 Blue      │              │ 📁 Folder    │                │
│  └──────────────┘              └──────────────┘                │
│                                                                  │
│  Tags                                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [engineering ×] [product ×] [+ Add tag]                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Status (edit only)                                              │
│  ○ Active  ○ Archived                                           │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                      [Cancel]  [Create/Save]    │
└─────────────────────────────────────────────────────────────────┘
```

**Fields:**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| name | Text input | Yes | 1-255 chars, unique per org | Auto-focus on open |
| description | Textarea | No | Max 5000 chars | Optional |
| color | Color picker | No | Hex color | Default from config |
| icon | Icon selector | No | MUI icon name | Default: WorkspaceIcon |
| tags | Tag input | No | Max 20 tags, 50 chars each | Autocomplete from existing |
| status | Radio buttons | No | active/archived | Only in edit mode |

**Behaviors:**
- Form validation on blur and submit
- Disable submit button until valid
- Show loading state during save
- Close dialog on success
- Show error toast on failure

---

### 4.4 Add Member Dialog

**Trigger:** "Add Member" button in Members tab

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Add Member                                                [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Search Users                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔍 Search by name or email...                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○ 👤 John Doe                                               ││
│  │   john@example.com                                          ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ● 👤 Sarah Smith                                            ││
│  │   sarah@example.com                                         ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ○ 👤 Mike Johnson                                           ││
│  │   mike@example.com                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Role                                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Member (ws_user)                                    ▼     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                      [Cancel]  [Add Member]     │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- User search with autocomplete (org members only)
- Radio selection for single user
- Role dropdown: Owner, Admin, Member
- Loading state during search
- Disable users already in workspace

---

### 4.5 Delete Confirmation Dialog

**Trigger:** "Delete Workspace" in settings

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Delete Workspace                                       [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Are you sure you want to delete "Product Development"?         │
│                                                                  │
│  This workspace will be soft-deleted and can be restored        │
│  within 30 days. After that, it will be permanently deleted.    │
│                                                                  │
│  • All members will lose access                                 │
│  • Favorites will be removed                                    │
│  • Associated resources will remain accessible                  │
│                                                                  │
│  Type workspace name to confirm:                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                       [Cancel]  [Delete]        │
└─────────────────────────────────────────────────────────────────┘
```

**Behaviors:**
- Require typing workspace name to enable delete button
- Show warning about consequences
- Show retention period info
- Red styling for delete button

---

## 5. Component Library Usage

### Material UI Components

| Component | Usage |
|-----------|-------|
| `Card` | Workspace cards in grid |
| `Avatar` | User avatars, workspace icons |
| `Chip` | Tags, role badges |
| `TextField` | Form inputs |
| `Button` | Actions |
| `IconButton` | Favorite toggle, menu trigger |
| `Menu` / `MenuItem` | Context menus, dropdowns |
| `Dialog` | Modals for create/edit/delete |
| `Tabs` / `Tab` | Detail page tabs |
| `List` / `ListItem` | Member list |
| `Autocomplete` | User search, tag input |
| `Skeleton` | Loading states |
| `Alert` | Error/success messages |
| `Tooltip` | Help text, disabled states |
| `Breadcrumbs` | Navigation |

### Custom Components

| Component | Description |
|-----------|-------------|
| `WorkspaceCard` | Card with color, icon, tags, favorite |
| `WorkspaceForm` | Create/edit form with validation |
| `MemberList` | List with role management |
| `ColorPicker` | Preset color selection |
| `IconSelector` | MUI icon selection |
| `TagInput` | Multi-tag input with autocomplete |
| `EmptyState` | Empty list illustrations |
| `DangerZone` | Delete section with warnings |

---

## 6. Interaction Patterns

### 6.1 List Interactions

**Workspace Card:**
- Click card → Navigate to detail page
- Click favorite icon → Toggle favorite (stops propagation)
- Click menu (⋮) → Show context menu (Edit, Delete)
- Hover → Subtle elevation change

**Filtering:**
- Search → Debounced search as you type (300ms)
- Favorites filter → Toggle checkbox, instant filter
- Tags filter → Multi-select dropdown
- Status filter → Single-select dropdown

**Sorting:**
- Default: Favorites first, then by updated_at DESC
- Optional: Sort by name, created_at

### 6.2 Form Interactions

**Text Inputs:**
- Validate on blur
- Show error message below field
- Character count for limited fields

**Color Picker:**
- Preset colors in grid
- Custom hex input option
- Live preview on workspace card

**Tag Input:**
- Type to search existing tags
- Enter to add new tag
- Click X to remove tag
- Max tags limit enforced

### 6.3 Dialog Interactions

**Open/Close:**
- Open with animation (fade + scale)
- Close on backdrop click (unless dirty form)
- Close on Escape key
- Show unsaved changes warning if dirty

**Form Submission:**
- Disable submit until valid
- Show loading state during save
- Close on success with toast
- Stay open on error with message

---

## 7. Responsive Design

### Breakpoints

| Breakpoint | Width | Grid Columns |
|------------|-------|--------------|
| xs | 0-599px | 1 |
| sm | 600-899px | 2 |
| md | 900-1199px | 3 |
| lg | 1200-1535px | 4 |
| xl | 1536px+ | 5 |

### Mobile Adaptations

**Workspace List (xs):**
- Full-width cards, single column
- Compact filter bar (collapsed into menu)
- Bottom sheet for filters
- FAB for "New Workspace" instead of header button

**Workspace Detail (xs):**
- Tabs as scrollable chips
- Full-screen dialogs instead of modals
- Sticky header with actions
- Swipe actions on member list items

**Navigation (xs):**
- Bottom navigation with Workspaces icon
- Full-screen workspace selector

---

## 8. Accessibility Requirements

### WCAG 2.1 AA Compliance

#### Perceivable

- **1.1.1 Non-text Content**: All icons have aria-labels
- **1.3.1 Info and Relationships**: Proper heading hierarchy (h1-h6)
- **1.4.1 Use of Color**: Color is not the only indicator (icons, text)
- **1.4.3 Contrast**: 4.5:1 minimum for text, 3:1 for large text
- **1.4.11 Non-text Contrast**: 3:1 for UI components

#### Operable

- **2.1.1 Keyboard**: All interactive elements keyboard accessible
- **2.1.2 No Keyboard Trap**: Can tab through and escape all dialogs
- **2.4.3 Focus Order**: Logical tab order
- **2.4.4 Link Purpose**: Descriptive link text
- **2.4.6 Headings and Labels**: Descriptive headings
- **2.4.7 Focus Visible**: Clear focus indicators

#### Understandable

- **3.1.1 Language of Page**: `lang` attribute set
- **3.2.1 On Focus**: No unexpected context changes
- **3.3.1 Error Identification**: Errors clearly identified
- **3.3.2 Labels or Instructions**: All inputs labeled
- **3.3.3 Error Suggestion**: Helpful error messages

#### Robust

- **4.1.1 Parsing**: Valid HTML
- **4.1.2 Name, Role, Value**: ARIA attributes properly used

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move to next focusable element |
| Shift+Tab | Move to previous focusable element |
| Enter | Activate button, submit form |
| Space | Toggle checkbox, select option |
| Escape | Close dialog, cancel action |
| Arrow keys | Navigate list items, menu options |

### Screen Reader Support

- Live regions for dynamic content updates
- Announcements for loading states
- Descriptive labels for all form fields
- Error announcements on validation
- Role attributes for custom components

---

## 9. Frontend Implementation

### 9.1 API Client

```typescript
// frontend/lib/api.ts
import type { AuthenticatedClient } from '@ai-sec/api-client';
import type { Workspace, WorkspaceCreate, WorkspaceUpdate, WsMember } from '../types';

export interface WorkspaceApiClient {
  // Workspaces
  getWorkspaces: (orgId: string, params?: WorkspaceQueryParams) => Promise<WorkspaceListResponse>;
  getWorkspace: (id: string) => Promise<Workspace>;
  createWorkspace: (workspace: WorkspaceCreate) => Promise<Workspace>;
  updateWorkspace: (id: string, workspace: WorkspaceUpdate) => Promise<Workspace>;
  deleteWorkspace: (id: string, permanent?: boolean) => Promise<DeleteResponse>;
  restoreWorkspace: (id: string) => Promise<Workspace>;
  
  // Members
  getMembers: (workspaceId: string) => Promise<WsMember[]>;
  addMember: (workspaceId: string, member: WsMemberCreate) => Promise<WsMember>;
  updateMember: (workspaceId: string, memberId: string, update: WsMemberUpdate) => Promise<WsMember>;
  removeMember: (workspaceId: string, memberId: string) => Promise<void>;
  
  // Favorites
  toggleFavorite: (workspaceId: string) => Promise<FavoriteResponse>;
  getFavorites: (orgId?: string) => Promise<Workspace[]>;
}
```

### 9.2 Custom Hooks

```typescript
// frontend/hooks/useWorkspaces.ts
export function useWorkspaces(orgId: string, options?: UseWorkspacesOptions) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch, filter, sort logic
  
  return { workspaces, loading, error, refetch };
}

// frontend/hooks/useWorkspace.ts
export function useWorkspace(workspaceId: string) {
  // Single workspace with members
  return { workspace, members, loading, error, refetch };
}

// frontend/hooks/useWorkspaceForm.ts
export function useWorkspaceForm(initialValues?: Partial<WorkspaceCreate>) {
  // Form state, validation, submission
  return { values, errors, touched, handleChange, handleSubmit, isSubmitting };
}
```

### 9.3 Types

```typescript
// frontend/types/index.ts
export interface Workspace {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  tags: string[];
  status: 'active' | 'archived';
  deleted_at?: string;
  retention_days: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Computed fields
  is_favorited?: boolean;
  favorited_at?: string;
  user_role?: 'ws_owner' | 'ws_admin' | 'ws_user';
  member_count?: number;
}

export interface WsMember {
  id: string;
  ws_id: string;
  user_id: string;
  ws_role: 'ws_owner' | 'ws_admin' | 'ws_user';
  created_at: string;
  profile?: UserProfile;
}

export interface WsConfig {
  nav_label_singular: string;
  nav_label_plural: string;
  nav_icon: string;
  enable_favorites: boolean;
  enable_tags: boolean;
  enable_color_coding: boolean;
  default_color: string;
}
```

---

## 10. Frontend Testing Requirements

### Component Tests

```typescript
// WorkspaceList.test.tsx
describe('WorkspaceList', () => {
  it('displays loading skeleton while fetching', async () => {});
  it('displays workspace cards after loading', async () => {});
  it('displays empty state when no workspaces', async () => {});
  it('filters workspaces by favorites', async () => {});
  it('filters workspaces by search term', async () => {});
  it('filters workspaces by tags', async () => {});
  it('sorts favorites first when enabled', async () => {});
  it('displays error state on fetch failure', async () => {});
});

// WorkspaceCard.test.tsx
describe('WorkspaceCard', () => {
  it('displays workspace name, description, tags', () => {});
  it('displays custom color and icon', () => {});
  it('shows favorite button for members', () => {});
  it('toggles favorite on star click', async () => {});
  it('shows user role badge', () => {});
  it('navigates to detail on card click', () => {});
  it('opens context menu on kebab click', () => {});
});

// WorkspaceForm.test.tsx
describe('WorkspaceForm', () => {
  it('validates required name field', async () => {});
  it('shows error for name over 255 chars', async () => {});
  it('validates hex color format', async () => {});
  it('limits tags to 20 max', async () => {});
  it('submits valid form data', async () => {});
  it('shows loading state during submission', async () => {});
  it('displays API errors', async () => {});
});

// MemberList.test.tsx
describe('MemberList', () => {
  it('displays member avatars and names', () => {});
  it('shows role badges for each member', () => {});
  it('shows add button for owners only', () => {});
  it('enables role change dropdown for owners', () => {});
  it('prevents removing last owner', async () => {});
  it('allows self-removal for non-owners', async () => {});
});
```

### Integration Tests

```typescript
// workspace-flows.test.tsx
describe('Workspace User Flows', () => {
  it('creates a new workspace successfully', async () => {});
  it('edits workspace as owner', async () => {});
  it('adds member to workspace', async () => {});
  it('removes member from workspace', async () => {});
  it('soft deletes and restores workspace', async () => {});
  it('favorites and unfavorites workspace', async () => {});
});
```

### Accessibility Tests

```typescript
// accessibility.test.tsx
describe('Workspace Accessibility', () => {
  it('passes axe audit on list page', async () => {});
  it('passes axe audit on detail page', async () => {});
  it('passes axe audit on create dialog', async () => {});
  it('has proper focus management in dialogs', async () => {});
  it('announces loading and error states', async () => {});
  it('supports full keyboard navigation', async () => {});
});
```

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
