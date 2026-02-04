# WS Plugin Architecture (Sprint 5) - Tab Ordering, Metrics Standard & Config Forms

**Status**: 📋 PLANNED  
**Priority**: **P3**  
**Estimated Duration**: 10-14 hours  
**Created**: 2026-02-03  
**Branch**: `feature/ws-plugin-arch-s5`  
**Context**: `memory-bank/context-ws-plugin-architecture.md`  
**Dependencies**: Sprint 4 (In Progress)  
**Related Standards**: ADR-020 (Module Metrics Standard - to be created)

---

## Naming Pattern (Initiative-Wide Consistency)

All sprints in the **WS Plugin Architecture** initiative follow this naming pattern:

- **Branch:** `feature/ws-plugin-arch-s{N}`
- **Plan:** `docs/plans/plan_ws-plugin-arch-s{N}.md`
- **Context:** `memory-bank/context-ws-plugin-architecture.md` (shared)

---

## Executive Summary

Sprint 5 implements advanced workspace features that were deferred from S4 to keep the scope focused:

1. **Tab Ordering Feature:** Customizable tab ordering with sys → org → ws inheritance
2. **Module Metrics Standard:** ADR-020 defining how modules expose metrics for dashboards
3. **Overview Tab Dynamic Metrics:** Scalable metrics display based on enabled modules
4. **Config Override Forms:** Advanced config editing beyond simple toggle switches
5. **Voice & Chat Workspace Tabs:** Tab components for newer modules

### Why These Were Deferred

| Feature | Reason for Deferral |
|---------|---------------------|
| Tab Ordering | New feature, not blocking S3 completion |
| Overview Metrics | Needs ADR-020 standard first - architectural decision required |
| Config Override Forms | Toggle on/off from S3 is sufficient for MVP |
| Auto-refresh | Current user sees immediate feedback; no polling needed |
| Voice/Chat Tabs | Modules need to be more mature first |

---

## Scope

### In Scope

**Phase 1 - Module Metrics Standard (ADR-020) (2-3h):**
- Define how modules declare metrics for workspace overview
- Define how modules declare metrics for org dashboard
- Create TypeScript interfaces for metrics contract
- Document in ADR-020

**Phase 2 - Overview Tab Dynamic Metrics (2-3h):**
- Implement metrics registry in module-mgmt
- Query enabled modules for their metrics
- Render metrics cards dynamically
- Conditional data fetching (only for enabled modules)

**Phase 3 - Tab Ordering Feature (3-4h):**
- Database: Add tab_order columns
- Backend: Tab order resolution logic
- Frontend: System admin, org admin, workspace admin UIs
- Drag-and-drop reordering

**Phase 4 - Config Override Forms (2-3h):**
- Org admin: Structured config override form
- Workspace admin: Structured config override form
- Feature flag toggles UI
- "Reset to default" functionality

**Phase 5 - Voice & Chat Workspace Tabs (1-2h):**
- Create voice tab component
- Create chat tab component
- Integrate with tab visibility filtering

### Out of Scope

- Real-time cascade for tab order (only affects new workspaces)
- WebSocket-based auto-refresh (polling/event-based is sufficient)
- Mobile-specific tab ordering UI

---

## Phase 1: Module Metrics Standard (ADR-020)

**Status:** 📋 PLANNED

### Problem Statement

As CORA scales to 100+ modules, we cannot hardcode metrics for each one. Modules need a standard way to declare:
- What metrics they provide
- How to fetch those metrics
- How to display them (count, percentage, status, etc.)

### Proposed Solution

**Create `ADR-020: Module Metrics Standard`**

```typescript
// Proposed: Module Metrics Contract
interface ModuleMetricsContract {
  moduleName: string;
  
  // Metrics for workspace overview tab
  workspaceMetrics: WorkspaceMetric[];
  
  // Metrics for main dashboard (org-wide)
  dashboardMetrics?: DashboardMetric[];
}

interface WorkspaceMetric {
  id: string;                    // Unique metric ID (e.g., "kb_document_count")
  label: string;                 // Display label (e.g., "Documents")
  icon: string;                  // Icon name or component
  displayType: 'count' | 'percentage' | 'status' | 'chart';
  
  // API endpoint to fetch metric value
  endpoint: string;              // e.g., "/api/data/ws/{wsId}/kb/metrics/document-count"
  
  // Optional: Link to module detail page
  linkTo?: string;               // e.g., "/ws/{wsId}/kb"
}
```

