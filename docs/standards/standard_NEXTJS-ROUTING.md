# CORA Next.js Routing Standard

**Status:** ✅ ACTIVE  
**Version:** 1.0  
**Created:** January 19, 2026  
**Last Updated:** January 19, 2026

---

## Overview

This document defines the standard pattern for organizing and deploying Next.js App Router routes in CORA projects. It explains:
- **CORA's flat routing pattern** (no nested dynamic routes)
- How module routes are organized in templates
- How routes are copied during project creation
- Route group conventions for workspace-scoped features
- Troubleshooting route 404 issues

---

## 🚨 CRITICAL: CORA Flat Routing Pattern

**CORA uses FLAT routes, NOT nested dynamic routes.**

### ✅ Correct Pattern (Flat Routes)

All detail pages are at the **root level** of the app:

```
app/
├── eval/
│   ├── [id]/page.tsx      ✅ /eval/:id
│   └── page.tsx           ✅ /eval (list)
├── voice/
│   ├── [id]/page.tsx      ✅ /voice/:id
│   └── page.tsx           ✅ /voice (list)
├── ws/
│   ├── [id]/page.tsx      ✅ /ws/:id
│   └── page.tsx           ✅ /ws (list)
└── admin/
    └── org/
        └── ws/
            └── [id]/page.tsx  ✅ /admin/org/ws/:id
```

### ❌ Anti-Pattern (Nested Dynamic Routes - DO NOT USE)

```
app/
└── ws/
    └── [id]/
        └── eval/
            └── [evalId]/page.tsx  ❌ /ws/:id/eval/:evalId - NOT USED IN CORA
```

**Why This Fails:**
- Next.js will compile the parent but **silently ignore the nested route**
- Results in 404 errors with no compilation warnings
- No other CORA routes follow this pattern

### Correct Alternative

Instead of `/ws/[id]/eval/[evalId]`, use:
- **Flat route:** `/eval/[id]` at root level
- **Context passing:** Use query params or state for workspace context

**Example:**
```typescript
// ✅ CORRECT: Link to flat route with context
router.push(`/eval/${evalId}?workspace=${workspaceId}`)

// ❌ WRONG: Link to nested dynamic route (causes 404)
router.push(`/ws/${workspaceId}/eval/${evalId}`)
```

---

## Route Organization in Templates

### Module Route Structure

Each CORA module can provide routes that are copied to the Next.js app during project creation.

**Template Structure:**
```
templates/
└── _modules-*/
    └── module-{name}/
        └── routes/          # ← Routes provided by this module
            ├── admin/       # Admin-only routes
            └── {feature}/   # User-facing feature routes
```

**Example - module-ws routes:**
```
templates/_modules-functional/module-ws/routes/
├── admin/
│   ├── org/ws/[id]/page.tsx    # Org admin workspace detail
│   ├── org/ws/page.tsx         # Org admin workspace list
│   ├── sys/ws/page.tsx         # System admin workspaces
│   └── workspaces/page.tsx     # Admin workspaces (legacy)
└── ws/
    ├── [id]/
    │   ├── eval/[evalId]/page.tsx  # Workspace evaluation detail
    │   └── page.tsx                # Workspace detail
    └── page.tsx                    # Workspace list
```

### Route File Requirements

All route files MUST:
1. Be valid Next.js App Router route files (`page.tsx`, `layout.tsx`, etc.)
2. Use `"use client"` directive if they use client-side React features
3. Use placeholder `@{{PROJECT_NAME}}/module-name` for imports
4. Export a default component

**Example Route File:**
```tsx
"use client";

import { useParams } from "next/navigation";
import { WorkspaceDetailPage } from "@{{PROJECT_NAME}}/module-ws";

export default function WorkspaceDetailRoute() {
  const params = useParams();
  const workspaceId = params.id as string;
  
  return <WorkspaceDetailPage workspaceId={workspaceId} />;
}
```

---

## Project Creation - Route Deployment

### How Routes Are Copied

During project creation, `scripts/create-cora-project.sh` copies routes from templates to the project:

**Source:**
```bash
routes_dir="${MODULE_TEMPLATE}/routes"
# Example: templates/_modules-functional/module-ws/routes/
```

**Destination:**
```bash
app_routes_dir="${STACK_DIR}/apps/web/app"
# Example: my-app-stack/apps/web/app/
```

**Copy Process:**
1. Preserves relative path structure
2. Creates necessary parent directories
3. Replaces `{{PROJECT_NAME}}` with actual project name
4. Logs each created route

