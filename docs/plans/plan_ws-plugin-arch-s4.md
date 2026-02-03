# WS Plugin Architecture (Sprint 4) - Tab Ordering & DB Naming Compliance

**Status**: 📋 PLANNED  
**Priority**: **P2**  
**Estimated Duration**: 8-10 hours  
**Created**: 2026-02-02  
**Branch**: `feature/ws-plugin-arch-s4`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 3 (Complete) ✅  
**Related Standards**: `docs/standards/standard_DATABASE-NAMING.md` (ADR-011)

---

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-arch-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared)

---

## Executive Summary

Sprint 4 implements two related features for workspace management:

1. **Database Naming Compliance:** Rename workspace tables to follow ADR-011 naming standards
2. **Tab Ordering Feature:** Implement customizable tab ordering with sys → org → ws inheritance

### Current State

- ✅ Sprint 3: Module enablement cascade complete (sys → org → ws)
- ❌ Workspace config tables don't follow `_cfg_` naming standard
- ❌ Activity log table doesn't follow `_log_` naming standard
- ❌ No tab ordering feature (all workspaces have same tab order)

### Goal

1. **Rename tables to comply with ADR-011:**
   - `ws_configs` → `ws_cfg_sys` (system-level workspace defaults)
   - `ws_org_settings` → `ws_cfg_org` (org-level workspace overrides)
   - `ws_activity_log` → `ws_log_activity` (workspace activity log)

2. **Add tab ordering feature:**
   - System admins set default tab order
   - Org admins can override for their org
   - Workspace admins can customize their workspace (after creation)
   - One-time copy at creation (not real-time cascade)

---

## Scope

### In Scope

**Phase 1 - Database Migration:**
- Rename `ws_configs` → `ws_cfg_sys`
- Rename `ws_org_settings` → `ws_cfg_org`
- Rename `ws_activity_log` → `ws_log_activity`
- Add `default_tab_order` to `ws_cfg_sys`
- Add `tab_order` to `ws_cfg_org`
- Add `tab_order` to `workspaces`
- Update all constraints, indexes, triggers
- Update RLS policies

**Phase 2 - Backend Updates:**
- Update Lambda functions to use new table names
- Add tab order resolution logic
- Update API endpoints for workspace config
- Add backward compatibility (if needed)

**Phase 3 - Frontend Updates:**
- Update frontend queries to use new table names
- Create system admin tab order UI
- Create org admin tab order UI
- Create workspace admin tab order UI
- Add drag-and-drop reordering

**Phase 4 - Testing & Documentation:**
- Test table renames
- Test tab ordering (sys → org → ws)
- Update documentation
- Update memory-bank context

### Out of Scope

- Real-time cascade for tab order (only affects new workspaces)
- Tab visibility based on module enablement (handled by Sprint 3)
- Mobile-specific tab ordering UI (uses same order, different display)

---

## Phase 1: Database Migration (2-3h)

### 1.1: Rename ws_configs → ws_cfg_sys ✅

**Migration SQL:**
```sql
-- Step 1: Rename table
ALTER TABLE ws_configs RENAME TO ws_cfg_sys;

-- Step 2: Update constraints
ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_pkey,
  ADD CONSTRAINT ws_cfg_sys_pkey PRIMARY KEY (id);

ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_updated_by_fkey,
  ADD CONSTRAINT fk_ws_cfg_sys_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- Step 3: Recreate CHECK constraints with new names
ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_color_check,
  ADD CONSTRAINT ws_cfg_sys_color_check CHECK ((default_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text);

ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_max_tag_length_check,
  ADD CONSTRAINT ws_cfg_sys_max_tag_length_check CHECK (
    (max_tag_length IS NULL) OR ((max_tag_length >= 3) AND (max_tag_length <= 50))
  );

ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_max_tags_check,
  ADD CONSTRAINT ws_cfg_sys_max_tags_check CHECK (
    (max_tags_per_workspace IS NULL) OR ((max_tags_per_workspace >= 1) AND (max_tags_per_workspace <= 50))
  );

ALTER TABLE ws_cfg_sys 
  DROP CONSTRAINT IF EXISTS ws_configs_retention_days_check,
  ADD CONSTRAINT ws_cfg_sys_retention_days_check CHECK (
    (default_retention_days IS NULL) OR ((default_retention_days >= 1) AND (default_retention_days <= 365))
  );

-- Step 4: Update trigger
DROP TRIGGER IF EXISTS ws_configs_updated_at ON ws_cfg_sys;
CREATE TRIGGER ws_cfg_sys_updated_at 
  BEFORE UPDATE ON ws_cfg_sys 
  FOR EACH ROW EXECUTE FUNCTION update_ws_cfg_sys_updated_at();

-- Step 5: Add tab_order column
ALTER TABLE ws_cfg_sys 
ADD COLUMN default_tab_order JSONB DEFAULT '["module-kb", "module-chat", "module-voice", "module-eval"]'::jsonb;

COMMENT ON COLUMN ws_cfg_sys.default_tab_order IS 'Default tab order for all new workspaces (applies if org has no override)';

-- Step 6: Add table comment
COMMENT ON TABLE ws_cfg_sys IS 'System-wide workspace configuration defaults. Renamed from ws_configs on 2026-02-02 to comply with ADR-011.';
```

