# CORA Toolkit Updates: Admin Card Registry Pattern

**Date:** November 11, 2025  
**Purpose:** Document toolkit changes to support the Admin Card Registry Pattern

---

## Summary

The CORA toolkit has been updated to support the **Admin Card Registry Pattern**, which allows modules to contribute platform-level administrative features to the `/admin` dashboard without modifying core admin code.

This pattern enables a plugin-style architecture where modules export admin card configurations that are automatically discovered and displayed on the admin dashboard.

---

## Files Added

### 1. `templates/_module-template/frontend/adminCard.tsx`

**Purpose:** Template file for creating platform admin cards in new modules.

**Content:**

- Provides example `AdminCardConfig` export
- Includes comprehensive JSDoc comments explaining when to use admin cards
- Shows proper icon import and configuration
- Demonstrates display order conventions

**Usage:** Module developers can copy and customize this file when their module needs platform-level admin features.

---

## Files Modified

### 2. `docs/frontend.md`

**Changes:**

- Added new section: "Platform Admin Card Registry Pattern" (inserted before "Barrel Exports")
- Documented when to use admin cards vs. regular navigation
- Provided complete implementation guide with 4 steps:
  1. Create adminCard.tsx
  2. Export from module index
  3. Create the admin page
  4. Register in admin dashboard
- Included display order conventions (0-9: critical, 10-19: org, 20-29: AI/ML, etc.)
- Added clear examples and anti-patterns
- Updated barrel export example to show optional admin card export

**Impact:** Frontend developers now have complete guidance on creating admin cards.

### 3. `pm-app-stack/design-wip/CORA/docs/AI-MODULE-DEVELOPMENT-GUIDE.md`

**Changes:**

- Added new "Step 7: (OPTIONAL) Add Platform Admin Card" to the complete example workflow
- Included code example showing admin card creation for skills module
- Added "When to create admin cards" checklist
- Referenced the comprehensive admin-card-registry-pattern.md documentation

**Impact:** AI assistants and developers following the guide now know when and how to create admin cards.

---

## Related Documentation Created (Outside Toolkit)

### `pm-app-stack/docs/architecture/admin-card-registry-pattern.md`

Complete architectural documentation for the pattern including:

- Overview and when to use
- Type definitions (`AdminCardConfig`)
- Module implementation steps
- Admin dashboard integration
- Display order conventions
- Permission levels
- Complete working example (AI Enablement module)
- Benefits, anti-patterns, and future enhancements

### `pm-app-stack/packages/shared-types/src/index.ts`

Added TypeScript types:

```typescript
export interface AdminCardConfig {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  color: string;
  superAdminOnly?: boolean;
  order?: number;
}

export type AdminCardsConfig = AdminCardConfig[];
```

---

## Implementation Example

The **ai-enablement-module** serves as the reference implementation:

**Files Created:**

1. `packages/ai-enablement-module/frontend/adminCard.tsx` - Admin card config
2. `apps/web/app/admin/ai-providers/page.tsx` - Admin page component

**Files Modified:**

1. `packages/ai-enablement-module/frontend/index.ts` - Exports admin card
2. `apps/web/app/admin/page.tsx` - Imports and displays admin card

**Result:** Super admins see an "AI Providers" card on the `/admin` dashboard that links to `/admin/ai-providers` for platform-level provider management.

---

## Display Order Convention

Standardized order ranges for organizing admin cards:

| Range | Purpose                                         |
| ----- | ----------------------------------------------- |
| 0-9   | Reserved for critical platform features         |
| 10-19 | Organization management and core admin features |
| 20-29 | AI/ML platform features (AI providers, configs) |
| 30-39 | Performance and monitoring                      |
| 40-49 | Content and media management                    |
| 50-99 | Additional platform services                    |
| 100+  | Experimental or temporary features              |

**Example:** AI Enablement module uses `order: 15` to appear between Organizations (10) and RAG Providers (20).

---

## When to Use Admin Cards

✅ **Use admin cards for:**

- Platform-level features (affect all organizations)
- Super admin only features
- Global configuration or management
- Platform analytics and monitoring

❌ **Do NOT use admin cards for:**

- Organization-level features (use regular navigation)
- User-facing features (use navigation links)

---

## Migration Path for Existing Modules

If you have an existing module that needs platform-level admin features:

1. **Create** `frontend/adminCard.tsx` using the template
2. **Customize** the card configuration (id, title, description, icon, href, order)
3. **Export** from `frontend/index.ts`
4. **Create** the admin page at `apps/web/app/admin/your-feature/page.tsx`
5. **Register** in `apps/web/app/admin/page.tsx` by adding to `moduleAdminCards` array

---

## Breaking Changes

**None.** This is an additive change. Existing modules continue to work without modification.

Modules can opt-in to the admin card pattern by:

- Creating an `adminCard.tsx` file
- Exporting it from their frontend index

---

## Testing

To verify your admin card implementation:

1. **Build the module:**

   ```bash
   pnpm build
   ```

2. **Start dev server:**

   ```bash
   pnpm dev
   ```

3. **Navigate to** `/admin` as a super_admin user

4. **Verify:**
   - Card appears in correct position (based on order)
   - Card only visible to super_admin (if superAdminOnly: true)
   - Clicking card navigates to correct admin page
   - Admin page has proper permission checks

---

## Future Enhancements

Potential improvements to the admin card pattern:

- **Automatic Discovery**: Use module.json to auto-discover admin cards
- **Plugin Registry**: Centralized registry instead of manual imports
- **Role-Based Access**: Support custom permission functions beyond superAdminOnly
- **Card Badges**: Show notification counts or status indicators
- **Categories**: Group related admin cards into sections

---

## Questions or Issues?

- Review: `docs/architecture/admin-card-registry-pattern.md` (comprehensive guide)
- Review: `packages/ai-enablement-module/frontend/adminCard.tsx` (reference implementation)
- Check: Template at `templates/_module-template/frontend/adminCard.tsx`

---

## Summary of Changes

| File                                                            | Type     | Description                            |
| --------------------------------------------------------------- | -------- | -------------------------------------- |
| `templates/_module-template/frontend/adminCard.tsx`             | Added    | Template for new admin cards           |
| `docs/frontend.md`                                              | Modified | Added admin card pattern documentation |
| `AI-MODULE-DEVELOPMENT-GUIDE.md`                                | Modified | Added Step 7 for optional admin cards  |
| `pm-app-stack/packages/shared-types/src/index.ts`               | Modified | Added `AdminCardConfig` type           |
| `pm-app-stack/docs/architecture/admin-card-registry-pattern.md` | Added    | Complete architectural documentation   |

**Total Files Changed in Toolkit:** 3  
**Total Lines Added in Toolkit:** ~200  
**Total Reference Implementation Files:** 4

---

**Updated By:** Claude (Cline Agent)  
**Review Status:** Ready for use  
**Backward Compatibility:** ✅ Fully backward compatible