**Code Reference (create-cora-project.sh lines 1130-1150):**
```bash
if [[ -d "$routes_dir" ]]; then
  find "$routes_dir" -name "*.tsx" -o -name "*.ts" | while read -r route_file; do
    relative_path="${route_file#$routes_dir/}"
    target_dir="${app_routes_dir}/$(dirname "$relative_path")"
    
    mkdir -p -- "$target_dir"
    cp -- "$route_file" "$target_dir/"
    
    target_file="${target_dir}/$(basename "$route_file")"
    sed -i '' "s/{{PROJECT_NAME}}/${PROJECT_NAME}/g" "$target_file"
  done
fi
```

### Route Mapping Examples

| Template Path | Project Path |
|---------------|--------------|
| `module-ws/routes/ws/page.tsx` | `app/ws/page.tsx` |
| `module-ws/routes/ws/[id]/page.tsx` | `app/ws/[id]/page.tsx` |
| `module-ws/routes/ws/[id]/eval/[evalId]/page.tsx` | `app/ws/[id]/eval/[evalId]/page.tsx` |
| `module-ws/routes/admin/org/ws/page.tsx` | `app/admin/org/ws/page.tsx` |

**Key Point:** The mapping is **1:1 relative path preservation**. Route groups are NOT automatically added.

---

## Route Groups (Optional Enhancement)

### What Are Route Groups?

Next.js route groups use parentheses `(group-name)` to organize routes without affecting the URL path.

**Example:**
```
app/
├── (workspace)/        # ← Route group (not in URL)
│   └── ws/
│       └── [id]/
│           └── page.tsx   # URL: /ws/:id
└── (admin)/
    └── admin/
        └── page.tsx       # URL: /admin
```

### When to Use Route Groups

Route groups are beneficial for:
- **Shared Layouts:** Different layout for workspace vs admin pages
- **Code Organization:** Grouping related routes together
- **Conditional Rendering:** Different auth requirements per group

### Current CORA Practice (Undocumented)

Some CORA projects use route groups, but this is **NOT standardized** in templates:

**Observed Pattern:**
- Workspace-scoped routes → `app/(workspace)/ws/...`
- Admin routes → `app/(admin)/admin/...`
- Public routes → `app/(public)/...`

**Problem:** Templates don't include route groups, so they must be added manually or via project-specific configuration.

---

## Troubleshooting Route 404 Errors

### Issue: Nested Route Returns 404

**Symptoms:**
- Parent route works: `/ws/123` ✅
- Nested route fails: `/ws/123/eval/456` ❌

**Root Cause:** Next.js requires a `page.tsx` at EVERY route level.

**Example Problem:**
```
app/
└── ws/
    └── [id]/
        └── eval/
            └── [evalId]/
                └── page.tsx   # ❌ Missing parent page.tsx!
```

**Solution:** Add the parent route:
```
app/
└── ws/
    └── [id]/
        ├── page.tsx          # ✅ Required!
        └── eval/
            └── [evalId]/
                └── page.tsx
```

### Issue: Route Group Mismatch

**Symptoms:**
- Parent route with route group works: `(workspace)/ws/[id]/page.tsx` ✅
- Nested route without route group fails: `ws/[id]/eval/[evalId]/page.tsx` ❌

**Root Cause:** Route must be in SAME route group as parent.

**Solution:** Ensure consistent route group usage:
```
app/
└── (workspace)/
    └── ws/
        └── [id]/
            ├── page.tsx                # ✅ Both in (workspace) group
            └── eval/
                └── [evalId]/
                    └── page.tsx        # ✅
```

### Issue: Template Route Not Copied

**Symptoms:**
- Route exists in template ✅
- Route missing in project after creation ❌

**Debugging Steps:**
1. Verify route exists in template:
   ```bash
   find templates/_modules-functional/module-ws/routes -name "page.tsx"
   ```

2. Check if module is enabled in project config:
   ```yaml
   # setup.config.yaml
   modules:
     enabled:
       - module-ws  # ← Must be listed
   ```

3. Check project creation logs for route copying confirmation:
   ```
   [INFO]     ✅ Created route: /ws/[id]
   ```

4. Manually verify route in project:
   ```bash
   ls -la my-app-stack/apps/web/app/ws/[id]/page.tsx
   ```

---

## Syncing Route Fixes to Existing Projects

### Using sync-fix-to-project.sh

The `sync-fix-to-project.sh` script handles route syncing from templates to existing projects.

