# Module-WS (Workspace Module)

**Version:** 1.0.0  
**Tier:** Functional  
**Category:** Collaboration

## Overview

The Workspace Module provides collaborative workspace containers for organizing team resources. Workspaces serve as the primary organizational unit for grouping chats, knowledge bases, and workflows within an organization.

## Features

- ✅ **Multi-tenant Workspaces** - Organization-scoped workspaces with isolation
- ✅ **Role-Based Access** - Three-tier permissions: Owner, Admin, User
- ✅ **Soft Delete with Retention** - Configurable retention period before permanent deletion
- ✅ **Favorites** - Per-user workspace favorites for quick access
- ✅ **Tags & Color Coding** - Customizable workspace organization
- ✅ **Configurable Labels** - Platform-configurable navigation labels (Workspace, Audit, Campaign, etc.)

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `workspace` | Primary workspace container |
| `ws_member` | Many-to-many workspace memberships with roles |
| `ws_config` | Platform-level configuration (singleton) |
| `ws_favorite` | Per-user workspace favorites |

### Roles

| Role | Permissions |
|------|-------------|
| `ws_owner` | Full control: manage workspace, manage members, delete workspace |
| `ws_admin` | Partial control: update settings, view members (cannot manage members or delete) |
| `ws_user` | View-only: read access to workspace and members |

## API Endpoints

### Workspaces

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ws/workspaces?orgId={uuid}` | List workspaces |
| POST | `/api/ws/workspaces` | Create workspace |
| GET | `/api/ws/workspaces/:id` | Get workspace |
| PUT | `/api/ws/workspaces/:id` | Update workspace |
| DELETE | `/api/ws/workspaces/:id` | Soft delete workspace |
| POST | `/api/ws/workspaces/:id/restore` | Restore deleted workspace |

### Members

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ws/workspaces/:id/members` | List members |
| POST | `/api/ws/workspaces/:id/members` | Add member |
| PUT | `/api/ws/workspaces/:wsId/members/:memberId` | Update member role |
| DELETE | `/api/ws/workspaces/:wsId/members/:memberId` | Remove member |

### Favorites

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ws/workspaces/:id/favorite` | Toggle favorite |
| GET | `/api/ws/favorites?orgId={uuid}` | List favorites |

## Dependencies

### Core Dependencies (Required)

- **module-access** - Authentication, authorization, database operations
- **module-mgmt** - Module registration and health checks

### Functional Dependencies (Optional)

None - This is a base collaboration module that other modules depend on.

## Configuration

### Platform Configuration (`ws_config`)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `nav_label_singular` | string | "Workspace" | Navigation label (singular) |
| `nav_label_plural` | string | "Workspaces" | Navigation label (plural) |
| `nav_icon` | string | "WorkspaceIcon" | Material UI icon name |
| `enable_favorites` | boolean | true | Enable favorites functionality |
| `enable_tags` | boolean | true | Enable tags functionality |
| `enable_color_coding` | boolean | true | Enable color customization |
| `default_color` | string | "#1976d2" | Default hex color for new workspaces |

## Frontend Components

### Components

- `WorkspaceList` - Grid/list view of workspaces
- `WorkspaceCard` - Individual workspace card with actions
- `WorkspaceForm` - Create/edit workspace dialog
- `MemberList` - Workspace member management

### Hooks

- `useWorkspaces` - List workspaces with filtering
- `useWorkspace` - Single workspace with mutations
- `useWorkspaceMembers` - Member management
- `useWorkspaceForm` - Form state management

### Admin Cards

- `wsAdminCard` - Platform admin card for module configuration
- `wsOrgAdminCard` - Organization admin card for workspace analytics

## File Structure

```
module-ws/
├── backend/
│   └── lambdas/
│       ├── workspace/          # Workspace CRUD handler
│       └── cleanup/            # Retention cleanup handler
├── db/
│   └── schema/
│       ├── 001-workspace.sql
│       ├── 002-ws-member.sql
│       ├── 003-ws-config.sql
│       ├── 004-ws-favorite.sql
│       └── 005-workspace-rpc-functions.sql
├── frontend/
│   ├── admin/                  # Admin cards
│   ├── components/             # React components
│   ├── hooks/                  # Custom hooks
│   ├── lib/                    # API client
│   └── types/                  # TypeScript types
├── module.json                 # Module manifest
└── README.md                   # This file
```

## Installation

```bash
# Import module to project
./scripts/import-module.sh module-ws

# Run database migrations
./scripts/run-database-migrations.sh dev module-ws

# Deploy infrastructure
cd {project}-infra && terraform apply
```

## Usage

### Create a Workspace

```python
# Backend (Lambda)
result = access.execute_rpc(
    'create_workspace_with_owner',
    params={
        'p_org_id': org_id,
        'p_name': 'Product Development',
        'p_description': 'Main product workspace',
        'p_color': '#1976d2',
        'p_icon': 'WorkspaceIcon',
        'p_tags': ['engineering', 'product'],
        'p_owner_id': user_id
    }
)
```

### Frontend Hook Usage

```typescript
import { useWorkspaces } from '@project/module-ws-frontend';

function WorkspacePage() {
  const { workspaces, loading, error } = useWorkspaces(client, orgId);
  
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  
  return <WorkspaceList workspaces={workspaces} />;
}
```

## Specifications

See the full specifications in `docs/specifications/module-ws/`:

- [MODULE-WS-SPEC.md](../../docs/specifications/module-ws/MODULE-WS-SPEC.md) - Parent specification
- [MODULE-WS-TECHNICAL-SPEC.md](../../docs/specifications/module-ws/MODULE-WS-TECHNICAL-SPEC.md) - Technical details
- [MODULE-WS-USER-UX-SPEC.md](../../docs/specifications/module-ws/MODULE-WS-USER-UX-SPEC.md) - User experience
- [MODULE-WS-ADMIN-UX-SPEC.md](../../docs/specifications/module-ws/MODULE-WS-ADMIN-UX-SPEC.md) - Admin experience

---

**Created:** December 31, 2025  
**Author:** CORA Development Toolkit
