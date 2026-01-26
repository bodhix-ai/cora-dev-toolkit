# UX Design: Module Configuration Admin Pages

**Status:** Draft  
**Created:** 2026-01-25  
**Updated:** 2026-01-25 (Corrected to centralized module-mgmt pattern)  
**Sprint:** WS Plugin Architecture Sprint 3  
**Related:**
- `docs/plans/plan_ws-plugin-arch-s3.md` - Technical implementation plan
- `docs/arch decisions/ADR-017-WS-PLUGIN-ARCHITECTURE.md` - Architecture decisions
- `memory-bank/context-admin-standardization.md` - Admin standardization context

---

## Overview

This document defines the UX design for module configuration admin pages at the organization and workspace levels. It extends the system-level module management already implemented by the Admin Standardization team.

### Key Architectural Principle

**Module enablement is CENTRALIZED in module-mgmt.** Only module-mgmt manages module registration and enablement. Other modules have their own admin pages for their own resources (documents, channels, sessions, etc.), but NOT for module enablement.

### Scope Clarification

| Component | Team | Status |
|-----------|------|--------|
| Sys Admin Modules Tab (`/admin/sys/mgmt/modules`) | Admin Standardization | ✅ Complete |
| `mgmt_cfg_sys_modules` table | Admin Standardization | ✅ Complete |
| Module enable/disable at system level | Admin Standardization | ✅ Complete |
| **Org Admin Modules Page (`/admin/org/mgmt/modules`)** | **WS Plugin S3** | 🆕 This design |
| **Workspace Module Config (Settings tab → Modules section)** | **WS Plugin S3** | 🆕 This design |
| **`mgmt_cfg_org_modules` table** | **WS Plugin S3** | 🆕 This design |
| **`mgmt_cfg_ws_modules` table** | **WS Plugin S3** | 🆕 This design |
| **Config cascade resolution** | **WS Plugin S3** | 🆕 This design |

---

## Config Inheritance Model