### 1.2: Rename ws_org_settings → ws_cfg_org ✅

**Migration SQL:**
```sql
-- Step 1: Rename table
ALTER TABLE ws_org_settings RENAME TO ws_cfg_org;

-- Step 2: Update constraints
ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_pkey,
  ADD CONSTRAINT ws_cfg_org_pkey PRIMARY KEY (id);

ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_org_id_unique,
  ADD CONSTRAINT ws_cfg_org_org_id_key UNIQUE (org_id);

ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_org_id_fkey,
  ADD CONSTRAINT fk_ws_cfg_org_org_id FOREIGN KEY (org_id) REFERENCES orgs(id) ON DELETE CASCADE;

ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_created_by_fkey,
  ADD CONSTRAINT fk_ws_cfg_org_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_updated_by_fkey,
  ADD CONSTRAINT fk_ws_cfg_org_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- Step 3: Recreate CHECK constraint
ALTER TABLE ws_cfg_org 
  DROP CONSTRAINT IF EXISTS ws_org_settings_max_workspaces_check,
  ADD CONSTRAINT ws_cfg_org_max_workspaces_check CHECK (
    (max_workspaces_per_user >= 1) AND (max_workspaces_per_user <= 100)
  );

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_ws_org_settings_org_id;
CREATE INDEX idx_ws_cfg_org_org_id ON ws_cfg_org(org_id);

-- Step 5: Update trigger
DROP TRIGGER IF EXISTS trigger_update_ws_org_settings_updated_at ON ws_cfg_org;
CREATE TRIGGER trigger_update_ws_cfg_org_updated_at 
  BEFORE UPDATE ON ws_cfg_org 
  FOR EACH ROW EXECUTE FUNCTION update_ws_cfg_org_updated_at();

-- Step 6: Add tab_order column
ALTER TABLE ws_cfg_org 
ADD COLUMN tab_order JSONB;

COMMENT ON COLUMN ws_cfg_org.tab_order IS 'Org-level tab order override. NULL = inherit from system default (ws_cfg_sys.default_tab_order)';

-- Step 7: Add table comment
COMMENT ON TABLE ws_cfg_org IS 'Organization-level workspace configuration overrides. Renamed from ws_org_settings on 2026-02-02 to comply with ADR-011.';
```

### 1.3: Rename ws_activity_log → ws_log_activity ✅

**Migration SQL:**
```sql
-- Step 1: Rename table
ALTER TABLE ws_activity_log RENAME TO ws_log_activity;

-- Step 2: Update constraints (update based on actual schema)
ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_pkey,
  ADD CONSTRAINT ws_log_activity_pkey PRIMARY KEY (id);

-- Update foreign keys (example - adjust based on actual schema)
ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_ws_id_fkey,
  ADD CONSTRAINT fk_ws_log_activity_ws_id FOREIGN KEY (ws_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_user_id_fkey,
  ADD CONSTRAINT fk_ws_log_activity_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Update indexes (adjust based on actual schema)
DROP INDEX IF EXISTS idx_ws_activity_log_ws_id;
CREATE INDEX idx_ws_log_activity_ws_id ON ws_log_activity(ws_id);

DROP INDEX IF EXISTS idx_ws_activity_log_user_id;
CREATE INDEX idx_ws_log_activity_user_id ON ws_log_activity(user_id);

DROP INDEX IF EXISTS idx_ws_activity_log_created_at;
CREATE INDEX idx_ws_log_activity_created_at ON ws_log_activity(created_at);

-- Step 4: Add table comment
COMMENT ON TABLE ws_log_activity IS 'Workspace activity log. Renamed from ws_activity_log on 2026-02-02 to comply with ADR-011 (Rule 8.2: Log Tables).';
```

