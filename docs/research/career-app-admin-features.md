# Career App Admin Features Research

**Date:** December 25, 2025  
**Source:** `~/code/sts/career/sts-career-stack/`  
**Purpose:** Document working admin feature implementations for comparison  
**Status:** Research Complete

---

## Executive Summary

The career app has a **different architecture** from the policy app:
- Uses **Tailwind CSS** (not MUI)
- Uses **TailwindUI** patterns
- Uses **NextAuth** for authentication
- Focus on **certification management**

**Key Difference:** The career app is domain-specific (certifications) while policy app has platform-wide RAG/AI features.

---

## Admin Routes Found

```
/admin/platform/page.tsx - Platform admin dashboard (tab-based)
/admin/certifications/page.tsx - Certification catalog
/admin/certifications/campaigns/page.tsx - Verification campaigns
/admin/certifications/campaigns/[id]/edit/page.tsx - Edit campaign
/admin/certifications/verifications/page.tsx - Verification management
```

---

## Platform Admin Dashboard Pattern

**File:** `/admin/platform/page.tsx`

### Key Characteristics

1. **Tab-Based Navigation**
   - Overview tab (dashboard)
   - Users tab (placeholder)
   - Organizations tab (working)

2. **Permission Checking**
```typescript
const hasGlobalAdminAccess = profile ? isGlobalAdmin(profile) : false;

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
  } else if (status === "authenticated" && !hasGlobalAdminAccess) {
    router.push("/");
  }
}, [status, hasGlobalAdminAccess, router]);
```

3. **Tailwind CSS Styling**
   - Dark mode support (`dark:` prefix)
   - Utility-first approach
   - No MUI components

4. **Card Grid Dashboard**
```typescript
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  {/* Stat cards */}
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Feature cards */}
</div>
```

---

## Comparison: Career vs Policy App

| Aspect | Career App | Policy App |
|--------|-----------|------------|
| **CSS Framework** | Tailwind CSS | Material-UI (MUI) |
| **Authentication** | NextAuth | Clerk |
| **Admin Focus** | Certifications | RAG/AI Providers |
| **Navigation** | Tabs | Tabs |
| **Layout** | Card Grid | Card Grid + Tables |
| **Permission Check** | `isGlobalAdmin()` | `global_role === "super_admin"` |
| **Dark Mode** | Built-in Tailwind | MUI theme |
| **Icons** | SVG inline | MUI Icons |

---

## Patterns **NOT** Found in Career App

❌ **Email Domain Management** - Not in career app  
❌ **RAG/AI Provider Management** - Not in career app  
❌ **Organization Domain Configuration** - Not in career app  

**Conclusion:** Career app doesn't have the features we need to implement for test7.

---

## Patterns **FOUND** and Reusable

### 1. Permission-Based Redirect Pattern

```typescript
useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
  } else if (status === "authenticated" && !hasGlobalAdminAccess) {
    router.push("/");
  }
}, [status, hasGlobalAdminAccess, router]);
```

**Reusable:** ✅ Yes - but toolkit uses MUI, not Tailwind

### 2. Unauthorized Access UI

Shows a nice error page with:
- Icon (red warning circle)
- Error title
- Error message
- Return home button

**Reusable:** ✅ Pattern can be adapted to MUI

### 3. Loading States

```typescript
if (status === "loading") {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Reusable:** ✅ Concept reusable with MUI CircularProgress

### 4. Tab Navigation

```typescript
const [activeTab, setActiveTab] = useState<"overview" | "users" | "organizations">("overview");

<nav className="-mb-px flex space-x-8">
  <button onClick={() => setActiveTab("overview")} className={...}>
    Overview
  </button>
  {/* ... */}
</nav>
```

**Reusable:** ✅ Similar to MUI Tabs component

### 5. Statistics Cards

```typescript
<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
  <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-6">
    <p className="text-xs text-gray-500 uppercase tracking-wide">
      Platform Status
    </p>
    <p className="mt-2 text-2xl font-semibold text-gray-900">
      Operational
    </p>
  </div>
</div>
```

**Reusable:** ✅ Same concept as MUI Card + Grid

### 6. Feature Cards with Actions

```typescript
<div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
    {/* Icon */}
  </div>
  <h3 className="text-lg font-semibold mb-2">Organizations</h3>
  <p className="text-sm mb-4">View and manage all organizations</p>
  <button onClick={() => setActiveTab("organizations")}>
    View Organizations
  </button>
</div>
```

**Reusable:** ✅ Concept reusable with MUI

---

## Key Takeaways for Test7 Implementation

### ✅ Reusable Concepts (Adapt to MUI)
1. Permission-based redirect pattern
2. Tab-based navigation
3. Card grid dashboard layout
4. Statistics cards
5. Feature cards with actions
6. Unauthorized access page
7. Loading states

### ❌ NOT Reusable (Different Tech Stack)
1. Tailwind CSS classes → Use MUI `sx` prop
2. Inline SVG icons → Use MUI Icons
3. Dark mode Tailwind classes → Use MUI theme
4. NextAuth → Already using NextAuth in toolkit

### 🎯 Policy App is Better Reference
For the **specific features** we need to implement:
- RAG Provider Management
- Email Domain Management  
- Organization Management

**Policy app is the better reference** because it has:
- MUI components (same as toolkit)
- Working RAG provider management
- Organization management table

Career app is useful for:
- Overall dashboard layout inspiration
- Permission patterns
- Tab navigation patterns

But **NOT** useful for specific domain management UIs.

---

## Recommendation

**For test7 implementation:**
1. **Use policy app patterns** for:
   - RAG provider management components
   - Organization/domain management
   - MUI component usage
   - Table layouts

2. **Use career app patterns** for:
   - Overall dashboard layout inspiration
   - Permission redirect logic
   - Tab navigation structure

3. **Combine both** for:
   - Platform admin dashboard (career app layout + policy app MUI)
   - Permission checks (career app pattern + policy app role names)

---

**Research Complete**  
**Primary Reference:** Policy App (MUI + specific features)  
**Secondary Reference:** Career App (dashboard layout + patterns)  
**Next:** Create design standards based on policy app findings
