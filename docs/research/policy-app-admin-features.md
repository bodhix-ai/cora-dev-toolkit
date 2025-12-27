# Policy App Admin Features Research

**Date:** December 25, 2025  
**Source:** `~/code/policy/pm-app-stack/`  
**Purpose:** Document working admin feature implementations for test7 missing pages  
**Status:** Research Complete

---

## Executive Summary

The policy app (`pm-app-stack`) has **partial** implementations of the admin features we need:

✅ **FOUND - Complete Implementation:**
- RAG Provider Management (`/admin/rag/providers`) - Full CRUD with tabs, components, API integration
- Organization Management (`/admin/organizations`) - Table-based CRUD with inline editing

❌ **NOT FOUND - Missing in UI:**
- Email Domain Management - Backend exists, no frontend UI
- Identity Provisioning UI - Backend/tests exist, no frontend UI

This aligns with test6 validation findings showing 25 orphaned routes.

---

## 1. RAG Provider Management (COMPLETE ✅)

### Location
**Main Page:** `/admin/rag/providers/page.tsx`  
**Components:** `/admin/rag/providers/components/`

### Implementation Pattern

**Page Structure:**
```typescript
"use client"

// State Management
- isLoading, isSaving (UI states)
- config, localConfig (original + editing states)
- hasChanges (change detection)
- notification (snackbar feedback)
- activeTab (tab navigation)

// Permission Check
useEffect(() => {
  if (profile && profile.global_role !== "super_admin") {
    router.push("/admin");
  }
}, [profile, router]);

// Tab-Based Layout
- Tab 0: Overview (ProvidersOverview component)
- Tab 1-4: Individual provider configuration panels
```

### Key Components

#### ProvidersOverview.tsx

**Summary Cards Pattern (4 metrics):**
```typescript
<Grid container spacing={3}>
  <Grid item xs={12} md={3}>
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          Total Providers
        </Typography>
        <Typography variant="h4">
          {providersInfo.total_providers}
        </Typography>
      </CardContent>
    </Card>
  </Grid>
  // ... 3 more cards
</Grid>
```

**Provider Cards Pattern:**
```typescript
<Card
  sx={{
    borderLeft: 4,
    borderColor: isActive ? "success.main" : "grey.300",
  }}
>
  <CardContent>
    {/* Header with status icon + provider name + status chip */}
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {getStatusIcon(provider.status)}
        <Typography variant="h6">{provider.name}</Typography>
      </Box>
      <Chip
        label={provider.status}
        color={getStatusColor(provider.status)}
        size="small"
      />
    </Box>

    {/* Description */}
    <Typography variant="body2" color="text.secondary">
      {provider.description}
    </Typography>

    {/* Metrics Grid (3 columns) */}
    <Grid container spacing={2}>
      <Grid item xs={4}>
        <Typography variant="caption">Total Models</Typography>
        <Typography variant="body1">{provider.model_count}</Typography>
      </Grid>
      // ... 2 more metrics
    </Grid>

    {/* Enable/Disable Checkbox */}
    <FormGroup>
      <FormControlLabel
        control={<Checkbox checked={isActive} onChange={...} />}
        label="Enable this provider"
      />
    </FormGroup>
  </CardContent>
</Card>
```

### MUI Components Used

**Layout:**
- `Box` - Layout containers
- `Typography` - Text (h4, h6, body1, body2, caption)
- `Card`, `CardContent` - Card containers
- `Grid` - Responsive grid layout

**Forms:**
- `FormControl`, `FormGroup`, `FormControlLabel`
- `Select`, `MenuItem`, `InputLabel`
- `Checkbox`

**Feedback:**
- `Chip` - Status indicators
- `Snackbar`, `Alert` - Notifications
- `CircularProgress` - Loading states

**Navigation:**
- `Tabs`, `Tab` - Tab navigation
- `Button` - Actions (Save, Refresh)

**Icons:**
- `CheckCircle`, `Cancel`, `Warning` - Status icons
- `Save`, `Refresh` - Action icons

### State Management Patterns

**Change Detection:**
```typescript
useEffect(() => {
  if (!profileData) return;

  const hasChanges =
    displayName !== (profileData.display_name || "") ||
    description !== (profileData.description || "") ||
    // ... other fields
    logoBase64 !== null;

  setIsDirty(hasChanges);
}, [displayName, description, ..., profileData]);
```

