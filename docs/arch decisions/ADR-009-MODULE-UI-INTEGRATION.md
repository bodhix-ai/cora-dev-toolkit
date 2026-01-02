# ADR-009: Module UI Integration System

**Status:** Implemented  
**Date:** January 2, 2026  
**Authors:** CORA Development Team  
**Related:** Session 62, ADR-007 (Auth Shell), ADR-008 (Sidebar & Org Selector)

---

## Context

With the implementation of the CORA Module Registry (Phases 1-3), modules can be dynamically added to projects via configuration. However, modules were invisible in the UI:

- **Navigation:** Sidebar had hardcoded navigation items - no way for modules to appear automatically
- **Admin Pages:** Platform/Org admin pages had hardcoded admin cards imported directly from modules
- **Discoverability:** Users couldn't find or access newly added functional modules

This created a disconnect between the backend (module registry, config merging) and frontend (hardcoded UI elements).

---

## Decision

Implement a **dynamic module UI integration system** that:

1. **Reads module configurations from merged YAML file** at runtime
2. **Builds navigation dynamically** based on module configs
3. **Builds admin cards dynamically** based on module configs
4. **Uses Server Components** to load configs and pass to Client Components
5. **Maps string icon names** from YAML to React icon components

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Project Creation                         │
│  create-cora-project.sh                                     │
│  ├─ Copies modules (core + functional)                      │
│  ├─ Merges module.config.yaml files                         │
│  └─ Creates: apps/web/config/cora-modules.config.yaml       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Runtime (Server-Side)                      │
│  app/layout.tsx (Server Component)                          │
│  ├─ buildNavigationConfig()                                 │
│  │  ├─ loadModuleConfig() → reads YAML                      │
│  │  ├─ Filters: navigation.show_in_main_nav = true          │
│  │  ├─ Maps icons: string → React component                 │
│  │  └─ Returns: NavigationConfig                            │
│  └─ Passes to AppShell as prop                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Runtime (Client-Side)                      │
│  components/Sidebar.tsx (Client Component)                  │
│  ├─ Receives navigation prop                                │
│  ├─ Maps through sections and items                         │
│  └─ Renders MUI List with navigation items                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 Admin Cards (Server-Side)                   │
│  app/admin/platform/page.tsx (Server Component)             │
│  ├─ getPlatformAdminCards()                                 │
│  │  ├─ loadModuleConfig() → reads YAML                      │
│  │  ├─ Filters: admin_card.enabled = true                   │
│  │  ├─ Filters by context: "platform"                       │
│  │  ├─ Sorts by priority                                    │
│  │  └─ Returns: AdminCardConfig[]                           │
│  └─ Renders cards in grid                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Module Configuration (YAML)

Each module defines UI metadata in `module.config.yaml`:

```yaml
module_ws:
  display_name: "Workspace Management"
  
  # Navigation configuration (optional)
  navigation:
    label_singular: "Workspace"
    label_plural: "Workspaces"
    icon: "WorkspaceIcon"
    show_in_main_nav: true
    nav_priority: 10
  
  # Admin card configuration (optional)
  admin_card:
    enabled: true
    path: "/admin/workspaces"
    title: "Workspace Management"
    description: "Manage workspaces, members, and configurations"
    icon: "WorkspaceIcon"
    priority: 40
    context: "platform"  # or "organization" or omit for both
```

**Key Fields:**
- `navigation.show_in_main_nav`: Controls visibility in left nav
- `admin_card.enabled`: Controls visibility in admin pages
- `admin_card.context`: Filters admin cards by page type
- `priority`: Lower number = higher priority (ordering)

### 2. Config Merging (Build Time)

Project creation script merges all module configs:

```bash
# create-cora-project.sh
merge_module_configs() {
  # Reads templates/_modules-core/*/module.config.yaml
  # Reads templates/_modules-functional/*/module.config.yaml
  # Merges into: apps/web/config/cora-modules.config.yaml
}
```

**Result:** Single consolidated config file with all module metadata.

### 3. Module Registry Loader (Runtime)

**File:** `apps/web/lib/moduleRegistry.ts`

**Functions:**

```typescript
// Load and parse merged YAML config
function loadModuleConfig(): MergedModuleConfig {
  const configPath = path.join(process.cwd(), "config", "cora-modules.config.yaml");
  const fileContent = fs.readFileSync(configPath, "utf8");
  return yaml.load(fileContent) as MergedModuleConfig;
}

// Build navigation from configs
export function buildNavigationConfig(): NavigationConfig {
  const moduleConfig = loadModuleConfig();
  const navItems = [
    { id: "dashboard", label: "Dashboard", href: "/", icon: getIcon("Dashboard") }
  ];
  
  Object.entries(moduleConfig).forEach(([moduleName, config]) => {
    if (config.navigation?.show_in_main_nav) {
      navItems.push({
        id: moduleName.replace("module_", ""),
        label: config.navigation.label_plural || config.display_name,
        href: `/${moduleName.replace("module_", "")}`,
        icon: getIcon(config.navigation.icon),
      });
    }
  });
  
  return [{ id: "main", label: "Main", order: 0, items: navItems }];
}

// Build admin cards for specific context
export function buildAdminCards(context: "platform" | "organization"): AdminCardConfig[] {
  const moduleConfig = loadModuleConfig();
  const adminCards = [];
  
  Object.entries(moduleConfig).forEach(([moduleName, config]) => {
    if (config.admin_card?.enabled && 
        (!config.admin_card.context || config.admin_card.context === context)) {
      adminCards.push({
        id: moduleName.replace("module_", ""),
        title: config.admin_card.title,
        description: config.admin_card.description,
        icon: getIcon(config.admin_card.icon),
        href: config.admin_card.path,
        context,
        order: config.admin_card.priority || 999,
      });
    }
  });
  
  return adminCards.sort((a, b) => (a.order || 999) - (b.order || 999));
}
```