### Implementation Options

**Option A: Module Registry YAML**
```yaml
# cora-modules.config.yaml
modules:
  module-kb:
    workspace_metrics:
      - id: kb_document_count
        label: Documents
        icon: FileText
        display_type: count
        endpoint: /api/data/ws/{wsId}/kb/metrics/document-count
        link_to: /ws/{wsId}/kb
```

**Option B: Module Code Export**
```typescript
// module-kb/frontend/metrics.ts
export const moduleMetrics: ModuleMetricsContract = {
  moduleName: 'module-kb',
  workspaceMetrics: [
    {
      id: 'kb_document_count',
      label: 'Documents',
      icon: 'FileText',
      displayType: 'count',
      endpoint: '/api/data/ws/{wsId}/kb/metrics/document-count',
      linkTo: '/ws/{wsId}/kb'
    }
  ]
};
```

### Deliverables

- [ ] `docs/arch decisions/ADR-020-MODULE-METRICS-STANDARD.md`
- [ ] TypeScript interfaces in `packages/shared/module-metrics/`
- [ ] Example implementation for module-kb
- [ ] Documentation guide

---

## Phase 2: Overview Tab Dynamic Metrics

**Status:** 📋 PLANNED (Depends on Phase 1)

### Current State

```tsx
// WorkspaceDetailPage.tsx - Overview tab (HARDCODED)
<Card>Documents: {kbCount}</Card>      // Always renders
<Card>Evaluations: {evalCount}</Card>  // Always renders
```

### Target State

```tsx
// WorkspaceDetailPage.tsx - Overview tab (DYNAMIC)
const { enabledModules } = useWorkspacePlugin();
const metricsRegistry = useModuleMetricsRegistry();

// Get metrics only for enabled modules
const activeMetrics = metricsRegistry.getWorkspaceMetrics(enabledModules);

return (
  <MetricsGrid>
    {activeMetrics.map(metric => (
      <DynamicMetricCard key={metric.id} metric={metric} workspaceId={wsId} />
    ))}
  </MetricsGrid>
);
```

### Implementation Steps

- [ ] Create `useModuleMetricsRegistry` hook
- [ ] Create `DynamicMetricCard` component
- [ ] Update `WorkspaceDetailPage` overview tab
- [ ] Add metrics endpoint to each module
- [ ] Test with enabled/disabled modules

---

## Phase 3: Tab Ordering Feature

**Status:** 📋 PLANNED

### Database Changes

```sql
-- Add to ws_cfg_sys (system defaults)
ALTER TABLE ws_cfg_sys 
ADD COLUMN default_tab_order JSONB DEFAULT '["module-kb", "module-chat", "module-voice", "module-eval"]'::jsonb;

-- Add to ws_cfg_org (org overrides)
ALTER TABLE ws_cfg_org 
ADD COLUMN tab_order JSONB;

-- Add to workspaces (workspace-specific)
ALTER TABLE workspaces 
ADD COLUMN tab_order JSONB;
```

### Resolution Logic

```python
def get_tab_order_for_workspace(ws_id: str) -> list:
    """
    Resolution order:
    1. Workspace-specific (workspaces.tab_order)
    2. Org override (ws_cfg_org.tab_order)
    3. System default (ws_cfg_sys.default_tab_order)
    """
    workspace = get_workspace(ws_id)
    if workspace.tab_order:
        return workspace.tab_order
    
    org_config = get_org_config(workspace.org_id)
    if org_config and org_config.tab_order:
        return org_config.tab_order
    
    sys_config = get_sys_config()
    return sys_config.default_tab_order
```

### Frontend UIs

**System Admin Tab Order UI:**
- Location: `/admin/sys/ws/config`
- Features: Drag-and-drop reordering, save default

**Org Admin Tab Order UI:**
- Location: `/admin/org/ws/config`
- Features: "Use system default" or "Customize", drag-and-drop

**Workspace Admin Tab Order UI:**
- Location: Workspace settings tab
- Features: Drag-and-drop, "Reset to org default"

### Implementation Steps

- [ ] Database migration for tab_order columns
- [ ] Backend: Resolution logic in lambda-ws
- [ ] Backend: API endpoints for tab order CRUD
- [ ] Frontend: System admin UI
- [ ] Frontend: Org admin UI
- [ ] Frontend: Workspace settings UI
- [ ] Frontend: Drag-and-drop library integration

---

