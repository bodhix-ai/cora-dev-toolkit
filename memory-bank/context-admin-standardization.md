# Context: Admin Page Standardization

**Created:** January 24, 2026  
**Primary Focus:** Admin page patterns, authentication, and URL structure

## Initiative Overview

Standardize all CORA admin pages (sys and org) with consistent:
- Authentication patterns (Pattern A with useUser)
- URL structure (`/admin/{scope}/{module}`)
- Breadcrumb navigation
- Role-based access control

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|-----------|-----------|
| S1 | `admin-page-s1` | `plan_admin-page-standardization-s1.md` | ✅ Complete | 2026-01-22 |
| S2 | `admin-page-s2-completion` | `plan_admin-page-standardization-s2.md` | ✅ Complete | 2026-01-24 |
| S3a | `admin-page-s3a` | `plan_admin-page-s3a.md` | 🟡 Active | - |

## Current Sprint (S3a)

**Branch:** `admin-page-s3a`
**Plan:** `docs/plans/plan_admin-page-s3a.md`
**Priority:** P1 - Unblocks WS Plugin Architecture initiative

**Focus:** Module Management Core
- Module Configuration Tab UI
- Module-aware admin card visibility
- Module-aware left navigation
- module-chat reclassification (core → functional)
- Validation script for module toggle compliance
- Standard documentation for module toggle pattern

**Impact:** Enables sys admins to toggle functional modules on/off at runtime. Provides foundation for WS Plugin Architecture to read module enabled state.

## Sprint 2 Summary (Completed)

**Branch:** `admin-page-s2-completion` (formerly `feature/citations-review`)

**Achievements:**
- URL structure migration to 3-part standard
- Missing pages created (sys/voice, org/access)
- Org admin scope fixes
- ADR-016: Org Admin Authorization Pattern
- Admin-auth-validator extended

## Sprint 3b Scope (Planned)

**Focus:** Admin Standards & Documentation
- Admin page parity rule (both sys & org per module)
- Module ADMINISTRATION.md template
- Delegated admin concept documentation
- Guide for module developers

## Sprint 3c Scope (Future)

**Focus:** In-App Documentation (kbdocs)
- Documentation route structure
- Markdown rendering in-app
- Project documentation copying pattern

## Key Decisions

- ADR-015: Admin Page Auth Pattern + Breadcrumb Navigation
- ADR-016: Org Admin Page Authorization

## Session Log

### January 25, 2026 - Sprint 3a Start
- Created admin-page-s3a branch
- Scope expanded to include module management core features
- Module-chat will be reclassified as functional (toggleable) while remaining in core creation tier
- This work unblocks WS Plugin Architecture initiative

### January 24, 2026 - Sprint 2 Completion
- Completed ADR-016 fixes for org admin authorization
- Renamed branch from citations-review to admin-page-s2-completion
- Updated documentation standards to 3-tier hierarchy