### 4. Icon Mapping

**File:** `apps/web/lib/iconMap.tsx`

Maps string icon names to React components:

```typescript
import DashboardIcon from "@mui/icons-material/Dashboard";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import ShieldIcon from "@mui/icons-material/Shield";

export const iconMap: Record<string, ReactNode> = {
  Dashboard: <DashboardIcon />,
  Shield: <ShieldIcon />,
  WorkspaceIcon: <WorkspacesIcon />,
  // ... more icons
};

export function getIcon(iconName: string | undefined): ReactNode {
  return iconMap[iconName] || <DashboardIcon />;
}
```

**Rationale:** YAML can only store strings, not JSX. Icon map provides type-safe mapping.

### 5. Navigation Integration

**Layout (Server Component):**
```typescript
// app/layout.tsx
export default async function RootLayout({ children }) {
  const session = await auth();
  const navigation = buildNavigationConfig(); // Server-side FS read
  
  return (
    <AuthProvider session={session}>
      <AppShell navigation={navigation}>{children}</AppShell>
    </AuthProvider>
  );
}
```

**AppShell (Client Component):**
```typescript
// components/AppShell.tsx
interface AppShellProps {
  navigation: NavigationConfig;
}

export default function AppShell({ children, navigation }: AppShellProps) {
  // ... auth checks
  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar navigation={navigation} />
      <Box component="main">{children}</Box>
    </Box>
  );
}
```

**Sidebar (Client Component):**
```typescript
// components/Sidebar.tsx
export function Sidebar({ navigation }: { navigation: NavigationConfig }) {
  return (
    <List>
      {navigation.flatMap((section) =>
        section.items.map((item) => (
          <ListItem key={item.href}>
            <ListItemButton onClick={() => router.push(item.href)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))
      )}
    </List>
  );
}
```

### 6. Admin Cards Integration

**Platform Admin (Server Component):**
```typescript
// app/admin/platform/page.tsx
export default function PlatformAdminPage() {
  const adminCards = getPlatformAdminCards(); // Server-side
  
  return (
    <Grid container spacing={3}>
      {adminCards.map((card) => (
        <Grid item xs={12} sm={6} md={4} key={card.id}>
          <Card>
            <CardActionArea component={Link} href={card.href}>
              <CardContent>
                <Box sx={{ color: card.color || "primary.main" }}>
                  {card.icon}
                </Box>
                <Typography variant="h5">{card.title}</Typography>
                <Typography variant="body2">{card.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
```

**Organization Admin:** Same pattern using `getOrganizationAdminCards()`.

---

## Technical Decisions

### Server Components vs Client Components

**Decision:** Load configs in Server Components, pass to Client Components as props.

**Rationale:**
- **Server Components** can use Node.js `fs` module
- YAML parsing happens once per request on server
- No client bundle bloat from YAML parser
- Better performance (no client-side file reading)
- Security: Config file not exposed to client

**Trade-offs:**
- ✅ Better performance
- ✅ Smaller client bundle
- ✅ More secure
- ❌ Navigation not dynamically updateable without page refresh
  - **Acceptable:** Navigation rarely changes during a session

### YAML Config vs Code Exports

**Decision:** Use YAML for module metadata, not JavaScript/TypeScript exports.

**Alternatives Considered:**
```typescript
// Alternative: Code exports
export const navigation: NavItemConfig = {
  href: "/workspaces",
  label: "Workspaces",
  icon: <WorkspaceIcon />,
};
```

**Why YAML Chosen:**
- ✅ Separation of concerns (config vs code)
- ✅ Easier to modify without touching code
- ✅ Single source of truth (merged config file)
- ✅ Build-time merging simplifies runtime
- ✅ No dynamic imports required
- ❌ Requires icon string mapping (not a React component)

### Icon String Mapping

**Decision:** Store icon names as strings in YAML, map to React components in code.

**Rationale:**
- YAML cannot store React components (JSX)
- Icon map centralizes icon management
- Easy to add new icons as needed
- Type-safe with TypeScript
- Icon imports only loaded once

**Example:**
```yaml
# module.config.yaml
icon: "WorkspaceIcon"
```
```typescript
// iconMap.tsx
WorkspaceIcon: <WorkspacesIcon />
```

### Context-Based Admin Cards

**Decision:** Use `context: "platform" | "organization"` field in admin card config.

