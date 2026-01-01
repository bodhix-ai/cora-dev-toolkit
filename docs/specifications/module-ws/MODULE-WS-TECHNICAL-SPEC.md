# Workspace Module - Technical Specification

**Module Name:** module-ws  
**Parent Spec:** [MODULE-WS-SPEC.md](./MODULE-WS-SPEC.md)  
**Status:** Draft  
**Last Updated:** December 31, 2025

---

## 1. Data Model

### Entity 1: workspace

**Purpose:** Primary container for team collaboration, associates with chats, knowledge bases, and workflows

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| name | VARCHAR(255) | Yes | - | NOT NULL | Workspace name |
| description | TEXT | No | NULL | - | Workspace description |
| color | VARCHAR(7) | No | '#1976d2' | CHECK (color ~ '^#[0-9A-Fa-f]{6}$') | Hex color for UI display |
| icon | VARCHAR(50) | No | 'WorkspaceIcon' | - | Material UI icon name |
| tags | TEXT[] | No | ARRAY[]::TEXT[] | - | Array of tags for categorization |
| status | VARCHAR(50) | Yes | 'active' | CHECK (status IN ('active', 'archived')) | Workspace status |
| deleted_at | TIMESTAMPTZ | No | NULL | - | Soft delete timestamp |
| deleted_by | UUID | No | NULL | FK to auth.users(id) | User who deleted workspace |
| retention_days | INTEGER | No | 30 | CHECK (retention_days > 0) | Days to retain after deletion |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Relationships

```
workspace
├── belongs_to: org (org_id → org.id)
├── belongs_to: auth.users (created_by → auth.users.id)
├── has_many: ws_member (via workspace_id)
├── has_many: ws_favorite (via workspace_id)
├── has_many: chat_session (via ws_id in future module-chat)
├── has_many: kb_base (via ws_id in future module-kb)
└── has_many: workflow (via ws_id in future module-wf)
```

#### Indexes

```sql
CREATE INDEX idx_workspace_org_id ON workspace(org_id);
CREATE INDEX idx_workspace_status ON workspace(status);
CREATE INDEX idx_workspace_deleted_at ON workspace(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspace_created_at ON workspace(created_at DESC);
CREATE INDEX idx_workspace_updated_at ON workspace(updated_at DESC);
CREATE INDEX idx_workspace_tags ON workspace USING GIN(tags);
CREATE INDEX idx_workspace_name_trgm ON workspace USING GIN(name gin_trgm_ops);
```

#### Validation Rules