**Unsaved Changes Warning:**
```typescript
const handleToggle = () => {
  if (isDirty) {
    const confirmClose = window.confirm(
      "You have unsaved changes. Are you sure you want to close this section?"
    );
    if (!confirmClose) return;
  }
  onToggle();
};
```

### API Integration Pattern

**Clerk Authentication:**
```typescript
const { getToken } = useAuth();
const token = await getToken({ template: "policy-supabase" });
```

**Dual Fetch on Load:**
```typescript
const [configData, providersData] = await Promise.all([
  getPlatformRAGConfig(token),
  listProviders(token),
]);
```

**Save with Optimistic Update:**
```typescript
await updatePlatformRAGConfig(token, {
  provider_configurations: localConfig.provider_configurations,
  default_ai_provider: localConfig.default_ai_provider,
  active_providers: localConfig.active_providers,
});

setNotification({
  open: true,
  message: "Configuration saved successfully!",
  severity: "success",
});

// Reload to get updated configuration
await loadRAGProviderData();
```

---

## 2. Organization Management (COMPLETE ✅)

### Location
**Main Page:** `/admin/organizations/page.tsx`

### Implementation Pattern

**Table-Based CRUD:**
```typescript
<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Name</TableCell>
        <TableCell>Owner</TableCell>
        <TableCell>Your Role</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {/* Inline Add Row */}
      {isAdding && (
        <TableRow>
          <TableCell>
            <TextField value={newOrgName} onChange={...} />
          </TableCell>
          <TableCell>
            <FormControl>
              <Select value={newOrgOwner} onChange={...}>
                {profiles.map(p => <MenuItem>...</MenuItem>)}
              </Select>
            </FormControl>
          </TableCell>
          <TableCell>Owner</TableCell>
          <TableCell>
            <Button onClick={handleCreateOrganization}>Save</Button>
            <Button onClick={() => setIsAdding(false)}>Cancel</Button>
          </TableCell>
        </TableRow>
      )}

      {/* Data Rows (with inline edit) */}
      {organizations.map(org =>
        editingOrgId === org.id ? (
          <TableRow key={org.id}>
            {/* Edit mode - text fields */}
          </TableRow>
        ) : (
          <TableRow key={org.id}>
            <TableCell>
              <Link href={`/admin/organizations/${org.id}/config`}>
                <Typography>{org.name}</Typography>
              </Link>
            </TableCell>
            <TableCell>{org.owner_name}</TableCell>
            <TableCell>
              <Typography>{userRole}</Typography>
            </TableCell>
            <TableCell>
              <IconButton onClick={() => startEditing(org)}>
                <Edit />
              </IconButton>
              <IconButton onClick={() => handleDeleteOrganization(org.id)}>
                <Trash2 />
              </IconButton>
            </TableCell>
          </TableRow>
        )
      )}
    </TableBody>
  </Table>
</TableContainer>
```

### Key Features

**1. Role-Based Filtering:**
```typescript
if (globalRole !== "super_admin") {
  // For non-super admins, only show orgs where they are admin or owner
  const adminOrgIds = userOrganizations
    .filter(org => org.userRole === "admin" || org.userRole === "owner")
    .map(org => org.id);

  filteredOrganizations = fetchedOrganizations.filter(org =>
    adminOrgIds.includes(org.id)
  );
}
```

**2. Search Functionality:**
```typescript
const filteredOrganizations = organizations.filter(org =>
  org.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```

**3. Inline Editing:**
```typescript
const [editingOrgId, setEditingOrgId] = useState<string | null>(null);

const startEditing = (org: Organization) => {
  setEditingOrgId(org.id);
  setEditingOrgName(org.name);
  setEditingOrgOwner(org.owner_id);
};
```

**4. Error Handling:**
```typescript
try {
  const newOrg = await createOrganization(newOrgName, token, newOrgOwner);
  setOrganizations([...organizations, newOrg]); // Optimistic update
  setError(null);
} catch (error: any) {
  if (error.response?.status === 400) {
    const errorData = error.response.data;
    if (errorData.code === "DUPLICATE_NAME") {
      setError({
        field: "name",
        message: errorData.error || "An organization with this name already exists.",
      });
    }
  }
}
```

**5. Breadcrumb Navigation:**
```typescript
<Breadcrumbs separator={<NavigateNext fontSize="small" />}>
  <Link href={"/admin" as Route}>
    <Typography>Admin Dashboard</Typography>
  </Link>
  <Typography color="text.secondary">Organizations</Typography>
</Breadcrumbs>
```

### MUI Components Used

