# Standards Update Summary - Missing Admin Pages Implementation

**Date:** December 26, 2025  
**Purpose:** Document standards updates required for missing admin pages implementation  

---

## Overview

The following standards require updates to align with the new single-card-per-module, tabbed admin structure:

1. ✅ `standard_ADMIN-CARD-PATTERN.md`
2. ✅ `standard_NAVIGATION-AND-ROLES.md`
3. ✅ `standard_MODULAR-ADMIN-ARCHITECTURE.md`
4. ✅ `standard_module-integration-spec.md`

---

## Key Changes

### New Rules Established

1. **One Admin Card Per Module** - Each core module exports exactly one admin card
2. **Admin Card Naming** - Use functional names: "Access Control", "AI Enablement", "Platform Management"
3. **Tabbed Admin Structure** - Admin pages use MUI Tabs to consolidate features
4. **No Main Menu for Core Modules** - Core modules (module-access, module-ai, module-mgmt) don't have main menu items
5. **Org AI Config Access** - Platform admins only (NOT org owners/admins)
6. **Route Naming** - Use `/admin/ai/*` instead of `/admin/rag/*`
7. **Org Details Page** - Contains tabs for Overview, Domains, Members, Invites, AI Config
8. **Users Tab** - Platform-level user view separate from org-level member management

---

## Updates by Document

### 1. standard_ADMIN-CARD-PATTERN.md

**Changes:**
- Add "One admin card per module" rule to Section 1.1
- Add admin card naming conventions (functional names)
- Update href examples to use single-word routes (`/admin/access` vs `/admin/my-module`)
- Add route naming rule: Single word or acronym only (access, ai, mgmt, chat, kb)
- Add section on "Core modules do not have main menu items"
- Add section on tabbed admin structure

---

### 2. standard_NAVIGATION-AND-ROLES.md

**Changes:**
- Update Section 2.1 to mention core modules have no main menu items
- Update Section 3.3 card examples to show consolidated cards:
  - "Access Control" (order 10) instead of "Organization Management"
  - "AI Enablement" (order 20) instead of separate AI cards
  - "Platform Management" (order 30) instead of "Lambda Management"
- Remove `superAdminOnly` field in favor of `requiredRoles` array

---

### 3. standard_MODULAR-ADMIN-ARCHITECTURE.md ⚠️ Most Changes

**Major Changes:**
- Update Section 1.1: One admin card per module for platform admin
- Update Section 1.2 diagram: Use new routes (`/admin/access-control`, `/admin/ai-enablement`)
- Update Section 2.2: Org AI Config is **platform admin only**
- Update Section 2.3 Access Matrix: Fix Org AI Config row
- Update Section 3.2: Replace 4 separate card examples with single card per module
- Remove Section 4.2 (Organization Admin Dashboard) - org features in org details page instead
- Update Section 6.1: Change RAG routes to AI routes
- Add new sections:
  - "Tabbed Admin Structure"
  - "Organization Details Page"

**Access Control Matrix Fix:**
```
| Org AI Config | ✅ Yes* | ✅ Yes* | ❌ No | ❌ No | ❌ No |
```

**Route Updates:**
- `/admin/rag-providers` → `/admin/ai`
- `/admin/organizations` → `/admin/access`
- Add `/admin/access/orgs/[id]` for org details

---

### 4. standard_module-integration-spec.md

**Changes:**
- Add "Admin Integration" section documenting single-card-per-module rule
- Add reference to tabbed admin structure pattern
- Update admin card naming conventions in module structure section

---

## Implementation Notes

**Breaking Changes:**
- Admin card routes are changing (e.g., `/admin/organizations` → `/admin/access`)
- AdminCardConfig interface gaining `context` field
- Org AI Config access restricted to platform admins only

**Route Naming Convention:**
- Use single word or acronym only
- Examples: `/admin/access`, `/admin/ai`, `/admin/mgmt`, `/admin/chat`, `/admin/kb`
- NOT multi-word: `/admin/access-control`, `/admin/ai-enablement`

**Non-Breaking:**
- Tabbed structure is additive (can migrate gradually)
- Core module main menu removal is clarification (not enforcement)

---

**Status:** Updates pending  
**Next:** Apply updates to each standard document
