# Context: Authentication Standardization

**Created:** January 30, 2026  
**Updated:** January 31, 2026  
**Primary Focus:** Standardization of authentication patterns across all CORA modules + Full Lifecycle Validation  
**Current Sprint:** S2

## Initiative Overview

The goal of this initiative is to standardize authentication patterns across all 8 CORA modules AND create integrated validation tools to enforce ADR-019 compliance.

**Problem:**
- Inconsistent auth checks (some use RPC, some direct SQL, some pass user_id instead of JWT)
- Module-chat was broken due to incorrect pattern (passing Okta JWT to Supabase RPC)
- 2-8 hours wasted per module debugging auth issues
- **No integrated validation for full auth lifecycle (frontend + backend)**
- **Fragmented validation results make it hard to identify related issues**
- **Standalone frontend/backend validators provide incomplete assurance**

**Solution:**
- Create helper functions in org-common layer (check_sys_admin, check_org_admin, check_ws_admin)
- Implement ADR-019 standard patterns for Lambda authorization
- **REVISED: Extend api-tracer to ALWAYS validate full auth lifecycle (no standalone validators)**
- Auth validation integrated into api-tracer as a core feature, not an optional flag

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|--------|-----------|
| S0 | `auth-standardization-s0` | `plan_s0-auth-standardization.md` | ✅ Complete | 2026-01-30 |
| S1 | `auth-standardization-s1` | `plan_s1-auth-standardization.md` | ✅ Complete | 2026-01-31 |
| S2 | `auth-standardization-s2` | `plan_s2-auth-standardization.md` | 🟡 Active | - |

## Current Sprint

- **Branch:** `auth-standardization-s2`
- **Plan:** `docs/plans/plan_s2-auth-standardization.md`
- **Focus:** Fix remaining auth validation errors across modules
- **Priority:** 
  1. Fix auth errors by module (41 remaining across 7 modules)
  2. Investigate key_consistency errors (679 errors)
  3. Run final validation to confirm fixes

## Key Decisions

- **ADR-019 Standard:** Use parameterized RPC functions wrapped in Python helpers
- **Database RPCs:** is_sys_admin(), is_org_admin(), is_ws_admin() in database
- **Python Helpers:** check_sys_admin(), check_org_admin(), check_ws_admin() in org-common
- **Org Context:** Frontend passes orgId in request; Lambda extracts via get_org_context_from_event()
- **Validation Strategy (REVISED):** Integrated full lifecycle auth validation in api-tracer
  - Auth validation is CORE functionality, not an optional flag
  - No standalone frontend/backend auth validators (they provide incomplete assurance)
  - api-tracer ALWAYS validates full auth lifecycle (Frontend + Gateway + Lambda)

## Session Log

### January 30, 2026 - Sprint S0 Complete
- Initiative created following discovery of critical auth issues in Sprint S4
- Comprehensive analysis: 27 lambdas audited (12 sys, 11 org, 4 ws admin)
- Created ADR-019: Auth Standardization Strategy
- Updated .clinerules with auth standards
- Created validation script skeleton
- Detailed S1-S3 implementation plans (143 steps)
- PR #82 created for S0
- Time: ~5-6 hours

### January 30, 2026 - Sprint S1 Session 1
- Branch: `auth-standardization-s1`
- Updated ADR-019 with org context extraction patterns
- Updated Lambda Authorization Standard with complete flow diagrams
- Initial validation analysis
- Time: ~3-4 hours

### January 31, 2026 - Sprint S1 Session 2
**Focus:** Validation Suite Analysis & Design

**Validators Analyzed:**
- admin-auth-validator (Frontend ADR-015/016 patterns)
- admin-route-validator (Route naming ADR-018b)
- api-response-validator (camelCase validation)
- api-tracer (Full-stack route matching)
- external-uid-validator (UID conversion) - overlaps with ADR-019
- rpc-function-validator (RPC existence)
- lambda-auth-validator (empty placeholder)

**Key Findings:**
1. Existing validators validate frontend and backend separately
2. No integrated view showing related auth issues by route
3. external-uid-validator functionality should move to lambda-auth-validator
4. api-tracer is best candidate for full lifecycle validation (already has full-stack context)

**Decision: REVISED - Integrated Full Lifecycle Auth in api-tracer**
- Auth validation integrated into api-tracer as CORE functionality (not optional flag)
- No standalone frontend/backend auth validators (incomplete assurance)
- api-tracer ALWAYS validates full auth lifecycle per route
- Deprecate admin-auth-validator and external-uid-validator

**Scope Expansion:**
- Original: 8-12h (fix lambdas)
- Revised: 16-24h (validation suite + fix lambdas)
- Reason: Need enforcement mechanism before fixing issues

**Documentation Updated:**
- ADR-019 restructured as index doc with sub-docs
- Plan updated with expanded scope and phases
- Context updated with session log

### January 31, 2026 - Sprint S1 Session 3 (Current)
**Focus:** Standards Naming Convention & Documentation Structure

**Standards Naming Convention Implemented:**
- Created `00_index_STANDARDS.md` with naming convention and validator mapping
- Approved numbering scheme:
  - `00` = Index/Meta
  - `01-09` = 4-Tier Architecture (front, api, back, data, quality)
  - `10-19` = CORA Architecture
  - `20-29` = Process (sprints, reviews)
  - `30-39` = Operations (infra, devops, security)
- Abbreviation: `std` (e.g., `03_std_back_AUTH.md`)

**ADR-019 Sub-Documents Created:**
- `ADR-019a-AUTH-FRONTEND.md` - Frontend authorization patterns
- `ADR-019b-AUTH-BACKEND.md` - Backend authorization patterns

