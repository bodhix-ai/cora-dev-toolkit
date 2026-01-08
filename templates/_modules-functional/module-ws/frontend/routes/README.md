# Module-WS Route Stubs

This directory contains Next.js App Router page stubs that should be copied to your project's `apps/web/app/` directory when integrating module-ws.

## Routes

### `/ws` - Workspaces List
- **File:** `ws/page.tsx`
- **Destination:** `apps/web/app/ws/page.tsx`
- **Purpose:** Main workspaces page showing user's workspace list
- **Access:** Any authenticated user

### `/admin/workspaces` - Workspace Management
- **File:** `admin/workspaces/page.tsx`
- **Destination:** `apps/web/app/admin/workspaces/page.tsx`
- **Purpose:** Platform admin workspace configuration
- **Access:** Platform Owners and Platform Admins only

## Installation

After copying module-ws to your project's `packages/` directory:

1. Copy the route stubs to your app directory:
   ```bash
   cp -r packages/module-ws/frontend/routes/ws apps/web/app/
   cp -r packages/module-ws/frontend/routes/admin/workspaces apps/web/app/admin/
   ```

2. Replace `{{PROJECT_NAME}}` with your actual project name in the copied files

3. The routes will automatically be available at:
   - `/ws` - Workspaces list
   - `/admin/workspaces` - Admin workspace management

## Note

The `create-cora-project.sh` script should handle this automatically when using `--modules module-ws`. These stubs are provided for manual integration or reference.