## Phase 4: Config Override Forms

**Status:** 📋 PLANNED

### Current State (S3)

- Org admins can toggle modules on/off
- Workspace admins can toggle modules on/off
- NO config customization beyond enabled/disabled

### Target State

**Org Admin Config Overrides:**
```tsx
// /admin/org/mgmt/modules/{moduleName}
<ModuleConfigForm
  level="org"
  moduleName="module-kb"
  systemConfig={sysConfig}      // Read-only reference
  currentOverrides={orgConfig}  // Editable
  onSave={saveOrgOverrides}
/>

// Displays:
// - max_documents: [500] (system: 1000)
// - allowed_file_types: [pdf, docx] (system: [pdf, docx, txt])
// - Feature flags: ☑ advanced_search (system: ☐)
```

**Workspace Admin Config Overrides:**
```tsx
// Workspace settings > Module config
<ModuleConfigForm
  level="workspace"
  moduleName="module-kb"
  effectiveConfig={mergedConfig}  // sys → org → ws merged
  currentOverrides={wsConfig}     // Editable
  onSave={saveWsOverrides}
  onReset={resetToOrgDefault}
/>
```

### Implementation Steps

- [ ] Create `ModuleConfigForm` component
- [ ] Create `FeatureFlagToggleList` component
- [ ] Add org admin config page per module
- [ ] Add workspace settings config section
- [ ] Backend: Config override merge logic
- [ ] Backend: API endpoints for config CRUD

---

## Phase 5: Voice & Chat Workspace Tabs

**Status:** 📋 PLANNED

### Voice Tab Component

```tsx
// module-voice/frontend/components/WorkspaceVoiceTab.tsx
export function WorkspaceVoiceTab({ workspaceId }: Props) {
  const { sessions, isLoading } = useVoiceSessions(workspaceId);
  
  return (
    <TabPanel>
      <VoiceSessionsList sessions={sessions} />
      <CreateSessionButton workspaceId={workspaceId} />
    </TabPanel>
  );
}
```

### Chat Tab Component

```tsx
// module-chat/frontend/components/WorkspaceChatTab.tsx
export function WorkspaceChatTab({ workspaceId }: Props) {
  const { conversations, isLoading } = useConversations(workspaceId);
  
  return (
    <TabPanel>
      <ConversationsList conversations={conversations} />
      <NewConversationButton workspaceId={workspaceId} />
    </TabPanel>
  );
}
```

### Implementation Steps

- [ ] Create `WorkspaceVoiceTab` component
- [ ] Create `WorkspaceChatTab` component
- [ ] Add tabs to `WorkspaceDetailPage`
- [ ] Integrate with tab visibility filtering (S3)
- [ ] Test with modules enabled/disabled

---

## Success Criteria

**Module Metrics Standard (ADR-020):**
- [ ] ADR-020 documented and approved
- [ ] TypeScript interfaces defined
- [ ] Example implementation for at least one module
- [ ] Guide documentation complete

**Overview Tab Dynamic Metrics:**
- [ ] Metrics render dynamically based on enabled modules
- [ ] No data fetching for disabled modules
- [ ] Scalable to 100+ modules

**Tab Ordering:**
- [ ] System admins can set default tab order
- [ ] Org admins can override for their org
- [ ] Workspace admins can customize their workspace
- [ ] Tab order correctly applied at workspace creation
- [ ] Drag-and-drop reordering works

**Config Override Forms:**
- [ ] Org admins can override module config
- [ ] Workspace admins can override module config
- [ ] Feature flags toggleable at org/ws level
- [ ] "Reset to default" works correctly

**Voice & Chat Tabs:**
- [ ] Voice tab renders for enabled module
- [ ] Chat tab renders for enabled module
- [ ] Tabs hidden when modules disabled

---

## Dependencies

- **Sprint 4 Complete:** Left nav filtering and DB naming migration
- **Module Maturity:** Voice and Chat modules need to be stable

---

## Notes

- **ADR-020 First:** Overview metrics implementation depends on having the standard defined
- **Incremental:** Tab ordering can be implemented independently of metrics
- **Config Forms:** Consider using JSON Schema for dynamic form generation

---

## References

- [ADR-017: WS Plugin Architecture](../../arch%20decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md)
- [Sprint 4 Plan](plan_ws-plugin-arch-s4.md)
- [Module Availability Integration Guide](../../guides/guide_MODULE-AVAILABILITY-INTEGRATION.md)