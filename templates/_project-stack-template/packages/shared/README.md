# Shared Package

Shared types and utilities for the CORA application.

## Workspace Plugin

The workspace plugin package provides a contract between the workspace host (module-ws) and workspace-aware plugin modules (kb, chat, eval, voice).

### Architecture

This implements a **composition pattern** where:
- **apps/web** acts as the composition layer
- **module-ws** is the workspace host that provides workspace data
- **Plugin modules** (kb, chat, eval, voice) consume workspace context without importing module-ws directly

This eliminates cross-module TypeScript type-checking issues and creates clear architectural boundaries.

### Usage

#### In apps/web (Composition Layer)

```tsx
// app/ws/[id]/layout.tsx
import { WorkspacePluginProvider } from '@/components/WorkspacePluginProvider';
import { useWorkspace, useWorkspaceConfig } from '@{{PROJECT_NAME}}/module-ws';

export default function WorkspaceLayout({ children, params }) {
  const { workspace } = useWorkspace(params.id);
  const { config } = useWorkspaceConfig();

  return (
    <WorkspacePluginProvider
      workspaceId={params.id}
      workspace={workspace}
      navigation={{
        labelSingular: config.navLabelSingular,
        labelPlural: config.navLabelPlural,
        icon: config.navIcon,
      }}
      features={{
        favoritesEnabled: config.enableFavorites,
        tagsEnabled: config.enableTags,
        colorCodingEnabled: config.enableColorCoding,
      }}
      userRole={workspace.userRole}
    >
      {children}
    </WorkspacePluginProvider>
  );
}
```

#### In Plugin Modules

```tsx
// packages/module-eval/frontend/pages/MyPage.tsx
import { useWorkspacePlugin } from '@{{PROJECT_NAME}}/shared/workspace-plugin';

export function MyPage() {
  const { workspaceId, navigation, features, userRole } = useWorkspacePlugin();

  return (
    <div>
      <h1>{navigation.labelSingular} Evaluations</h1>
      <p>Workspace: {workspaceId}</p>
      {features.favoritesEnabled && <FavoritesButton />}
    </div>
  );
}
```

### API

#### WorkspacePluginContext

```typescript
interface WorkspacePluginContext {
  workspaceId: string;
  workspace?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  navigation: {
    labelSingular: string;
    labelPlural: string;
    icon: string;
  };
  features: {
    favoritesEnabled: boolean;
    tagsEnabled: boolean;
    colorCodingEnabled: boolean;
  };
  userRole?: 'ws_owner' | 'ws_admin' | 'ws_user';
}
```

#### WorkspacePluginContextValue

Extends `WorkspacePluginContext` with additional runtime properties:

```typescript
interface WorkspacePluginContextValue extends WorkspacePluginContext {
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
```

### Benefits

- ✅ **Type Safety** - No cross-module type-checking failures
- ✅ **Clear Boundaries** - Explicit host/plugin relationship
- ✅ **Easy Testing** - Plugins can be tested with mock context
- ✅ **Maintainable** - Easy to add new workspace-aware modules
- ✅ **Standards Compliant** - Aligns with CORA module isolation principles

## License

Proprietary