- **name**: Required, 1-255 characters, unique per organization (among active workspaces)
- **description**: Optional, max 5000 characters
- **color**: Must be valid hex color (#RRGGBB)
- **icon**: Material UI icon name, max 50 characters
- **tags**: Each tag max 50 characters, max 20 tags per workspace
- **status**: Must be 'active' or 'archived'
- **org_id**: User must be member of organization
- **retention_days**: If soft deleted, must be > 0 (default 30 days)

#### Business Rules

1. **Unique Workspace Names**: Workspace names must be unique per organization (excluding soft-deleted workspaces)
2. **Owner Required**: Every workspace must have at least one member with `ws_owner` role
3. **Deletion Protection**: Cannot permanently delete workspace if it has associated resources (chats, KBs, workflows) - must archive first
4. **Soft Delete Retention**: Soft-deleted workspaces are retained for `retention_days` (default 30) before permanent deletion
5. **Archive Cascade**: When workspace is archived, it does NOT cascade to associated resources (chats/KBs remain accessible)
6. **Member Cascade**: When workspace is soft-deleted, all `ws_member` records are also soft-deleted
7. **Favorite Cleanup**: When workspace is soft-deleted, all `ws_favorite` records are removed

---

### Entity 2: ws_member

**Purpose:** Many-to-many relationship between workspaces and users, with role-based access control

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| ws_id | UUID | Yes | - | FK to workspace(id) ON DELETE CASCADE | Workspace reference |
| user_id | UUID | Yes | - | FK to auth.users(id) | User reference |
| ws_role | VARCHAR(50) | Yes | 'ws_user' | CHECK (ws_role IN ('ws_owner', 'ws_admin', 'ws_user')) | Member role |
| deleted_at | TIMESTAMPTZ | No | NULL | - | Soft delete timestamp |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Membership creation timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Who added this member |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Who last updated this member |
| **UNIQUE** | - | - | - | UNIQUE(ws_id, user_id) WHERE deleted_at IS NULL | Prevent duplicate active memberships |

#### Relationships

```
ws_member
├── belongs_to: workspace (ws_id → workspace.id)
├── belongs_to: auth.users (user_id → auth.users.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── belongs_to: auth.users (updated_by → auth.users.id)
```

#### Indexes

```sql
CREATE INDEX idx_ws_member_ws_id ON ws_member(ws_id);
CREATE INDEX idx_ws_member_user_id ON ws_member(user_id);
CREATE INDEX idx_ws_member_ws_role ON ws_member(ws_role);
CREATE INDEX idx_ws_member_updated_at ON ws_member(updated_at DESC);
CREATE UNIQUE INDEX idx_ws_member_unique_active ON ws_member(ws_id, user_id) 
    WHERE deleted_at IS NULL;
```

#### Validation Rules

- **ws_id**: Must exist in workspace table
- **user_id**: Must exist in auth.users table
- **ws_role**: Must be one of: `ws_owner`, `ws_admin`, `ws_user`
- **Unique Membership**: A user can only be an active member of a workspace once
- **updated_by**: Must exist in auth.users table if provided

#### Business Rules

1. **At Least One Owner**: Every workspace must have at least one `ws_owner`
2. **Owner Removal Protection**: Cannot remove last `ws_owner` from workspace
3. **Self-Removal**: Users can remove themselves from workspace (unless they're the last owner)
4. **Role Permissions**:
   - `ws_owner`: Full control (manage workspace, manage members, delete workspace)
   - `ws_admin`: Update workspace settings, view members (CANNOT manage members or delete workspace)
   - `ws_user`: Read access only, view members (CANNOT manage workspace or members)
5. **Cascade on Workspace Delete**: When workspace is soft-deleted, all members are soft-deleted

---

### Entity 3: ws_config

**Purpose:** Platform-level configuration for workspace module behavior and UI customization per application

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| nav_label_singular | VARCHAR(50) | Yes | 'Workspace' | NOT NULL | Navigation label (singular): "Workspace", "Audit", "Campaign", "Proposal" |
| nav_label_plural | VARCHAR(50) | Yes | 'Workspaces' | NOT NULL | Navigation label (plural): "Workspaces", "Audits", "Campaigns", "Proposals" |
| nav_icon | VARCHAR(50) | No | 'WorkspaceIcon' | - | Material UI icon name for navigation |
| enable_favorites | BOOLEAN | Yes | true | NOT NULL | Enable/disable favorites functionality |
| enable_tags | BOOLEAN | Yes | true | NOT NULL | Enable/disable tags functionality |
| enable_color_coding | BOOLEAN | Yes | true | NOT NULL | Enable/disable color customization |
| default_color | VARCHAR(7) | No | '#1976d2' | CHECK (default_color ~ '^#[0-9A-Fa-f]{6}$') | Default hex color for new workspaces |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Business Rules

1. **Single Configuration**: Only one configuration record exists globally (singleton pattern)
2. **Platform Owner and Admin**: Both platform_owner and platform_admin can update module configuration
3. **Navigation Labels**: Used throughout UI (sidebar, breadcrumbs, page titles)
4. **Feature Flags**: Configuration can disable features globally (favorites, tags, colors)
5. **Default Values**: New workspaces inherit default_color if not specified

---

### Entity 4: ws_favorite

**Purpose:** Per-user workspace favorites for quick access and prioritization

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| ws_id | UUID | Yes | - | FK to workspace(id) ON DELETE CASCADE | Workspace reference |
| user_id | UUID | Yes | - | FK to auth.users(id) | User who favorited |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | When favorited |
| **UNIQUE** | - | - | - | UNIQUE(ws_id, user_id) | One favorite per user per workspace |

#### Relationships

```
ws_favorite
├── belongs_to: workspace (ws_id → workspace.id)
└── belongs_to: auth.users (user_id → auth.users.id)
```

#### Indexes

```sql
CREATE INDEX idx_ws_favorite_ws_id ON ws_favorite(ws_id);
CREATE INDEX idx_ws_favorite_user_id ON ws_favorite(user_id);
CREATE UNIQUE INDEX idx_ws_favorite_unique ON ws_favorite(ws_id, user_id);
```

#### Validation Rules

- **ws_id**: Must exist in workspace table
- **user_id**: Must exist in auth.users table
- **User must be member**: User must be an active member of the workspace to favorite it

#### Business Rules

1. **Toggle Behavior**: Favoriting an already-favorited workspace unfavorites it (DELETE record)
2. **Membership Required**: Only workspace members can favorite a workspace
3. **Auto-Unfavorite**: If user is removed from workspace, their favorite is automatically removed
4. **Cascade on Delete**: When workspace is deleted, all favorites are removed

---

## 2. API Endpoints

### Base Path: `/api/ws/`

### 2.1 List Workspaces

```
GET /api/ws/workspaces?orgId={uuid}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | Yes | - | Organization ID (multi-tenant filter) |
| status | string | No | 'active' | Filter by status: 'active', 'archived', 'all' |
| favorites_only | boolean | No | false | Show only favorited workspaces |
| favorites_first | boolean | No | false | Sort favorites first, then by updated_at |
| sort_by | string | No | 'updated_at' | Sort field: 'updated_at', 'created_at', 'name', 'favorited_at' |
| search | string | No | - | Search by name (partial match, case-insensitive) |
| tags | string[] | No | - | Filter by tags (comma-separated) |
| limit | integer | No | 100 | Max results (1-1000) |
| offset | integer | No | 0 | Pagination offset |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "name": "Product Development",
      "description": "Main product development workspace",
      "color": "#1976d2",
      "icon": "WorkspaceIcon",
      "tags": ["engineering", "product"],
      "status": "active",
      "is_favorited": true,
      "favorited_at": "2025-12-31T12:00:00Z",
      "user_role": "ws_owner",
      "member_count": 5,
      "created_at": "2025-12-01T12:00:00Z",
      "updated_at": "2025-12-31T12:00:00Z",
      "created_by": "uuid"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Missing orgId parameter |
| 403 | User not member of organization |
| 500 | Internal server error |

---

### 2.2 Get Single Workspace

```
GET /api/ws/workspaces/{id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Product Development",
    "description": "Main product development workspace",
    "color": "#1976d2",
    "icon": "WorkspaceIcon",
    "tags": ["engineering", "product"],
    "status": "active",
    "is_favorited": true,
    "user_role": "ws_owner",
    "member_count": 5,
    "created_at": "2025-12-01T12:00:00Z",
    "updated_at": "2025-12-31T12:00:00Z",
    "created_by": "uuid",
    "updated_by": "uuid"
  }
}
```

**Error Responses:**

| Status | Description |
|--------|-------------|
| 404 | Workspace not found |
| 403 | User not member of workspace |

---

### 2.3 Create Workspace

```
POST /api/ws/workspaces
```

**Request Body:**

```json
{
  "org_id": "uuid",
  "name": "Product Development",
  "description": "Main product development workspace (optional)",
  "color": "#1976d2 (optional)",
  "icon": "WorkspaceIcon (optional)",
  "tags": ["engineering", "product"],
  "status": "active (optional, default)"
}
```

**Validation:**
- `org_id`: Required, valid UUID, user must be member
- `name`: Required, 1-255 characters, unique per org
- `description`: Optional, max 5000 characters
- `color`: Optional, valid hex color, default '#1976d2'
- `icon`: Optional, max 50 characters, default 'WorkspaceIcon'
- `tags`: Optional, array of strings (max 20 tags, each max 50 chars)
- `status`: Optional, default 'active', enum: active|archived

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "name": "Product Development",
    "description": "Main product development workspace",
    "color": "#1976d2",
    "icon": "WorkspaceIcon",
    "tags": ["engineering", "product"],
    "status": "active",
    "user_role": "ws_owner",
    "created_at": "2025-12-31T12:00:00Z",
    "created_by": "uuid"
  }
}
```

**Business Logic:**
- Creator is automatically added as `ws_owner` member
- Uses database RPC: `create_workspace_with_owner()`

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error (missing/invalid fields) |
| 403 | User not member of organization |
| 409 | Workspace name already exists in organization |

---

### 2.4 Update Workspace

```
PUT /api/ws/workspaces/{id}
```

**Request Body (all fields optional):**

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "color": "#ff5722",
  "icon": "FolderIcon",
  "tags": ["updated", "tags"],
  "status": "archived"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Updated Name",
    "description": "Updated description",
    "color": "#ff5722",
    "icon": "FolderIcon",
    "tags": ["updated", "tags"],
    "status": "archived",
    "updated_at": "2025-12-31T12:00:00Z",
    "updated_by": "uuid"
  }
}
```

**Permissions:**
- `ws_owner`: Can update all fields
- `ws_admin`: Can update name, description, color, icon, tags (NOT status)
- `ws_user`: No update permission

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 403 | Insufficient permissions (not owner/admin) |
| 404 | Workspace not found |
| 409 | Name conflict with existing workspace |

---

### 2.5 Delete Workspace (Soft Delete)

```
DELETE /api/ws/workspaces/{id}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| permanent | boolean | No | false | If true, permanently delete (only if no associations) |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Workspace soft deleted successfully",
    "id": "uuid",
    "deleted_at": "2025-12-31T12:00:00Z",
    "permanent_deletion_date": "2026-01-30T12:00:00Z"
  }
}
```

**Business Logic:**
- Soft delete (default): Sets `deleted_at` timestamp, `deleted_by` user ID, calculates `permanent_deletion_date`
- Cascade soft deletes all `ws_member` records
- Removes all `ws_favorite` records
- Permanent delete (if `permanent=true`): Only allowed if no associated resources exist
- Uses database RPC: `soft_delete_workspace()` or `permanent_delete_workspace()`

**Permissions:**
- Only `ws_owner` can delete workspace

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Insufficient permissions (not ws_owner) |
| 404 | Workspace not found |
| 409 | Cannot permanently delete (has associated resources) |

---

### 2.6 Restore Workspace

```
POST /api/ws/workspaces/{id}/restore
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Restored Workspace",
    "status": "active",
    "deleted_at": null,
    "restored_at": "2025-12-31T12:00:00Z",
    "restored_by": "uuid"
  }
}
```

**Business Logic:**
- Only soft-deleted workspaces can be restored
- Restores workspace (sets `deleted_at` to NULL)
- Restores all soft-deleted `ws_member` records
- User must have been a `ws_owner` before deletion

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | User was not ws_owner before deletion |
| 404 | Workspace not found or already active |
| 410 | Workspace retention period expired (permanently deleted) |

---

### 2.7 Add Workspace Member

```
POST /api/ws/workspaces/{id}/members
```

**Request Body:**

```json
{
  "user_id": "uuid",
  "ws_role": "ws_user"
}
```

**Validation:**
- `user_id`: Required, valid UUID, must exist in auth.users
- `ws_role`: Required, enum: `ws_owner`, `ws_admin`, `ws_user`

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "user_id": "uuid",
    "ws_role": "ws_user",
    "profile": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "avatar_url": "https://..."
    },
    "created_at": "2025-12-31T12:00:00Z",
    "created_by": "uuid"
  }
}
```

