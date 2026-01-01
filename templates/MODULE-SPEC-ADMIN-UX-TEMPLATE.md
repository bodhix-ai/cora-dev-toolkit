# {MODULE_NAME} Module - Admin UX Specification

**Module Name:** {module-name}  
**Version:** 1.0  
**Status:** [Draft | Approved | In Progress | Complete]  
**Created:** {date}

**Parent Specification:** [MODULE-{MODULE_NAME}-SPEC.md](./MODULE-{MODULE_NAME}-SPEC.md)

---

## Table of Contents

1. [Admin Personas](#admin-personas)
2. [Admin Use Cases](#admin-use-cases)
3. [Admin Configuration Flows](#admin-configuration-flows)
4. [Platform Admin UI](#platform-admin-ui)
5. [Organization Admin UI](#organization-admin-ui)
6. [Admin Card Design](#admin-card-design)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Admin Testing Requirements](#admin-testing-requirements)

---

## 1. Admin Personas

### 1.1 Platform Admin

**Role:** Platform Owner / Platform Admin

**Responsibilities:**
- Configure module settings at platform level
- Enable/disable module for organizations
- Set global defaults and constraints
- Monitor module usage across all organizations
- Manage module licensing/billing (if applicable)

**Access Level:** Full access to all organizations and settings

**Goals:**
- Maintain platform stability
- Ensure compliance across organizations
- Configure sensible defaults
- Monitor for issues proactively

**Technical Proficiency:** Advanced

### 1.2 Organization Admin

**Role:** Organization Owner / Organization Admin

**Responsibilities:**
- Configure module settings for their organization
- Manage module permissions for org members
- Monitor usage within their organization
- Enable/disable features

**Access Level:** Organization-scoped only

**Goals:**
- Configure module for team needs
- Control access and permissions
- Track usage and costs
- Customize for organization requirements

**Technical Proficiency:** Intermediate

---

## 2. Admin Use Cases

### 2.1 Use Case: Configure Module Settings (Platform)

**Actor:** Platform Admin

**Preconditions:**
- User is logged in as platform admin
- Module is installed in platform

**Main Flow:**
1. Platform admin navigates to Platform Admin dashboard
2. Admin clicks on module admin card
3. System displays module configuration page
4. Admin configures global settings:
   - Feature flags
   - Default values
   - Usage limits
   - Integration settings
5. Admin clicks "Save Changes"
6. System validates configuration
7. System applies changes
8. System displays success confirmation

**Alternative Flows:**
- **6a. Validation Error**
  - System displays validation errors
  - Admin corrects settings
  - Resume at step 5

**Postconditions:**
- Module configuration is updated
- Changes apply to all organizations (unless overridden)

### 2.2 Use Case: Configure Module Settings (Organization)

**Actor:** Organization Admin

**Preconditions:**
- User is logged in as org admin
- Module is enabled for organization

**Main Flow:**
1. Org admin navigates to Organization Admin dashboard
2. Admin clicks on module admin card
3. System displays organization-level configuration
4. Admin configures organization settings:
   - Feature toggles
   - Custom values (within platform limits)
   - Member permissions
5. Admin clicks "Save Changes"
6. System validates configuration against platform constraints
7. System applies changes
8. System displays success confirmation

**Alternative Flows:**
- **6a. Platform Constraint Violation**
  - System displays "Exceeds platform limit" error
  - Admin adjusts to within limits
  - Resume at step 5

### 2.3 Use Case: View Module Analytics

**Actor:** Platform Admin / Organization Admin

**Preconditions:**
- User is logged in with admin role
- Module has usage data

**Main Flow:**
1. Admin navigates to module admin page
2. Admin clicks "Analytics" tab
3. System displays:
   - Usage metrics (entities created, API calls, etc.)
   - Trend charts
   - Top users (if applicable)
   - Error rates
4. Admin filters by date range
5. Admin exports data (optional)

**Postconditions:**
- Admin has visibility into module performance

---

## 3. Admin Configuration Flows

### 3.1 Flow: First-Time Module Configuration

**Scenario:** Platform admin configures newly installed module

**Steps:**

1. **Access Module Admin**
   - Entry: Platform Admin > Admin Cards > {Module} Card
   - First-time state: Setup wizard or guided configuration

2. **Configure Required Settings**
   - System prompts for required configuration
   - Validation ensures all required fields populated
   - Help text explains each setting

3. **Configure Optional Settings**
   - System displays optional configuration
   - Defaults pre-populated
   - Advanced settings collapsed

4. **Enable for Organizations**
   - Choose: Enable for all, specific orgs, or none
   - Set per-org overrides if needed

5. **Verify Configuration**
   - System performs health check
   - Displays configuration summary
   - Confirms module is operational

**Flow Diagram:**

```
Access → Required Settings → Optional Settings → Enable → Verify
```

### 3.2 Flow: Modify Existing Configuration

**Scenario:** Admin updates module settings

**Steps:**

1. **Review Current Settings**
   - System displays current configuration
   - Changed values highlighted from defaults

2. **Modify Settings**
   - Admin changes desired values
   - Real-time validation feedback
   - Warning for impactful changes

3. **Preview Impact**
   - System shows what will change
   - Affected organizations/users listed

4. **Apply Changes**
   - Confirm dialog for significant changes
   - Rollback option available
   - Audit log updated

---

## 4. Platform Admin UI

### 4.1 Page: Platform Admin Dashboard

**Route:** `/admin`

**Purpose:** Central hub for platform administration

**Module Card Location:**

```
┌─────────────────────────────────────────────────┐
│ Platform Administration                         │
├─────────────────────────────────────────────────┤
│ Core Modules:                                   │
│   [Access] [AI] [Management]                    │
├─────────────────────────────────────────────────┤
│ Functional Modules:                             │
│   [{Module} Card] [Other Module] [...]          │
└─────────────────────────────────────────────────┘
```

### 4.2 Page: Platform Module Configuration

**Route:** `/admin/{module}`

**Purpose:** Platform-level configuration for module

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Admin > {Module}                    │
├─────────────────────────────────────────────────┤
│ Header:                                         │
│   {Module} Configuration                        │
│   Status: [Enabled Badge]                       │
├─────────────────────────────────────────────────┤
│ Tabs: [Settings] [Organizations] [Analytics]   │
├─────────────────────────────────────────────────┤
│ Settings Tab:                                   │
│                                                 │
│ Global Settings                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ Enable Feature A          [Toggle]          ││
│ │ Default Limit             [100]             ││
│ │ Integration Mode          [Select ▼]        ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ Constraints                                     │
│ ┌─────────────────────────────────────────────┐│
│ │ Max entities per org      [1000]            ││
│ │ Allow org override        [Toggle]          ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [Save Changes]                                  │
└─────────────────────────────────────────────────┘
```

**Settings Categories:**

| Category | Settings | Access |
|----------|----------|--------|
| Global Defaults | Feature flags, default values | Platform only |
| Constraints | Limits, quotas, restrictions | Platform only |
| Organization Overrides | Allow/deny per-org customization | Platform only |
| Advanced | Debug, experimental features | Platform only |

### 4.3 Page: Organizations Tab

**Route:** `/admin/{module}/organizations`

**Purpose:** View/configure module per organization

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Organizations                                   │
├─────────────────────────────────────────────────┤
│ [Search organizations] [Filter: All ▼]         │
├─────────────────────────────────────────────────┤
│ Organization      Status    Entities   Actions │
│ ─────────────────────────────────────────────  │
│ Org A             Enabled   45         [⚙️]    │
│ Org B             Enabled   123        [⚙️]    │
│ Org C             Disabled  -          [⚙️]    │
└─────────────────────────────────────────────────┘
```

---

## 5. Organization Admin UI

### 5.1 Page: Organization Admin Dashboard

**Route:** `/[org-slug]/admin`

**Purpose:** Organization-level administration hub

**Module Card Location:**

```
┌─────────────────────────────────────────────────┐
│ Organization Administration: {Org Name}        │
├─────────────────────────────────────────────────┤
│ Organization Settings:                          │
│   [General] [Members] [Billing]                │
├─────────────────────────────────────────────────┤
│ Module Settings:                                │
│   [{Module} Card] [Other Module] [...]          │
└─────────────────────────────────────────────────┘
```

### 5.2 Page: Organization Module Configuration

**Route:** `/[org-slug]/admin/{module}`

**Purpose:** Organization-level configuration for module

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: {Org} > Admin > {Module}            │
├─────────────────────────────────────────────────┤
│ Header:                                         │
│   {Module} Settings for {Org Name}              │
│   Status: [Enabled Badge]                       │
├─────────────────────────────────────────────────┤
│ Tabs: [Settings] [Permissions] [Usage]         │
├─────────────────────────────────────────────────┤
│ Settings Tab:                                   │
│                                                 │
│ Organization Settings                           │
│ ┌─────────────────────────────────────────────┐│
│ │ Enable Feature A          [Toggle]          ││
│ │ Custom Label              [Workspaces]      ││
│ │ Default Color             [Color Picker]    ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ [Save Changes]                                  │
│                                                 │
│ ⚠️ Some settings are controlled by platform    │
└─────────────────────────────────────────────────┘
```

**Settings Categories:**

| Category | Settings | Access |
|----------|----------|--------|
| Organization Defaults | Feature toggles, labels, theming | Org admin |
| Member Permissions | Role-based access | Org admin |
| Usage Limits | Quotas (within platform limits) | Org admin |
| Disabled | Settings controlled by platform | View only |

### 5.3 Page: Permissions Tab

**Route:** `/[org-slug]/admin/{module}/permissions`

**Purpose:** Configure role-based access to module features

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Permissions                                     │
├─────────────────────────────────────────────────┤
│ Permission          Owner  Admin  User  Viewer │
│ ─────────────────────────────────────────────  │
│ Create {entities}    ✓      ✓      ✓     -    │
│ Edit {entities}      ✓      ✓      ✓     -    │
│ Delete {entities}    ✓      ✓      -     -    │
│ View {entities}      ✓      ✓      ✓     ✓    │
│ Export {entities}    ✓      ✓      -     -    │
├─────────────────────────────────────────────────┤
│ [Reset to Defaults] [Save Changes]              │
└─────────────────────────────────────────────────┘
```

---

## 6. Admin Card Design

### 6.1 Card Specification

**Platform Admin Card:**

```typescript
// frontend/adminCard.tsx

import React from 'react';
import {ModuleIcon} from '@mui/icons-material';
import type { AdminCardConfig } from '@{project}/shared-types';

export const {module}PlatformAdminCard: AdminCardConfig = {
  id: '{module}-platform-admin',
  title: '{Module} Management',
  description: 'Configure {module} settings and monitor usage',
  icon: <ModuleIcon sx={{ fontSize: 48 }} />,
  href: '/admin/{module}',
  color: 'primary.main',
  order: 100,  // Display order
  context: 'platform',
  requiredRoles: ['platform_owner', 'platform_admin'],
  badge: null,  // Optional: "New", count, etc.
};
```

**Organization Admin Card:**

```typescript
export const {module}OrgAdminCard: AdminCardConfig = {
  id: '{module}-org-admin',
  title: '{Module} Settings',
  description: 'Configure {module} for your organization',
  icon: <ModuleIcon sx={{ fontSize: 48 }} />,
  href: '/{org-slug}/admin/{module}',
  color: 'primary.main',
  order: 100,
  context: 'organization',
  requiredRoles: ['org_owner', 'org_admin'],
  badge: null,
};
```

### 6.2 Card Component

```typescript
interface AdminCardProps {
  config: AdminCardConfig;
  onClick: () => void;
}

export function AdminCard({ config, onClick }: AdminCardProps) {
  return (
    <Card 
      onClick={onClick}
      sx={{ 
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
        <Box sx={{ color: config.color, mb: 2 }}>
          {config.icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {config.title}
          {config.badge && (
            <Chip label={config.badge} size="small" sx={{ ml: 1 }} />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {config.description}
        </Typography>
      </CardContent>
    </Card>
  );
}
```

### 6.3 Admin Card Registry

```typescript
// Register cards with module-mgmt
import { registerAdminCard } from '@{project}/module-mgmt-frontend';

registerAdminCard({module}PlatformAdminCard);
registerAdminCard({module}OrgAdminCard);
```

---

## 7. Monitoring & Analytics

### 7.1 Platform Analytics Page

**Route:** `/admin/{module}/analytics`

**Metrics to Display:**

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Entities | Count of all entities | Number card |
| Entities by Org | Distribution across organizations | Bar chart |
| Created Over Time | Entity creation trend | Line chart |
| API Calls | Request volume | Line chart |
| Error Rate | Percentage of failed requests | Number card |
| Active Users | Users who used module | Number card |

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ Analytics                     [Date Range ▼]   │
├─────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │  1,234  │ │    45   │ │  0.2%   │ │   156   ││
│ │ Entities│ │  Orgs   │ │ Errors  │ │ Users   ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├─────────────────────────────────────────────────┤
│ Entities Created Over Time                      │
│ [Line Chart: 30 days trend]                     │
├─────────────────────────────────────────────────┤
│ Top Organizations                               │
│ [Bar Chart: Top 10 by entity count]             │
└─────────────────────────────────────────────────┘
```

### 7.2 Organization Analytics Page

**Route:** `/[org-slug]/admin/{module}/usage`

**Metrics:**

| Metric | Description | Chart Type |
|--------|-------------|------------|
| Total Entities | Org entity count | Number card |
| Created This Month | Recent activity | Number card |
| Top Users | Most active members | Table |
| Usage Trend | Activity over time | Line chart |

### 7.3 Data Collection

```python
# Backend: Log analytics events
def log_entity_created(org_id: str, user_id: str, entity_id: str):
    access.insert_one(
        table='module_analytics',
        data={
            'module_name': '{module}',
            'event_type': 'entity_created',
            'org_id': org_id,
            'user_id': user_id,
            'entity_id': entity_id,
            'timestamp': datetime.utcnow()
        }
    )
```

---

## 8. Admin Testing Requirements

### 8.1 Platform Admin Tests

```typescript
describe('Platform Admin - {Module} Configuration', () => {
  beforeEach(() => {
    // Login as platform admin
  });
  
  it('displays admin card on platform dashboard', () => {
    render(<PlatformAdminDashboard />);
    expect(screen.getByText('{Module} Management')).toBeInTheDocument();
  });
  
  it('navigates to module configuration', async () => {
    render(<PlatformAdminDashboard />);
    await userEvent.click(screen.getByText('{Module} Management'));
    expect(screen.getByText('{Module} Configuration')).toBeInTheDocument();
  });
  
  it('saves configuration changes', async () => {
    render(<ModuleConfigPage />);
    
    // Modify setting
    const toggle = screen.getByRole('switch', { name: /enable feature/i });
    await userEvent.click(toggle);
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
  
  it('validates configuration constraints', async () => {
    render(<ModuleConfigPage />);
    
    // Set invalid value
    const input = screen.getByLabelText(/max entities/i);
    await userEvent.clear(input);
    await userEvent.type(input, '-1');
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify error
    expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
  });
});
```

### 8.2 Organization Admin Tests

```typescript
describe('Organization Admin - {Module} Settings', () => {
  beforeEach(() => {
    // Login as org admin
  });
  
  it('displays admin card on org dashboard', () => {
    render(<OrgAdminDashboard orgSlug="test-org" />);
    expect(screen.getByText('{Module} Settings')).toBeInTheDocument();
  });
  
  it('respects platform constraints', async () => {
    // Platform limit: 100
    render(<OrgModuleSettings orgSlug="test-org" />);
    
    const input = screen.getByLabelText(/limit/i);
    await userEvent.clear(input);
    await userEvent.type(input, '200');  // Exceeds platform limit
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(screen.getByText(/exceeds platform limit/i)).toBeInTheDocument();
  });
  
  it('configures permissions correctly', async () => {
    render(<OrgModulePermissions orgSlug="test-org" />);
    
    // Toggle permission
    const checkbox = screen.getByRole('checkbox', { name: /user.*create/i });
    await userEvent.click(checkbox);
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText(/permissions updated/i)).toBeInTheDocument();
    });
  });
});
```

### 8.3 Admin Card Registration Tests

```typescript
describe('Admin Card Registration', () => {
  it('registers platform admin card', () => {
    const cards = getRegisteredAdminCards('platform');
    expect(cards.find(c => c.id === '{module}-platform-admin')).toBeDefined();
  });
  
  it('registers organization admin card', () => {
    const cards = getRegisteredAdminCards('organization');
    expect(cards.find(c => c.id === '{module}-org-admin')).toBeDefined();
  });
  
  it('filters cards by user role', () => {
    // User role
    const userCards = getVisibleAdminCards({ role: 'org_user' });
    expect(userCards.find(c => c.id === '{module}-org-admin')).toBeUndefined();
    
    // Admin role
    const adminCards = getVisibleAdminCards({ role: 'org_admin' });
    expect(adminCards.find(c => c.id === '{module}-org-admin')).toBeDefined();
  });
});
```

### 8.4 Analytics Tests

```typescript
describe('Module Analytics', () => {
  it('displays platform metrics', async () => {
    render(<PlatformAnalytics />);
    
    await waitFor(() => {
      expect(screen.getByText(/total entities/i)).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();  // Mock value
    });
  });
  
  it('filters by date range', async () => {
    render(<PlatformAnalytics />);
    
    const dateSelect = screen.getByRole('combobox', { name: /date range/i });
    await userEvent.click(dateSelect);
    await userEvent.click(screen.getByText('Last 7 days'));
    
    // Verify data refreshed
    await waitFor(() => {
      expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    });
  });
});
```

### 8.5 Test Coverage Requirements

- **Admin UI Coverage:** ≥80%
- **Configuration Flows:** 100%
- **Role-Based Access:** 100%
- **Platform/Org Separation:** 100%

---

**Document Version:** 1.0  
**Last Updated:** {date}  
**Author:** [Name/AI]  
**Specification Type:** Admin UX