**Table:**
- `Paper` - Container
- `TableContainer`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`

**Forms:**
- `TextField` - Text input
- `FormControl`, `Select`, `MenuItem` - Dropdowns
- `Button` - Actions
- `IconButton` - Icon actions

**Icons:**
- `Add`, `Edit`, `Delete`, `Check`, `NavigateNext`

---

## 3. Email Domain Management (NOT FOUND ❌)

### Backend Evidence
**Test files reference domain management:**
- `tests/e2e/platform-org-provisioning.spec.ts`
- `tests/utils/helpers-platform-org.ts`

**Test6 Orphaned Routes:**
```
GET    /orgs/{id}/email-domains
POST   /orgs/{id}/email-domains
PUT    /orgs/{id}/email-domains/{domainId}
DELETE /orgs/{id}/email-domains/{domainId}
```

### Frontend Search Results
**No UI components found for:**
- Domain list/management
- Domain verification
- Auto-provisioning configuration

**Only mentions in:**
- `components/AppShell.tsx` - Generic references
- `lib/__tests__/api-organizations.test.ts` - Test file

### Conclusion
Backend APIs exist but **NO FRONTEND UI** has been implemented in policy app.

---

## 4. Identity Provisioning (NOT FOUND ❌)

### Backend Evidence
**Test files:**
- `tests/e2e/diagnostic-user-provisioning.spec.ts`
- `tests/e2e/platform-org-provisioning.spec.ts`

**Test6 Orphaned Route:**
```
POST /identities/provision
```

### Frontend Search Results
**No UI components found** - This is likely a webhook/API-only endpoint (no UI needed).

### Conclusion
This appears to be an **internal API/webhook** rather than a missing UI page.

---

## Common Design Patterns Identified

### 1. Admin Page Layout

```typescript
<Box sx={{ p: 4 }}>
  {/* Breadcrumb Navigation */}
  <Breadcrumbs separator={<NavigateNext />}>...</Breadcrumbs>

  {/* Header with Title + Actions */}
  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
    <Box>
      <Typography variant="h4">Page Title</Typography>
      <Typography variant="body1" color="text.secondary">
        Description
      </Typography>
    </Box>
    <Box sx={{ display: "flex", gap: 2 }}>
      <Button variant="outlined" startIcon={<RefreshIcon />}>
        Refresh
      </Button>
      {hasChanges && (
        <Button variant="contained" startIcon={<SaveIcon />}>
          Save Changes
        </Button>
      )}
    </Box>
  </Box>

  {/* Content (tabs, table, cards, etc.) */}
  {/* ... */}

  {/* Notification Snackbar */}
  <Snackbar open={notification.open} autoHideDuration={6000}>
    <Alert severity={notification.severity}>
      {notification.message}
    </Alert>
  </Snackbar>
</Box>
```

### 2. Permission Checking

```typescript
// Check super admin access
useEffect(() => {
  if (profile && profile.global_role !== "super_admin") {
    router.push("/admin");
  }
}, [profile, router]);

// Role-based visibility
const canEdit = hasMinimumRole(userRole, "org_admin");

// Conditional rendering
{canEdit && (
  <Button onClick={handleSave}>Save</Button>
)}
```

### 3. Loading States

```typescript
if (isLoading) {
  return (
    <Box sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "400px",
    }}>
      <CircularProgress />
    </Box>
  );
}

if (!config || !localConfig) {
  return (
    <Alert severity="error">
      Failed to load configuration. Please try refreshing the page.
    </Alert>
  );
}
```

### 4. Form Validation

```typescript
// Client-side validation before save
if (!displayName.trim()) {
  setError("Display name is required");
  return;
}

if (displayName.length > 100) {
  setError("Display name must be 100 characters or less");
  return;
}

if (websiteUrl && !isValidUrl(websiteUrl)) {
  setError("Please enter a valid URL (e.g., https://example.com)");
  return;
}

// Helper function
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};
```

### 5. Notification Pattern

```typescript
const [notification, setNotification] = useState<{
  open: boolean;
  message: string;
  severity: "success" | "error" | "info";
}>({ open: false, message: "", severity: "info" });

// On success
setNotification({
  open: true,
  message: "Configuration saved successfully!",
  severity: "success",
});

// Auto-hide after 3 seconds
setTimeout(() => setSuccess(null), 3000);
```

### 6. Status Indicators

```typescript
const getStatusIcon = (status: string) => {
  switch (status) {
    case "configured":
      return <CheckCircleIcon color="success" />;
    case "not_configured":
      return <WarningIcon color="warning" />;
    case "error":
      return <CancelIcon color="error" />;
    default:
      return <WarningIcon color="disabled" />;
  }
};