**Permissions:**
- `ws_owner`: Can add members with any role
- `ws_admin`: No permission to add members (view only)
- `ws_user`: No permission to add members (view only)

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error (missing/invalid fields) |
| 403 | Insufficient permissions |
| 404 | Workspace or user not found |
| 409 | User already a member of workspace |

---

### 2.8 List Workspace Members

```
GET /api/ws/workspaces/{id}/members
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| ws_role | string | No | - | Filter by role: ws_owner, ws_admin, ws_user |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "user_id": "uuid",
      "ws_role": "ws_owner",
      "profile": {
        "full_name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://...",
        "phone": "+1234567890"
      },
      "created_at": "2025-12-01T12:00:00Z",
      "created_by": "uuid"
    }
  ]
}
```

**Permissions:**
- All workspace members can list members

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | User not member of workspace |
| 404 | Workspace not found |

---

### 2.9 Update Workspace Member Role

```
PUT /api/ws/workspaces/{workspaceId}/members/{memberId}
```

**Request Body:**

```json
{
  "ws_role": "ws_admin"
}
```

**Validation:**
- `ws_role`: Required, enum: `ws_owner`, `ws_admin`, `ws_user`
- Cannot remove last `ws_owner` (must change to different role after adding another owner)

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "user_id": "uuid",
    "ws_role": "ws_admin",
    "profile": {
      "full_name": "John Doe",
      "email": "john@example.com"
    },
    "updated_at": "2025-12-31T12:00:00Z"
  }
}
```

**Permissions:**
- `ws_owner`: Can change any member's role
- `ws_admin`: No permission to update roles (view only)
- `ws_user`: No permission to update roles (view only)

**Error Responses:**

| Status | Description |
|--------|-------------|
| 400 | Validation error |
| 403 | Insufficient permissions |
| 404 | Workspace or member not found |
| 409 | Cannot remove last ws_owner |

---

### 2.10 Remove Workspace Member

```
DELETE /api/ws/workspaces/{workspaceId}/members/{memberId}
```

**Response (204 No Content)**

**Business Logic:**
- Soft deletes the `ws_member` record
- Automatically removes member's favorite (if exists)
- Cannot remove last `ws_owner`
- Users can remove themselves (unless they're the last owner)

**Permissions:**
- `ws_owner`: Can remove any member (except last owner)
- `ws_admin`: Can only remove themselves (view only for others)
- `ws_user`: Can only remove themselves (view only for others)

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | Insufficient permissions |
| 404 | Workspace or member not found |
| 409 | Cannot remove last ws_owner |

---

### 2.11 Toggle Workspace Favorite

```
POST /api/ws/workspaces/{id}/favorite
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "workspace_id": "uuid",
    "is_favorited": true,
    "favorited_at": "2025-12-31T12:00:00Z"
  }
}
```

**Business Logic:**
- If not favorited: Creates `ws_favorite` record, returns `is_favorited: true`
- If already favorited: Deletes `ws_favorite` record, returns `is_favorited: false`
- Uses database RPC: `toggle_workspace_favorite()`

**Permissions:**
- User must be a workspace member to favorite it

**Error Responses:**

| Status | Description |
|--------|-------------|
| 403 | User not member of workspace |
| 404 | Workspace not found |

---

### 2.12 List Favorite Workspaces

```
GET /api/ws/favorites?orgId={uuid}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | No | - | Filter by organization (optional) |
| limit | integer | No | 50 | Max results |
| offset | integer | No | 0 | Pagination offset |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Product Development",
      "description": "...",
      "color": "#1976d2",
      "icon": "WorkspaceIcon",
      "tags": ["engineering"],
      "status": "active",
      "is_favorited": true,
      "favorited_at": "2025-12-31T12:00:00Z",
      "user_role": "ws_owner",
      "org_id": "uuid"
    }
  ]
}
```

**Business Logic:**
- Returns all favorited workspaces across all orgs (or filtered by orgId)
- Sorted by `favorited_at` DESC

---

## 3. Core Module Integrations

### 3.1 module-access Integration

**Authentication:**
```python
import access_common as access