### Cascade Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM LEVEL                                  │
│              (mgmt_cfg_sys_modules)                             │
│                                                                  │
│  • Global module enable/disable (SysAdmin only)                 │
│  • Default config values                                         │
│  • Default feature flags                                         │
│  • This is the BASELINE for all orgs                            │
│  • Managed at: /admin/sys/mgmt/modules                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (inherited by all orgs)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                ORGANIZATION LEVEL                                │
│              (mgmt_cfg_org_modules)                             │
│                                                                  │
│  • Org can DISABLE modules (not enable if sys disabled)         │
│  • Org can OVERRIDE config values (within sys limits)           │
│  • Org can OVERRIDE feature flags (within sys allowlist)        │
│  • This becomes the BASELINE for all workspaces in org          │
│  • Managed at: /admin/org/mgmt/modules                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (inherited by org's workspaces)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                WORKSPACE LEVEL                                   │
│              (mgmt_cfg_ws_modules)                              │
│                                                                  │
│  • WS can DISABLE modules (not enable if org/sys disabled)      │
│  • WS can OVERRIDE config values (within org limits)            │
│  • WS can OVERRIDE feature flags (within org allowlist)         │
│  • This is the FINAL resolved config used by module code        │
│  • Managed at: Workspace Settings tab → Modules section         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Restrictive Inheritance:** Each level can only **restrict**, never expand
   - If System disables → Org cannot enable
   - If Org disables → Workspace cannot enable
   - Config limits cascade down (e.g., sys max=1000 → org max=500 → ws max=100)

2. **Explicit Overrides:** Only store explicit overrides at each level
   - Null/missing = inherit from parent
   - Explicit value = override parent

3. **Resolution Order:** sys → org → ws (last wins for explicit values)

4. **Centralized Management:** Module enablement is ONLY through module-mgmt
   - System level: `/admin/sys/mgmt/modules`
   - Org level: `/admin/org/mgmt/modules`

---

## User Personas & Access

| Persona | Route | Can Manage |
|---------|-------|------------|
| **System Admin** | `/admin/sys/mgmt/modules` | All modules globally |
| **Org Admin** | `/admin/org/mgmt/modules` | Module enablement & config for their org |
| **Workspace Admin** | Workspace Settings tab → Modules section | Module config for their workspace |

**Route Pattern:** `admin/{scope}/{module}/{resource}`

Module-specific admin pages:
- `/admin/org/access/users` - Access module manages users
- `/admin/org/access/roles` - Access module manages roles
- `/admin/org/kb/documents` - KB module manages documents
- `/admin/org/chat/channels` - Chat module manages channels
- `/admin/org/mgmt/modules` - **Mgmt module manages module enablement** ← This is where module config lives

---

## 1. System Admin - Modules Tab (Reference Only)

> **Note:** This is already implemented by the Admin Standardization team. Included here for context.

**Route:** `/admin/sys/mgmt/modules`

**Capabilities:**
- View all registered modules
- Enable/disable modules globally
- Configure system-level defaults
- Set feature flags

---

## 2. Org Admin - Module Configuration (Centralized in module-mgmt)

### 2.1 Org Admin Page - Standard Card Layout

The org admin page (`/admin/org/`) displays one card per module. Each module card leads to that module's admin page for managing **that module's resources**.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Organization Administration                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │    👤      │  │    🤖      │  │    ⚙️      │  │    🏢      │     │
│  │  Access    │  │    AI      │  │   Mgmt     │  │    WS      │     │
│  │            │  │            │  │            │  │            │     │
│  │  Users &   │  │ AI Provider│  │  Platform  │  │ Workspace  │     │
│  │  Roles     │  │  Settings  │  │  Settings  │  │  Settings  │     │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │    📚      │  │    💬      │  │    🎤      │  │    📊      │     │
│  │    KB      │  │   Chat     │  │   Voice    │  │   Eval     │     │
│  │            │  │            │  │            │  │            │     │
│  │ Knowledge  │  │  Chat &    │  │   Voice    │  │ Evaluation │     │
│  │   Base     │  │ Messaging  │  │ Interviews │  │  Testing   │     │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Note:** Cards only appear if the module is enabled at the system level AND installed.

### 2.2 Module-Mgmt Admin Page - Modules Tab

**Route:** `/admin/org/mgmt/modules`

The **Mgmt module** is the ONLY place where org admins manage module enablement. This follows the same pattern as the system level (`/admin/sys/mgmt/modules`).

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Org Admin                                                         │
│                                                                      │
│  ⚙️ Platform Management                                              │
│  Manage platform settings for your organization                      │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  [Schedule]  [Performance]  [📦 Modules]  ◄─── Module config here   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Module Configuration                                                │
│  Enable or disable modules and configure settings for your org.      │
│                                                                      │
│  ┌─ Core Modules ────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  👤 module-access                         [✓ Enabled]    │ │  │
│  │  │  Identity & access control                               │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  🤖 module-ai                             [✓ Enabled]    │ │  │
│  │  │  AI provider management                                  │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  📚 module-kb                             [✓ Enabled]    │ │  │
│  │  │  Knowledge base & RAG                                    │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  💬 module-chat                           [✓ Enabled]    │ │  │
│  │  │  Chat & messaging                                        │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Functional Modules ──────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  🎤 module-voice                          [○ Disabled]   │ │  │
│  │  │  Voice interview capabilities                            │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  📊 module-eval                           [✓ Enabled]    │ │  │
│  │  │  Evaluation & testing                                    │ │  │
│  │  │  System: ✓ Enabled                                       │ │  │
│  │  │  [Configure ▼]                                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Module Config Expanded View

When "Configure ▼" is clicked, the module card expands to show config options:

```
┌──────────────────────────────────────────────────────────────────────┐
│  📚 module-kb                                       [✓ Enabled]      │
│  Knowledge base & RAG                                                │
│  System: ✓ Enabled                                                   │
│                                                                      │
│  ┌─ Config Overrides ────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  max_documents_per_workspace                                   │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  System default: 1000                                    │ │  │
│  │  │  Org override:   [500        ]                           │ │  │
│  │  │  ℹ️ Workspaces can set lower values, not higher          │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  max_file_size_mb                                              │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  System default: 25 MB                                   │ │  │
│  │  │  Org override:   [10         ]                           │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  [Reset All to System Defaults]                               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Feature Flags ───────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  [✓] rag_v2              │  System: ✓  │  Use RAG v2 engine  │  │
│  │  [○] experimental_embed  │  System: ○  │  Cannot enable      │  │
│  │  [✓] citation_links      │  System: ✓  │  Show citations     │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Cancel]                                           [Save Changes]   │
│  [Configure ▲]                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.4 Other Module Admin Pages (NOT for Module Config)

Other modules have their own admin pages for managing **their resources**, NOT module enablement:

| Module | Route | What It Manages |
|--------|-------|-----------------|
| Access | `/admin/org/access/users` | User accounts |
| Access | `/admin/org/access/roles` | Role definitions |
| Access | `/admin/org/access/invitations` | User invitations |
| AI | `/admin/org/ai/providers` | AI provider settings |
| AI | `/admin/org/ai/models` | Model configurations |
| KB | `/admin/org/kb/documents` | Knowledge base documents |
| KB | `/admin/org/kb/sources` | Data sources |
| Chat | `/admin/org/chat/channels` | Chat channels |
| Voice | `/admin/org/voice/sessions` | Voice sessions |
| Eval | `/admin/org/eval/tests` | Evaluation tests |

**These pages do NOT have a "Module Config" tab.** Module enablement is only at `/admin/org/mgmt/modules`.

### 2.5 Component Structure

```
templates/_modules-core/module-mgmt/frontend/components/admin/
├── MgmtAdminPage.tsx              # Main admin page with tabs
├── ScheduleTab.tsx                # Existing tab
├── PerformanceTab.tsx             # Existing tab
└── ModulesTab.tsx                 # NEW - org-level module management
    ├── ModuleList.tsx             # List all modules with toggles
    ├── ModuleCard.tsx             # Single module card with expand/collapse
    ├── ModuleConfigPanel.tsx      # Config overrides when expanded
    └── FeatureFlagToggle.tsx      # Feature flag toggle component

templates/_project-stack-template/packages/shared/
└── module-config/
    ├── types.ts                   # Shared types for module config
    ├── ConfigOverrideEditor.tsx   # Reusable config editor
    ├── InheritanceIndicator.tsx   # Shows cascade status
    └── useModuleConfig.ts         # Hook for fetching/updating config
```

---

## 3. Workspace - Tab Structure with Module Section in Settings

### 3.1 Workspace Tab Pattern

Workspaces use a **dynamic tab structure** where:
- **Functional module tabs** appear based on which modules are enabled for the workspace
- **Settings tab is always LAST** and contains collapsible sections

**Tab Structure:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Workspace: "Q1 Interview Project"                                   │
├─────────────────────────────────────────────────────────────────────┤
│  [📚 Docs]  [📊 Eval]  [💬 Chat]  [🎤 Voice]  [⚙️ Settings]         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  (Content of selected tab shown below)                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Note:** Tabs only appear if the module is enabled for this workspace:
- If KB is disabled → no "Docs" tab
- If Eval is disabled → no "Eval" tab
- Settings tab is ALWAYS present and ALWAYS last

### 3.2 Functional Module Tabs

Each functional module gets its own tab when enabled:

| Module | Tab Name | Content |
|--------|----------|---------|
| **module-kb** | 📚 Docs | Knowledge base documents, sources, search |
| **module-eval** | 📊 Eval | Evaluation tests, results, scores |
| **module-chat** | 💬 Chat | Chat conversations, channels |
| **module-voice** | 🎤 Voice | Voice sessions, transcripts, recordings |

### 3.3 Settings Tab - Collapsible Sections

**The Settings tab** (always last) contains collapsible sections for all workspace configuration:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Workspace: "Q1 Interview Project"                                   │
├─────────────────────────────────────────────────────────────────────┤
│  [📚 Docs]  [📊 Eval]  [💬 Chat]  [🎤 Voice]  [⚙️ Settings]  ◄───   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Workspace Settings                                                  │
│  Configure your workspace preferences and access.                    │
│                                                                      │
│  ┌─ General ──────────────────────────────────────────────── [▼] ┐  │
│  │                                                                │  │
│  │  Workspace Name: [Q1 Interview Project        ]               │  │
│  │  Description:    [Quarterly candidate interviews...]          │  │
│  │  [Save Changes]                                               │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Members ──────────────────────────────────────────────── [▼] ┐  │
│  │                                                                │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │  User              │  Role        │  Actions           │   │  │
│  │  ├────────────────────┼──────────────┼────────────────────┤   │  │
│  │  │  john@acme.com     │  Owner       │  —                 │   │  │
│  │  │  jane@acme.com     │  Admin       │  [Edit] [Remove]   │   │  │
│  │  │  bob@acme.com      │  Member      │  [Edit] [Remove]   │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │  [+ Add Member]                                               │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Modules ──────────────────────────────────────────────── [▼] ┐  │
│  │                                                                │  │
│  │  Configure which modules are active and their settings.        │  │
│  │  Inheritance: System → Acme Corp (org) → This Workspace       │  │
│  │                                                                │  │
│  │  ┌─ 📚 Knowledge Base ─────────────────────────────── [▼] ┐   │  │
│  │  │  Status: [✓ Enabled]                                   │   │  │
│  │  │  max_documents: [100    ] (org limit: 500)            │   │  │
│  │  │  [✓] rag_v2  [✓] citation_links                       │   │  │
│  │  │  [Save] [Reset to Org Defaults]                       │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─ 📊 Evaluation ─────────────────────────────────── [▼] ┐   │  │
│  │  │  Status: [✓ Enabled]                                   │   │  │
│  │  │  Using org default settings                            │   │  │
│  │  │  [Customize Settings]                                  │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─ 💬 Chat ───────────────────────────────────────── [▼] ┐   │  │
│  │  │  Status: [○ Disabled for this workspace]               │   │  │
│  │  │  [Enable Chat]                                         │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─ 🎤 Voice ──────────────────────────────────────── [▼] ┐   │  │
│  │  │  Status: [✓ Enabled]                                   │   │  │
│  │  │  max_recordings: [50    ] (org limit: 100)            │   │  │
│  │  │  [Save] [Reset to Org Defaults]                       │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─ 🔒 Unavailable Modules ────────────────────────────────┐  │  │
│  │  │  module-xyz: Disabled by organization                   │  │  │
│  │  │  Contact org admin to enable.                           │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─ Danger Zone ──────────────────────────────────────────── [▼] ┐  │
│  │                                                                │  │
│  │  [Archive Workspace]  [Delete Workspace]                      │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Settings Tab Sections

| Section | Content | Collapsible |
|---------|---------|-------------|
| **General** | Workspace name, description, avatar | Yes |
| **Members** | User list, roles, add/remove | Yes |
| **Modules** | Module enable/disable, config overrides | Yes (nested) |
| **Integrations** | Third-party connections (future) | Yes |
| **Danger Zone** | Archive, delete workspace | Yes |

### 3.5 Dynamic Tab Behavior

When a module is enabled/disabled in Settings → Modules:

1. **Enable module** → Tab appears in workspace navigation
2. **Disable module** → Tab disappears from workspace navigation
3. Changes take effect immediately (after save)

**Example: Enabling Chat**

```
Before:  [📚 Docs]  [📊 Eval]  [🎤 Voice]  [⚙️ Settings]
                                              ↓
User enables Chat in Settings → Modules → Chat → [✓ Enabled]
                                              ↓
After:   [📚 Docs]  [📊 Eval]  [💬 Chat]  [🎤 Voice]  [⚙️ Settings]
```

### 3.6 Collapsed Default State

For cleaner UX, sections can default to collapsed:

```
┌─ General ───────────────────────────────────────────────────── [▶] ┐
└─────────────────────────────────────────────────────────────────────┘

┌─ Members ───────────────────────────────────────────────────── [▶] ┐
└─────────────────────────────────────────────────────────────────────┘

┌─ Modules ───────────────────────────────────────────────────── [▼] ┐  ← Expanded
│  ...module configuration content...                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Flows

### 4.1 Org Admin Disables a Module

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORG ADMIN FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Org Admin navigates to /admin/org/                              │
│  2. Clicks the Mgmt (Platform Management) admin card                │
│  3. On Mgmt admin page, clicks "Modules" tab                        │
│  4. Finds module-voice in the list                                  │
│  5. Toggles "Enabled" → [○ Disabled]                                │
│  6. Confirmation dialog:                                             │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  Disable module-voice?                                       │ │
│     │                                                              │ │
│     │  This will:                                                  │ │
│     │  • Hide Voice from navigation in all workspaces             │ │
│     │  • Disable Voice API access for this organization           │ │
│     │  • Affect 5 workspaces currently using this module          │ │
│     │                                                              │ │
│     │  Existing data will be preserved.                           │ │
│     │                                                              │ │
│     │  [Cancel]                             [Disable Module]       │ │
│     └─────────────────────────────────────────────────────────────┘ │
│  7. Module disabled → module-voice shows "Disabled" indicator       │
│  8. Workspaces refresh automatically                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Workspace Admin Customizes Config

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WORKSPACE ADMIN FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Workspace Admin clicks "Settings" tab (always last)             │
│  2. Expands "Modules" section                                        │
│  3. Expands module-kb configuration                                 │
│  4. Changes max_documents from 500 (org default) to 100             │
│  5. Validation:                                                      │
│     • Value must be ≤ org limit (500) ✓                             │
│     • Value must be > 0 ✓                                           │
│  6. Clicks [Save]                                                   │
│  7. Success toast: "Module configuration updated"                   │
│  8. WorkspacePluginProvider refreshes with new config               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Config Cascade Resolution

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONFIG RESOLUTION EXAMPLE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Config key: max_documents_per_workspace                            │
│                                                                      │
│  ┌─────────────────────┐                                            │
│  │ System Level        │  Value: 1000 (default)                     │
│  │ mgmt_cfg_sys_modules│                                            │
│  └─────────┬───────────┘                                            │
│            │ inherit                                                 │
│            ▼                                                         │
│  ┌─────────────────────┐                                            │
│  │ Org Level           │  Override: 500                             │
│  │ mgmt_cfg_org_modules│  (org wants lower limit)                   │
│  └─────────┬───────────┘                                            │
│            │ inherit                                                 │
│            ▼                                                         │
│  ┌─────────────────────┐                                            │
│  │ Workspace Level     │  Override: 100                             │
│  │ mgmt_cfg_ws_modules │  (ws wants even lower)                     │
│  └─────────┬───────────┘                                            │
│            │ resolve                                                 │
│            ▼                                                         │
│  ┌─────────────────────┐                                            │
│  │ Final Resolved      │  Value: 100                                │
│  │ Module Code Uses    │  (workspace override wins)                 │
│  └─────────────────────┘                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Real-Time Updates

### 5.1 Update Mechanism

When config changes at any level:

1. **Database Update** → `mgmt_cfg_*_modules` table updated
2. **API Response** → Next API call returns updated config
3. **Client Refresh** → WorkspacePluginProvider refreshes:
   - Polling: Every 60 seconds (configurable)
   - Or: WebSocket push (future enhancement)
4. **UI Update** → Navigation/features update immediately

### 5.2 Refresh Triggers

| Event | Trigger | Scope |
|-------|---------|-------|
| Org admin changes config | Immediate refresh | All org workspaces |
| WS admin changes config | Immediate refresh | Current workspace |
| System admin changes config | Immediate refresh | All orgs/workspaces |
| User navigates to workspace | Refresh on load | Current workspace |
| Polling interval | Background refresh | Current workspace |

---

## 6. Error States & Edge Cases

### 6.1 Module Disabled by Parent

```
┌──────────────────────────────────────────────────────────────┐
│  🎤 module-voice                                [N/A]        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ⚠️ This module is disabled by your organization.      │ │
│  │                                                         │ │
│  │  You cannot enable module-voice because it has been    │ │
│  │  disabled at the organization level. Contact your      │ │
│  │  organization administrator for access.                │ │
│  │                                                         │ │
│  │  Disabled by: Organization "Acme Corp"                 │ │
│  │  Disabled on: 2026-01-15                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Config Validation Error

```
┌──────────────────────────────────────────────────────────────┐
│  max_documents_per_workspace                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Org limit: 500                                        │ │
│  │  Your value: [1000       ]                             │ │
│  │                                                         │ │
│  │  ❌ Value exceeds organization limit (500)             │ │
│  │     Enter a value ≤ 500                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 Loading States

```
┌──────────────────────────────────────────────────────────────┐
│  Module Configuration                                        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  ◐ Loading module configuration...                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 7. Accessibility Requirements

All new UI components must meet WCAG 2.1 AA standards:

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard Navigation** | All controls accessible via Tab, Enter, Space |
| **Screen Reader** | ARIA labels on toggles, buttons, config inputs |
| **Color Contrast** | 4.5:1 minimum for text, 3:1 for large text |
| **Focus Indicators** | Visible focus ring on all interactive elements |
| **Error Announcements** | `aria-live="polite"` for validation errors |
| **Form Labels** | All inputs have associated `<label>` elements |

---

## 8. Component Summary

### New Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `ModulesTab` | `module-mgmt/frontend/components/admin/` | Org-level module management tab |
| `ModuleList` | `module-mgmt/frontend/components/admin/` | List all modules with toggles |
| `ModuleCard` | `module-mgmt/frontend/components/admin/` | Single module with expand/collapse |
| `ModuleConfigPanel` | `module-mgmt/frontend/components/admin/` | Config overrides when expanded |
| `ConfigOverrideEditor` | `packages/shared/module-config/` | Reusable config value editor |
| `FeatureFlagToggle` | `packages/shared/module-config/` | Feature flag toggle |
| `InheritanceIndicator` | `packages/shared/module-config/` | Cascade visualization |
| `WorkspaceSettingsModules` | `module-ws/frontend/components/` | Modules section in WS settings |
| `CollapsibleSection` | `packages/shared/ui/` | Expand/collapse section wrapper |

### Hooks to Create/Extend

| Hook | Changes |
|------|---------|
| `useModuleRegistry` | Add org config fetching |
| `useWorkspacePlugin` | Add resolved config access |
| `useOrgModuleConfig` | NEW - fetch/update org module config |
| `useWsModuleConfig` | NEW - fetch/update workspace module config |

---

## 9. Open Questions

1. **Config Override UI Complexity:** Should we support:
   - A) Simple key-value form (current design)
   - B) JSON editor for power users
   - C) Both with a toggle

2. **Audit Trail:** Should we show:
   - Who made the last config change
   - History of changes
   - Diff between current and parent config

---

## 10. Implementation Order

1. **Phase 1:** Database schema (tables + RLS)
2. **Phase 2:** Backend API endpoints (`/admin/org/mgmt/modules`)
3. **Phase 3a:** Org Admin Modules Tab (in module-mgmt)
4. **Phase 3b:** Workspace Settings → Modules section
5. **Phase 4:** Testing + documentation

---

## Appendix: Collapsible Section Component

```typescript
// CollapsibleSection.tsx - Reusable expand/collapse wrapper
interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon,
  defaultExpanded = false,
  children
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2, 
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' }
        }}
        role="button"
        aria-expanded={expanded}
      >
        {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{title}</Typography>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 2, pt: 0 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}