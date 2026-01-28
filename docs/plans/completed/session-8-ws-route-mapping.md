# Session 8: Module-WS Route Standardization Mapping

**Created:** January 27, 2026  
**Module:** module-ws  
**Scope:** Migrate admin routes to `/admin/{scope}/ws/*` pattern

---

## Current State Analysis

### Routes by Category

#### ✅ User-Facing Routes (NO CHANGES - Already Correct)
These routes are for regular workspace operations, not admin functions:
- `GET /ws` - List user's workspaces
- `POST /ws` - Create workspace
- `GET /ws/{workspaceId}` - Get workspace details
- `PUT /ws/{workspaceId}` - Update workspace
- `DELETE /ws/{workspaceId}` - Soft delete workspace
- `POST /ws/{workspaceId}/restore` - Restore workspace
- `GET /ws/{workspaceId}/activity` - Activity log
- `POST /ws/{workspaceId}/transfer` - Transfer ownership
- `GET /ws/{workspaceId}/members` - List members
- `POST /ws/{workspaceId}/members` - Add member
- `PUT /ws/{workspaceId}/members/{memberId}` - Update member role
- `DELETE /ws/{workspaceId}/members/{memberId}` - Remove member
- `POST /ws/{workspaceId}/favorite` - Toggle favorite
- `GET /ws/favorites` - List favorites

#### ⚠️ Sys Admin Routes (NEED STANDARDIZATION)
Platform-wide admin operations:
- `/ws/sys/analytics` → `/admin/sys/ws/analytics`
- `/ws/config` → `/admin/sys/ws/config` (GET + PUT both need to move)

#### ⚠️ Org Admin Routes (NEED STANDARDIZATION)
Organization-scoped admin operations:
- `/ws/org/settings` → `/admin/org/ws/settings` (GET + PUT)
- `/ws/admin/analytics` → `/admin/org/ws/analytics` (GET)
- `/ws/admin/workspaces` → `/admin/org/ws/workspaces` (GET - list all org workspaces)
- `/ws/admin/workspaces/{workspaceId}/restore` → `/admin/org/ws/workspaces/{workspaceId}/restore` (POST)
- `/ws/admin/workspaces/{workspaceId}` → `/admin/org/ws/workspaces/{workspaceId}` (DELETE)

#### ❌ Deprecated Routes (REMOVE)
- `/ws/admin/stats` - Marked as deprecated in Lambda, redirects to analytics

---

## Route Migration Plan

### Sys Admin Routes (5 routes total)

| Old Route | New Route | Method | Handler | Description |
|-----------|-----------|--------|---------|-------------|
| `/ws/sys/analytics` | `/admin/sys/ws/analytics` | GET | `handle_sys_analytics` | Platform-wide workspace statistics |
| `/ws/config` | `/admin/sys/ws/config` | GET | `handle_get_config` | Get workspace module config |
| `/ws/config` | `/admin/sys/ws/config` | PUT | `handle_update_config` | Update workspace module config |

**Note:** `/ws/admin/stats` deprecated route should be removed from outputs.tf

### Org Admin Routes (7 routes total)

| Old Route | New Route | Method | Handler | Description |
|-----------|-----------|--------|---------|-------------|
| `/ws/org/settings` | `/admin/org/ws/settings` | GET | `handle_get_org_settings` | Get org workspace settings |
| `/ws/org/settings` | `/admin/org/ws/settings` | PUT | `handle_update_org_settings` | Update org workspace settings |
| `/ws/admin/analytics` | `/admin/org/ws/analytics` | GET | `handle_admin_analytics` | Get org workspace analytics |
| `/ws/admin/workspaces` | `/admin/org/ws/workspaces` | GET | NEW HANDLER NEEDED | List all org workspaces (admin view) |
| `/ws/admin/workspaces/{workspaceId}/restore` | `/admin/org/ws/workspaces/{workspaceId}/restore` | POST | `handle_restore_workspace` | Admin restore workspace |
| `/ws/admin/workspaces/{workspaceId}` | `/admin/org/ws/workspaces/{workspaceId}` | DELETE | NEW HANDLER NEEDED | Admin force delete workspace |

---

## Implementation Steps

### Step 1: Update infrastructure/outputs.tf

**Changes:**
- Update 3 sys admin route paths
- Update 7 org admin route paths
- Remove 1 deprecated route (`/ws/admin/stats`)
- Total: 10 route changes + 1 removal = 11 lines changed

### Step 2: Update backend Lambda docstring

**File:** `backend/lambdas/workspace/lambda_function.py`

**Changes:**
- Update module docstring with new route documentation
- Group routes by: Sys Admin, Org Admin, User Operations
- Remove deprecated routes from docstring

### Step 3: Update backend Lambda dispatcher

**File:** `backend/lambdas/workspace/lambda_function.py`

**Changes:**
- Update route matching in `lambda_handler()` function
- Change all admin route checks from `/ws/sys/*`, `/ws/org/*`, `/ws/admin/*` to `/admin/{scope}/ws/*`
- Add new handlers if needed (e.g., admin force delete)

### Step 4: Update frontend API calls

**File:** `frontend/lib/api.ts`

**Changes:**
- Update API client methods to use new routes
- Estimate: 10-15 function calls need updates

### Step 5: Create org admin page

**File:** `apps/web/app/admin/org/ws/page.tsx` (NEW)

**Features:**
- List all workspaces in organization (admin view)
- View workspace settings for org
- Analytics dashboard
- Admin actions (restore, force delete)

---

## Authorization Model

### Sys Admin Routes
**Who can access:**
- `sys_admin` and `sys_owner` roles only

**What they can do:**
- View platform-wide analytics across all orgs
- Update global workspace module configuration

### Org Admin Routes
**Who can access:**
- `org_admin` and `org_owner` roles (for their org)
- `sys_admin` and `sys_owner` roles (for any org)

**What they can do:**
- View organization-specific workspace analytics
- Update org workspace settings
- List all org workspaces (admin view)
- Force delete workspaces
- Restore deleted workspaces

---

## Testing Checklist

- [ ] Run admin-route-validator before changes (capture baseline errors)
- [ ] Update outputs.tf routes
- [ ] Update Lambda docstring
- [ ] Update Lambda dispatcher logic
- [ ] Update frontend API calls
- [ ] Create org admin page
- [ ] Run admin-route-validator after changes (verify 0 errors for module-ws)
- [ ] Test sys admin routes (analytics, config)
- [ ] Test org admin routes (settings, analytics, workspace management)
- [ ] Verify user-facing routes still work (no accidental changes)

---

## Files to Update

1. `templates/_modules-core/module-ws/infrastructure/outputs.tf` (11 route changes)
2. `templates/_modules-core/module-ws/backend/lambdas/workspace/lambda_function.py` (docstring + dispatcher)
3. `templates/_modules-core/module-ws/frontend/lib/api.ts` (10-15 API calls)
4. `templates/_project-stack-template/apps/web/app/admin/org/ws/page.tsx` (NEW - org admin page)

**Total:** 4 files

---

## Estimated Effort

- Route mapping and analysis: ✅ 1 hour (COMPLETE)
- Infrastructure updates: 1 hour
- Lambda updates: 2 hours
- Frontend API updates: 1 hour
- Org admin page creation: 2 hours
- Testing and validation: 1 hour

**Total:** 8 hours (6 hours remaining)