def lambda_handler(event, context):
    # Extract user from event
    user_info = access.get_user_from_event(event)
    user_id = access.get_supabase_user_id_from_okta_uid(user_info['user_id'])
```

**Authorization:**
```python
# Verify org membership
org_id = query_params.get('orgId')
if not org_id:
    return access.bad_request_response('orgId required')

membership = access.find_one(
    table='org_members',
    filters={'org_id': org_id, 'person_id': user_id, 'active': True}
)

if not membership:
    return access.forbidden_response('No access to organization')

# Verify workspace membership and role
ws_member = access.find_one(
    table='ws_member',
    filters={'workspace_id': workspace_id, 'user_id': user_id, 'deleted_at': None}
)

if not ws_member:
    return access.forbidden_response('Not a member of this workspace')

# Check role permissions
user_role = ws_member['ws_role']
if user_role not in ['ws_owner', 'ws_admin']:
    return access.forbidden_response('Insufficient permissions')
```

**Database Operations:**
```python
# List workspaces
workspaces = access.find_many(
    table='workspace',
    filters={'org_id': org_id, 'deleted_at': None}
)

# Get single workspace
workspace = access.find_one(
    table='workspace',
    filters={'id': workspace_id, 'deleted_at': None}
)

# Create workspace (use RPC for owner assignment)
result = access.execute_rpc(
    'create_workspace_with_owner',
    params={
        'p_org_id': org_id,
        'p_name': name,
        'p_description': description,
        'p_color': color,
        'p_icon': icon,
        'p_tags': tags,
        'p_owner_id': user_id
    }
)

# Update workspace
updated = access.update_one(
    table='workspace',
    filters={'id': workspace_id},
    data={
        'name': new_name,
        'description': new_desc,
        'updated_by': user_id,
        'updated_at': 'NOW()'
    }
)

# Soft delete workspace
access.update_one(
    table='workspace',
    filters={'id': workspace_id},
    data={
        'deleted_at': 'NOW()',
        'deleted_by': user_id
    }
)
```

**Response Functions:**
```python
# Success responses
return access.success_response(workspaces)  # 200
return access.created_response(new_workspace)  # 201

