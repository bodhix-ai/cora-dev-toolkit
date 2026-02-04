# WS Plugin Architecture (Sprint 4) - Left Nav Filtering & DB Naming Compliance

**Status**: 🚧 IN PROGRESS  
**Priority**: **P1**  
**Estimated Duration**: 4-5 hours  
**Created**: 2026-02-02  
**Updated**: 2026-02-03 (Scope refined - deferred items moved to S5)  
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

Sprint 4 focuses on two critical items:

1. **Left Navigation Dynamic Filtering:** Fix broken nav that reads from static YAML instead of database
2. **Database Naming Compliance:** Rename workspace tables to follow ADR-011 naming standards

### What Was Deferred to S5

The following items were moved to Sprint 5 (`plan_ws-plugin-arch-s5.md`):

| Feature | Reason for Deferral |
|---------|---------------------|
| Tab Ordering | New feature, not blocking S3 completion |
| Overview Tab Dynamic Metrics | Needs ADR-020 standard first - architectural decision required |
| Config Override Forms | Toggle on/off from S3 is sufficient for MVP |
| Auto-refresh | Current user sees immediate feedback; no polling needed |
| Voice/Chat Workspace Tabs | Modules need to be more mature first |

### Current State

- ✅ Sprint 3: Module enablement cascade complete (sys → org → ws)
- ✅ Sprint 3: Workspace tab visibility filters by module enablement
- ❌ **CRITICAL:** Left nav doesn't filter by module enablement (reads static YAML)
- ❌ Workspace config tables don't follow `_cfg_` naming standard
- ❌ Activity log table doesn't follow `_log_` naming standard

### Goal

1. **Fix Left Navigation:**
   - Query database for module enablement (sys → org cascade)
   - Filter nav items dynamically based on resolved enablement
   - Workspace-level does NOT affect nav (nav is org-wide)

2. **Rename tables to comply with ADR-011:**
   - `ws_configs` → `ws_cfg_sys` (system-level workspace defaults)
   - `ws_org_settings` → `ws_cfg_org` (org-level workspace overrides)
   - `ws_activity_log` → `ws_log_activity` (workspace activity log)

---

## Scope

### In Scope

**Phase 1 - Test Project Setup (30min):**
- Create test project using `setup.config.ws-optim.yaml`
- Verify deployment and login work

**Phase 2 - Left Navigation Dynamic Filtering (2-3h):**
- Update `buildNavigationConfig()` to query database
- Apply sys → org cascade for enablement
- Add refresh callback for org admin toggle changes
- Cache results per org for performance

**Phase 3 - Database Naming Migration (1-2h):**
- Rename three tables to comply with ADR-011
- Update Lambda functions with new table names
- Update frontend queries with new table names

**Phase 4 - Testing & Documentation (30min):**
- Test all scenarios
- Update documentation
- Update memory-bank context

### Out of Scope (Moved to S5)

- Tab ordering feature
- Overview tab dynamic metrics
- Config override forms
- Auto-refresh mechanism
- Voice & Chat workspace tabs

---

## Phase 1: Test Project Setup (30min)

**Status:** 📋 PLANNED

### 1.1: Create Test Project

Use the test-module workflow with `setup.config.ws-optim.yaml`:

```bash
# Config file already exists:
# templates/_project-stack-template/setup.config.ws-optim.yaml

# Create project
./scripts/create-cora-project.sh --input templates/_project-stack-template/setup.config.ws-optim.yaml
```

### 1.2: Verify Deployment

- [ ] Project created at `~/code/bodhix/testing/ws-optim/`
- [ ] Infrastructure deployed successfully
- [ ] Login working
- [ ] Module enablement toggle working (S3 feature)

---

## Phase 2: Left Navigation Dynamic Filtering (2-3h)

**Status:** 📋 PLANNED

### Problem Statement

**CRITICAL:** Left nav currently reads from static YAML file, not database.

**Current Implementation:**
- File: `apps/web/lib/moduleRegistry.ts`
- Function: `buildNavigationConfig()`
- Data source: `cora-modules.config.yaml` (static file)
- Check: `show_in_main_nav` flag only

**Impact:** When org admin disables a module, the nav item still appears because nav reads from YAML, not database.

### Design Decision: Nav is Org-Wide

**Confirmed:** Workspace-level enablement does NOT affect left nav.

