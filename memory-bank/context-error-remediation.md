# Context: Error Remediation & Clean Baseline

**Created:** January 26, 2026  
**Primary Focus:** Eliminate validation errors to achieve error-free project baseline

## Initiative Overview

This initiative aims to achieve the **P1: Clean Project Baseline (Error-Free)** goal from the backlog. With Admin Standardization S3a and WS Plugin Architecture S1/S2 complete, we can now systematically eliminate remaining validation errors.

**Current State (Feb 5, 2026):**
- Total Errors: 570 (post S5 completion)
- Top Issues: Code Quality (403), Orphaned Routes (238), Route Matching (144)
- Certification: Bronze

**Goal:** Achieve 0 errors across all validators, enabling Silver/Gold certification.

## Sprint History

| Sprint | Branch | Plan | Status | Completed |
|--------|--------|------|-----------|-----------| 
| S1 | `fix/typescript-errors-s1` | `plan_typescript-errors-s1.md` | ✅ Complete | 2026-01-26 |
| S2 | `fix/validation-errors-s2` | `plan_api-tracer-s2.md` | ✅ Complete | 2026-01-27 |
| S3 | `fix/validation-errors-s3` | `plan_accessibility-frontend-s3.md` | ✅ Complete | 2026-01-27 |
| S4 | `fix/validation-errors-s4` | `plan_validation-errors-s4.md` | ✅ Complete | 2026-01-27 |
| Fix | `fix/create-project-config` | `plan_create-project-config.md` | ✅ Complete | 2026-01-27 |
| S5 | `fix/validation-errors-s5` | `plan_validation-errors-s5.md` | ✅ Complete | 2026-02-05 |
| S6 | `feature/validation-errors-s6` | `plan_validation-errors-s6.md` | 🟡 In Progress | - |
| **Migration** | TBD | `plan_api-naming-standard-migration.md` | 📋 Planned | - |

## Current Sprint

**Sprint S6: Validation Errors - Route Analysis & Architecture Review**
- **Branch:** `feature/validation-errors-s6`
- **Plan:** `docs/plans/plan_validation-errors-s6.md`
- **Focus:** Orphaned route analysis, categorization, targeted fixes
- **Baseline:** 570 errors (238 orphaned routes, 403 code quality, 144 route matching)
- **Status:** 🟡 IN PROGRESS

### February 5, 2026 - Session 13: Route Analysis - Module-Chat Discovery 🔍

**Session Summary:**
- **Duration:** ~1 hour
- **Focus:** Analyze actual orphaned routes to understand composition
- **Target Module:** module-chat (41 orphaned routes)
- **Result:** Critical architectural pattern discovery
- **Status:** Analysis phase, no error reduction yet

**Critical Discovery - Two Distinct Route Patterns:**

**Pattern 1: Admin Routes (~18 routes) - Component-Based**
- SysChatAdmin documents 8 routes with @routes metadata
- OrgChatAdmin documents 10 routes with @routes metadata
- **Issue:** These routes show as "orphaned" despite having component metadata
- **Hypothesis:** Validator may not be matching them correctly OR metadata not being read
- **Impact:** 18 false positive orphaned route errors

**Pattern 2: Non-Admin Routes (~17 routes) - Hooks-Based**
- Workspace management: GET/POST `/ws/{wsId}/chats`
- User-level chats: GET/POST `/users/me/chats`
- KB grounding, sharing, favorites operations
- **Issue:** Called from hooks (`useChat`, `useChatSession`, `useChatSharing`), not components
- **Impact:** No component metadata exists for these routes
- **Similar to:** module-kb, module-eval patterns (hooks-based architecture)

**Routes Found in chat-session Lambda (35 total):**

1. **Workspace Scoped (5):**
   - GET/POST `/ws/{wsId}/chats`
   - GET/PATCH/DELETE `/ws/{wsId}/chats/{sessionId}`

2. **User Level (5):**
   - GET/POST `/users/me/chats`
   - GET/PATCH/DELETE `/chats/{sessionId}`

3. **KB Grounding (3):**
   - GET/POST `/chats/{sessionId}/kbs`
   - DELETE `/chats/{sessionId}/kbs/{kbId}`

4. **Sharing (3):**
   - GET/POST `/chats/{sessionId}/shares`
   - DELETE `/chats/{sessionId}/shares/{shareId}`

5. **Favorites (1):**
   - POST `/chats/{sessionId}/favorite`

6. **Sys Admin (8):**
   - GET/PUT `/admin/sys/chat/config`
   - GET `/admin/sys/chat/analytics` (+ /usage, /tokens)
   - GET/DELETE `/admin/sys/chat/sessions` (+ /{id})

7. **Org Admin (10):**
   - GET/PUT `/admin/org/chat/config`
   - GET/DELETE `/admin/org/chat/sessions` (+ /{id}, /restore)
   - GET `/admin/org/chat/analytics` (+ /users, /workspaces)

**Analysis Implications:**

1. **For Admin Routes (18):**
   - Need to verify validator is reading SysChatAdmin/OrgChatAdmin metadata
   - If metadata exists but validator can't match → validator enhancement needed
   - If metadata missing → add to existing components

2. **For Hooks-Based Routes (17):**
   - Represents different architectural pattern (data fetching in hooks)
   - Options:
     - Document routes in hook files (similar to component @routes)
     - Enhance validator to read hook metadata
     - Accept as valid "orphaned" (no frontend component calls expected)

3. **Remaining Routes (~6):**
   - chat-stream and chat-message Lambdas not yet examined
   - Likely contain streaming and message CRUD operations

**User Feedback - Critical Constraint:**
- **NOT acceptable:** Whitelist routes just to reduce error count
- **ONLY acceptable:** Whitelist routes that shouldn't be validated (webhooks, health checks, build artifacts)
- **Implication:** The 238 orphaned routes are REAL issues requiring proper categorization and fixes

**Next Session Priorities:**

**Option A: Validate Admin Route Metadata (20 min)**
- Check if SysChatAdmin/OrgChatAdmin @routes match Lambda docstrings
- Verify validator is detecting and matching component metadata
- If working: 18 errors should resolve
- If broken: Fix validator component detection

**Option B: Continue Module Analysis (2-3 hours)**
- Examine chat-stream and chat-message Lambdas (6 routes)
- Analyze other high-orphan modules (module-kb: 38, module-eval: 42)
- Build comprehensive categorization across all modules

**Option C: Hooks-Based Route Strategy (1-2 hours)**
- Document hooks pattern (useChat, etc.) with route metadata
- Enhance validator to read hook metadata OR
- Define validation exclusion policy for hooks-based routes

**Recommendation:** Option A first (quick validation), then decide between B or C based on findings

**Files Examined:**
- `/Users/aaron/code/bodhix/testing/ws-optim/ai-mod-stack/packages/module-chat/backend/lambdas/chat-session/lambda_function.py`

**Test Project:**
- `/Users/aaron/code/bodhix/testing/ws-optim/ai-mod-stack`

---

[Previous sprint sessions continue below...]

## Recently Completed Sprint

**Sprint S5: Validation Errors - Low-Hanging Fruit** ✅ COMPLETE

[Rest of the file content remains the same...]