# Error responses
return access.bad_request_response('Missing required field: name')  # 400
return access.forbidden_response('Not a workspace member')  # 403
return access.not_found_response('Workspace not found')  # 404
return access.conflict_response('Workspace name already exists')  # 409
return access.internal_error_response('Database error')  # 500
```

### 3.2 module-ai Integration

**Not applicable** - module-ws does not use AI features.

### 3.3 module-mgmt Integration

**Module Registration:**
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
            'tables': check_tables_exist(['workspace', 'ws_member', 'ws_favorite'])
        },
        'timestamp': datetime.utcnow().isoformat()
    }

def check_database_connection():
    """Verify database connectivity"""
    try:
        access.find_one(table='workspace', filters={'id': '00000000-0000-0000-0000-000000000000'})
        return 'ok'
    except:
        return 'error'

def check_tables_exist(tables):
    """Verify required tables exist"""
    # Implementation
    return 'ok'
```

---

## 4. Database Schema

### Migration: `001_create_workspace_tables.sql`

```sql
-- ========================================
-- WORKSPACE Module Schema
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search

-- Table: workspace
CREATE TABLE IF NOT EXISTS public.workspace (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#1976d2',
    icon VARCHAR(50) NOT NULL DEFAULT 'WorkspaceIcon',
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),
    retention_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT workspace_status_check CHECK (status IN ('active', 'archived')),
    CONSTRAINT workspace_color_check CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT workspace_retention_check CHECK (retention_days > 0)
);

-- Partial unique index for active workspaces
CREATE UNIQUE INDEX idx_workspace_name_org_unique ON public.workspace(org_id, name) 
    WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX idx_workspace_org_id ON public.workspace(org_id);
CREATE INDEX idx_workspace_status ON public.workspace(status);
CREATE INDEX idx_workspace_deleted_at ON public.workspace(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspace_created_at ON public.workspace(created_at DESC);
CREATE INDEX idx_workspace_updated_at ON public.workspace(updated_at DESC);
CREATE INDEX idx_workspace_tags ON public.workspace USING GIN(tags);
CREATE INDEX idx_workspace_name_trgm ON public.workspace USING GIN(name gin_trgm_ops);

-- Table: ws_member
CREATE TABLE IF NOT EXISTS public.ws_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspace(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ws_role VARCHAR(50) NOT NULL DEFAULT 'ws_user',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_member_role_check CHECK (ws_role IN ('ws_owner', 'ws_admin', 'ws_user'))
);

-- Indexes
CREATE INDEX idx_ws_member_ws_id ON public.ws_member(ws_id);
CREATE INDEX idx_ws_member_user_id ON public.ws_member(user_id);
CREATE INDEX idx_ws_member_ws_role ON public.ws_member(ws_role);
CREATE INDEX idx_ws_member_updated_at ON public.ws_member(updated_at DESC);
CREATE INDEX idx_ws_member_deleted_at ON public.ws_member(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_ws_member_unique_active ON public.ws_member(ws_id, user_id) 
    WHERE deleted_at IS NULL;

-- Table: ws_config
CREATE TABLE IF NOT EXISTS public.ws_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nav_label_singular VARCHAR(50) NOT NULL DEFAULT 'Workspace',
    nav_label_plural VARCHAR(50) NOT NULL DEFAULT 'Workspaces',
    nav_icon VARCHAR(50) NOT NULL DEFAULT 'WorkspaceIcon',
    enable_favorites BOOLEAN NOT NULL DEFAULT true,
    enable_tags BOOLEAN NOT NULL DEFAULT true,
    enable_color_coding BOOLEAN NOT NULL DEFAULT true,
    default_color VARCHAR(7) NOT NULL DEFAULT '#1976d2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT ws_config_color_check CHECK (default_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Insert default configuration (singleton)
INSERT INTO public.ws_config (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Table: ws_favorite
CREATE TABLE IF NOT EXISTS public.ws_favorite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ws_id UUID NOT NULL REFERENCES public.workspace(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ws_favorite_ws_id ON public.ws_favorite(ws_id);
CREATE INDEX idx_ws_favorite_user_id ON public.ws_favorite(user_id);
CREATE INDEX idx_ws_favorite_created_at ON public.ws_favorite(created_at DESC);
CREATE UNIQUE INDEX idx_ws_favorite_unique ON public.ws_favorite(ws_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ws_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ws_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ws_favorite ENABLE ROW LEVEL SECURITY;

-- RLS Policies: workspace
CREATE POLICY "workspace_select_policy" ON public.workspace
    FOR SELECT
    USING (
        can_access_org_data(org_id) AND
        deleted_at IS NULL
    );

CREATE POLICY "workspace_insert_policy" ON public.workspace
    FOR INSERT
    WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "workspace_update_policy" ON public.workspace
    FOR UPDATE
    USING (
        can_modify_org_data(org_id) AND
        is_workspace_admin_or_owner(id, auth.uid())
    )
    WITH CHECK (
        can_modify_org_data(org_id) AND
        is_workspace_admin_or_owner(id, auth.uid())
    );

CREATE POLICY "workspace_delete_policy" ON public.workspace
    FOR DELETE
    USING (
        can_modify_org_data(org_id) AND
        is_workspace_owner(id, auth.uid())
    );

-- RLS Policies: ws_member
CREATE POLICY "ws_member_select_policy" ON public.ws_member
    FOR SELECT
    USING (
        is_workspace_member(ws_id, auth.uid()) AND
        deleted_at IS NULL
    );

CREATE POLICY "ws_member_insert_policy" ON public.ws_member
    FOR INSERT
    WITH CHECK (is_workspace_owner(ws_id, auth.uid()));

CREATE POLICY "ws_member_update_policy" ON public.ws_member
    FOR UPDATE
    USING (is_workspace_owner(ws_id, auth.uid()))
    WITH CHECK (is_workspace_owner(ws_id, auth.uid()));

CREATE POLICY "ws_member_delete_policy" ON public.ws_member
    FOR DELETE
    USING (
        is_workspace_owner(ws_id, auth.uid()) OR
        user_id = auth.uid()
    );

-- RLS Policies: ws_config
CREATE POLICY "ws_config_select_policy" ON public.ws_config
    FOR SELECT
    USING (true);  -- Everyone can read config

CREATE POLICY "ws_config_update_policy" ON public.ws_config
    FOR UPDATE
    USING (is_platform_admin_or_owner())
    WITH CHECK (is_platform_admin_or_owner());

-- RLS Policies: ws_favorite
CREATE POLICY "ws_favorite_select_policy" ON public.ws_favorite
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "ws_favorite_insert_policy" ON public.ws_favorite
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        is_workspace_member(ws_id, auth.uid())
    );

CREATE POLICY "ws_favorite_delete_policy" ON public.ws_favorite
    FOR DELETE
    USING (user_id = auth.uid());

-- Triggers
CREATE TRIGGER update_workspace_updated_at
    BEFORE UPDATE ON public.workspace
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ws_member_updated_at
    BEFORE UPDATE ON public.ws_member
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ws_config_updated_at
    BEFORE UPDATE ON public.ws_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.workspace IS 'Collaborative workspace containers for organizing team resources';
COMMENT ON COLUMN public.workspace.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.workspace.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.workspace.deleted_at IS 'Soft delete timestamp - workspace retained for retention_days';
COMMENT ON COLUMN public.workspace.retention_days IS 'Days to retain workspace after soft deletion before permanent deletion';

COMMENT ON TABLE public.ws_member IS 'Workspace membership with role-based access control';
COMMENT ON COLUMN public.ws_member.ws_id IS 'Foreign key to workspace table';
COMMENT ON COLUMN public.ws_member.ws_role IS 'Member role: ws_owner (full control), ws_admin (update settings, view-only members), ws_user (view-only)';

COMMENT ON TABLE public.ws_config IS 'Platform-level configuration for workspace module (singleton)';
COMMENT ON COLUMN public.ws_config.nav_label_singular IS 'Navigation label (singular): Workspace, Audit, Campaign, etc.';

COMMENT ON TABLE public.ws_favorite IS 'Per-user workspace favorites for quick access';
COMMENT ON COLUMN public.ws_favorite.ws_id IS 'Foreign key to workspace table';
```

