# Knowledge Base Module - Admin UX Specification

**Module Name:** module-kb  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 14, 2026

**Parent Specification:** [MODULE-KB-SPEC.md](./MODULE-KB-SPEC.md)

---

## Table of Contents

1. [Admin Personas](#1-admin-personas)
2. [Admin Flows](#2-admin-flows)
3. [Page Specifications](#3-page-specifications)
4. [Admin Card Specifications](#4-admin-card-specifications)
5. [Component Library](#5-component-library)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Accessibility Requirements](#7-accessibility-requirements)
8. [Admin Testing](#8-admin-testing)

---

## 1. Admin Personas

### 1.1 Platform Admin (System Administrator)

**Profile:**
- Manages platform-wide resources and configurations
- Creates and curates global knowledge bases
- Controls which organizations can access global KBs
- Monitors platform-wide KB usage and health

**Goals:**
- Create authoritative platform-wide KB resources
- Efficiently distribute global KBs to organizations
- Monitor document processing and embedding status
- Track storage and token usage across platform

**Pain Points:**
- Managing KB access across many organizations
- Monitoring processing status of large document batches
- Understanding cross-org usage patterns

**Key Tasks:**
1. Create/edit/delete global KBs
2. Upload documents to global KBs
3. Associate/disassociate global KBs with orgs
4. View platform-wide KB analytics
5. Monitor document processing health

---

### 1.2 Org Admin (Organization Administrator)

**Profile:**
- Manages organization-level resources
- Creates and curates org-specific knowledge bases
- Controls which KBs are available to workspace admins
- Enables global KBs shared by platform admin

**Goals:**
- Build org-specific knowledge repositories
- Control access to sensitive organizational documents
- Enable relevant global KBs for org members
- Monitor org KB usage and costs

**Pain Points:**
- Balancing security with accessibility
- Managing document approvals and quality
- Understanding workspace-level KB usage

**Key Tasks:**
1. Create/edit/delete org KBs
2. Upload documents to org KBs
3. Enable/disable global KBs for org
4. Configure org KB permissions (who can upload)
5. View org KB usage analytics

---

### 1.3 Workspace Admin

**Profile:**
- Manages workspace-level settings
- Controls which KBs are available for workspace chats
- Does NOT create KBs (workspace KB auto-created)

**Goals:**
- Enable relevant org/global KBs for workspace members
- Manage workspace document collection
- Control KB grounding defaults for workspace chats

**Pain Points:**
- Too many available KBs to choose from
- Understanding which KBs are most relevant

**Key Tasks:**
1. Enable/disable org and global KBs for workspace
2. View workspace KB usage
3. Manage workspace KB documents

---

## 2. Admin Flows

### 2.1 Create Global KB (Platform Admin)

```
┌─────────────────┐
│ Navigate to     │
│ Admin Dashboard │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click KB Card   │
│ "Manage Global  │
│ KBs" Button     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Global KB List  │
│ Page Loads      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "+ Create │
│ Global KB"      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Create Global KB Dialog:                │
│                                         │
│ Name: [__________________________]      │
│ Description: [____________________]     │
│                                         │
│ Configuration:                          │
│ [✓] Auto-index uploaded documents       │
│ [ ] Require approval before indexing    │
│                                         │
│ [Cancel] [Create KB]                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ KB Created      │
│ Redirect to KB  │
│ Detail Page     │
└─────────────────┘
```

**Success Criteria:**
- Creation < 2 seconds
- Clear validation messages
- Auto-redirect to detail page

---

### 2.2 Associate Global KB with Organizations

```
┌─────────────────┐
│ Global KB       │
│ Detail Page     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Manage   │
│ Org Access" Tab │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Organization Access (Step 1):           │
│                                         │
│ Search: [________________________]      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Org Name         │ Status │ Actions │ │
│ ├───────────────────┼────────┼─────────┤ │
│ │ Acme Corp        │ ✓ On   │ [Disable]│ │
│ │ TechStart Inc    │ ✗ Off  │ [Enable] │ │
│ │ Innovate LLC     │ ✓ On   │ [Disable]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Organization]                    │
└─────────────────────────────────────────┘
```

**Success Criteria:**
- Toggle status < 500ms
- Search filters instantly
- Bulk enable/disable available

---

### 2.3 Create Org KB (Org Admin)

```
┌─────────────────┐
│ Navigate to     │
│ Admin Dashboard │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click KB Card   │
│ "Manage Org     │
│ KBs" Button     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Org KB List     │
│ Page Loads      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "+ Create │
│ Org KB"         │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Create Org KB Dialog:                   │
│                                         │
│ Name: [__________________________]      │
│ Description: [____________________]     │
│                                         │
│ Who can upload documents:               │
│ ( ) Only admins                         │
│ (•) All org members                     │
│                                         │
│ Configuration:                          │
│ [✓] Auto-index uploaded documents       │
│                                         │
│ [Cancel] [Create KB]                    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ KB Created      │
│ Redirect to KB  │
│ Detail Page     │
└─────────────────┘
```

---

### 2.4 Enable Global KB for Organization

```
┌─────────────────┐
│ Org Admin       │
│ Dashboard       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click KB Card   │
│ "Manage Org     │
│ KBs" Button     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Global   │
│ KBs" Tab        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Available Global KBs:                   │
│                                         │
│ These KBs are shared by platform admin. │
│ Enable them to make available to your   │
│ organization's workspaces.              │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ KB Name          │ Docs │ Status    │ │
│ ├──────────────────┼──────┼───────────┤ │
│ │ CORA Best        │ 100  │ [✓] On    │ │
│ │ Practices        │      │           │ │
│ │ Industry Regs    │ 50   │ [ ] Off   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

### 2.5 Upload Documents to Admin KB

```
┌─────────────────┐
│ KB Detail Page  │
│ (Org or Global) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Documents│
│ " Tab           │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Documents                               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📄 Drag & drop files here           │ │
│ │    or click to upload               │ │
│ │    PDF, DOCX, TXT, MD (max 50 MB)   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Name       │ Size   │ Status │ ⋯ │   │ │
│ ├────────────┼────────┼────────┼───┤   │ │
│ │ policy.pdf │ 2.5 MB │ ✓ Done │ ⋯ │   │ │
│ │ guide.docx │ 500 KB │ ⟳ Proc │ ⋯ │   │ │
│ │ faq.md     │ 15 KB  │ ✗ Fail │ ⋯ │   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [↓ Download All] [🗑️ Delete Selected]  │
└─────────────────────────────────────────┘
```

---

## 3. Page Specifications

### 3.1 Platform Admin: Global KB List Page

**Route:** `/admin/sys/kb`

**Purpose:** List and manage all global (platform-wide) knowledge bases.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin > System > Knowledge Bases                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Global Knowledge Bases                    [+ Create Global KB]  │
│                                                                 │
│ Platform-wide knowledge bases that can be shared with any       │
│ organization.                                                   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Search: [________________________] [Filter ▼] [Sort ▼]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Name           │ Docs │ Orgs │ Status   │ Created   │ ⋯ │   │ │
│ ├────────────────┼──────┼──────┼──────────┼───────────┼───┤   │ │
│ │ CORA Best      │ 100  │ 5    │ ● Active │ Jan 1     │ ⋯ │   │ │
│ │ Practices      │      │      │          │           │   │   │ │
│ │ Industry Regs  │ 50   │ 3    │ ● Active │ Dec 15    │ ⋯ │   │ │
│ │ Training Docs  │ 25   │ 0    │ ○ Draft  │ Dec 20    │ ⋯ │   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Showing 3 of 3 global KBs                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `GlobalKBTable` - List of global KBs with stats
- `CreateGlobalKBDialog` - Modal for KB creation
- `SearchFilterBar` - Search and filter controls

**States:**
- **Empty:** No global KBs, prompt to create first
- **Loading:** Table skeleton
- **Error:** API error with retry
- **Success:** KBs displayed

---

### 3.2 Platform Admin: Global KB Detail Page

**Route:** `/admin/sys/kb/[id]`

**Purpose:** View and manage a specific global KB (documents, org access, settings).

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin > System > Knowledge Bases > CORA Best Practices          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ CORA Best Practices                              [Edit] [Delete]│
│ Platform-wide best practices and guidelines                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📊 Overview │ 📄 Documents │ 🏢 Org Access │ ⚙️ Settings     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                      OVERVIEW TAB                           │ │
│ │                                                             │ │
│ │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │ │
│ │ │ 📄 Documents  │ │ 🧩 Chunks     │ │ 🏢 Orgs       │       │ │
│ │ │     100       │ │    3,000      │ │     5         │       │ │
│ │ └───────────────┘ └───────────────┘ └───────────────┘       │ │
│ │                                                             │ │
│ │ Recent Activity:                                            │ │
│ │ • 5 new documents indexed today                             │ │
│ │ • 2 orgs enabled this KB yesterday                          │ │
│ │                                                             │ │
│ │ Storage: 45 MB / 500 MB                                     │ │
│ │ ████████████░░░░░░░░ 9%                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Overview** - Stats, recent activity, storage
2. **Documents** - Document list with upload zone
3. **Org Access** - Enable/disable per organization
4. **Settings** - KB configuration

---

### 3.3 Org Admin: Org KB List Page

**Route:** `/admin/org/kb`

**Purpose:** List and manage organization knowledge bases and enable global KBs.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Admin > Organization > Knowledge Bases                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📁 Org KBs │ 🌐 Global KBs                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════ │
│                       ORG KBs TAB                               │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ Organization Knowledge Bases                [+ Create Org KB]   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Name           │ Docs │ Enabled │ Created   │ Actions │     │ │
│ ├────────────────┼──────┼─────────┼───────────┼─────────┤     │ │
│ │ Company        │ 25   │ ✓ Yes   │ Jan 1     │ ⋯       │     │ │
│ │ Policies       │      │         │           │         │     │ │
│ │ Dept Guidelines│ 15   │ ✓ Yes   │ Dec 15    │ ⋯       │     │ │
│ │ Training Docs  │ 10   │ ○ No    │ Dec 20    │ ⋯       │     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Tabs:**
1. **Org KBs** - Organization-created KBs
2. **Global KBs** - Platform KBs available to enable

---

### 3.4 Org Admin: Global KBs Tab

**Purpose:** View and enable/disable global KBs shared by platform admin.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ═══════════════════════════════════════════════════════════════ │
│                       GLOBAL KBs TAB                            │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ Available Global Knowledge Bases                                │
│                                                                 │
│ These KBs are shared by your platform administrator.            │
│ Enable them to make available to your workspace admins.         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ KB Name          │ Description      │ Docs │ Status │       │ │
│ ├──────────────────┼──────────────────┼──────┼────────┤       │ │
│ │ CORA Best        │ Platform best    │ 100  │ [✓]    │       │ │
│ │ Practices        │ practices        │      │ On     │       │ │
│ │                  │                  │      │        │       │ │
│ │ Industry Regs    │ Regulatory       │ 50   │ [ ]    │       │ │
│ │                  │ compliance       │      │ Off    │       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ℹ️ Enabled KBs can be further enabled by workspace admins for   │
│    their workspaces.                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Admin Card Specifications

### 4.1 Platform Admin KB Card

**Location:** Platform Admin Dashboard

**Purpose:** Quick access to global KB management with key stats.

**Layout:**

```
┌─────────────────────────────────────────┐
│ 📚 Knowledge Bases                      │
├─────────────────────────────────────────┤
│                                         │
│ ┌───────────┐    ┌───────────┐          │
│ │ 📁 3      │    │ 📄 175    │          │
│ │ Global KBs│    │ Documents │          │
│ └───────────┘    └───────────┘          │
│                                         │
│ ┌───────────┐    ┌───────────┐          │
│ │ 🏢 12     │    │ 💾 125 MB │          │
│ │ Orgs      │    │ Storage   │          │
│ └───────────┘    └───────────┘          │
│                                         │
│ ⟳ 3 documents processing...             │
│                                         │
├─────────────────────────────────────────┤
│ [Manage Global KBs →]                   │
└─────────────────────────────────────────┘
```

**Props:**

```typescript
interface PlatformKBAdminCardProps {
  stats: {
    globalKbCount: number;
    totalDocuments: number;
    orgsWithAccess: number;
    totalStorage: number;  // bytes
    processingDocuments: number;
  };
  onManage: () => void;
}
```

**Data Fetching:**

```typescript
// GET /admin/sys/kbs/stats
{
  "success": true,
  "data": {
    "globalKbCount": 3,
    "totalDocuments": 175,
    "orgsWithAccess": 12,
    "totalStorage": 131072000,
    "processingDocuments": 3
  }
}
```

---

### 4.2 Org Admin KB Card

**Location:** Org Admin Dashboard

**Purpose:** Quick access to org KB management with key stats.

**Layout:**

```
┌─────────────────────────────────────────┐
│ 📚 Knowledge Bases                      │
├─────────────────────────────────────────┤
│                                         │
│ ┌───────────┐    ┌───────────┐          │
│ │ 📁 5      │    │ 📄 50     │          │
│ │ Org KBs   │    │ Documents │          │
│ └───────────┘    └───────────┘          │
│                                         │
│ ┌───────────┐    ┌───────────┐          │
│ │ 🌐 2      │    │ 💾 25 MB  │          │
│ │ Global On │    │ Storage   │          │
│ └───────────┘    └───────────┘          │
│                                         │
│ 3 of 4 available global KBs enabled     │
│                                         │
├─────────────────────────────────────────┤
│ [Manage Org KBs →]                      │
└─────────────────────────────────────────┘
```

**Props:**

```typescript
interface OrgKBAdminCardProps {
  stats: {
    orgKbCount: number;
    totalDocuments: number;
    globalKbsEnabled: number;
    globalKbsAvailable: number;
    totalStorage: number;
  };
  onManage: () => void;
}
```

---

## 5. Component Library

### 5.1 GlobalKBTable

**Purpose:** Display list of global KBs with stats and actions.

**Props:**

```typescript
interface GlobalKBTableProps {
  kbs: GlobalKB[];
  onEdit: (kbId: string) => void;
  onDelete: (kbId: string) => void;
  onView: (kbId: string) => void;
  loading?: boolean;
}

interface GlobalKB {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  orgCount: number;  // Orgs with access enabled
  isEnabled: boolean;
  createdAt: string;
  createdBy: string;
}
```

**Columns:**
- **Name:** KB name with link to detail
- **Docs:** Document count
- **Orgs:** Number of orgs with access
- **Status:** Active/Inactive badge
- **Created:** Date created
- **Actions:** Edit, Delete menu

---

### 5.2 OrgKBTable

**Purpose:** Display list of org KBs with stats and actions.

**Props:**

```typescript
interface OrgKBTableProps {
  kbs: OrgKB[];
  onEdit: (kbId: string) => void;
  onDelete: (kbId: string) => void;
  onView: (kbId: string) => void;
  loading?: boolean;
}

interface OrgKB {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  chunkCount: number;
  isEnabled: boolean;
  config: {
    whoCanUpload: 'admin' | 'all_members';
    autoIndex: boolean;
  };
  createdAt: string;
  createdBy: string;
}
```

---

### 5.3 OrgAccessManager

**Purpose:** Manage which organizations have access to a global KB.

**Props:**

```typescript
interface OrgAccessManagerProps {
  kbId: string;
  associations: OrgAssociation[];
  onToggle: (orgId: string, enabled: boolean) => Promise<void>;
  onAddOrg: (orgId: string) => Promise<void>;
  onRemoveOrg: (orgId: string) => Promise<void>;
  loading?: boolean;
}

interface OrgAssociation {
  orgId: string;
  orgName: string;
  isEnabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
}
```

**Features:**
- Search/filter organizations
- Toggle enable/disable per org
- Add new org association
- Remove org association
- Show enable/disable timestamps

---

### 5.4 GlobalKBToggleList

**Purpose:** Allow org admins to enable/disable available global KBs.

**Props:**

```typescript
interface GlobalKBToggleListProps {
  globalKbs: AvailableGlobalKB[];
  onToggle: (kbId: string, enabled: boolean) => Promise<void>;
  loading?: boolean;
}

interface AvailableGlobalKB {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  isEnabled: boolean;  // Whether org has enabled this KB
  sharedAt: string;    // When platform admin shared
  sharedBy: string;    // Platform admin who shared
}
```

**Features:**
- Toggle switches for each global KB
- Document count display
- Description tooltip
- Optimistic updates

---

### 5.5 CreateKBDialog

**Purpose:** Modal dialog for creating new KBs (global or org).

**Props:**

```typescript
interface CreateKBDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateKBData) => Promise<void>;
  scope: 'global' | 'org';
  orgId?: string;  // Required for org scope
}

interface CreateKBData {
  name: string;
  description?: string;
  config: {
    whoCanUpload?: 'admin' | 'all_members';  // Org only
    autoIndex: boolean;
  };
}
```

**Form Fields:**
- **Name:** Required, 1-255 characters
- **Description:** Optional, max 1000 characters
- **Who can upload:** Org scope only, radio buttons
- **Auto-index:** Checkbox, default true

**Validation:**
- Name required
- Name unique within scope
- Description max length

---

### 5.6 KBStatsCards

**Purpose:** Display KB statistics in card format.

**Props:**

```typescript
interface KBStatsCardsProps {
  stats: KBStats;
  showOrgCount?: boolean;  // For global KBs
  showStorage?: boolean;
}

interface KBStats {
  documentCount: number;
  chunkCount: number;
  totalSize: number;
  orgCount?: number;
  processingCount?: number;
  failedCount?: number;
}
```

**Cards:**
- 📄 Documents (count)
- 🧩 Chunks (count)
- 💾 Storage (formatted size)
- 🏢 Organizations (global KBs only)
- ⟳ Processing (if any)
- ✗ Failed (if any)

---

### 5.7 AdminDocumentTable

**Purpose:** Extended document table with admin actions.

**Props:**

```typescript
interface AdminDocumentTableProps {
  documents: KBDocument[];
  onDelete: (docId: string) => Promise<void>;
  onRetry: (docId: string) => Promise<void>;
  onDownload: (docId: string) => Promise<void>;
  onBulkDelete: (docIds: string[]) => Promise<void>;
  selectable?: boolean;
  loading?: boolean;
}
```

**Features:**
- All user features
- Bulk selection
- Bulk delete
- Retry failed documents
- Processing priority controls
- Upload history

---

## 6. Interaction Patterns

### 6.1 KB CRUD Operations

**Create:**
1. Click "Create KB" button
2. Dialog opens with form
3. Fill required fields
4. Click "Create"
5. Optimistic UI: Show loading
6. Success: Close dialog, show KB in list
7. Error: Keep dialog open, show error

**Edit:**
1. Click edit button/menu
2. Dialog opens with current values
3. Make changes
4. Click "Save"
5. Optimistic UI: Update immediately
6. Success: Close dialog
7. Error: Revert changes, show error

**Delete:**
1. Click delete button/menu
2. Confirmation dialog opens
3. Type KB name to confirm (for safety)
4. Click "Delete"
5. Optimistic UI: Remove from list
6. Success: Show toast
7. Error: Restore in list, show error

---

### 6.2 Org Access Toggle

**Enable:**
1. Find org in list
2. Click toggle/enable button
3. Optimistic UI: Show enabled
4. API call in background
5. Success: Keep state
6. Error: Revert, show error

**Disable:**
1. Click toggle/disable button
2. Confirmation if org has active usage
3. Optimistic UI: Show disabled
4. API call in background
5. Success: Keep state
6. Error: Revert, show error

---

### 6.3 Bulk Document Operations

**Bulk Delete:**
1. Select multiple documents (checkboxes)
2. Click "Delete Selected"
3. Confirmation dialog with count
4. Click "Delete"
5. Progress indicator
6. Success: Remove from list, show count
7. Error: Show failed items

**Bulk Retry:**
1. Select failed documents
2. Click "Retry Selected"
3. Optimistic UI: Status → pending
4. Documents re-queued for processing
5. Status updates via polling

---

## 7. Accessibility Requirements

### 7.1 Admin-Specific Requirements

**Data Tables:**
- Proper ARIA table semantics
- Sortable column headers with ARIA attributes
- Row selection with keyboard (Space)
- Bulk action focus management

**Dialogs:**
- Focus trap within dialog
- Escape key closes
- Return focus to trigger element
- Form validation announced

**Toggle Controls:**
- Clear on/off state announced
- Loading state announced
- Error state announced

---

### 7.2 Keyboard Navigation

| Component | Tab | Space/Enter | Escape |
|-----------|-----|-------------|--------|
| KB Table | Move between rows | Expand/select row | - |
| Org Access List | Move between orgs | Toggle access | - |
| Create Dialog | Move between fields | Submit form | Close dialog |
| Delete Confirm | Move between buttons | Activate button | Close dialog |
| Document Select | Move between docs | Toggle selection | Clear selection |

---

## 8. Admin Testing

### 8.1 Component Tests

```typescript
// tests/admin/components/GlobalKBTable.test.tsx

describe('GlobalKBTable', () => {
  it('renders list of global KBs', () => {
    render(<GlobalKBTable kbs={mockKbs} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByText('CORA Best Practices')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // doc count
    expect(screen.getByText('5')).toBeInTheDocument();   // org count
  });
  
  it('calls onEdit when edit clicked', async () => {
    const onEdit = jest.fn();
    render(<GlobalKBTable kbs={mockKbs} onEdit={onEdit} onDelete={jest.fn()} />);
    
    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith('kb-123');
  });
  
  it('shows empty state when no KBs', () => {
    render(<GlobalKBTable kbs={[]} onEdit={jest.fn()} onDelete={jest.fn()} />);
    
    expect(screen.getByText(/no global knowledge bases/i)).toBeInTheDocument();
  });
});
```

---

### 8.2 Page Tests

```typescript
// tests/admin/pages/GlobalKBListPage.test.tsx

describe('GlobalKBListPage', () => {
  it('loads and displays global KBs', async () => {
    render(<GlobalKBListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('CORA Best Practices')).toBeInTheDocument();
    });
  });
  
  it('opens create dialog on button click', async () => {
    render(<GlobalKBListPage />);
    
    await userEvent.click(screen.getByRole('button', { name: /create global kb/i }));
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });
  
  it('creates KB and shows in list', async () => {
    render(<GlobalKBListPage />);
    
    await userEvent.click(screen.getByRole('button', { name: /create global kb/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'New KB');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    await waitFor(() => {
      expect(screen.getByText('New KB')).toBeInTheDocument();
    });
  });
});
```

---

### 8.3 E2E Tests

```typescript
// tests/e2e/admin-kb.spec.ts

test.describe('Admin KB Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as platform admin
    await loginAsPlatformAdmin(page);
  });
  
  test('create global KB flow', async ({ page }) => {
    await page.goto('/admin/sys/kb');
    await page.click('text=Create Global KB');
    
    await page.fill('input[name="name"]', 'Test Global KB');
    await page.fill('textarea[name="description"]', 'Test description');
    await page.click('text=Create');
    
    await expect(page.locator('text=Test Global KB')).toBeVisible();
  });
  
  test('enable global KB for org', async ({ page }) => {
    await page.goto('/admin/sys/kb/test-kb-id');
    await page.click('text=Org Access');
    
    const toggle = page.locator('role=switch[name="Acme Corp"]');
    await toggle.click();
    
    await expect(toggle).toBeChecked();
  });
  
  test('upload document to global KB', async ({ page }) => {
    await page.goto('/admin/sys/kb/test-kb-id');
    await page.click('text=Documents');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Drag & drop files');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./fixtures/test.pdf');
    
    await expect(page.locator('text=test.pdf')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });
});
```

---

### 8.4 Test Coverage Requirements

| Category | Target Coverage |
|----------|-----------------|
| Admin Components | ≥ 85% |
| Admin Pages | ≥ 80% |
| Admin Hooks | ≥ 90% |
| E2E Critical Paths | 100% |

**Critical Admin Paths (100% E2E coverage):**
1. Create global KB
2. Associate global KB with org
3. Create org KB
4. Enable global KB for org
5. Upload documents to admin KB
6. Delete KB with confirmation

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Author:** Cline AI Agent  
**Specification Type:** Admin UX