### 1.4: Add tab_order to workspaces Table ✅

**Migration SQL:**
```sql
-- Add tab_order column to workspaces
ALTER TABLE workspaces 
ADD COLUMN tab_order JSONB;

COMMENT ON COLUMN workspaces.tab_order IS 'Workspace-specific tab order. Set from org/sys default at creation, customizable by ws admins. NULL = use current org/sys default.';

-- Backfill existing workspaces with default order
UPDATE workspaces w
SET tab_order = (
  SELECT COALESCE(
    oc.tab_order,                    -- Org override if exists
    sc.default_tab_order             -- System default
  )
  FROM ws_cfg_sys sc
  LEFT JOIN ws_cfg_org oc ON oc.org_id = w.org_id
  LIMIT 1
)
WHERE tab_order IS NULL;
```

### 1.5: Update Trigger Functions ✅

**Create/Update Trigger Functions:**
```sql
-- ws_cfg_sys updated_at trigger function
CREATE OR REPLACE FUNCTION update_ws_cfg_sys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ws_cfg_org updated_at trigger function
CREATE OR REPLACE FUNCTION update_ws_cfg_org_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 2: Backend Updates (2-3h)

### 2.1: Update Lambda Functions

**Files to Update:**

**module-ws Lambda Functions:**
- `templates/_modules-core/module-ws/backend/lambdas/lambda-ws/lambda_function.py`
  - Update all SQL queries: `ws_configs` → `ws_cfg_sys`
  - Update all SQL queries: `ws_org_settings` → `ws_cfg_org`
  - Update all SQL queries: `ws_activity_log` → `ws_log_activity`
  - Add tab order resolution logic for workspace creation

**Search Pattern:**
```bash
# Find all references to old table names
grep -r "ws_configs" templates/_modules-core/module-ws/backend/
grep -r "ws_org_settings" templates/_modules-core/module-ws/backend/
grep -r "ws_activity_log" templates/_modules-core/module-ws/backend/
```

### 2.2: Add Tab Order Resolution Functions

**In lambda-ws Lambda:**
```python
def get_default_tab_order_for_new_workspace(conn, org_id: str) -> list:
    """
    Get the default tab order for a new workspace.
    
    Resolution order:
    1. Check org-level override (ws_cfg_org.tab_order)
    2. Fall back to system default (ws_cfg_sys.default_tab_order)
    
    Args:
        conn: Database connection
        org_id: Organization ID
        
    Returns:
        list: Tab order array
    """
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check org-level override
    cursor.execute("""
        SELECT tab_order 
        FROM ws_cfg_org 
        WHERE org_id = %s
    """, (org_id,))
    
    org_config = cursor.fetchone()
    if org_config and org_config['tab_order']:
        return org_config['tab_order']
    
    # Fall back to system default
    cursor.execute("""
        SELECT default_tab_order 
        FROM ws_cfg_sys 
        LIMIT 1
    """)
    
    sys_config = cursor.fetchone()
    return sys_config['default_tab_order'] if sys_config else [
        "module-kb",
        "module-chat", 
        "module-voice",
        "module-eval"
    ]


def handle_create_workspace(event, context, conn, user_claims):
    """Create workspace with default tab order from org or sys."""
    # ... existing validation ...
    
    # Get default tab order for this org
    default_tab_order = get_default_tab_order_for_new_workspace(conn, org_id)
    
    # Create workspace with tab order
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        INSERT INTO workspaces (
            name, org_id, tab_order, color, icon, 
            created_by, updated_by
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        name, org_id, json.dumps(default_tab_order), 
        color, icon, user_id, user_id
    ))
    
    # ... rest of creation logic ...
```

### 2.3: Update API Endpoints

**Add/Update endpoints in lambda-ws:**

```python
def handle_update_workspace_tab_order(event, context, conn, user_claims):
    """
    Update workspace tab order (ws admins only).
    
    PUT /api/data/ws/{wsId}/tab-order
    Body: { "tab_order": ["module-chat", "module-kb", ...] }
    """
    ws_id = event['pathParameters']['wsId']
    user_id = user_claims['sub']
    body = json.loads(event['body'])
    tab_order = body.get('tab_order')
    
    # Validate tab_order
    if not isinstance(tab_order, list):
        return error_response("tab_order must be an array", 400)
    
    # Check workspace admin access
    if not is_workspace_admin(conn, ws_id, user_id):
        return error_response("Access denied. Workspace admin required.", 403)
    
    # Update tab order
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("""
        UPDATE workspaces 
        SET tab_order = %s, updated_at = NOW(), updated_by = %s
        WHERE id = %s
        RETURNING tab_order
    """, (json.dumps(tab_order), user_id, ws_id))
    
    result = cursor.fetchone()
    conn.commit()
    
    return success_response({
        "tab_order": result['tab_order']
    })