### Migration: `002_workspace_helper_functions.sql`

```sql
-- ========================================
-- WORKSPACE Module Helper Functions
-- ========================================

-- Function: is_workspace_member
CREATE OR REPLACE FUNCTION is_workspace_member(
    p_ws_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_member
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_workspace_owner
CREATE OR REPLACE FUNCTION is_workspace_owner(
    p_ws_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_member
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role = 'ws_owner'
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: is_workspace_admin_or_owner
CREATE OR REPLACE FUNCTION is_workspace_admin_or_owner(
    p_ws_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM ws_member
        WHERE ws_id = p_ws_id
        AND user_id = p_user_id
        AND ws_role IN ('ws_owner', 'ws_admin')
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: create_workspace_with_owner
CREATE OR REPLACE FUNCTION create_workspace_with_owner(
    p_org_id UUID,
    p_name VARCHAR(255),
    p_description TEXT,
    p_color VARCHAR(7),
    p_icon VARCHAR(50),
    p_tags TEXT[],
    p_owner_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspace%ROWTYPE;
BEGIN
    -- Insert workspace
    INSERT INTO workspace (
        org_id, name, description, color, icon, tags, created_by
    ) VALUES (
        p_org_id, p_name, p_description, 
        COALESCE(p_color, '#1976d2'),
        COALESCE(p_icon, 'WorkspaceIcon'),
        COALESCE(p_tags, ARRAY[]::TEXT[]),
        p_owner_id
    ) RETURNING * INTO v_workspace;
    
    -- Add creator as owner
    INSERT INTO ws_member (ws_id, user_id, ws_role, created_by)
    VALUES (v_workspace.id, p_owner_id, 'ws_owner', p_owner_id);
    
    -- Return workspace as JSON
    RETURN row_to_json(v_workspace);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: soft_delete_workspace
CREATE OR REPLACE FUNCTION soft_delete_workspace(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspace%ROWTYPE;
BEGIN
    -- Verify user is owner
    IF NOT is_workspace_owner(p_workspace_id, p_user_id) THEN
        RAISE EXCEPTION 'Only workspace owners can delete workspaces';
    END IF;
    
    -- Soft delete workspace
    UPDATE workspace
    SET deleted_at = NOW(), deleted_by = p_user_id
    WHERE id = p_workspace_id
    RETURNING * INTO v_workspace;
    
    -- Soft delete all members
    UPDATE ws_member
    SET deleted_at = NOW()
    WHERE ws_id = p_workspace_id;
    
    -- Remove all favorites
    DELETE FROM ws_favorite
    WHERE ws_id = p_workspace_id;
    
    -- Return result
    RETURN json_build_object(
        'id', v_workspace.id,
        'deleted_at', v_workspace.deleted_at,
        'permanent_deletion_date', v_workspace.deleted_at + INTERVAL '1 day' * v_workspace.retention_days
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: restore_workspace
CREATE OR REPLACE FUNCTION restore_workspace(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS JSON AS $$
DECLARE
    v_workspace workspace%ROWTYPE;
BEGIN
    -- Get workspace
    SELECT * INTO v_workspace FROM workspace WHERE id = p_workspace_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace not found';
    END IF;
    
    IF v_workspace.deleted_at IS NULL THEN
        RAISE EXCEPTION 'Workspace is not deleted';
    END IF;
    
    -- Verify user was an owner before deletion
    IF NOT EXISTS (
        SELECT 1 FROM ws_member
        WHERE ws_id = p_workspace_id
        AND user_id = p_user_id
        AND ws_role = 'ws_owner'
    ) THEN
        RAISE EXCEPTION 'Only previous owners can restore workspaces';
    END IF;
    
    -- Restore workspace
    UPDATE workspace
    SET deleted_at = NULL, deleted_by = NULL, updated_by = p_user_id, updated_at = NOW()
    WHERE id = p_workspace_id
    RETURNING * INTO v_workspace;
    
    -- Restore all members
    UPDATE ws_member
    SET deleted_at = NULL
    WHERE ws_id = p_workspace_id;
    
    RETURN row_to_json(v_workspace);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: toggle_workspace_favorite
CREATE OR REPLACE FUNCTION toggle_workspace_favorite(
    p_workspace_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_is_favorited BOOLEAN;
BEGIN
    -- Verify user is workspace member
    IF NOT is_workspace_member(p_workspace_id, p_user_id) THEN
        RAISE EXCEPTION 'User is not a member of this workspace';
    END IF;
    
    -- Check if already favorited
    SELECT EXISTS (
        SELECT 1 FROM ws_favorite
        WHERE ws_id = p_workspace_id AND user_id = p_user_id
    ) INTO v_is_favorited;
    
    IF v_is_favorited THEN
        -- Remove favorite
        DELETE FROM ws_favorite
        WHERE ws_id = p_workspace_id AND user_id = p_user_id;
        RETURN FALSE;
    ELSE
        -- Add favorite
        INSERT INTO ws_favorite (ws_id, user_id)
        VALUES (p_workspace_id, p_user_id);
        RETURN TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: get_workspaces_with_member_info
CREATE OR REPLACE FUNCTION get_workspaces_with_member_info(
    p_org_id UUID,
    p_user_id UUID,
    p_favorites_only BOOLEAN DEFAULT FALSE,
    p_favorites_first BOOLEAN DEFAULT FALSE,
    p_status VARCHAR(50) DEFAULT 'active'
) RETURNS TABLE (
    id UUID,
    org_id UUID,
    name VARCHAR(255),
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    tags TEXT[],
    status VARCHAR(50),
    user_role VARCHAR(50),
    is_favorited BOOLEAN,
    favorited_at TIMESTAMPTZ,
    member_count BIGINT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.org_id,
        w.name,
        w.description,
        w.color,
        w.icon,
        w.tags,
        w.status,
        wm.ws_role AS user_role,
        (wf.ws_id IS NOT NULL) AS is_favorited,
        wf.created_at AS favorited_at,
        (SELECT COUNT(*) FROM ws_member WHERE ws_id = w.id AND deleted_at IS NULL) AS member_count,
        w.created_at,
        w.updated_at,
        w.created_by,
        w.updated_by
    FROM workspace w
    INNER JOIN ws_member wm ON w.id = wm.ws_id 
        AND wm.user_id = p_user_id 
        AND wm.deleted_at IS NULL
    LEFT JOIN ws_favorite wf ON w.id = wf.ws_id AND wf.user_id = p_user_id
    WHERE w.org_id = p_org_id
        AND w.deleted_at IS NULL
        AND (p_status = 'all' OR w.status = p_status)
        AND (NOT p_favorites_only OR wf.ws_id IS NOT NULL)
    ORDER BY
        CASE WHEN p_favorites_first THEN (wf.ws_id IS NOT NULL)::int ELSE 0 END DESC,
        w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Migration: `003_workspace_cleanup_job.sql`

```sql
-- ========================================
-- WORKSPACE Cleanup Job (Permanent Deletion)
-- ========================================

