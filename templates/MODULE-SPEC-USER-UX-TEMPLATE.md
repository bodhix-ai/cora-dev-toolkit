# {MODULE_NAME} Module - User UX Specification

**Module Name:** {module-name}  
**Version:** 1.0  
**Status:** [Draft | Approved | In Progress | Complete]  
**Created:** {date}

**Parent Specification:** [MODULE-{MODULE_NAME}-SPEC.md](./MODULE-{MODULE_NAME}-SPEC.md)

---

## Table of Contents

1. [User Personas](#user-personas)
2. [Use Cases](#use-cases)
3. [User Journeys](#user-journeys)
4. [Page Specifications](#page-specifications)
5. [Component Library Usage](#component-library-usage)
6. [Interaction Patterns](#interaction-patterns)
7. [Mobile Responsiveness](#mobile-responsiveness)
8. [Accessibility Requirements](#accessibility-requirements)
9. [Frontend Testing Requirements](#frontend-testing-requirements)

---

## 1. User Personas

### 1.1 Primary Persona: [Name]

**Role:** [Job title/role]

**Goals:**
- [Primary goal 1]
- [Primary goal 2]
- [Primary goal 3]

**Pain Points:**
- [Pain point 1]
- [Pain point 2]
- [Pain point 3]

**Technical Proficiency:** [Novice | Intermediate | Advanced]

**Frequency of Use:** [Daily | Weekly | Monthly | Occasional]

**Context of Use:**
- **Device:** [Desktop | Tablet | Mobile]
- **Location:** [Office | Remote | Field]
- **Time constraints:** [High | Medium | Low]

### 1.2 Secondary Persona: [Name]

[Repeat structure for additional personas]

---

## 2. Use Cases

### 2.1 Use Case: Create {Entity}

**Actor:** [Persona name]

**Preconditions:**
- User is logged in
- User is member of an organization
- User has permission to create entities

**Main Flow:**
1. User navigates to {entity} list page
2. User clicks "Create {Entity}" button
3. System displays create form
4. User fills in required fields:
   - Name
   - Description (optional)
   - [Other fields]
5. User clicks "Save" button
6. System validates input
7. System creates entity
8. System displays success message
9. System navigates to entity detail page

**Alternative Flows:**
- **3a. Validation Error**
  - System displays error messages
  - User corrects errors
  - Resume at step 5
  
- **7a. Duplicate Name**
  - System displays "Name already exists" error
  - User changes name
  - Resume at step 5

**Postconditions:**
- New entity is created
- Entity appears in list
- User can view/edit entity

**Frequency:** [High | Medium | Low]

**Business Value:** [High | Medium | Low]

### 2.2 Use Case: Edit {Entity}

**Actor:** [Persona name]

**Preconditions:**
- User is logged in
- User has access to entity's organization
- Entity exists

**Main Flow:**
1. User navigates to entity detail page
2. User clicks "Edit" button
3. System displays edit form with current values
4. User modifies fields
5. User clicks "Save" button
6. System validates input
7. System updates entity
8. System displays success message
9. System refreshes detail view

**Alternative Flows:**
- **6a. Validation Error**
  - [Similar to create flow]

**Postconditions:**
- Entity is updated
- Changes are reflected in all views

### 2.3 Use Case: Delete {Entity}

[Continue with additional use cases]

---

## 3. User Journeys

### 3.1 Journey: First-Time User Creating {Entity}

**Scenario:** New user needs to create their first {entity}

**Steps:**

1. **Discover Feature**
   - Entry point: Navigation menu or dashboard
   - Visual cue: Icon/card for {module}
   - Expected action: Click to navigate

2. **Understand Empty State**
   - View: Empty list with helpful message
   - Content: "Get started by creating your first {entity}"
   - Visual: Illustration or icon
   - CTA: Prominent "Create {Entity}" button

3. **Create First Entity**
   - View: Simple creation form
   - Help: Tooltips on complex fields
   - Validation: Real-time feedback
   - Success: Clear confirmation message

4. **Explore Created Entity**
   - View: Entity detail page
   - Discovery: Available actions clearly visible
   - Next steps: Suggested related actions

**Journey Map:**

```
Discover → Empty State → Create → Success → Explore
  (Nav)      (List)      (Form)   (Msg)     (Detail)
```

**Pain Points:**
- May not know where to find feature
- Might be unsure what fields mean
- Could miss success confirmation

**Solutions:**
- Clear navigation labels
- Inline help text
- Prominent success message with next steps

### 3.2 Journey: Power User Managing Multiple {Entities}

**Scenario:** Experienced user managing 50+ entities

**Steps:**

1. **Quick Access**
   - Entry: Direct navigation or recent items
   - Speed: Keyboard shortcuts available
   - Efficiency: Bulk actions visible

2. **Filter/Search**
   - Tools: Search bar, filter dropdowns
   - Speed: Instant results
   - Refinement: Combine multiple filters

3. **Bulk Operations**
   - Selection: Checkbox to select multiple
   - Actions: Archive, export, etc.
   - Feedback: Progress indicator for operations

4. **Quick Edit**
   - Inline editing where appropriate
   - Batch updates
   - Undo functionality

**Journey Map:**

```
Navigate → Search/Filter → Select Multiple → Bulk Action → Confirm
```

---

## 4. Page Specifications

### 4.1 Page: {Entity} List

**Route:** `/[org-slug]/{module}/{entities}`

**Purpose:** Display all entities for current organization with filtering/search

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Org > {Module}                      │
├─────────────────────────────────────────────────┤
│ Header:                                         │
│   {Entities} [Title]              [Create Btn] │
├─────────────────────────────────────────────────┤
│ Filters & Search:                               │
│   [Search] [Status ▼] [Sort ▼]                 │
├─────────────────────────────────────────────────┤
│ List/Grid:                                      │
│   ┌──────────────────────────────┐             │
│   │ Entity Card                   │             │
│   │ Name: [entity name]           │             │
│   │ Status: [badge]               │             │
│   │ Created: [date]               │             │
│   └──────────────────────────────┘             │
│   [More cards...]                               │
├─────────────────────────────────────────────────┤
│ Pagination: ← 1 2 3 ... 10 →                   │
└─────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| Breadcrumb | MUI | links, currentPage | Standard pattern |
| PageHeader | Custom | title, actions | Reusable component |
| SearchBar | MUI TextField | value, onChange, placeholder | Debounced input |
| FilterDropdown | MUI Select | options, value, onChange | Multiple filters |
| EntityCard | Custom | entity, onEdit, onDelete | Hover actions |
| Pagination | MUI | page, totalPages, onChange | Standard pagination |

**Data Loading:**

```typescript
const { entities, loading, error } = useEntities(client, currentOrg.id);
```

**States:**

- **Loading**: Skeleton cards
- **Empty**: Empty state illustration + "Create first entity" CTA
- **Error**: Error alert with retry button
- **Loaded**: Entity cards with data

**Interactions:**

- **Search**: Debounced 300ms, filters list in real-time
- **Filter**: Applies immediately, updates URL query params
- **Card Click**: Navigates to detail page
- **Create Button**: Opens creation flow
- **Delete**: Confirmation dialog before action

**Empty State:**

```
No {entities} yet
[Illustration]
Get started by creating your first {entity}
[Create {Entity} Button]
```

**Mobile Behavior:**
- Stack filters vertically
- Single column card layout
- Bottom-anchored create button
- Infinite scroll instead of pagination

### 4.2 Page: {Entity} Detail

**Route:** `/[org-slug]/{module}/{entities}/[id]`

**Purpose:** Display single entity with full details and actions

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Org > {Module} > {Entity Name}      │
├─────────────────────────────────────────────────┤
│ Header:                                         │
│   {Entity Name} [Title]                         │
│   [Edit] [Delete] [More Actions ▼]             │
├─────────────────────────────────────────────────┤
│ Details Card:                                   │
│   Name: [value]                                 │
│   Description: [value]                          │
│   Status: [badge]                               │
│   Created: [date] by [user]                     │
│   Updated: [date] by [user]                     │
├─────────────────────────────────────────────────┤
│ Related Section: (if applicable)                │
│   [Related entities list]                       │
└─────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| PageHeader | Custom | title, actions, breadcrumb | Standard |
| DetailCard | MUI Card | entity | Read-only display |
| ActionMenu | MUI Menu | actions | Dropdown for more actions |
| ConfirmDialog | MUI Dialog | open, onConfirm, message | Delete confirmation |

**States:**

- **Loading**: Skeleton layout
- **Not Found**: 404 error with "Go back" button
- **No Access**: 403 error with explanation
- **Loaded**: Full details displayed

**Interactions:**

- **Edit**: Opens edit form (modal or navigation)
- **Delete**: Shows confirmation dialog
- **Back**: Returns to list page

### 4.3 Page: Create {Entity}

**Route:** `/[org-slug]/{module}/{entities}/new`

**Purpose:** Form to create new entity

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Org > {Module} > New {Entity}       │
├─────────────────────────────────────────────────┤
│ Form Card:                                      │
│   Name *                                        │
│   [text input]                                  │
│                                                 │
│   Description                                   │
│   [multiline text input]                        │
│                                                 │
│   Status                                        │
│   [select: Active, Archived]                    │
│                                                 │
│   [Cancel] [Create {Entity}]                   │
└─────────────────────────────────────────────────┘
```

**Form Validation:**

```typescript
const schema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived']).default('active')
});
```

**Components:**

| Component | Library | Validation | Notes |
|-----------|---------|------------|-------|
| TextField | MUI | Zod schema | Required indicator |
| TextArea | MUI | Zod schema | Character counter |
| Select | MUI | Zod schema | Default value |
| FormActions | Custom | - | Cancel + Submit |

**Interactions:**

- **Real-time validation**: On blur
- **Submit validation**: On submit
- **Success**: Navigate to detail page + success toast
- **Error**: Display error messages inline

### 4.4 Page: Edit {Entity}

[Similar to Create, but pre-populated with current values]

---

## 5. Component Library Usage

### 5.1 Material-UI Components

**Standard Components:**

```typescript
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Alert,
  Skeleton,
  Chip,
  Breadcrumbs,
  Link
} from '@mui/material';
```

**Icons:**

```typescript
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
```

### 5.2 Custom Components

**EntityCard:**

```typescript
interface EntityCardProps {
  entity: Entity;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function EntityCard({ entity, onEdit, onDelete }: EntityCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{entity.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {entity.description}
        </Typography>
        <Chip label={entity.status} size="small" />
      </CardContent>
      <CardActions>
        <Button onClick={() => onEdit(entity.id)}>Edit</Button>
        <Button onClick={() => onDelete(entity.id)} color="error">
          Delete
        </Button>
      </CardActions>
    </Card>
  );
}
```

---

## 6. Interaction Patterns

### 6.1 Form Patterns

**Create Form Pattern:**

```typescript
function CreateEntityForm() {
  const [formData, setFormData] = useState<EntityCreate>({
    org_id: currentOrg.id,
    name: '',
    description: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate
    const result = schema.safeParse(formData);
    if (!result.success) {
      setErrors(/* format errors */);
      return;
    }
    
    // Submit
    try {
      const api = createEntityClient(client);
      const newEntity = await api.createEntity(formData);
      
      // Success
      showToast('Entity created successfully');
      router.push(`/${orgSlug}/{module}/{entities}/${newEntity.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### 6.2 List/Table Patterns

**Search & Filter:**

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState<string | null>(null);

const filteredEntities = useMemo(() => {
  return entities.filter(entity => {
    const matchesSearch = entity.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || entity.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
}, [entities, searchTerm, statusFilter]);
```

### 6.3 Delete Confirmation Pattern

```typescript
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [entityToDelete, setEntityToDelete] = useState<string | null>(null);

const handleDeleteClick = (id: string) => {
  setEntityToDelete(id);
  setDeleteDialogOpen(true);
};

const handleDeleteConfirm = async () => {
  if (!entityToDelete) return;
  
  try {
    const api = createEntityClient(client);
    await api.deleteEntity(entityToDelete);
    showToast('Entity deleted');
    refetch(); // Refresh list
  } catch (err) {
    showToast('Failed to delete entity', 'error');
  } finally {
    setDeleteDialogOpen(false);
    setEntityToDelete(null);
  }
};
```

### 6.4 Loading States

**Skeleton Pattern:**

```typescript
if (loading) {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} />
      <Skeleton variant="rectangular" height={200} />
      <Skeleton variant="text" width="100%" />
    </Box>
  );
}
```

---

## 7. Mobile Responsiveness

### 7.1 Breakpoints

```typescript
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,     // Mobile
      sm: 600,   // Tablet
      md: 900,   // Desktop
      lg: 1200,  // Large desktop
      xl: 1536   // Extra large
    }
  }
});
```

### 7.2 Responsive Layouts

**List Page:**

- **Desktop (≥900px)**: 3-column grid
- **Tablet (600-899px)**: 2-column grid
- **Mobile (<600px)**: Single column

**Form Pages:**

- **Desktop**: 600px max width, centered
- **Mobile**: Full width with padding

**Navigation:**

- **Desktop**: Sidebar always visible
- **Mobile**: Hamburger menu (drawer)

### 7.3 Touch Targets

**Minimum sizes:**
- Buttons: 48x48px
- Icon buttons: 48x48px
- Form inputs: 48px height
- Clickable cards: 48px min height

### 7.4 Mobile-Specific Features

**Pull to Refresh:**
```typescript
// On list pages for data refresh
```

**Bottom Navigation:**
```typescript
// For primary actions on mobile
```

**Swipe Gestures:**
```typescript
// Swipe to delete on list items (optional)
```

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Required Standards:**

- ✅ Perceivable
  - Text alternatives for images
  - Color contrast ≥4.5:1
  - Resizable text up to 200%
  
- ✅ Operable
  - Keyboard navigation
  - Focus indicators
  - No keyboard traps
  
- ✅ Understandable
  - Clear labels
  - Error identification
  - Consistent navigation
  
- ✅ Robust
  - Valid HTML
  - ARIA attributes
  - Screen reader support

### 8.2 Semantic HTML

```typescript
// Use semantic elements
<nav>...</nav>
<main>...</main>
<article>...</article>
<section>...</section>
<header>...</header>
<footer>...</footer>
```

### 8.3 ARIA Labels

```typescript
<Button
  aria-label="Create new entity"
  aria-describedby="create-help-text"
>
  <AddIcon />
</Button>

<TextField
  label="Name"
  required
  aria-required="true"
  aria-invalid={!!errors.name}
  aria-describedby="name-error"
/>

{errors.name && (
  <Typography id="name-error" color="error" role="alert">
    {errors.name}
  </Typography>
)}
```

### 8.4 Keyboard Navigation

**Tab Order:**
1. Primary navigation
2. Page header actions
3. Search/filters
4. Main content
5. Pagination

**Keyboard Shortcuts:**
- `Tab`: Navigate forward
- `Shift+Tab`: Navigate backward
- `Enter`: Activate button/link
- `Escape`: Close dialog
- `/`: Focus search (optional)

### 8.5 Screen Reader Support

**Announcements:**

```typescript
// Success/error messages announced
<Alert role="alert" aria-live="polite">
  Entity created successfully
</Alert>

// Loading states announced
<Box role="status" aria-live="polite" aria-busy={loading}>
  {loading ? 'Loading entities...' : `${entities.length} entities loaded`}
</Box>
```

---

## 9. Frontend Testing Requirements

### 9.1 Component Tests

```typescript
describe('EntityList', () => {
  it('displays loading state', () => {
    render(<EntityList loading={true} entities={[]} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('displays entities after loading', () => {
    const entities = [{ id: '1', name: 'Test Entity' }];
    render(<EntityList loading={false} entities={entities} />);
    expect(screen.getByText('Test Entity')).toBeInTheDocument();
  });
  
  it('displays empty state when no entities', () => {
    render(<EntityList loading={false} entities={[]} />);
    expect(screen.getByText(/no.*entities/i)).toBeInTheDocument();
  });
  
  it('handles search input', async () => {
    const entities = [
      { id: '1', name: 'Alpha' },
      { id: '2', name: 'Beta' }
    ];
    render(<EntityList loading={false} entities={entities} />);
    
    const searchInput = screen.getByRole('textbox', { name: /search/i });
    await userEvent.type(searchInput, 'Alpha');
    
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });
});
```

### 9.2 User Flow Tests

```typescript
describe('Create Entity Flow', () => {
  it('completes full creation workflow', async () => {
    render(<App />);
    
    // Navigate to create page
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Fill form
    await userEvent.type(
      screen.getByLabelText(/name/i),
      'New Entity'
    );
    await userEvent.type(
      screen.getByLabelText(/description/i),
      'Test description'
    );
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });
  });
  
  it('displays validation errors', async () => {
    render(<CreateEntityForm />);
    
    // Submit empty form
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Check for errors
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
});
```

### 9.3 Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<EntityList entities={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 9.4 Test Coverage Requirements

- **Component Coverage:** ≥80%
- **User Flow Coverage:** 100% of critical paths
- **Accessibility:** 100% of interactive elements
- **Responsive:** Test at xs, sm, md breakpoints

---

**Document Version:** 1.0  
**Last Updated:** {date}  
**Author:** [Name/AI]  
**Specification Type:** User UX