```

---

## Phase 3: Frontend Updates (3-4h)

### 3.1: Update Frontend Queries

**Files to Update:**
- `templates/_project-stack-template/apps/web/app/admin/sys/ws/` (system admin workspace config)
- `templates/_project-stack-template/apps/web/app/admin/org/ws/` (org admin workspace config)
- `templates/_modules-core/module-ws/frontend/hooks/useWorkspace*.ts`

**Search Pattern:**
```bash
# Find all frontend references to old table names
grep -r "ws_configs" templates/_project-stack-template/apps/web/
grep -r "ws_org_settings" templates/_project-stack-template/apps/web/
grep -r "ws_activity_log" templates/_project-stack-template/apps/web/
```

### 3.2: Create System Admin Tab Order UI

**File:** `templates/_project-stack-template/apps/web/app/admin/sys/ws/config/page.tsx`

**Component:** System admin page to configure default tab order

**Features:**
- Drag-and-drop to reorder modules
- Shows all available modules
- Preview: "This order applies to all new orgs/workspaces"
- Save button updates `ws_cfg_sys.default_tab_order`

### 3.3: Create Org Admin Tab Order UI

**File:** `templates/_project-stack-template/apps/web/app/admin/org/ws/config/page.tsx`

**Component:** Org admin page to override tab order

**Features:**
- Option 1: "Use system default" (tab_order = NULL)
- Option 2: "Customize for this organization"
- Drag-and-drop to reorder modules
- Shows current system default for reference
- Warning: "Existing workspaces are not affected"
- Save button updates `ws_cfg_org.tab_order`

### 3.4: Create Workspace Admin Tab Order UI

**File:** `templates/_modules-core/module-ws/frontend/components/settings/WorkspaceTabOrderSettings.tsx`

**Component:** Workspace settings tab order customization

**Features:**
- Shows current workspace tab order
- Drag-and-drop to reorder
- Info: "This only affects this workspace"
- Button: "Reset to organization default"
- Save button updates `workspaces.tab_order`

**Integration:**
Add to existing `WorkspaceModuleSettings` component or create separate tab.

### 3.5: Update WorkspacePluginProvider

**File:** `templates/_project-stack-template/apps/web/components/WorkspacePluginProvider.tsx`

**Enhancement:** Use workspace tab order to determine module tab display order

```tsx
// Fetch workspace data including tab_order
const { workspace, isLoading } = useWorkspace(workspaceId);

// Use tab order from workspace, or default
const tabOrder = workspace?.tab_order || [
  'module-kb',
  'module-chat',
  'module-voice',
  'module-eval'
];

// Filter to only enabled modules and apply order
const orderedEnabledModules = tabOrder
  .filter(moduleName => moduleAvailability.isModuleAvailable(moduleName))
  .map(moduleName => moduleAvailability.getModuleConfig(moduleName));