-- Function: cleanup_expired_workspaces
CREATE OR REPLACE FUNCTION cleanup_expired_workspaces()
RETURNS TABLE (
    deleted_count INTEGER,
    workspace_ids UUID[]
) AS $$
DECLARE
    v_deleted_ids UUID[];
    v_count INTEGER;
BEGIN
    -- Find expired workspaces
    SELECT ARRAY_AGG(id) INTO v_deleted_ids
    FROM workspace
    WHERE deleted_at IS NOT NULL
    AND deleted_at + INTERVAL '1 day' * retention_days < NOW();
    
    -- Permanently delete (cascades to ws_member via FK)
    DELETE FROM workspace
    WHERE id = ANY(v_deleted_ids);
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count, COALESCE(v_deleted_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_workspaces() IS 
'Permanently deletes soft-deleted workspaces that have exceeded their retention period. 
Should be run daily via scheduled job (e.g., AWS EventBridge + Lambda).';

-- Manual execution example:
-- SELECT * FROM cleanup_expired_workspaces();
```

---

## 5. Configuration Requirements

### Required Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| WS_RETENTION_DAYS | integer | No | 30 | Default retention period for soft-deleted workspaces |
| WS_MAX_TAGS | integer | No | 20 | Maximum tags per workspace |
| WS_MAX_TAG_LENGTH | integer | No | 50 | Maximum characters per tag |

### Environment Variables

```bash
# Lambda environment variables
WS_RETENTION_DAYS=30
WS_MAX_TAGS=20
WS_MAX_TAG_LENGTH=50
```

### Secrets

No secrets required for module-ws.

---

## 6. Infrastructure Requirements

### Lambda Function

```hcl
# terraform/modules/workspace/main.tf

resource "aws_lambda_function" "workspace_handler" {
  function_name = "${var.project_prefix}-workspace-handler"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 256
  
  environment {
    variables = {
      SUPABASE_URL         = var.supabase_url
      SUPABASE_SERVICE_KEY = var.supabase_service_key
      WS_RETENTION_DAYS    = var.ws_retention_days
    }
  }
  
  layers = [var.access_layer_arn]
}

resource "aws_cloudwatch_event_rule" "cleanup_schedule" {
  name                = "${var.project_prefix}-ws-cleanup-schedule"
  description         = "Daily workspace cleanup job"
  schedule_expression = "rate(1 day)"
}

resource "aws_cloudwatch_event_target" "cleanup_lambda" {
  rule      = aws_cloudwatch_event_rule.cleanup_schedule.name
  target_id = "workspace-cleanup"
  arn       = aws_lambda_function.cleanup_handler.arn
}
```

### IAM Permissions

```hcl
resource "aws_iam_role_policy" "workspace_lambda_policy" {
  name = "${var.project_prefix}-workspace-lambda-policy"
  role = aws_iam_role.workspace_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

---

## 7. Testing Requirements

### Backend Tests

```python
# test_workspace_lambda.py

def test_list_workspaces_success():
    """Test successful GET /workspaces"""
    # Test with valid orgId, user is org member
    # Should return workspaces with user_role and is_favorited
    pass

def test_list_workspaces_missing_org_id():
    """Test missing orgId parameter (400 error)"""
    pass

def test_list_workspaces_no_access():
    """Test user not in organization (403 error)"""
    pass

def test_create_workspace_success():
    """Test successful POST /workspaces"""
    # Creator should be added as ws_owner
    pass

def test_create_workspace_validation():
    """Test validation errors (400 error)"""
    # Missing name, invalid color, etc.
    pass

def test_create_workspace_duplicate_name():
    """Test duplicate name in org (409 error)"""
    pass

def test_update_workspace_as_owner():
    """Test workspace owner can update all fields"""
    pass

def test_update_workspace_as_admin():
    """Test workspace admin cannot update status"""
    pass

def test_update_workspace_as_user():
    """Test workspace user cannot update (403 error)"""
    pass

def test_soft_delete_workspace():
    """Test soft delete sets deleted_at and cascades to members"""
    pass

def test_soft_delete_workspace_non_owner():
    """Test non-owner cannot delete (403 error)"""
    pass

def test_restore_workspace():
    """Test restore clears deleted_at and restores members"""
    pass

def test_restore_workspace_non_owner():
    """Test non-owner cannot restore (403 error)"""
    pass

def test_add_member_as_owner():
    """Test owner can add member with any role"""
    pass

def test_add_member_as_admin():
    """Test admin cannot add members (403 error)"""
    pass

def test_add_member_duplicate():
    """Test adding duplicate member (409 error)"""
    pass

def test_update_member_role():
    """Test changing member role"""
    pass

def test_remove_last_owner():
    """Test cannot remove last ws_owner (409 error)"""
    pass

def test_toggle_favorite():
    """Test favorite/unfavorite workspace"""
    pass

def test_toggle_favorite_non_member():
    """Test non-member cannot favorite (403 error)"""
    pass
```

---

## 8. Migration Notes

### Legacy Code Mapping

| Legacy Component | New Component | Changes |
|------------------|---------------|---------|
| `handlers/projects.py` | `backend/lambdas/workspace/lambda_function.py` | Renamed entity, added metadata fields, soft delete |
| `projects` table | `workspace` table | Added: color, icon, tags, deleted_at, retention_days |
| `project_members` table | `ws_member` table | Renamed: `role` → `ws_role`, added soft delete |
| `project_favorites` table | `ws_favorite` table | No changes |
| RPC `create_project_with_owner` | `create_workspace_with_owner` | Renamed |

### Data Migration

```sql
-- Migrate projects to workspaces
INSERT INTO public.workspace (
    id, org_id, name, description, 
    color, icon, tags, status,
    created_at, created_by, updated_at, updated_by
)
SELECT 
    id,
    org_id,
    name,
    description,
    '#1976d2' AS color,  -- Default color
    'WorkspaceIcon' AS icon,  -- Default icon
    ARRAY[]::TEXT[] AS tags,  -- Empty tags
    CASE 
        WHEN archived = true THEN 'archived'
        ELSE 'active'
    END AS status,
    created_at,
    created_by,
    updated_at,
    updated_by
FROM legacy.projects
WHERE deleted_at IS NULL;

-- Migrate project_members to ws_member
INSERT INTO public.ws_member (
    id, ws_id, user_id, ws_role, created_at, created_by
)
SELECT 
    id,
    project_id AS ws_id,
    user_id,
    'ws_' || role AS ws_role,  -- owner → ws_owner, admin → ws_admin, user → ws_user
    created_at,
    created_by
FROM legacy.project_members
WHERE deleted_at IS NULL;

-- Migrate project_favorites to ws_favorite
INSERT INTO public.ws_favorite (
    id, ws_id, user_id, created_at
)
SELECT 
    id,
    project_id AS ws_id,
    user_id,
    created_at
FROM legacy.project_favorites;
```

### Breaking Changes

- ✅ Entity renamed: `project` → `workspace`
- ✅ Foreign key renamed: `project_id` → `ws_id`
- ✅ Role column renamed: `role` → `ws_role`
- ✅ Role values prefixed: `owner` → `ws_owner`, `admin` → `ws_admin`, `user` → `ws_user`
- ✅ API path changed: `/api/projects` → `/api/ws/workspaces`
- ✅ Added metadata fields: `color`, `icon`, `tags`
- ✅ Added soft delete: `deleted_at`, `deleted_by`, `retention_days`
- ✅ Response format: flat → `{success, data}` wrapper

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