**Standards Renamed:**
| Old Name | New Name |
|----------|----------|
| `standard_LAMBDA-AUTHORIZATION.md` | `03_std_back_AUTH.md` |
| `standard_CORA-FRONTEND.md` | `01_std_front_AUTH.md` |
| `standard_API-PATTERNS.md` | `02_std_api_RESPONSE.md` |

**Remaining Standards to Rename:**
- `standard_DATABASE-NAMING.md` → `04_std_data_TABLE-NAMING.md`
- `standard_BRANCHING-STRATEGY.md` → `31_std_devops_BRANCHING.md`
- `standard_VERSIONING.md` → `31_std_devops_VERSIONING.md`
- (Full mapping in `00_index_STANDARDS.md`)

## Validation Suite Architecture (REVISED)

**Key Insight:** api-tracer already parses Frontend, Gateway, and Lambda code. All applicable checks should run in a single pass to avoid redundant parsing.

```
api-tracer - Comprehensive Full-Stack Validator
├── LAYER 1: Route Validation (existing)
│   ├── Frontend → Gateway matching
│   ├── Gateway → Lambda matching
│   └── Path parameter validation
│
├── LAYER 2: Auth Lifecycle Validation (NEW)
│   ├── Frontend auth: useUser(), useRole(), useOrganizationContext()
│   ├── Lambda auth: check_*_admin(), external UID conversion
│   └── Results grouped by route path
│
├── LAYER 3: Code Quality Checks (INTEGRATE)
│   ├── Lambda Checks (already parsing Python):
│   │   ├── import_validator - org_common signature validation
│   │   ├── api-response-validator - camelCase response keys
│   │   ├── python-key-consistency - dict key naming consistency
│   │   └── rpc-function-validator - RPC call existence
│   │
│   ├── Frontend Checks (already parsing TypeScript):
│   │   ├── api-response-validator - camelCase property access
│   │   └── role-naming-validator - role naming standards
│   │
│   └── Gateway Checks (already parsing Terraform):
│       └── admin-route-validator - route naming standards
│
└── Results grouped by route path (unified view)
```

**Single Parse, Multiple Checks:**
```python
# When api-tracer parses a Lambda file, run ALL applicable checks:
lambda_ast = parse_lambda_file(path)

# Route extraction (existing)
routes = extract_routes(lambda_ast)

# Auth validation (new)
auth_issues = check_auth_patterns(lambda_ast)

# Code quality (integrated from standalone validators)
import_issues = check_org_common_imports(lambda_ast)
response_issues = check_camelcase_responses(lambda_ast)
key_issues = check_key_consistency(lambda_ast)
rpc_issues = check_rpc_calls(lambda_ast, db_functions)
```

**Validators to Integrate into api-tracer:**

| Validator | Current Status | Integration |
|-----------|---------------|-------------|
| admin-auth-validator | Standalone frontend | → api-tracer (auth layer) |
| external-uid-validator | Standalone Lambda | → api-tracer (auth layer) |
| import_validator | Standalone Lambda | → api-tracer (quality layer) |
| api-response-validator | Standalone both | → api-tracer (quality layer) |
| admin-route-validator | Standalone Gateway | → api-tracer (quality layer) |
| python-key-consistency | Standalone Lambda | → api-tracer (quality layer) |
| rpc-function-validator | Standalone Lambda | → api-tracer (quality layer) |
| role-naming-validator | Standalone multi | → api-tracer (quality layer) |

**Validators that remain standalone (different scope):**

| Validator | Reason |
|-----------|--------|
| portability-validator | Scans all file types (.tf, .sh, .yaml, .env, etc.) |
| db-naming-validator | Scans SQL schema files only |
| a11y-validator | Scans HTML/React for accessibility |

**Output Format (Unified View):**
```
Full Stack Validation Report

Route: GET /admin/org/chat/config
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Gateway:
    ✅ Route defined with authorizer
    ✅ Route follows ADR-018b naming standard
  Frontend:
    ✅ useUser() present
    ❌ Missing useOrganizationContext() for org route
    ✅ camelCase property access
  Lambda:
    ✅ External UID conversion present
    ❌ Missing check_org_admin()
    ✅ org_common imports valid
    ⚠️ Response key 'model_id' should be 'modelId'
```

## S1 Completion Summary (January 31, 2026)

**What S1 Delivered:**
1. ✅ Comprehensive validation suite (api-tracer with auth + code quality checks)
2. ✅ Full documentation (ADR-019, ADR-019a, ADR-019b, standards naming convention)
3. ✅ Chat Org Admin fully functional (Sprint S4 Issue #7 resolved)
4. ✅ Validation baseline documented (1020 issues across 8 modules)
5. ✅ org-common helper functions in templates

**Metrics:**
- Time: ~11 hours actual (estimated 12h)
- Sessions: 7 sessions
- Auth Errors Fixed: module-chat (8 → 0)
- Remaining Auth Errors: 41 across 7 modules

**Validation Results Baseline:**
| Error Type | Count |
|------------|-------|
| quality_key_consistency | 679 |
| quality_import | 31 |
| auth_missing_org_context_extraction | 23 |
| auth_missing_check_org_admin | 12 |
| auth_missing_use_role | 6 |
| auth_missing_check_sys_admin | 6 |
| missing_lambda_handler | 2 |
| auth_missing_org_context | 2 |

## Next Steps (S2)

1. **Fix auth errors by module** (41 remaining)
   - module-voice: 11 errors
   - module-ai: 8 errors  
   - module-ws: 6 errors
   - module-access: 6 errors
   - module-kb: 5 errors
   - module-eval: 3 errors
   - module-mgmt: 2 errors

2. **Investigate key_consistency errors** (679 errors)
   - Determine if snake_case → camelCase migration needed
   - Or if these are false positives

3. **Final validation** after fixes complete