**Rationale:**
- Left nav is org-wide - all users in an org see the same navigation
- Different workspaces may have different modules enabled, but nav shows org-level availability
- Only sys (system) and org levels matter for nav filtering

### Implementation Plan

**2.1: Update buildNavigationConfig to Accept orgId**

```typescript
// apps/web/lib/moduleRegistry.ts

// BEFORE:
export async function buildNavigationConfig(): Promise<NavConfig> {
  // Reads from static YAML only
}

// AFTER:
export async function buildNavigationConfig(orgId: string): Promise<NavConfig> {
  // 1. Read base config from YAML (module metadata)
  const baseConfig = await loadModuleConfigYaml();
  
  // 2. Query database for org-level enablement
  const enabledModules = await getOrgEnabledModules(orgId);
  
  // 3. Filter nav items by enablement
  const filteredNav = baseConfig.navItems.filter(item => 
    enabledModules.includes(item.moduleName)
  );
  
  return { navItems: filteredNav };
}
```

**2.2: Create getOrgEnabledModules Function**

```typescript
// apps/web/lib/moduleRegistry.ts

async function getOrgEnabledModules(orgId: string): Promise<string[]> {
  // Query sys_module_registry for system-level enablement
  // Query mgmt_cfg_org_modules for org-level overrides
  // Apply cascade: sys → org
  // Return list of enabled module names
  
  const response = await fetch(`/api/platform/modules?org_id=${orgId}`);
  const modules = await response.json();
  
  return modules
    .filter(m => m.isEnabled && m.isInstalled)
    .map(m => m.name);
}
```

**2.3: Update Sidebar Component**

```typescript
// apps/web/components/sidebar/Sidebar.tsx

export function Sidebar() {
  const { currentOrg } = useOrganizationContext();
  const [navConfig, setNavConfig] = useState<NavConfig | null>(null);
  
  useEffect(() => {
    if (currentOrg?.id) {
      buildNavigationConfig(currentOrg.id).then(setNavConfig);
    }
  }, [currentOrg?.id]);
  
  // Render nav items from navConfig
}
```

**2.4: Add Refresh Callback**

When org admin toggles a module, refresh the nav:

```typescript
// After org admin toggles module
await updateModuleEnablement(moduleName, enabled);
await refreshNavigation(); // Re-fetch nav config
```

**2.5: Cache Results Per Org**

```typescript
// Simple cache with TTL
const navConfigCache = new Map<string, { config: NavConfig; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function buildNavigationConfig(orgId: string): Promise<NavConfig> {
  const cached = navConfigCache.get(orgId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config;
  }
  
  const config = await buildNavigationConfigFromDb(orgId);
  navConfigCache.set(orgId, { config, timestamp: Date.now() });
  return config;
}

// Clear cache when org admin makes changes
export function invalidateNavCache(orgId: string) {
  navConfigCache.delete(orgId);
}
```

### Files to Modify

- `templates/_project-stack-template/apps/web/lib/moduleRegistry.ts`
- `templates/_project-stack-template/apps/web/components/sidebar/Sidebar.tsx` (or equivalent)
- `templates/_modules-core/module-mgmt/frontend/pages/OrgModuleConfigPage.tsx` (add refresh)

### Validation Steps

- [ ] Disable module-kb at org level
- [ ] Verify "Docs" nav item disappears for all users in that org
- [ ] Re-enable module-kb
- [ ] Verify "Docs" nav item reappears immediately for admin
- [ ] Verify other users see change on next page load

---

## Phase 3: Database Naming Migration (1-2h)

**Status:** 📋 PLANNED

### 3.1: Rename ws_configs → ws_cfg_sys

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

-- Step 5: Add table comment
COMMENT ON TABLE ws_cfg_sys IS 'System-wide workspace configuration defaults. Renamed from ws_configs on 2026-02-03 to comply with ADR-011.';
```

### 3.2: Rename ws_org_settings → ws_cfg_org

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

-- Step 6: Add table comment
COMMENT ON TABLE ws_cfg_org IS 'Organization-level workspace configuration overrides. Renamed from ws_org_settings on 2026-02-03 to comply with ADR-011.';
```

### 3.3: Rename ws_activity_log → ws_log_activity