**Important:** Route files with brackets `[id]` require special handling due to shell glob patterns.

**Current Script Behavior:**
```bash
# Search uses wildcards - brackets can cause issues
find templates/ -path "*${TEMPLATE_FILE}*"
```

**Workaround - Search Without Brackets:**
```bash
# Instead of: ws/[id]/page.tsx
# Use partial path: module-ws/routes/ws

./scripts/sync-fix-to-project.sh ~/path/to/project-stack "module-ws/routes/ws"
# Returns multiple matches - then specify more context
```

**Future Enhancement:** Script should handle bracket escaping automatically.

---

## Proposed Standard for Route Groups

### Recommendation

**Option A: No Route Groups (Current State)**
- ✅ Simple, matches template structure exactly
- ✅ No manual intervention needed
- ❌ Less organized for large projects
- ❌ Harder to apply different layouts

**Option B: Standardized Route Groups (Proposed)**
- ✅ Better code organization
- ✅ Enables layout-based auth and theming
- ❌ Requires template updates
- ❌ Requires project creation script changes

### Proposed Convention (if adopting route groups)

| Route Type | Route Group | Example |
|------------|-------------|---------|
| Workspace features | `(workspace)` | `(workspace)/ws/[id]/page.tsx` |
| Admin pages | `(admin)` | `(admin)/admin/org/ws/page.tsx` |
| Public pages | `(public)` | `(public)/login/page.tsx` |
| API routes | N/A | `api/auth/[...nextauth]/route.ts` |

**Implementation Steps:**
1. Update templates to include route groups in path:
   ```
   templates/_modules-functional/module-ws/routes/
   └── (workspace)/
       └── ws/
           └── [id]/
               └── page.tsx
   ```

2. Update `create-cora-project.sh` to preserve `(group)` directories

3. Document route group usage in module development guide

---

## Standard Requirements

### For Module Developers

When creating routes for a CORA module:

1. ✅ **DO** place routes in `module-{name}/routes/` directory
2. ✅ **DO** use relative paths that match desired URL structure
3. ✅ **DO** use `@{{PROJECT_NAME}}/module-name` for imports
4. ✅ **DO** provide `page.tsx` at EVERY route level (not just leaves)
5. ✅ **DO** use `"use client"` directive when needed
6. ❌ **DON'T** hardcode project names in routes
7. ❌ **DON'T** assume route groups exist (until standardized)

### For Project Creators

When creating a new CORA project:

1. ✅ **DO** use `--with-core-modules` flag (required for routes)
2. ✅ **DO** verify routes were copied after creation
3. ✅ **DO** check browser console for 404 errors
4. ✅ **DO** ensure parent routes exist for nested routes
5. ❌ **DON'T** manually add routes - use templates
6. ❌ **DON'T** modify route structure without documenting

---

## Future Enhancements

### Priority 1: Fix sync-fix-to-project.sh

The sync script needs to handle bracket characters in filenames:

```bash
# Escape brackets before find command
ESCAPED_FILE=$(echo "$TEMPLATE_FILE" | sed 's/\[/\\[/g' | sed 's/\]/\\]/g')
FOUND_FILES=$(find "${TOOLKIT_ROOT}/templates" -type f -path "*${ESCAPED_FILE}*")
```

### Priority 2: Route Group Standardization

Decision needed:
- Adopt route groups as standard?
- Update templates accordingly?
- Document migration path for existing projects?

### Priority 3: Route Validation

Add to `cora-validate.py`:
- Check all nested routes have parent `page.tsx`
- Verify route imports use correct placeholders
- Validate route group consistency

---

## References

- **Next.js App Router:** https://nextjs.org/docs/app/building-your-application/routing
- **Route Groups:** https://nextjs.org/docs/app/building-your-application/routing/route-groups
- **Dynamic Routes:** https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- **CORA Project Setup:** `docs/guides/guide_cora-project-setup.md`
- **Implementation:** `scripts/create-cora-project.sh` (lines 1130-1150)

---

## Document Status

**Current Issues:**
1. ⚠️ Route groups not standardized in templates
2. ⚠️ sync-fix-to-project.sh doesn't handle brackets properly
3. ⚠️ No validation for parent route existence

**Proposed Next Steps:**
1. Discuss route group adoption with team
2. Update sync script with bracket handling
3. Add route validation to toolkit

**Document Maintainer:** CORA Dev Toolkit Team  
**Last Review:** January 19, 2026
