# Knowledge Base Module - User UX Specification

**Module Name:** module-kb  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 14, 2026

**Parent Specification:** [MODULE-KB-SPEC.md](./MODULE-KB-SPEC.md)

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [User Flows](#2-user-flows)
3. [Page Specifications](#3-page-specifications)
4. [Component Library](#4-component-library)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Accessibility Requirements](#6-accessibility-requirements)
7. [Mobile Responsiveness](#7-mobile-responsiveness)
8. [Frontend Testing](#8-frontend-testing)

---

## 1. User Personas

### 1.1 Regular User (Workspace Member)

**Profile:**
- Team member working on projects within workspaces
- Needs to upload documents for AI context
- Wants to enable relevant org/global KBs for grounding
- Not responsible for KB administration

**Goals:**
- Upload documents quickly with drag-and-drop
- See processing status of uploaded documents
- Toggle available KBs to control AI context
- Search documents within workspace

**Pain Points:**
- Confusion about which KBs are available
- Unclear document processing status
- Large file upload failures

**Key Tasks:**
1. Upload document to workspace
2. View document processing status
3. Enable/disable available KBs
4. Delete own documents

---

### 1.2 Workspace Owner

**Profile:**
- Created or manages a workspace
- Responsible for workspace-level data management
- May configure workspace KB settings

**Goals:**
- Manage all documents in workspace KB
- Configure who can upload documents
- Monitor document processing status
- Clean up outdated documents

**Pain Points:**
- No visibility into which KBs are being used
- Difficulty managing large document sets
- Unclear storage usage

**Key Tasks:**
1. All Regular User tasks
2. Delete any document in workspace
3. Configure workspace KB settings
4. View workspace KB statistics

---

### 1.3 Chat User

**Profile:**
- Engaged in AI chat sessions
- Needs immediate document context for conversation
- May toggle available KBs for grounding

**Goals:**
- Upload documents directly to chat
- Enable workspace/org/global KBs for context
- Get accurate citations in AI responses

**Pain Points:**
- Slow document processing delays chat
- Too many KBs enabled causes noise
- Citation links not working

**Key Tasks:**
1. Upload document to chat
2. Toggle KBs for chat grounding
3. View KB sources in AI response citations

---

## 2. User Flows

### 2.1 Upload Document to Workspace

```
┌─────────────────┐
│ Navigate to     │
│ Workspace       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click "Data"    │
│ Tab             │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Drag & Drop OR  │────▶│ File Validation │
│ Click to Upload │     │ (type, size)    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
           ┌──────────────┐          ┌──────────────┐
           │ Valid File   │          │ Invalid File │
           │ → Upload     │          │ → Error Msg  │
           └──────┬───────┘          └──────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Progress Bar     │
         │ Shows Upload %   │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Document Added   │
         │ Status: Pending  │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Async Processing │
         │ Status: Processing│
         └────────┬─────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Status:      │   │ Status:      │
│ Indexed ✓    │   │ Failed ✗     │
└──────────────┘   └──────────────┘
```

**Success Criteria:**
- Upload completes within 30 seconds for 50MB file
- User sees real-time progress bar
- Status updates automatically (no refresh needed)
- Toast notification on completion/failure

---

### 2.2 Toggle KB for Workspace

```
┌─────────────────┐
│ Workspace Data  │
│ Tab Loaded      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ KB Toggle       │
│ Selector Shows  │
│ Available KBs   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Available KBs (grouped by source):      │
│                                         │
│ 📁 Workspace                            │
│ └── [✓] Project Alpha Documents         │
│                                         │
│ 🏢 Organization                         │
│ ├── [✓] Company Policies                │
│ └── [ ] Engineering Guidelines          │
│                                         │
│ 🌐 Global                               │
│ └── [✓] CORA Best Practices             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ User Clicks     │
│ Toggle          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Optimistic UI   │
│ Update          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ API Call to     │
│ Persist Toggle  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│ Success│ │ Failure│
│ Keep   │ │ Revert │
│ State  │ │ + Error│
└────────┘ └────────┘
```

**Success Criteria:**
- Toggle response < 200ms (optimistic UI)
- Clear visual feedback on toggle state
- Grouped by source (workspace, org, global)
- Disabled state for unavailable KBs

---

### 2.3 Upload Document to Chat

```
┌─────────────────┐
│ In Chat Session │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Click 📎 Attach │
│ Button          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select File(s)  │
│ or Drag & Drop  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ File Uploads    │
│ Inline Preview  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Processing      │
│ Indicator       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Document Ready  │
│ Auto-enabled    │
│ for Chat KB     │
└─────────────────┘
```

**Success Criteria:**
- Documents visible inline in chat
- Processing status visible in chat
- Chat KB auto-created on first upload
- Documents immediately available for grounding

---

### 2.4 View Document with Citations

```
┌─────────────────┐
│ Send Message    │
│ with KB Context │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Response     │
│ with Citations  │
│ [1] [2] [3]     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User Clicks     │
│ Citation [1]    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Citation Popover:                       │
│                                         │
│ 📄 employee-handbook.pdf                │
│ 📁 Company Policies (Org KB)            │
│ 📃 Page 5                               │
│                                         │
│ "Employees are entitled to 20 days      │
│ of paid vacation per year..."           │
│                                         │
│ [View Document] [Copy Text]             │
└─────────────────────────────────────────┘
```

**Success Criteria:**
- Citations clearly numbered in response
- Popover shows source document info
- Can navigate to full document
- Can copy citation text

---

## 3. Page Specifications

### 3.1 Workspace Data Tab

**Location:** Workspace Detail Page → Data Tab

**Purpose:** Manage workspace KB documents and toggle available KBs

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Data                                                    [?]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ KB Context for This Workspace                               │ │
│ │                                                             │ │
│ │ Enable knowledge bases to provide context for AI responses. │ │
│ │                                                             │ │
│ │ 📁 Workspace                                                │ │
│ │ └── [✓] Project Alpha Documents (5 docs)                    │ │
│ │                                                             │ │
│ │ 🏢 Organization                                             │ │
│ │ ├── [✓] Company Policies (25 docs)                          │ │
│ │ └── [ ] Engineering Guidelines (12 docs)                    │ │
│ │                                                             │ │
│ │ 🌐 Global                                                   │ │
│ │ └── [✓] CORA Best Practices (100 docs)                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Workspace Documents                          [+ Upload]     │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 📄 Drag & drop files here or click to upload            │ │ │
│ │ │    PDF, DOCX, TXT, MD (max 50 MB)                       │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Name          │ Size    │ Status    │ Uploaded  │ ⋯ │   │ │
│ │ ├───────────────┼─────────┼───────────┼───────────┼───┤   │ │
│ │ │ report.pdf    │ 1.5 MB  │ ✓ Indexed │ 2h ago    │ ⋯ │   │ │
│ │ │ notes.docx    │ 250 KB  │ ⟳ Process │ 5m ago    │ ⋯ │   │ │
│ │ │ draft.md      │ 12 KB   │ ✗ Failed  │ 1h ago    │ ⋯ │   │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Stats: 3 documents • 1.8 MB total • 150 chunks                  │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- `KBToggleSelector` - Toggle available KBs
- `DocumentUploadZone` - Drag-and-drop upload area
- `DocumentTable` - List of workspace documents

**States:**
- **Empty:** No workspace KB yet, prompt to upload first doc
- **Loading:** Skeleton loaders for KBs and documents
- **Error:** API error with retry button
- **Success:** Full data displayed

---

### 3.2 Chat KB Interface (Future)

**Location:** Chat Message Input Area

**Purpose:** Upload documents and toggle KBs for chat context

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [AI Response with citations [1] [2]]                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [User message input...]                    [📎] [📚] [Send] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 📎 = Attach document                                           │
│ 📚 = Toggle KB context (opens KB selector popover)             │
└─────────────────────────────────────────────────────────────────┘
```

**KB Selector Popover:**

```
┌─────────────────────────────────┐
│ Knowledge Base Context          │
│                                 │
│ 💬 Chat                         │
│ └── [✓] Chat Documents (2)      │
│                                 │
│ 📁 Workspace                    │
│ └── [✓] Project Docs (5)        │
│                                 │
│ 🏢 Organization                 │
│ ├── [✓] Policies (25)           │
│ └── [ ] Guidelines (12)         │
│                                 │
│ 🌐 Global                       │
│ └── [✓] Best Practices (100)    │
│                                 │
│ [Apply]                         │
└─────────────────────────────────┘
```

---

## 4. Component Library

### 4.1 KBToggleSelector

**Purpose:** Display and toggle available KBs grouped by source.

**Props:**

```typescript
interface KBToggleSelectorProps {
  availableKbs: {
    workspaceKb?: KBToggleOption;
    chatKb?: KBToggleOption;
    orgKbs: KBToggleOption[];
    globalKbs: KBToggleOption[];
  };
  onToggle: (kbId: string, enabled: boolean) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

interface KBToggleOption {
  id: string;
  name: string;
  scope: 'global' | 'org' | 'workspace' | 'chat';
  isEnabled: boolean;
  documentCount: number;
  isAvailable: boolean;  // false if KB is disabled by admin
}
```

**Visual States:**
- **Enabled:** Filled toggle, full opacity
- **Disabled:** Unfilled toggle, full opacity
- **Unavailable:** Grayed out, tooltip explains why
- **Loading:** Spinner on toggle

**Accessibility:**
- Each toggle is a checkbox with proper ARIA labels
- Keyboard navigation with Tab/Space
- Screen reader announces KB name and state

---

### 4.2 DocumentUploadZone

**Purpose:** Drag-and-drop file upload area with validation.

**Props:**

```typescript
interface DocumentUploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  maxSize?: number;  // Default: 50 * 1024 * 1024 (50 MB)
  acceptedTypes?: string[];  // Default: ['.pdf', '.docx', '.txt', '.md']
  multiple?: boolean;  // Default: true
  disabled?: boolean;
}
```

**Visual States:**
- **Default:** Dashed border, upload icon
- **Drag Over:** Highlighted border, "Drop files here"
- **Uploading:** Progress bar per file
- **Success:** Green check, file added to table
- **Error:** Red border, error message

**Validation Messages:**
- "File too large. Maximum size is 50 MB."
- "File type not supported. Allowed: PDF, DOCX, TXT, MD."
- "Upload failed. Please try again."

**Accessibility:**
- Keyboard accessible via button
- Role="button" with aria-label
- Progress announced to screen readers

---

### 4.3 DocumentTable

**Purpose:** Display documents with status, actions, and metadata.

**Props:**

```typescript
interface DocumentTableProps {
  documents: KBDocument[];
  onDelete: (documentId: string) => Promise<void>;
  onDownload: (documentId: string) => Promise<void>;
  onRetry?: (documentId: string) => Promise<void>;
  loading?: boolean;
  canDeleteAll?: boolean;  // Workspace owner can delete any doc
}

interface KBDocument {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string;
  chunkCount?: number;
  createdAt: string;
  createdBy: string;
}
```

**Columns:**
- **Name:** Filename with icon based on type
- **Size:** Formatted file size (KB/MB)
- **Status:** Badge with icon and text
- **Uploaded:** Relative time (e.g., "2 hours ago")
- **Actions:** Download, Delete, Retry (if failed)

**Status Badges:**
- **Pending:** ⏳ Yellow "Pending"
- **Processing:** ⟳ Blue "Processing" (animated)
- **Indexed:** ✓ Green "Indexed"
- **Failed:** ✗ Red "Failed" (with tooltip for error)

**Empty State:**
"No documents yet. Upload files to create your workspace knowledge base."

**Accessibility:**
- Table has proper headers
- Actions have aria-labels
- Status announced to screen readers

---

### 4.4 DocumentStatusBadge

**Purpose:** Show document processing status with appropriate styling.

**Props:**

```typescript
interface DocumentStatusBadgeProps {
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  errorMessage?: string;
}
```

**Rendering:**

```tsx
function DocumentStatusBadge({ status, errorMessage }: DocumentStatusBadgeProps) {
  const config = {
    pending: { icon: Clock, color: 'warning', label: 'Pending' },
    processing: { icon: Loader2, color: 'info', label: 'Processing', animate: true },
    indexed: { icon: CheckCircle, color: 'success', label: 'Indexed' },
    failed: { icon: XCircle, color: 'error', label: 'Failed' }
  };
  
  const { icon: Icon, color, label, animate } = config[status];
  
  return (
    <Tooltip title={status === 'failed' ? errorMessage : undefined}>
      <Chip
        icon={<Icon className={animate ? 'animate-spin' : ''} />}
        label={label}
        color={color}
        size="small"
      />
    </Tooltip>
  );
}
```

---

### 4.5 KBStatsCard

**Purpose:** Display KB statistics (document count, chunk count, storage).

**Props:**

```typescript
interface KBStatsCardProps {
  stats: {
    documentCount: number;
    chunkCount: number;
    totalSize: number;  // bytes
    processingCount?: number;
    failedCount?: number;
  };
}
```

**Rendering:**

```
┌─────────────────────────────────────────┐
│ 📊 Workspace KB Stats                   │
├─────────────────────────────────────────┤
│ 📄 5 documents                          │
│ 🧩 150 chunks                           │
│ 💾 1.8 MB storage                       │
│ ⟳ 1 processing                          │
└─────────────────────────────────────────┘
```

---

### 4.6 CitationPopover

**Purpose:** Show citation details when user clicks citation link.

**Props:**

```typescript
interface CitationPopoverProps {
  citation: {
    id: string;
    documentId: string;
    documentName: string;
    kbName: string;
    kbScope: 'global' | 'org' | 'workspace' | 'chat';
    pageNumber?: number;
    excerpt: string;
  };
  onViewDocument: (documentId: string) => void;
  onCopyText: (text: string) => void;
}
```

**Rendering:**

```tsx
function CitationPopover({ citation, onViewDocument, onCopyText }: CitationPopoverProps) {
  return (
    <Popover>
      <Box p={2} maxWidth={400}>
        <Typography variant="subtitle2">
          📄 {citation.documentName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          📁 {citation.kbName} ({citation.kbScope})
          {citation.pageNumber && ` • Page ${citation.pageNumber}`}
        </Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
          "{citation.excerpt}"
        </Typography>
        <Stack direction="row" spacing={1} mt={2}>
          <Button size="small" onClick={() => onViewDocument(citation.documentId)}>
            View Document
          </Button>
          <Button size="small" onClick={() => onCopyText(citation.excerpt)}>
            Copy Text
          </Button>
        </Stack>
      </Box>
    </Popover>
  );
}
```

---

## 5. Interaction Patterns

### 5.1 Drag and Drop Upload

**Behavior:**
1. User drags file over upload zone
2. Zone highlights with "Drop files here"
3. User drops file
4. File validation occurs
5. If valid: Progress bar appears, upload starts
6. If invalid: Error message shown, zone resets
7. On complete: File added to document table

**Edge Cases:**
- Multiple files: Queue uploads, show combined progress
- Duplicate filename: Allow (unique ID in S3 key)
- Network failure: Retry button, keep file in queue

---

### 5.2 Optimistic Toggle Updates

**Behavior:**
1. User clicks KB toggle
2. UI immediately reflects new state
3. API call made in background
4. If success: Keep state
5. If failure: Revert state, show error toast

**Code Pattern:**

```typescript
const [toggleState, setToggleState] = useState(initialState);

async function handleToggle(kbId: string, enabled: boolean) {
  const previousState = toggleState[kbId];
  
  // Optimistic update
  setToggleState(prev => ({ ...prev, [kbId]: enabled }));
  
  try {
    await api.toggleKB(kbId, enabled);
  } catch (error) {
    // Revert on failure
    setToggleState(prev => ({ ...prev, [kbId]: previousState }));
    toast.error('Failed to update KB setting');
  }
}
```

---

### 5.3 Real-time Status Updates

**Behavior:**
- Document status updates automatically
- No page refresh required
- Uses polling (every 5 seconds for processing docs)

**Implementation:**

```typescript
function useDocumentPolling(documents: KBDocument[]) {
  const processingDocs = documents.filter(d => 
    d.status === 'pending' || d.status === 'processing'
  );
  
  useEffect(() => {
    if (processingDocs.length === 0) return;
    
    const interval = setInterval(() => {
      refetchDocuments();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [processingDocs.length]);
}
```

---

### 5.4 Error Handling Patterns

**Upload Errors:**
- Show inline error in upload zone
- Allow retry without re-selecting file
- Log to console for debugging

**Toggle Errors:**
- Revert optimistic update
- Show toast notification
- Keep toggle interactable

**Document Errors:**
- Show failed status badge
- Tooltip with error message
- Retry button in actions

---

## 6. Accessibility Requirements

### 6.1 WCAG 2.1 AA Compliance

**Perceivable:**
- [ ] All images have alt text
- [ ] Color is not the only indicator (icons + text)
- [ ] Text has 4.5:1 contrast ratio
- [ ] Focus indicators visible

**Operable:**
- [ ] All functions accessible via keyboard
- [ ] No keyboard traps
- [ ] Skip links for repeated content
- [ ] Touch targets ≥ 44x44 pixels

**Understandable:**
- [ ] Error messages descriptive
- [ ] Form labels visible
- [ ] Consistent navigation
- [ ] Help text available

**Robust:**
- [ ] Valid HTML
- [ ] ARIA attributes correct
- [ ] Works with screen readers

---

### 6.2 Component-Specific Accessibility

**KBToggleSelector:**
- Each toggle is `role="switch"` or `<input type="checkbox">`
- Label associated via `aria-labelledby`
- Group label for each section (Workspace, Org, Global)

**DocumentUploadZone:**
- `role="button"` on drop zone
- `aria-label="Upload documents"`
- Progress announced via `aria-live="polite"`

**DocumentTable:**
- `<table>` with proper `<thead>` and `<th scope="col">`
- Actions have `aria-label` (e.g., "Delete report.pdf")
- Status icons have `aria-hidden="true"`, text visible

**CitationPopover:**
- Focus trapped within popover
- Escape key closes popover
- `role="dialog"` with `aria-labelledby`

---

### 6.3 Keyboard Navigation

| Component | Tab | Space/Enter | Escape | Arrow Keys |
|-----------|-----|-------------|--------|------------|
| KBToggleSelector | Move between toggles | Toggle state | - | - |
| DocumentUploadZone | Focus zone | Open file picker | - | - |
| DocumentTable | Move between rows | Activate action | - | Move within row |
| CitationPopover | Move between buttons | Activate button | Close popover | - |

---

## 7. Mobile Responsiveness

### 7.1 Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| xs | 0-599px | Stack components vertically |
| sm | 600-899px | Compact table, fewer columns |
| md | 900-1199px | Standard layout |
| lg | 1200px+ | Full layout with stats sidebar |

---

### 7.2 Mobile-Specific Adaptations

**Workspace Data Tab (Mobile):**

```
┌─────────────────────────┐
│ Data                    │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ KB Context      [▼] │ │  ← Collapsed by default
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 📄 Tap to upload    │ │  ← Simplified upload
│ │    or drag & drop   │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ report.pdf    1.5MB │ │  ← Card layout instead
│ │ ✓ Indexed     2h    │ │     of table
│ │ [↓] [🗑️]            │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ notes.docx   250KB  │ │
│ │ ⟳ Processing  5m    │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

**Changes:**
- KB toggle selector collapsed by default
- Document table becomes card list
- Actions condensed to icons
- Touch-friendly tap targets

---

### 7.3 Touch Interactions

**Drag and Drop:**
- Still works on mobile via file picker
- Tap zone to open native file picker
- No drag-over highlighting needed

**Swipe Actions (future enhancement):**
- Swipe left on document card to reveal delete
- Swipe right to download

---

## 8. Frontend Testing

### 8.1 Component Tests

```typescript
// tests/components/KBToggleSelector.test.tsx

describe('KBToggleSelector', () => {
  it('renders all available KBs grouped by source', () => {
    render(<KBToggleSelector availableKbs={mockKbs} onToggle={jest.fn()} />);
    
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(4);
  });
  
  it('calls onToggle when toggle is clicked', async () => {
    const onToggle = jest.fn();
    render(<KBToggleSelector availableKbs={mockKbs} onToggle={onToggle} />);
    
    await userEvent.click(screen.getByRole('switch', { name: /Company Policies/ }));
    
    expect(onToggle).toHaveBeenCalledWith('kb-123', false);
  });
  
  it('shows disabled state for unavailable KBs', () => {
    const kbs = { ...mockKbs, orgKbs: [{ ...mockKbs.orgKbs[0], isAvailable: false }] };
    render(<KBToggleSelector availableKbs={kbs} onToggle={jest.fn()} />);
    
    expect(screen.getByRole('switch', { name: /Company Policies/ })).toBeDisabled();
  });
});
```

---

### 8.2 Hook Tests

```typescript
// tests/hooks/useWorkspaceKB.test.tsx

describe('useWorkspaceKB', () => {
  it('fetches workspace KB and available KBs', async () => {
    const { result } = renderHook(() => useWorkspaceKB('ws-123'));
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.kb).toBeDefined();
    expect(result.current.availableKbs.workspaceKb).toBeDefined();
  });
  
  it('handles toggle with optimistic update', async () => {
    const { result } = renderHook(() => useWorkspaceKB('ws-123'));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    const initialState = result.current.availableKbs.orgKbs[0].isEnabled;
    
    act(() => {
      result.current.toggleKB('kb-456', !initialState);
    });
    
    // Optimistic update
    expect(result.current.availableKbs.orgKbs[0].isEnabled).toBe(!initialState);
  });
});
```

---

### 8.3 Integration Tests

```typescript
// tests/integration/WorkspaceDataTab.test.tsx

describe('Workspace Data Tab', () => {
  it('uploads document and shows in table', async () => {
    render(<WorkspaceDetailPage workspaceId="ws-123" />);
    
    await userEvent.click(screen.getByRole('tab', { name: /Data/ }));
    
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByRole('button', { name: /upload/i });
    
    await userEvent.upload(dropzone, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });
  
  it('toggles KB and persists state', async () => {
    render(<WorkspaceDetailPage workspaceId="ws-123" />);
    
    await userEvent.click(screen.getByRole('tab', { name: /Data/ }));
    
    const toggle = screen.getByRole('switch', { name: /Company Policies/ });
    await userEvent.click(toggle);
    
    await waitFor(() => {
      expect(toggle).not.toBeChecked();
    });
  });
});
```

---

### 8.4 E2E Tests (Playwright)

```typescript
// tests/e2e/workspace-kb.spec.ts

test.describe('Workspace KB', () => {
  test('upload document flow', async ({ page }) => {
    await page.goto('/workspaces/ws-123');
    await page.click('text=Data');
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('text=Drag & drop files');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('./fixtures/test.pdf');
    
    await expect(page.locator('text=test.pdf')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
    
    // Wait for processing
    await expect(page.locator('text=Indexed')).toBeVisible({ timeout: 30000 });
  });
  
  test('toggle KB persists after refresh', async ({ page }) => {
    await page.goto('/workspaces/ws-123');
    await page.click('text=Data');
    
    const toggle = page.locator('role=switch[name="Company Policies"]');
    await toggle.click();
    
    await page.reload();
    await page.click('text=Data');
    
    await expect(toggle).not.toBeChecked();
  });
});
```

---

### 8.5 Test Coverage Requirements

| Category | Target Coverage |
|----------|-----------------|
| Components | ≥ 80% |
| Hooks | ≥ 90% |
| Utilities | ≥ 95% |
| Integration | ≥ 60% |
| E2E Critical Paths | 100% |

**Critical Paths (require 100% E2E coverage):**
1. Document upload to workspace
2. KB toggle persistence
3. Document status updates
4. Document deletion

---

**Document Version:** 1.0  
**Last Updated:** January 14, 2026  
**Author:** Cline AI Agent  
**Specification Type:** User UX