```

---

## Phase 4: Testing & Documentation (1-2h)

### 4.1: Testing Checklist

**Database Migration Testing:**
- [ ] Verify `ws_cfg_sys` table exists and has correct schema
- [ ] Verify `ws_cfg_org` table exists and has correct schema
- [ ] Verify `ws_log_activity` table exists and has correct schema
- [ ] Verify old table names don't exist
- [ ] Verify constraints are correct
- [ ] Verify indexes are correct
- [ ] Verify RLS policies work
- [ ] Verify triggers work

**Tab Order Testing:**
- [ ] Test system default order applied to new workspaces
- [ ] Test org override applied to new workspaces
- [ ] Test workspace customization persists
- [ ] Test "Reset to org default" button
- [ ] Test drag-and-drop reordering
- [ ] Test tab visibility respects module enablement (Sprint 3)
- [ ] Test existing workspaces backfilled correctly

**Lambda Testing:**
- [ ] Test workspace creation with tab order
- [ ] Test workspace config updates
- [ ] Test activity logging
- [ ] Test API endpoints for tab order

**Frontend Testing:**
- [ ] Test system admin tab order UI
- [ ] Test org admin tab order UI
- [ ] Test workspace admin tab order UI
- [ ] Test tabs render in correct order
- [ ] Test module tabs only show if enabled (Sprint 3)

### 4.2: Documentation Updates

**Files to Update:**
- `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARDS.md`
  - Add ws_cfg_sys, ws_cfg_org, ws_log_activity to compliant list
  - Remove old names from non-compliant list
- `docs/standards/standard_DATABASE-NAMING.md`
  - Update examples if needed
- `memory-bank/context-ws-plugin-architecture.md`
  - Add Sprint 4 summary
  - Update current state
- `docs/guides/guide_WORKSPACE-TAB-ORDERING.md` (new)
  - How to configure tab order (sys/org/ws)
  - How tab order inheritance works
  - How tab order interacts with module enablement

---

## Success Criteria

**Database Migration:**
- [ ] All workspace-related tables follow ADR-011 naming standard
- [ ] All constraints, indexes, triggers updated
- [ ] RLS policies function correctly
- [ ] No references to old table names in codebase

**Tab Ordering Feature:**
- [ ] System admins can set default tab order
- [ ] Org admins can override tab order for their org
- [ ] Workspace admins can customize tab order for their workspace
- [ ] Tab order correctly applied at workspace creation
- [ ] Tabs render in configured order
- [ ] Tab visibility respects module enablement cascade (Sprint 3)

**Code Quality:**
- [ ] TypeScript compilation passes
- [ ] All Lambda functions updated
- [ ] All frontend queries updated
- [ ] Validation passes
- [ ] Documentation complete

---

## Rollback Plan

If migration introduces issues:

1. **Database Rollback:**
   ```sql
   ALTER TABLE ws_cfg_sys RENAME TO ws_configs;
   ALTER TABLE ws_cfg_org RENAME TO ws_org_settings;
   ALTER TABLE ws_log_activity RENAME TO ws_activity_log;
   -- Revert all constraint/index names
   ```

2. **Code Rollback:**
   - Revert Lambda changes
   - Revert frontend changes
   - Deploy previous version

3. **Data Integrity:**
   - tab_order columns can be dropped if needed
   - Workspace creation will fall back to default order

---

## Implementation Order

**Recommended sequence:**

1. **Week 1: Database Migration**
   - Phase 1.1: Rename ws_configs → ws_cfg_sys (1h)
   - Phase 1.2: Rename ws_org_settings → ws_cfg_org (1h)
   - Phase 1.3: Rename ws_activity_log → ws_log_activity (30min)
   - Phase 1.4: Add tab_order columns (30min)

2. **Week 2: Backend & Frontend**
   - Phase 2: Update Lambda functions (2-3h)
   - Phase 3: Update frontend (3-4h)

3. **Week 3: Testing & Documentation**
   - Phase 4: Testing & docs (1-2h)

**Total Estimate:** 8-10 hours

---

## Dependencies

- **Sprint 3 Complete:** Module enablement cascade must be working
- **ADR-011:** Database naming standards documented
- **Database Access:** Supabase migration access required

---

## Integration with Existing Features

**Module Enablement (Sprint 3):**
- Tab order determines order of tabs
- Module enablement determines visibility of tabs
- Combined: Tabs render in configured order, but only if module enabled

**Example:**
```
Workspace tab_order: ["module-voice", "module-chat", "module-kb", "module-eval"]
Enabled modules: ["module-kb", "module-chat", "module-eval"]

Result: Overview → KB → Chat → Eval → Settings
(Voice not shown because disabled, but order preserved for others)
```

---

## Open Questions

1. **Migration Timing:** During maintenance window or rolling update?
2. **Backward Compatibility:** Should we keep old table names as views temporarily?
3. **Default Tab Order:** Should we survey users for preferred default order?
4. **Mobile Display:** Same order but different UI (tabs vs menu)?

---

## Notes

- **Copy-at-Creation:** Tab order is set once at workspace creation, not real-time cascade
- **No Breaking Changes:** Tab order is optional, defaults to system default
- **Extensible:** Can add more config options to ws_cfg_sys/ws_cfg_org later
- **Grep-Friendly:** New names follow standard and are easy to find

---

## References

- [ADR-011: Table Naming Standards](../../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [Database Naming Standard](../../standards/standard_DATABASE-NAMING.md)
- Sprint 3 Plan: [plan_ws-plugin-arch-s3.md](plan_ws-plugin-arch-s3.md)