const getStatusColor = (status: string): ChipProps['color'] => {
  switch (status) {
    case "configured": return "success";
    case "not_configured": return "warning";
    case "error": return "error";
    default: return "default";
  }
};
```

---

## Typography Variants Used

| Element | Variant | Usage |
|---------|---------|-------|
| Page Title | `h4` | Main page heading |
| Section Title | `h6` | Section headings |
| Card Title | `h6` | Card headers |
| Metric Value | `h4` | Large numbers/stats |
| Metric Label | `body2` | Metric descriptions |
| Body Text | `body1` | Regular content |
| Helper Text | `caption` | Small helper text |
| Secondary Text | `body1` + `color="text.secondary"` | Descriptions |

---

## Color Palette

**Success (Green):**
- Active providers
- Configured status
- Success messages

**Warning (Yellow):**
- Not configured status
- Warnings

**Error (Red):**
- Error status
- Validation errors
- Error messages

**Primary (Blue):**
- Links
- Primary actions
- Active states

**Text:**
- `text.primary` - Main content
- `text.secondary` - Descriptions, helper text
- `text.disabled` - Disabled content

---

## Spacing Standards

**Page Padding:** `p: 4` (32px)  
**Section Margins:** `mb: 4` (32px)  
**Grid Spacing:** `spacing={3}` (24px)  
**Button Gaps:** `gap: 2` (16px)  
**Card Content:** Default CardContent padding  

---

## Recommendations for Missing Pages

### For Email Domain Management UI:

**Pattern to Follow:** Combination of table (organizations.tsx) + cards (ProvidersOverview.tsx)

**Suggested Structure:**
1. **Domain List Table** - Similar to organizations table with inline add/edit
   - Columns: Domain, Status (Verified/Unverified), Default Role, Auto-Provision, Actions
   - Inline add/edit like organizations
   - Status chips for verification status

2. **Verification Instructions Panel** - Collapsible panel with:
   - DNS verification steps
   - Email verification option
   - Status checking

3. **Auto-Provisioning Config** - In-table or dialog:
   - Toggle for auto-provisioning
   - Select for default role (org_user, org_admin, org_owner)

**Files to Create:**
```
/admin/organizations/[id]/domains/page.tsx
components/admin/OrgDomainManagement.tsx
components/admin/DomainList.tsx
components/admin/AddDomainDialog.tsx
components/admin/DomainVerificationInstructions.tsx
```

### For Identity Provisioning:

**Recommendation:** This is likely a **webhook/API endpoint** - no UI needed.

**Alternative:** If UI is desired, add a section in organization settings showing:
- Recent provisioning events (table)
- Provisioning logs
- Manual provision button (for testing)

---

## Career App Comparison

**Status:** Career app not found in accessible location (`~/code/sts-career-stack` does not exist).

**Impact:** Cannot compare patterns between policy and career apps.

**Mitigation:** Policy app patterns are comprehensive enough to proceed with design standards.

---

## Next Steps

1. **Create Design Standards Documents:**
   - `standard_ADMIN-UI-PATTERNS.md` - Generic admin page patterns
   - `standard_AI-PROVIDER-ADMIN.md` - Provider management specific
   - `standard_ORG-DOMAIN-MANAGEMENT.md` - Domain management specific

2. **Map Orphaned Routes to Implementations:**
   - Cross-reference 25 orphaned routes with policy app findings
   - Identify which routes need UIs vs. are webhook/API only
   - Prioritize implementation order

3. **Implement Missing Pages:**
   - Start with highest-value routes
   - Reuse patterns from policy app
   - Follow established MUI component standards

---

## Appendix: File Locations Analyzed

### Policy App Files Read:
1. `/admin/rag/providers/page.tsx` - Main provider management page
2. `/admin/rag/providers/components/ProvidersOverview.tsx` - Overview component
3. `/admin/organizations/page.tsx` - Organization management page
4. `/components/settings/OrganizationProfileSection.tsx` - Org profile settings

### Policy App Files Searched:
- Searched all `.tsx` and `.ts` files in `/apps/web` for domain/provisioning features
- Found only test files and generic references
- Confirmed no UI implementation for domain management or provisioning

---

**Research Complete**  
**Status:** Ready for design standards extraction  
**Next:** Create standard documents based on these patterns
