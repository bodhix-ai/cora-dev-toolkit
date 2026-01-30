# Context: Authentication Standardization

**Created:** January 30, 2026
**Primary Focus:** Standardization of authentication patterns across all CORA modules

## Initiative Overview

The goal of this initiative is to standardize authentication patterns across all 8 CORA modules. Currently, modules use inconsistent patterns, leading to fragile code, security risks, and developer confusion. The solution involves creating a centralized `cora_auth.py` library and migrating all modules to use it.

**Problem:**
- Inconsistent auth checks (some use RPC, some direct SQL, some pass user_id instead of JWT)
- Module-chat was broken due to incorrect pattern (passing Okta JWT to Supabase RPC)
- 2-8 hours wasted per module debugging auth issues

**Solution:**
- Create `cora_auth.py` library in org-common layer
- Implement standard CORAuth class with methods for sys, org, and resource auth
- Migrate all 8 modules to use the new library
- Enforce standards via validation

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S1 | `auth-standardization-s1` | `plan_auth-standardization.md` | 🟡 Active | - |

## Current Sprint

- **Branch:** `auth-standardization-s1`
- **Plan:** `docs/plans/plan_auth-standardization.md`
- **Focus:** Create `cora_auth.py` library and migrate module-chat (immediate fix) + remaining modules

## Key Decisions

- **Centralized Auth Library:** All auth logic moves to `cora_auth.py`
- **Database RPCs:** All auth checks must use Security Definer RPCs (no direct SQL in Lambdas)
- **JWT Source of Truth:** All auth functions must take JWT as input, not user_id

## Session Log

### January 30, 2026 - Initiative Start
- Initiative created following discovery of critical auth issues in Sprint S4 of Admin Standardization
- Plan created: `docs/plans/plan_auth-standardization.md`
- Context file created