**Rationale:**
- Some modules are platform-level only (e.g., module-mgmt)
- Some modules are org-level only
- Some apply to both (when context omitted)
- Flexible filtering at runtime

**Example:**
```yaml
# Platform only
admin_card:
  context: "platform"

# Organization only
admin_card:
  context: "organization"

# Both (omit context)
admin_card:
  enabled: true
  # no context = shows on both pages
```

---

## Data Flow

### Navigation Loading

```
1. User requests page
   ↓
2. layout.tsx (Server Component)
   - Calls buildNavigationConfig()
   - Reads apps/web/config/cora-modules.config.yaml
   - Parses YAML
   - Filters modules with show_in_main_nav: true
   - Maps icon strings to React components
   - Returns NavigationConfig
   ↓
3. AppShell (Client Component)
   - Receives navigation as prop
   - Passes to Sidebar
   ↓
4. Sidebar (Client Component)
   - Receives navigation as prop
   - Maps through items
   - Renders MUI List
```

### Admin Cards Loading

```
1. User navigates to /admin/platform
   ↓
2. page.tsx (Server Component)
   - Calls getPlatformAdminCards()
   - Reads apps/web/config/cora-modules.config.yaml
   - Parses YAML
   - Filters modules with admin_card.enabled: true
   - Filters by context: "platform"
   - Sorts by priority
   - Returns AdminCardConfig[]
   ↓
3. page.tsx (Server Component)
   - Maps through admin cards
   - Renders Grid of Cards
```

---

## Module Author Guide

### Adding Navigation to Your Module

1. **Edit `module.config.yaml`:**
```yaml
module_mymodule:
  display_name: "My Module"
  navigation:
    label_singular: "Item"
    label_plural: "Items"
    icon: "Folder"  # Must be in iconMap.tsx
    show_in_main_nav: true
    nav_priority: 20
```

2. **Add icon to iconMap.tsx** (if needed):
```typescript
import FolderIcon from "@mui/icons-material/Folder";

export const iconMap = {
  // ...
  Folder: <FolderIcon />,
};
```

3. **Create route:** `app/mymodule/page.tsx`

4. **Done!** Navigation appears automatically.

### Adding Admin Cards to Your Module

1. **Edit `module.config.yaml`:**
```yaml
module_mymodule:
  admin_card:
    enabled: true
    path: "/admin/mymodule"
    title: "My Module Settings"
    description: "Manage my module configuration"
    icon: "Folder"
    priority: 50  # Lower = higher priority
    context: "platform"  # or "organization" or omit for both
```

2. **Create admin page:** `app/admin/mymodule/page.tsx`

3. **Done!** Admin card appears automatically.

---

## Benefits

### For Developers
- ✅ No manual navigation updates when adding modules
- ✅ No manual admin card imports
- ✅ Centralized configuration in YAML
- ✅ Plug-and-play module system

### For Module Authors
- ✅ Self-describing modules via config
- ✅ No frontend code changes required for integration
- ✅ Control UI presence via config flags
- ✅ Consistent UX across all modules

### For Users
- ✅ Consistent navigation across all CORA apps
- ✅ Discoverable modules in admin pages
- ✅ Clean, organized admin interface
- ✅ Professional appearance with proper icons

---

## Future Enhancements

### 1. Permission-Based Visibility
```yaml
navigation:
  required_permissions: ["ws.view"]
admin_card:
  required_roles: ["platform_admin"]
```

### 2. Badge Support
```yaml
navigation:
  badge_api: "/api/ws/unread-count"
```

### 3. Navigation Sections
```yaml
navigation:
  section: "workspaces"
  section_priority: 20
```

### 4. Collapsible Sections
Expandable/collapsible navigation groups.

### 5. Module Search
Searchable navigation palette (Cmd+K).

### 6. Favorites/Pinning
User-specific pinned modules.

---

## Related Documents

- **ADR-007:** CORA Auth Shell Standard (AppShell pattern)
- **ADR-008:** Sidebar and Org Selector Standard
- **Plan:** `docs/plans/plan_module-ui-integration.md`
- **Guide:** `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`

---

## Implementation

**Status:** ✅ Implemented (Session 62, January 2, 2026)

**Files:**
- `apps/web/lib/moduleRegistry.ts` - Core loader
- `apps/web/lib/iconMap.tsx` - Icon mapping
- `apps/web/components/Sidebar.tsx` - Dynamic navigation
- `apps/web/components/AppShell.tsx` - Navigation pass-through
- `apps/web/app/layout.tsx` - Server-side loading
- `apps/web/app/admin/platform/page.tsx` - Dynamic admin cards
- `apps/web/app/admin/org/page.tsx` - Dynamic admin cards

**Dependencies:**
- `js-yaml: ^4.1.0` - YAML parsing
- `@types/js-yaml: ^4.0.9` - TypeScript definitions

---

## Success Metrics

- ✅ Module-ws appears in navigation automatically
- ✅ Module-ws admin cards appear automatically
- ✅ Zero code changes needed to add modules
- ✅ Consistent UX across all modules
- ✅ ~400 lines of reusable infrastructure code
- ✅ Template TypeScript types complete
- ✅ Documentation complete