**Migration SQL:**
```sql
-- Step 1: Rename table
ALTER TABLE ws_activity_log RENAME TO ws_log_activity;

-- Step 2: Update constraints
ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_pkey,
  ADD CONSTRAINT ws_log_activity_pkey PRIMARY KEY (id);

-- Update foreign keys
ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_ws_id_fkey,
  ADD CONSTRAINT fk_ws_log_activity_ws_id FOREIGN KEY (ws_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE ws_log_activity 
  DROP CONSTRAINT IF EXISTS ws_activity_log_user_id_fkey,
  ADD CONSTRAINT fk_ws_log_activity_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Update indexes
DROP INDEX IF EXISTS idx_ws_activity_log_ws_id;
CREATE INDEX idx_ws_log_activity_ws_id ON ws_log_activity(ws_id);

DROP INDEX IF EXISTS idx_ws_activity_log_user_id;
CREATE INDEX idx_ws_log_activity_user_id ON ws_log_activity(user_id);

DROP INDEX IF EXISTS idx_ws_activity_log_created_at;
CREATE INDEX idx_ws_log_activity_created_at ON ws_log_activity(created_at);

-- Step 4: Add table comment
COMMENT ON TABLE ws_log_activity IS 'Workspace activity log. Renamed from ws_activity_log on 2026-02-03 to comply with ADR-011 (Rule 8.2: Log Tables).';
```

### 3.4: Update Lambda Functions

**Search for references:**
```bash
grep -r "ws_configs" templates/_modules-core/module-ws/backend/
grep -r "ws_org_settings" templates/_modules-core/module-ws/backend/
grep -r "ws_activity_log" templates/_modules-core/module-ws/backend/
```

**Update all queries to use new table names.**

### 3.5: Update Frontend Queries

**Search for references:**
```bash
grep -r "ws_configs" templates/_project-stack-template/apps/web/
grep -r "ws_org_settings" templates/_project-stack-template/apps/web/
grep -r "ws_activity_log" templates/_project-stack-template/apps/web/
```

**Update all queries to use new table names.**

### 3.6: Create Trigger Functions (if not exist)

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

## Phase 4: Testing & Documentation (30min)

**Status:** 📋 PLANNED

### 4.1: Testing Checklist

**Left Navigation Testing:**
- [ ] System admin disables module-kb → nav item hidden globally
- [ ] Org admin disables module-eval → nav item hidden for that org only
- [ ] Org admin re-enables module → nav item appears immediately (for admin)
- [ ] Regular user sees updated nav on page refresh
- [ ] Different orgs have independent nav filtering

**Database Migration Testing:**
- [ ] Verify `ws_cfg_sys` table exists and has correct schema
- [ ] Verify `ws_cfg_org` table exists and has correct schema
- [ ] Verify `ws_log_activity` table exists and has correct schema
- [ ] Verify old table names don't exist
- [ ] Verify constraints are correct
- [ ] Verify indexes are correct
- [ ] Verify RLS policies work
- [ ] Verify triggers work

**Lambda Testing:**
- [ ] Workspace CRUD operations work
- [ ] Activity logging works
- [ ] Config retrieval works

### 4.2: Documentation Updates

**Files to Update:**
- `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARDS.md`
  - Add ws_cfg_sys, ws_cfg_org, ws_log_activity to compliant list
  - Remove old names from non-compliant list
- `memory-bank/context-ws-plugin-architecture.md`
  - Add Sprint 4 summary
  - Update current state
- `docs/arch decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md`
  - Add Sprint 4 section

---

## Success Criteria

**Left Navigation:**
- [ ] Nav filters based on sys → org enablement (not YAML)
- [ ] Org admin sees immediate feedback after toggle
- [ ] Different orgs can have different nav items
- [ ] Workspace-level enablement does NOT affect nav

**Database Migration:**
- [ ] All workspace-related tables follow ADR-011 naming standard
- [ ] All constraints, indexes, triggers updated
- [ ] RLS policies function correctly
- [ ] No references to old table names in codebase

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

---

## Dependencies

- **Sprint 3 Complete:** Module enablement cascade must be working ✅
- **ADR-011:** Database naming standards documented ✅
- **Database Access:** Supabase migration access required

---

## References

- [ADR-011: Table Naming Standards](../../arch%20decisions/ADR-011-TABLE-NAMING-STANDARDS.md)
- [Database Naming Standard](../../standards/standard_DATABASE-NAMING.md)
- [Sprint 3 Plan](completed/plan_ws-plugin-arch-s3.md)
- [Sprint 5 Plan (Deferred Scope)](plan_ws-plugin-arch-s5.md)