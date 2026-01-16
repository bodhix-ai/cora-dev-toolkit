# Active Context - CORA Development Toolkit

## Current Focus

**Session 129: Module-KB Architecture Updates & Spec Restructure** - ✅ **COMPLETE** (January 15, 2026)

**Next Session:** Phase 2 - Database Schema Implementation

---

## ✅ Session 129: Module-KB Core Module Promotion & Spec Split - **COMPLETE** (January 15, 2026)

**Goal:** Promote module-kb to Core Module (Tier 2) and split technical spec into manageable files.

**Status:** ✅ COMPLETE - Architecture decision made, specs restructured

### Completed Work

#### 1. Module-KB Promoted to Core Module (Tier 2) ✅
- **Rationale:** KB provides foundational RAG/knowledge infrastructure that functional modules (module-chat, module-wf) depend on
- **Decision:** Module-kb is now alongside module-ai as Tier 2 infrastructure
- **Template Location:** `templates/_modules-core/module-kb/` (when created)

**Core Module Tier Classification:**
| Tier | Module | Purpose |
|------|--------|---------|
| 1 | module-access | Identity & access control |
| 2 | module-ai | AI provider management |
| 2 | **module-kb** | Knowledge base & RAG infrastructure |
| 3 | module-mgmt | Platform management & monitoring |

#### 2. Technical Spec Split into Smaller Files ✅
Created `docs/specifications/module-kb/technical/` directory:
- `01-data-model.md` - 7 entities with global→sys naming fixes (~350 lines)
- `02-database-schema.md` - 9 migration files with complete SQL (~500 lines)
- `MODULE-KB-TECHNICAL-SPEC.md` - Converted to index/reference document

#### 3. Naming Standardization Applied ✅
All spec files now use correct CORA naming:
- `scope = 'sys'` (not 'global')
- `kb_access_sys` table (not `kb_access_global`)
- Consistent 4-level inheritance chain terminology

### Files Modified/Created

1. `docs/specifications/module-kb/technical/01-data-model.md` (NEW)
2. `docs/specifications/module-kb/technical/02-database-schema.md` (NEW)
3. `docs/specifications/module-kb/MODULE-KB-TECHNICAL-SPEC.md` (converted to index)
4. `docs/specifications/module-kb/MODULE-KB-SPEC.md` (updated classification)
5. `docs/plans/plan_module-kb-implementation.md` (added Core Module info)

### Outstanding Tasks

- [ ] Update `.clinerules` to add module-kb to core modules list
- [ ] Create remaining technical spec files (03-07) incrementally as needed
- [ ] Proceed with Phase 2: Database Schema Implementation

**Progress:** 100% of session goals complete  
**Total Time:** ~1 hour  
**Next:** Phase 2 - Create actual database migration files in template

---

## ✅ Session 128: Module-KB Phase 1 Specifications - **COMPLETE** (January 14, 2026)

**Goal:** Complete Phase 1 Foundation & Specification documents for module-kb.

**Status:** ✅ COMPLETE - All 4 specification documents finalized

### Completed Work

#### 1. Specification Directory Structure ✅
- Created: `docs/specifications/module-kb/`
- Files created:
  - `MODULE-KB-SPEC.md` (parent specification)
  - `MODULE-KB-TECHNICAL-SPEC.md` (database, API, infrastructure)
  - `MODULE-KB-USER-UX-SPEC.md` (user flows, document upload)
  - `MODULE-KB-ADMIN-UX-SPEC.md` (admin KB management)

#### 2. 4-Level Access Control Model ✅
- **Inheritance Chain Documented:**
  - **kb_access_global** → Sys admin shares global KB with org (Step 1)
  - **kb_access_orgs** → Org admin enables KB for their org (Step 2)
  - **kb_access_ws** → Workspace admin enables KB for workspace chats (Step 3)
  - **kb_access_chats** → User selects KB for their chat (Step 4)
  
- **Scope Rules:**
  - Global KB: Requires all 4 levels enabled
  - Org KB: Requires levels 2-4 (no sys admin sharing)
  - Workspace KB: Requires levels 3-4 (no org admin sharing)
  - Chat KB: User controls directly

#### 3. Technical Spec Updates ✅
- [x] Renamed migration 002: `kb_documents` → `kb_docs`
- [x] Added migration `005-kb-access-orgs.sql` for org-level enablement
- [x] Added migration `006-kb-access-ws.sql` for workspace-level enablement
- [x] Renumbered migrations: 005→007 (chats), 006→008 (RPC), 007→009 (RLS)
- [x] Updated `can_access_kb()` RPC for 4-level inheritance
- [x] Updated `get_accessible_kbs_for_workspace()` RPC for inheritance chain
- [x] Added `get_accessible_kbs_for_chat()` RPC for full 4-level check
- [x] Added RLS policies for `kb_access_orgs` and `kb_access_ws` tables

#### 4. Parent Spec Updates ✅
- [x] Updated Section 7 with all 7 entities and inheritance documentation
- [x] Added scope-based inheritance rules table

#### 5. Admin UX Spec Created ✅
- [x] Platform admin global KB management pages
- [x] Org admin KB management pages
- [x] Admin card specifications for dashboards
- [x] Component library for admin UIs
- [x] Interaction patterns for CRUD operations
- [x] Admin testing requirements

### Key Technical Decisions

1. **4-Table Access Model:** Each scope level has its own access table for fine-grained control
2. **Cascading Inheritance:** Higher levels must enable before lower levels can access
3. **Default Dimension:** 1024 (AWS Bedrock Titan V2) - cost-effective for most use cases
4. **Abbreviations:** `kb_docs` not `kb_documents` per CORA naming standards

### Files Modified This Session

1. `docs/specifications/module-kb/MODULE-KB-SPEC.md` - Updated Section 7 with 7 entities
2. `docs/specifications/module-kb/MODULE-KB-TECHNICAL-SPEC.md` - Major updates:
   - Renamed 002-kb-documents.sql → 002-kb-docs.sql
   - Added 005-kb-access-orgs.sql migration
   - Added 006-kb-access-ws.sql migration  
   - Renumbered 007-009 migrations
   - Updated RPC functions for 4-level inheritance
   - Added RLS policies for new access tables
3. `docs/specifications/module-kb/MODULE-KB-USER-UX-SPEC.md` - Complete (no changes needed)
4. `docs/specifications/module-kb/MODULE-KB-ADMIN-UX-SPEC.md` - Created (~1000 lines)

### Specification Summary

| Document | Status | Lines | Purpose |
|----------|--------|-------|---------|
| MODULE-KB-SPEC.md | ✅ Complete | ~400 | Parent overview, 7 entities, scope hierarchy |
| MODULE-KB-TECHNICAL-SPEC.md | ✅ Complete | ~2700 | 9 migrations, APIs, Lambda patterns, Terraform |
| MODULE-KB-USER-UX-SPEC.md | ✅ Complete | ~1200 | User personas, flows, components, testing |
| MODULE-KB-ADMIN-UX-SPEC.md | ✅ Complete | ~1000 | Admin personas, pages, cards, testing |
| **Total** | **✅** | **~5300** | Complete Phase 1 specification |

**Progress:** 100% of Phase 1 complete  
**Total Time:** ~3 hours (Session 128)  
**Next:** Phase 2 - Database Schema Implementation

---

## ✅ Session 127: Module-KB Implementation - Phase 0 Complete

---

## ✅ Session 127: Module-KB Implementation - Phase 0 Complete + Frontend Fix - **COMPLETE** (January 14, 2026)

**Goal:** Execute Phase 0 (AI Config Table Migration) as prerequisite for module-kb implementation + fix frontend data display bug.

**Status:** Complete - Migration executed successfully, all Phase 0 deliverables met, frontend validated working

### Context

Module-kb requires RAG embedding configuration from AI config tables. Phase 0 migrates both `sys_rag` and `org_prompt_engineering` tables to CORA naming standards (`ai_cfg_sys_rag`, `ai_cfg_org_prompts`) before starting main module implementation.

### Completed Work

#### 1. Frontend Data Access Bug Fix (1.5 hours)
- **Issue:** OrgAIConfigTab component showing empty fields despite API returning correct data
- **Root Cause:** Component accessing `response.policyMissionType` instead of `response.data.policyMissionType`
- **Files Fixed:**
  - Template: `templates/_modules-core/module-access/frontend/components/admin/OrgAIConfigTab.tsx`
  - Test Project: Synced and verified fix applied
- **Impact:** All RAG configuration fields now display correctly in UI
- **Validation:** User confirmed all fields populated + `updated_by` audit column working

#### 2. Database Migration (3.5 hours)
- **Migration SQL:** `scripts/migrations/20260114_ai_config_tables_migration.sql`
  - Migrated `sys_rag` → `ai_cfg_sys_rag` (complete table structure with all 28 columns)
  - Migrated `org_prompt_engineering` → `ai_cfg_org_prompts` (complete structure)
  - Created backward-compatible views for 1-week transition period
  - Added RLS policies for both tables (platform admin, org admin access)
  - Included comprehensive rollback procedure

- **Challenges Resolved:**
  1. Fixed string concatenation syntax in COMMENT statements
  2. Fixed JSON escaping (removed backslashes from JSONB defaults)
  3. Fixed table structure mismatch (used full schemas, not simplified versions)
  4. Fixed DROP VIEW issue (old tables, not views - changed to DROP TABLE)

- **Testing:** Migration executed successfully with zero errors in dev environment

#### 2. Lambda Code Updates (1 hour)
- **File:** `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`
- **Changes:** All SQL queries updated to reference new table names
  - `sys_rag` → `ai_cfg_sys_rag`
  - `org_prompt_engineering` → `ai_cfg_org_prompts`
- **Impact:** ai-config-handler Lambda now CORA-compliant

#### 3. Template Schema Files (1 hour)
- **Created:**
  - `templates/_modules-core/module-ai/db/schema/006-ai-cfg-sys-rag.sql` (new, CORA-compliant)
  - `templates/_modules-core/module-ai/db/schema/007-ai-cfg-org-prompts.sql` (new, CORA-compliant)

- **Archived:**
  - `templates/_modules-core/module-ai/db/schema/archive/006-sys-rag.sql.old`
  - `templates/_modules-core/module-ai/db/schema/archive/007-org-prompt-engineering.sql.old`

- **Impact:** All future projects will use correct table names from day one

#### 4. Documentation (30 min)
- **Rollback Procedure:** `scripts/migrations/ROLLBACK-20260114_ai_config_tables_migration.md`
  - Step-by-step rollback SQL
  - Lambda code reversion instructions
  - Template file restoration steps
  - Verification checklist
  - Data safety analysis (LOW RISK)

#### 5. Git Commit
- **Branch:** `feature/module-kb-implementation` (created from `fix/admin-functionality-improvements`)
- **Commit:** `95bf750` - "feat(module-kb): Complete Phase 0 - AI Config Table Migration"
- **Stats:** 7 files changed, 938 insertions, 14 deletions

### Key Achievements

✅ **Zero-Downtime Migration:** Backward-compatible views ensure old code continues working  
✅ **Data Integrity:** All data migrated successfully, row counts verified  
✅ **Standards Compliance:** Both tables now follow CORA naming conventions  
✅ **Future-Proof:** New projects get correct table names automatically  
✅ **Touch Once:** ai-config-handler Lambda updated once for both tables (efficiency)  
✅ **Documented:** Comprehensive rollback procedure for safety

### Migration Statistics

- **Tables Migrated:** 2 (`sys_rag`, `org_prompt_engineering`)
- **Lambda Functions Updated:** 1 (`ai-config-handler`)
- **Schema Files Created:** 2 (006, 007)
- **Schema Files Archived:** 2 (moved to archive/)
- **Migration Errors:** 0 ✅
- **Data Loss:** 0 ✅
- **Downtime:** 0 seconds ✅

### Files Modified

1. `scripts/migrations/20260114_ai_config_tables_migration.sql` - New migration
2. `scripts/migrations/ROLLBACK-20260114_ai_config_tables_migration.md` - Rollback docs
3. `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py` - Updated queries
4. `templates/_modules-core/module-ai/db/schema/006-ai-cfg-sys-rag.sql` - New schema
5. `templates/_modules-core/module-ai/db/schema/007-ai-cfg-org-prompts.sql` - New schema
6. `templates/_modules-core/module-ai/db/schema/archive/006-sys-rag.sql.old` - Archived
7. `templates/_modules-core/module-ai/db/schema/archive/007-org-prompt-engineering.sql.old` - Archived

### Success Criteria Met

✅ Migration SQL created and tested  
✅ Zero downtime during migration  
✅ All existing AI config functionality unchanged  
✅ New module-kb code will reference correct tables  
✅ Database naming standards enforced  
✅ Rollback procedure documented  
✅ Changes committed to version control

**Progress:** 100% complete  
**Total Time:** ~7.5 hours (6h migration + 1.5h frontend fix)  
**Phase 0 Status:** ✅ COMPLETE (Backend + Frontend validated working)

### End-to-End Validation ✅ COMPLETE

**User Testing Results:**
- ✅ GET `/orgs/{id}/ai/config` returns correct wrapped data structure
- ✅ Frontend properly accesses `response.data.*` fields
- ✅ All RAG configuration fields display correctly:
  - Policy Mission Type: "research"
  - Custom System Prompt: "two"
  - Custom Context Prompt: "three"
  - Citation Style: "footnote"
  - Include Page Numbers: true
  - Include Source Metadata: true
  - Response Tone: "simple"
  - Max Response Length: "concise"
  - Organization System Prompt: "one"
- ✅ Audit columns working: `updated_by` column being populated
- ✅ PUT requests saving successfully
- ✅ Zero errors in browser console
- ✅ Zero TypeScript compilation errors

**Phase 0 Status:** ✅ COMPLETE & VALIDATED

### Frontend Fix Details

**Component:** `OrgAIConfigTab.tsx` (module-access)
- **Template Updated:** `templates/_modules-core/module-access/frontend/components/admin/OrgAIConfigTab.tsx`
- **Bug:** Accessing unwrapped response (`response.policyMissionType`)
- **Fix:** Changed to wrapped response access (`response.data.policyMissionType`)
- **Type Updated:** `{ success: boolean } & OrgAIConfig` → `{ success: boolean; data: OrgAIConfig }`
- **Scope:** All 9 form fields updated to use `response.data.*`

**Sync Process:**
1. Fixed template file
2. Synced to test project: `./scripts/sync-fix-to-project.sh`
3. Replaced template vars: `@{{PROJECT_NAME}}` → `@ai-sec`
4. Dev server restarted by user
5. Validated UI displays all data correctly

### Next Steps

**Ready for Phase 1: Foundation & Specification** (~6-9 hours)
- Create module specification directory structure
- Write MODULE-SPEC-PARENT.md (overview, dependencies, integration points)
- Write MODULE-SPEC-TECHNICAL.md (database schema, Lambda functions, API endpoints)
- Write MODULE-SPEC-USER-UX.md (user flows, KB toggle selector, document management)
- Write MODULE-SPEC-ADMIN-UX.md (admin pages, workflows, analytics)
- Design CORA-compliant database schema (kb_bases, kb_documents, kb_chunks)
- Define API endpoints with route docstrings
- Document S3 and pgvector integration strategy

---

## ✅ Session 126: Module-KB Planning & DB Migration Integration - **COMPLETE** (January 14, 2026)

**Goal:** Review module-kb and module-chat implementation plans, assess risks of implementing before legacy DB migration, and integrate AI config table migration into module-kb Phase 0.

**Status:** Complete - Strategic planning and plan updates finalized

### Context

User expressed urgency to implement module-kb and module-chat despite legacy tables not yet aligned with new naming standards. Analysis needed to assess risks vs benefits of proceeding.

### Completed Work

#### 1. Risk/Benefit Assessment (2 hours)
- **Reviewed Plans:**
  - `plan_module-kb-implementation.md` - 12 phases, ~33-48 hours
  - `plan_module-chat-implementation.md` - 13 phases, ~30-45 hours
  - `plan_db-naming-migration.md` - 6 phases, 13 legacy tables

- **Key Finding:** NEW module tables (kb_*, chat_*) use correct naming from inception. Risk is primarily in references to LEGACY tables via API calls.

- **Risk Analysis:**
  - ✅ LOW: New modules use APIs, not direct SQL to legacy tables (abstraction layer)
  - ✅ LOW: Core entity tables (orgs, workspaces, users) not being renamed
  - 🟡 MEDIUM: Technical debt from two "vintages" of naming (manageable)
  - ❌ HIGH (mitigated): Would need to update ai-config-handler Lambda twice if migrating sys_rag separately

- **Recommendation:** Proceed with module-kb first, BUT migrate BOTH AI config tables (sys_rag + org_prompt_engineering) in Phase 0 to avoid touching same Lambda twice.

#### 2. Module-KB Phase 0 Enhancement (1.5 hours)
- **File:** `docs/plans/plan_module-kb-implementation.md`
- **Changes:**
  - Renamed Phase 0 from "RAG Table Migration" to "AI Config Table Migration"
  - Added `org_prompt_engineering` → `ai_cfg_org_prompts` to migration scope
  - Duration: Increased from 2-3 hours to 3-4 hours (both tables)
  - **Rationale:** Both tables used by same Lambda (`ai-config-handler`) - follows "touch each Lambda only once" principle

- **Migration SQL Updated:**
  - Single migration file: `20260114_ai_config_tables_migration.sql`
  - Migrates both `sys_rag` and `org_prompt_engineering` together
  - Includes RLS policies for both tables
  - Creates backward-compatible views for both tables

- **Testing Expanded:**
  - Added org prompt API testing
  - Added RLS testing for org-level prompts (org admins can edit, org members can read)

#### 3. DB Migration Plan Integration (1 hour)
- **File:** `docs/plans/plan_db-naming-migration.md`
- **Changes:**
  - Phase 4 marked as "✅ HANDLED BY MODULE-KB PHASE 0"
  - Both AI config tables now migrated via module-kb
  - Updated "New Module Development Gate" section
  - Updated Lambda Grouping Summary
  - Added cross-references between plans

- **Strategic Impact:**
  - Phase 4 no longer standalone - integrated into module-kb workflow
  - Reduces total migration phases from 6 to 5 (Phase 4 = module-kb Phase 0)
  - Eliminates future migration debt for module-kb

#### 4. Cross-Plan Coordination
- **Links Added:**
  - module-kb plan → DB migration plan Phase 4
  - DB migration plan → module-kb Phase 0
  - Both plans reference each other for complete context

- **Decision Matrix Documented:**
  - If implementing module-kb first: Phase 4 automatic, then Phases 1-3 as needed
  - If migrating existing modules first: Complete Phases 1-3, skip Phase 4 (handled by module-kb)

### Key Decisions

1. **Proceed with module-kb implementation now** - Business urgency outweighs technical debt risk
2. **Migrate BOTH AI config tables in Phase 0** - Avoids touching ai-config-handler Lambda twice
3. **Keep legacy table migrations (Phases 1-3) as optional** - Can be done before, during, or after module-kb
4. **Phase 4 = module-kb Phase 0** - Fully integrated, not separate migration

### Strategic Benefits

✅ **Business Value:** Module-kb and module-chat functionality delivered faster  
✅ **Technical Efficiency:** Touch ai-config-handler Lambda only once  
✅ **Migration Debt:** Eliminated for new modules (kb_*, chat_* tables correct from start)  
✅ **Flexibility:** Legacy migrations (Phases 1-3) can proceed independently  
✅ **Standards:** New modules serve as reference implementations

### Files Modified

1. `docs/plans/plan_module-kb-implementation.md` - Phase 0 expanded to both AI config tables
2. `docs/plans/plan_db-naming-migration.md` - Phase 4 integrated into module-kb Phase 0

### Artifacts Created

- Comprehensive risk/benefit assessment (documented in plan mode conversation)
- Cross-referenced migration strategy across two plans
- Updated session notes (this section)

**Progress:** 100% complete  
**Total Time:** ~4.5 hours  
**Impact:** Module-kb can proceed with clean slate - all referenced tables will have correct naming before main implementation begins.

### Next Steps

1. Execute module-kb Phase 0 (AI config table migration) - 3-4 hours
2. Proceed with module-kb Phases 1-12 - ~30-42 hours remaining
3. Optionally: Complete DB migration Phases 1-3 (auth, system, workspace tables)
4. Proceed with module-chat implementation using module-kb

---

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

**Goal:** Enforce database naming standards in Module Development Guide to unblock module-kb development.

**Status:** All 7 Phases Complete + Standards Expanded to All Specialized Tables

### ✅ Completed Phases

#### Phase 1: Update Prerequisites Section (30 min) ✅
- Added "Database Standards" subsection to Phase 0 
- Checklist requires review of DATABASE-NAMING-STANDARDS.md
- Understanding of plural forms, prefix abbreviations, config table patterns

#### Phase 2: Update Entity Identification Section (45 min) ✅
- Updated entity specification: "plural for table, singular for API/types"
- Added comprehensive "Entity Naming Standards" subsection
- Added examples table: DB → API → Type transformations
- Included prefix abbreviation guidance (ws_, wf_, cert_, org_)

#### Phase 3: Add Compliance Checkpoint (30 min) ✅
- Critical warning box at Step 3.3 (Database Implementation)
- Pre-implementation checklist covers:
  - Core table prefixes: sys_, ai_, org_, user_ (security foundation)
  - Functional module prefixes: ws_, kb_, chat_, wf_ (new modules add here)
  - Column, FK, index, constraint naming patterns
- **Corrected** based on user feedback about actual prefix usage

#### Phase 4: Update Schema Template (1 hour) ✅
- Template emphasizes PLURAL table names (`{entities}` not `{entity}`)
- Comments throughout template enforce plural naming
- References corrected: `public.orgs` not `public.org`

#### Phase 5: Create Validation Script (2 hours) ✅
- Created: `scripts/validate-db-naming.py`
- Features:
  - Check tables use plural form
  - Verify prefix abbreviations documented
  - Validate snake_case columns
  - Check FK pattern, index pattern
  - Report violations with line numbers

#### Phase 6: Update AI Prompting Templates (45 min) ✅
- Added standards compliance to Phase 1 Discovery prompt
- Added detailed validation to Phase 3 Implementation prompt
- Updated to reference Rule 8 (config pattern)

#### Phase 7: Update Documentation Links (15 min) ✅
- Added DATABASE-NAMING-STANDARDS.md to Related Documentation
- Marked as **REQUIRED**

### 🎯 Additional Accomplishments

#### ADR-011: Specialized Table Naming Conventions ✅
- **File:** `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARD.md`
- **Scope Expanded:** Covers Config, Log, History, Usage, State, and Queue tables
- **Pattern Approved:** `{module}_{type}_{scope_or_purpose}`
- **Examples:** `ws_cfg_sys`, `user_log_auth`, `ai_hist_model_validation`
- **Benefits:** Immediate identification, no redundancy, grep-friendly

#### Rule 8: Specialized Table Patterns ✅
- **File:** `docs/standards/cora/standard_DATABASE-NAMING.md`
- Added comprehensive Rule 8 with all infix patterns (`_cfg_`, `_log_`, `_hist_`, etc.)
- Deprecated Rule 7 (namespace prefixes) with migration path
- Migration required: `sys_lambda_config` → `sys_cfg_lambda`, `ws_configs` → `ws_cfg_sys`

#### Validator & Migration Plan ✅
- **Validator:** `scripts/validate-db-naming.py` updated for Python 3.9 + all specialized patterns
- **Plan:** `docs/plans/plan_db-naming-migration.md` created (Phased approach, 13 tables)

#### Standards Updates ✅
- Changed `platform_` → `sys_` throughout documentation
- Updated all config table examples to use `_cfg_` infix
- Documented scope levels: sys, org, ws, user

**Progress:** 100% complete  
**Total Time:** ~6 hours (includes ADR-011 creation)  
**Impact:** Module Development Guide now enforces naming standards at all checkpoints. Config table naming standardized with grep-friendly pattern.

### 📋 Future Work (Migration Phase)
**Plan:** `docs/plans/plan_db-naming-migration.md`

1. **Phase 1 (Critical):** `sys_idp_config` + `sys_log_idp_audit` (Auth system)
2. **Phase 2 (High):** `sys_lambda_config` (System config)
3. **Phase 3 (High):** `ws_configs` + `ws_org_settings` + `ws_activity_log` (Workspace module)
4. **Phase 4 (Medium):** `org_prompt_engineering` + `sys_rag` (AI module)
5. **Phase 5-6 (Low):** Defer log/usage tables

---

## ✅ Session 123: Build Error Fixes + Standards Cleanup - **COMPLETE**

---

## ✅ Completed: Plan Status Documentation (Session 124 - January 14, 2026)

**Investigation Results:**

1. **plan_missing-admin-pages-implementation.md** - ✅ **Phase 3 COMPLETE** (undocumented)
   - All components implemented: PlatformMgmtAdmin, ScheduleTab, PerformanceTab, StorageTab
   - Plan updated to reflect completion

2. **plan_ai-platform-seeding-strategy.md** - ✅ **Status ACCURATE** 
   - Correctly marked as "PLANNING" / "AWAITING APPROVAL"
   - No implementation work found (as expected)

3. **plan_module-ui-integration.md** - ✅ **FULLY IMPLEMENTED** (undocumented)
   - All 6 phases complete: Types, moduleRegistry.ts, Sidebar, Layout, Admin Pages, Module Exports
   - Standards ARE available for next module development
   - Plan updated to reflect completion

**Conclusion:** Module UI integration standards are ready. Next modules (module-kb, module-chat) can use the established patterns.

---

## Current Test Environment

**Project:** ai-sec (test-ws-23)

| Repo | Path |
|------|------|
| Stack | `~/code/bodhix/testing/test-ws-23/ai-sec-stack` |
| Infra | `~/code/bodhix/testing/test-ws-23/ai-sec-infra` |

**Note:** Update these paths when creating new test environments.

---

## ⏳ Outstanding User Testing Validations

**Status:** User must recreate project from templates, deploy, and test each item.

| # | Issue | API/Component | Expected Result | Code Verified | User Tested |
|---|-------|---------------|-----------------|---------------|-------------|
| 1 | GET /orgs/{id}/invites returns 403 | Invites API | Invites load for org admins | ✅ | ✅ Working - found #9, #10 |
| 2 | PUT /ws/config returns 400 | Workspace Config API | Config saves successfully (200) | ✅ **FIXED** | ✅ **WORKING** |
| 3 | GET /ws/config data not displayed | Workspace Config UI | Saved config displays in UI after refresh | ✅ **FIXED** | ✅ **WORKING** (requires refresh) |
| 4 | GET /admin/users shows "No name" | Users API | User names display correctly | ✅ **FIXED** | ✅ **WORKING** |
| 5 | Edit Workspace popup empty | Workspace Edit Modal | Existing values populate form | ✅ **FIXED** | ✅ **WORKING** |
| 6 | Org Members shows "Unknown User" | Org Members Tab | Member names/emails display | ✅ **FIXED** | ✅ **WORKING** |
| 7 | AI Config shows no models | AI Config Panel | Chat/embedding models appear in dropdowns | ✅ **FIXED** | ✅ **WORKING** |
| 8 | Lambda Warming toggle not working | Platform Mgmt | Toggle state displays correctly, saves | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 9 | Invites "Invited By" shows "Unknown" | Invites Tab | Shows inviter name/email | ✅ **FIXED** | ✅ **WORKING** |
| 10 | Create Invitation missing expiration | Invite Dialog | Date picker with 7-day default | ✅ **FIXED** | ✅ **WORKING** |
| 11 | Embedding dimension warning inverted | AI Config Panel | Warning only for non-1024 dimensions | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 12 | Org members missing action buttons | Org Members Tab | Edit/delete buttons for org_owner | 🔍 **INVESTIGATING** | ⏳ Pending |
| 13 | AI config save returns 400 | AI Config API | Saves with camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (requires refresh) |
| 14 | Lambda warming config errors | Platform Mgmt | Custom schedule + camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (custom schedule pending) |

**Note:** Each user-tested issue may discover additional sub-issues requiring fixes (as seen with #1 → #9, #10, and #8 → #11, #12, #13, #14).

---

## ✅ Session 123 Fixes Applied to Templates

### New Fixes (Session 123 - January 14, 2026)

#### 9. Invites "Invited By" shows "Unknown"
- **File:** `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
- **Issue:** API returned `invitedBy` as UUID, frontend expected `{ name, email }` object
- **Fix:** Modified `handle_list_invites()` to enrich each invite with inviter profile data

#### 10. Create Invitation missing expiration date picker
- **Files:**
  - `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
  - `templates/_modules-core/module-access/frontend/types/index.ts`
  - `templates/_modules-core/module-access/frontend/components/org/InviteMemberDialog.tsx`
- **Fix:** 
  - Backend: Accept `expiresAt` field (camelCase per API-PATTERNS standard)
  - Frontend type: Added `expiresAt?: string` to `InviteMemberInput`
  - Frontend dialog: Added date picker with 7 calendar day default

#### 11. Workspace Config - Missing fields
- **Files:**
  - `scripts/migrations/20260114_ws_configs_add_tag_retention_fields.sql` (new)
  - `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** 
  - API response incorrectly wrapped: `{ config: { config: {...} } }`
  - Missing 3 fields in ws_configs: default_retention_days, max_tags_per_workspace, max_tag_length
- **Fix:**
  - Lambda: Added field_mapping for new fields, updated validation
  - API client: Fixed updateConfig to unwrap `response.data.config` correctly
  - Database: Created migration to add 3 new columns with defaults

#### 12. Workspace Icon - Display not updating
- **Files:**
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** Workspace icon saved to DB but Sidebar doesn't update until page refresh
- **Root Cause:** Independent React hook state - Sidebar and Settings page use separate `useWorkspaceConfig` instances
- **Fix:** Updated Sidebar to use `wsConfig.navIcon` (data saves correctly)
- **Known Limitation:** Icon updates require browser refresh (each hook has independent state)
- **Future Enhancement:** Implement shared state management (Context/React Query) for real-time updates

### Newly Discovered Issues (Session 123 - January 14, 2026)

#### 14. Embedding Dimension Warning Logic Inverted ✅ FIXED
- **Issue:** Warning shows when selecting 1024 dimensions (the default), should only show for non-1024
- **Root Cause:** `RECOMMENDED_DIMENSIONS` constant set to 1536 instead of 1024
- **Fix:** Changed `RECOMMENDED_DIMENSIONS` from 1536 → 1024 in `ModelSelectionModal.tsx`
- **Status:** ✅ Working - tested by user

#### 15. Org Members Missing Action Buttons
- **Issue:** No edit/delete buttons in org members list, even for org_owner
- **Expected Behavior:** org_owner should see action buttons to edit member roles and remove members from org
- **Note:** Delete should remove from org, not delete from system
- **Status:** Pending fix

#### 16. AI Config Save Returns 400 Error ✅ FIXED
- **Issue:** PUT /admin/ai/config returns 400 "Both default_embedding_model_id and default_chat_model_id are required"
- **Root Cause:** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `ai-config-handler/lambda_function.py`
- **Status:** ✅ Working - saves successfully
- **Known Limitation:** Frontend doesn't refresh state after save (requires browser refresh to see saved values)
- **Future Enhancement:** Update frontend to refresh local state after successful PUT request

#### 17. Lambda Warming Config Issues ✅ PARTIALLY FIXED
- **Issues:**
  1. ✅ Toggle save works - Fixed with field_mapping in `lambda-mgmt/lambda_function.py`
  2. ⏳ Custom schedule option not selectable (under investigation)
- **Root Cause (Toggle):** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `lambda-mgmt/lambda_function.py`
- **Status:** Toggle working, custom schedule needs frontend investigation
- **Next Steps:** Check browser console for errors when selecting custom schedule

#### 13. Template Placeholder Issue - sync-fix-to-project.sh
- **Files:**
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Issue:** Template files contain `{{PROJECT_NAME}}` placeholders that aren't replaced when syncing
- **Impact:** TypeScript build errors: `Cannot find module '@{{PROJECT_NAME}}/...'`
- **Workaround:** Manually replace placeholders with `sed` after syncing
- **Future Enhancement:** Add template variable substitution to sync-fix-to-project.sh script

### Build Error Fixes (TypeScript/Frontend)

#### 1. OrgMembersList.tsx - Field name alignment
- **File:** `templates/_modules-core/module-access/frontend/components/org/OrgMembersList.tsx`
- **Fixes:**
  - `member.roleName` → `member.orgRole` (required field)
  - `member.user` → `member.profile` (current API structure)
  - `member.joinedAt` → `member.joinedAt || member.createdAt` (handles undefined)

#### 2. Workspace admin route - Session type
- **File:** `templates/_modules-functional/module-ws/routes/admin/org/ws/[id]/page.tsx`
- **Fix:** Changed from `useSession` with `session?.user?.orgId` to `useUser()` hook with `profile?.currentOrgId`

#### 3. Workspace detail route - userId access
- **File:** `templates/_modules-functional/module-ws/routes/ws/[id]/page.tsx`
- **Fix:** Added `useUser()` hook to get userId instead of `useOrganizationContext()` (which doesn't provide userId)

#### 4. Sidebar.tsx - Multiple fixes
- **File:** `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Fixes:**
  - `wsConfig?.nav_label_plural` → `wsConfig?.navLabelPlural` (camelCase)
  - Wrapped OrgIcon in Box to apply sx props (OrgIcon doesn't accept sx directly)

#### 5. ModelCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelCard.tsx`
- **Fixes:**
  - `model.model_name` → `model.modelName`
  - `model.deployment_status` → `model.deploymentStatus`
  - `model.supports_chat` → `model.supportsChat`
  - `model.supports_embeddings` → `model.supportsEmbeddings`
  - `model.capabilities?.embedding_dimensions` → `model.capabilities?.embeddingDimensions`

#### 6. ViewModelsModal.tsx - Type key access
- **File:** `templates/_modules-core/module-ai/frontend/components/models/ViewModelsModal.tsx`
- **Fixes:**
  - `categoryCounts.requiresInferenceProfile` → `categoryCounts.requires_inference_profile`
  - `categoryCounts.invalidRequestFormat` → `categoryCounts.invalid_request_format`
  - (Note: These use snake_case because ValidationCategory type uses snake_case enum values)

#### 7. ModelSelectionModal.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelSelectionModal.tsx`
- **Fix:** `model.model_name` → `model.modelName`

#### 8. ProviderCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/providers/ProviderCard.tsx`
- **Fix:** `modelCounts.by_category` → `modelCounts.byCategory`

### Standards Cleanup

#### 9. Deleted superseded standard
- **Deleted:** `docs/standards/standard_api-response.md`
- **Reason:** Superseded by `docs/standards/standard_API-PATTERNS.md` which is more comprehensive (covers requests + responses)

### Script Improvements

#### 10. create-cora-project.sh - Module dependency registration
- **File:** `scripts/create-cora-project.sh`
- **Enhancement:** Now automatically adds functional modules as dependencies to `apps/web/package.json`
- **Works with:** module-ws, module-chat, module-kb (any functional module)

---

## 🔄 Known Remaining Issue

### useWorkspace.ts - Session type augmentation
- **File:** `templates/_modules-functional/module-ws/frontend/hooks/useWorkspace.ts`
- **Issue:** `session?.accessToken` not resolving despite type augmentation existing
- **Cause:** Module's TypeScript compilation doesn't pick up apps/web type augmentation
- **Status:** Needs investigation - may require tsconfig adjustment or type re-export

---

## Build Error Warnings (Non-Issues)

### Lambda Authorizer pip warnings
The following pip dependency warnings during `./build.sh` are **NOT issues**:
- PyJWT 2.8.0 vs 2.9.0/2.10.1 - OK, Lambda runs in isolated environment
- cryptography 46.0.3 vs <46.0.0 - OK, Lambda has its own dependencies
- urllib3 version mismatch - OK, for Python <3.10 only

Build succeeds with `✅ Built: build/authorizer.zip` - warnings are about local vs Lambda package conflicts.

---

## 🟡 Session 122 Fixes (Previously Applied)

### Backend Fixes
1. **GET /orgs/{id}/invites - 403** - Fixed `role` → `org_role` in authorization checks
2. **PUT /ws/config - 400** - Added field_mapping for camelCase/snake_case
3. **GET /ws/config - UI display** - Added `_transform_config()` for DB→API response
4. **GET /admin/users - "No name"** - Added `_transform_user()` function

### Frontend Fixes
5. **Edit Workspace popup** - Added useEffect to sync form values
6. **Org Members display** - Updated interface to match API (`profile` vs `user`)
7. **OrgMember type** - Updated interface structure
8. **AI Config models** - Fixed `supports_chat` → `supportsChat` filters

### Tooling
9. **API Response Validator** - Added `check_untransformed_db_data()` detection

---

## 🛠️ Shared Utilities Available

### org_common Transform Utilities
**File:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`

**Session 126: Module-KB Planning & DB Migration Integration** - ✅ **COMPLETE** (January 14, 2026)

---

## ✅ Session 126: Module-KB Planning & DB Migration Integration - **COMPLETE** (January 14, 2026)

**Goal:** Review module-kb and module-chat implementation plans, assess risks of implementing before legacy DB migration, and integrate AI config table migration into module-kb Phase 0.

**Status:** Complete - Strategic planning and plan updates finalized

### Context

User expressed urgency to implement module-kb and module-chat despite legacy tables not yet aligned with new naming standards. Analysis needed to assess risks vs benefits of proceeding.

### Completed Work

#### 1. Risk/Benefit Assessment (2 hours)
- **Reviewed Plans:**
  - `plan_module-kb-implementation.md` - 12 phases, ~33-48 hours
  - `plan_module-chat-implementation.md` - 13 phases, ~30-45 hours
  - `plan_db-naming-migration.md` - 6 phases, 13 legacy tables

- **Key Finding:** NEW module tables (kb_*, chat_*) use correct naming from inception. Risk is primarily in references to LEGACY tables via API calls.

- **Risk Analysis:**
  - ✅ LOW: New modules use APIs, not direct SQL to legacy tables (abstraction layer)
  - ✅ LOW: Core entity tables (orgs, workspaces, users) not being renamed
  - 🟡 MEDIUM: Technical debt from two "vintages" of naming (manageable)
  - ❌ HIGH (mitigated): Would need to update ai-config-handler Lambda twice if migrating sys_rag separately

- **Recommendation:** Proceed with module-kb first, BUT migrate BOTH AI config tables (sys_rag + org_prompt_engineering) in Phase 0 to avoid touching same Lambda twice.

#### 2. Module-KB Phase 0 Enhancement (1.5 hours)
- **File:** `docs/plans/plan_module-kb-implementation.md`
- **Changes:**
  - Renamed Phase 0 from "RAG Table Migration" to "AI Config Table Migration"
  - Added `org_prompt_engineering` → `ai_cfg_org_prompts` to migration scope
  - Duration: Increased from 2-3 hours to 3-4 hours (both tables)
  - **Rationale:** Both tables used by same Lambda (`ai-config-handler`) - follows "touch each Lambda only once" principle

- **Migration SQL Updated:**
  - Single migration file: `20260114_ai_config_tables_migration.sql`
  - Migrates both `sys_rag` and `org_prompt_engineering` together
  - Includes RLS policies for both tables
  - Creates backward-compatible views for both tables

- **Testing Expanded:**
  - Added org prompt API testing
  - Added RLS testing for org-level prompts (org admins can edit, org members can read)

#### 3. DB Migration Plan Integration (1 hour)
- **File:** `docs/plans/plan_db-naming-migration.md`
- **Changes:**
  - Phase 4 marked as "✅ HANDLED BY MODULE-KB PHASE 0"
  - Both AI config tables now migrated via module-kb
  - Updated "New Module Development Gate" section
  - Updated Lambda Grouping Summary
  - Added cross-references between plans

- **Strategic Impact:**
  - Phase 4 no longer standalone - integrated into module-kb workflow
  - Reduces total migration phases from 6 to 5 (Phase 4 = module-kb Phase 0)
  - Eliminates future migration debt for module-kb

#### 4. Cross-Plan Coordination
- **Links Added:**
  - module-kb plan → DB migration plan Phase 4
  - DB migration plan → module-kb Phase 0
  - Both plans reference each other for complete context

- **Decision Matrix Documented:**
  - If implementing module-kb first: Phase 4 automatic, then Phases 1-3 as needed
  - If migrating existing modules first: Complete Phases 1-3, skip Phase 4 (handled by module-kb)

### Key Decisions

1. **Proceed with module-kb implementation now** - Business urgency outweighs technical debt risk
2. **Migrate BOTH AI config tables in Phase 0** - Avoids touching ai-config-handler Lambda twice
3. **Keep legacy table migrations (Phases 1-3) as optional** - Can be done before, during, or after module-kb
4. **Phase 4 = module-kb Phase 0** - Fully integrated, not separate migration

### Strategic Benefits

✅ **Business Value:** Module-kb and module-chat functionality delivered faster  
✅ **Technical Efficiency:** Touch ai-config-handler Lambda only once  
✅ **Migration Debt:** Eliminated for new modules (kb_*, chat_* tables correct from start)  
✅ **Flexibility:** Legacy migrations (Phases 1-3) can proceed independently  
✅ **Standards:** New modules serve as reference implementations

### Files Modified

1. `docs/plans/plan_module-kb-implementation.md` - Phase 0 expanded to both AI config tables
2. `docs/plans/plan_db-naming-migration.md` - Phase 4 integrated into module-kb Phase 0

### Artifacts Created

- Comprehensive risk/benefit assessment (documented in plan mode conversation)
- Cross-referenced migration strategy across two plans
- Updated session notes (this section)

**Progress:** 100% complete  
**Total Time:** ~4.5 hours  
**Impact:** Module-kb can proceed with clean slate - all referenced tables will have correct naming before main implementation begins.

### Next Steps

1. Execute module-kb Phase 0 (AI config table migration) - 3-4 hours
2. Proceed with module-kb Phases 1-12 - ~30-42 hours remaining
3. Optionally: Complete DB migration Phases 1-3 (auth, system, workspace tables)
4. Proceed with module-chat implementation using module-kb

---

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

## ✅ Session 125: Database Naming Standards Enforcement - **COMPLETE** (January 14, 2026)

**Goal:** Enforce database naming standards in Module Development Guide to unblock module-kb development.

**Status:** All 7 Phases Complete + Standards Expanded to All Specialized Tables

### ✅ Completed Phases

#### Phase 1: Update Prerequisites Section (30 min) ✅
- Added "Database Standards" subsection to Phase 0 
- Checklist requires review of DATABASE-NAMING-STANDARDS.md
- Understanding of plural forms, prefix abbreviations, config table patterns

#### Phase 2: Update Entity Identification Section (45 min) ✅
- Updated entity specification: "plural for table, singular for API/types"
- Added comprehensive "Entity Naming Standards" subsection
- Added examples table: DB → API → Type transformations
- Included prefix abbreviation guidance (ws_, wf_, cert_, org_)

#### Phase 3: Add Compliance Checkpoint (30 min) ✅
- Critical warning box at Step 3.3 (Database Implementation)
- Pre-implementation checklist covers:
  - Core table prefixes: sys_, ai_, org_, user_ (security foundation)
  - Functional module prefixes: ws_, kb_, chat_, wf_ (new modules add here)
  - Column, FK, index, constraint naming patterns
- **Corrected** based on user feedback about actual prefix usage

#### Phase 4: Update Schema Template (1 hour) ✅
- Template emphasizes PLURAL table names (`{entities}` not `{entity}`)
- Comments throughout template enforce plural naming
- References corrected: `public.orgs` not `public.org`

#### Phase 5: Create Validation Script (2 hours) ✅
- Created: `scripts/validate-db-naming.py`
- Features:
  - Check tables use plural form
  - Verify prefix abbreviations documented
  - Validate snake_case columns
  - Check FK pattern, index pattern
  - Report violations with line numbers

#### Phase 6: Update AI Prompting Templates (45 min) ✅
- Added standards compliance to Phase 1 Discovery prompt
- Added detailed validation to Phase 3 Implementation prompt
- Updated to reference Rule 8 (config pattern)

#### Phase 7: Update Documentation Links (15 min) ✅
- Added DATABASE-NAMING-STANDARDS.md to Related Documentation
- Marked as **REQUIRED**

### 🎯 Additional Accomplishments

#### ADR-011: Specialized Table Naming Conventions ✅
- **File:** `docs/arch decisions/ADR-011-TABLE-NAMING-STANDARD.md`
- **Scope Expanded:** Covers Config, Log, History, Usage, State, and Queue tables
- **Pattern Approved:** `{module}_{type}_{scope_or_purpose}`
- **Examples:** `ws_cfg_sys`, `user_log_auth`, `ai_hist_model_validation`
- **Benefits:** Immediate identification, no redundancy, grep-friendly

#### Rule 8: Specialized Table Patterns ✅
- **File:** `docs/standards/cora/standard_DATABASE-NAMING.md`
- Added comprehensive Rule 8 with all infix patterns (`_cfg_`, `_log_`, `_hist_`, etc.)
- Deprecated Rule 7 (namespace prefixes) with migration path
- Migration required: `sys_lambda_config` → `sys_cfg_lambda`, `ws_configs` → `ws_cfg_sys`

#### Validator & Migration Plan ✅
- **Validator:** `scripts/validate-db-naming.py` updated for Python 3.9 + all specialized patterns
- **Plan:** `docs/plans/plan_db-naming-migration.md` created (Phased approach, 13 tables)

#### Standards Updates ✅
- Changed `platform_` → `sys_` throughout documentation
- Updated all config table examples to use `_cfg_` infix
- Documented scope levels: sys, org, ws, user

**Progress:** 100% complete  
**Total Time:** ~6 hours (includes ADR-011 creation)  
**Impact:** Module Development Guide now enforces naming standards at all checkpoints. Config table naming standardized with grep-friendly pattern.

### 📋 Future Work (Migration Phase)
**Plan:** `docs/plans/plan_db-naming-migration.md`

1. **Phase 1 (Critical):** `sys_idp_config` + `sys_log_idp_audit` (Auth system)
2. **Phase 2 (High):** `sys_lambda_config` (System config)
3. **Phase 3 (High):** `ws_configs` + `ws_org_settings` + `ws_activity_log` (Workspace module)
4. **Phase 4 (Medium):** `org_prompt_engineering` + `sys_rag` (AI module)
5. **Phase 5-6 (Low):** Defer log/usage tables

---

## ✅ Session 123: Build Error Fixes + Standards Cleanup - **COMPLETE**

---

## ✅ Completed: Plan Status Documentation (Session 124 - January 14, 2026)

**Investigation Results:**

1. **plan_missing-admin-pages-implementation.md** - ✅ **Phase 3 COMPLETE** (undocumented)
   - All components implemented: PlatformMgmtAdmin, ScheduleTab, PerformanceTab, StorageTab
   - Plan updated to reflect completion

2. **plan_ai-platform-seeding-strategy.md** - ✅ **Status ACCURATE** 
   - Correctly marked as "PLANNING" / "AWAITING APPROVAL"
   - No implementation work found (as expected)

3. **plan_module-ui-integration.md** - ✅ **FULLY IMPLEMENTED** (undocumented)
   - All 6 phases complete: Types, moduleRegistry.ts, Sidebar, Layout, Admin Pages, Module Exports
   - Standards ARE available for next module development
   - Plan updated to reflect completion

**Conclusion:** Module UI integration standards are ready. Next modules (module-kb, module-chat) can use the established patterns.

---

## Current Test Environment

**Project:** ai-sec (test-ws-23)

| Repo | Path |
|------|------|
| Stack | `~/code/bodhix/testing/test-ws-23/ai-sec-stack` |
| Infra | `~/code/bodhix/testing/test-ws-23/ai-sec-infra` |

**Note:** Update these paths when creating new test environments.

---

## ⏳ Outstanding User Testing Validations

**Status:** User must recreate project from templates, deploy, and test each item.

| # | Issue | API/Component | Expected Result | Code Verified | User Tested |
|---|-------|---------------|-----------------|---------------|-------------|
| 1 | GET /orgs/{id}/invites returns 403 | Invites API | Invites load for org admins | ✅ | ✅ Working - found #9, #10 |
| 2 | PUT /ws/config returns 400 | Workspace Config API | Config saves successfully (200) | ✅ **FIXED** | ✅ **WORKING** |
| 3 | GET /ws/config data not displayed | Workspace Config UI | Saved config displays in UI after refresh | ✅ **FIXED** | ✅ **WORKING** (requires refresh) |
| 4 | GET /admin/users shows "No name" | Users API | User names display correctly | ✅ **FIXED** | ✅ **WORKING** |
| 5 | Edit Workspace popup empty | Workspace Edit Modal | Existing values populate form | ✅ **FIXED** | ✅ **WORKING** |
| 6 | Org Members shows "Unknown User" | Org Members Tab | Member names/emails display | ✅ **FIXED** | ✅ **WORKING** |
| 7 | AI Config shows no models | AI Config Panel | Chat/embedding models appear in dropdowns | ✅ **FIXED** | ✅ **WORKING** |
| 8 | Lambda Warming toggle not working | Platform Mgmt | Toggle state displays correctly, saves | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 9 | Invites "Invited By" shows "Unknown" | Invites Tab | Shows inviter name/email | ✅ **FIXED** | ✅ **WORKING** |
| 10 | Create Invitation missing expiration | Invite Dialog | Date picker with 7-day default | ✅ **FIXED** | ✅ **WORKING** |
| 11 | Embedding dimension warning inverted | AI Config Panel | Warning only for non-1024 dimensions | ✅ **FIXED** (Session 123) | ✅ **WORKING** |
| 12 | Org members missing action buttons | Org Members Tab | Edit/delete buttons for org_owner | 🔍 **INVESTIGATING** | ⏳ Pending |
| 13 | AI config save returns 400 | AI Config API | Saves with camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (requires refresh) |
| 14 | Lambda warming config errors | Platform Mgmt | Custom schedule + camelCase field names | ✅ **FIXED** (Session 123) | ✅ **WORKING** (custom schedule pending) |

**Note:** Each user-tested issue may discover additional sub-issues requiring fixes (as seen with #1 → #9, #10, and #8 → #11, #12, #13, #14).

---

## ✅ Session 123 Fixes Applied to Templates

### New Fixes (Session 123 - January 14, 2026)

#### 9. Invites "Invited By" shows "Unknown"
- **File:** `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
- **Issue:** API returned `invitedBy` as UUID, frontend expected `{ name, email }` object
- **Fix:** Modified `handle_list_invites()` to enrich each invite with inviter profile data

#### 10. Create Invitation missing expiration date picker
- **Files:**
  - `templates/_modules-core/module-access/backend/lambdas/invites/lambda_function.py`
  - `templates/_modules-core/module-access/frontend/types/index.ts`
  - `templates/_modules-core/module-access/frontend/components/org/InviteMemberDialog.tsx`
- **Fix:** 
  - Backend: Accept `expiresAt` field (camelCase per API-PATTERNS standard)
  - Frontend type: Added `expiresAt?: string` to `InviteMemberInput`
  - Frontend dialog: Added date picker with 7 calendar day default

#### 11. Workspace Config - Missing fields
- **Files:**
  - `scripts/migrations/20260114_ws_configs_add_tag_retention_fields.sql` (new)
  - `templates/_modules-functional/module-ws/backend/lambdas/workspace/lambda_function.py`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** 
  - API response incorrectly wrapped: `{ config: { config: {...} } }`
  - Missing 3 fields in ws_configs: default_retention_days, max_tags_per_workspace, max_tag_length
- **Fix:**
  - Lambda: Added field_mapping for new fields, updated validation
  - API client: Fixed updateConfig to unwrap `response.data.config` correctly
  - Database: Created migration to add 3 new columns with defaults

#### 12. Workspace Icon - Display not updating
- **Files:**
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
- **Issue:** Workspace icon saved to DB but Sidebar doesn't update until page refresh
- **Root Cause:** Independent React hook state - Sidebar and Settings page use separate `useWorkspaceConfig` instances
- **Fix:** Updated Sidebar to use `wsConfig.navIcon` (data saves correctly)
- **Known Limitation:** Icon updates require browser refresh (each hook has independent state)
- **Future Enhancement:** Implement shared state management (Context/React Query) for real-time updates

### Newly Discovered Issues (Session 123 - January 14, 2026)

#### 14. Embedding Dimension Warning Logic Inverted ✅ FIXED
- **Issue:** Warning shows when selecting 1024 dimensions (the default), should only show for non-1024
- **Root Cause:** `RECOMMENDED_DIMENSIONS` constant set to 1536 instead of 1024
- **Fix:** Changed `RECOMMENDED_DIMENSIONS` from 1536 → 1024 in `ModelSelectionModal.tsx`
- **Status:** ✅ Working - tested by user

#### 15. Org Members Missing Action Buttons
- **Issue:** No edit/delete buttons in org members list, even for org_owner
- **Expected Behavior:** org_owner should see action buttons to edit member roles and remove members from org
- **Note:** Delete should remove from org, not delete from system
- **Status:** Pending fix

#### 16. AI Config Save Returns 400 Error ✅ FIXED
- **Issue:** PUT /admin/ai/config returns 400 "Both default_embedding_model_id and default_chat_model_id are required"
- **Root Cause:** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `ai-config-handler/lambda_function.py`
- **Status:** ✅ Working - saves successfully
- **Known Limitation:** Frontend doesn't refresh state after save (requires browser refresh to see saved values)
- **Future Enhancement:** Update frontend to refresh local state after successful PUT request

#### 17. Lambda Warming Config Issues ✅ PARTIALLY FIXED
- **Issues:**
  1. ✅ Toggle save works - Fixed with field_mapping in `lambda-mgmt/lambda_function.py`
  2. ⏳ Custom schedule option not selectable (under investigation)
- **Root Cause (Toggle):** API expects snake_case but receives camelCase from frontend
- **Fix:** Added field_mapping to `lambda-mgmt/lambda_function.py`
- **Status:** Toggle working, custom schedule needs frontend investigation
- **Next Steps:** Check browser console for errors when selecting custom schedule

#### 13. Template Placeholder Issue - sync-fix-to-project.sh
- **Files:**
  - `templates/_modules-functional/module-ws/frontend/lib/api.ts`
  - `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Issue:** Template files contain `{{PROJECT_NAME}}` placeholders that aren't replaced when syncing
- **Impact:** TypeScript build errors: `Cannot find module '@{{PROJECT_NAME}}/...'`
- **Workaround:** Manually replace placeholders with `sed` after syncing
- **Future Enhancement:** Add template variable substitution to sync-fix-to-project.sh script

### Build Error Fixes (TypeScript/Frontend)

#### 1. OrgMembersList.tsx - Field name alignment
- **File:** `templates/_modules-core/module-access/frontend/components/org/OrgMembersList.tsx`
- **Fixes:**
  - `member.roleName` → `member.orgRole` (required field)
  - `member.user` → `member.profile` (current API structure)
  - `member.joinedAt` → `member.joinedAt || member.createdAt` (handles undefined)

#### 2. Workspace admin route - Session type
- **File:** `templates/_modules-functional/module-ws/routes/admin/org/ws/[id]/page.tsx`
- **Fix:** Changed from `useSession` with `session?.user?.orgId` to `useUser()` hook with `profile?.currentOrgId`

#### 3. Workspace detail route - userId access
- **File:** `templates/_modules-functional/module-ws/routes/ws/[id]/page.tsx`
- **Fix:** Added `useUser()` hook to get userId instead of `useOrganizationContext()` (which doesn't provide userId)

#### 4. Sidebar.tsx - Multiple fixes
- **File:** `templates/_project-stack-template/apps/web/components/Sidebar.tsx`
- **Fixes:**
  - `wsConfig?.nav_label_plural` → `wsConfig?.navLabelPlural` (camelCase)
  - Wrapped OrgIcon in Box to apply sx props (OrgIcon doesn't accept sx directly)

#### 5. ModelCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelCard.tsx`
- **Fixes:**
  - `model.model_name` → `model.modelName`
  - `model.deployment_status` → `model.deploymentStatus`
  - `model.supports_chat` → `model.supportsChat`
  - `model.supports_embeddings` → `model.supportsEmbeddings`
  - `model.capabilities?.embedding_dimensions` → `model.capabilities?.embeddingDimensions`

#### 6. ViewModelsModal.tsx - Type key access
- **File:** `templates/_modules-core/module-ai/frontend/components/models/ViewModelsModal.tsx`
- **Fixes:**
  - `categoryCounts.requiresInferenceProfile` → `categoryCounts.requires_inference_profile`
  - `categoryCounts.invalidRequestFormat` → `categoryCounts.invalid_request_format`
  - (Note: These use snake_case because ValidationCategory type uses snake_case enum values)

#### 7. ModelSelectionModal.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/ModelSelectionModal.tsx`
- **Fix:** `model.model_name` → `model.modelName`

#### 8. ProviderCard.tsx - snake_case to camelCase
- **File:** `templates/_modules-core/module-ai/frontend/components/providers/ProviderCard.tsx`
- **Fix:** `modelCounts.by_category` → `modelCounts.byCategory`

### Standards Cleanup

#### 9. Deleted superseded standard
- **Deleted:** `docs/standards/standard_api-response.md`
- **Reason:** Superseded by `docs/standards/standard_API-PATTERNS.md` which is more comprehensive (covers requests + responses)

### Script Improvements

#### 10. create-cora-project.sh - Module dependency registration
- **File:** `scripts/create-cora-project.sh`
- **Enhancement:** Now automatically adds functional modules as dependencies to `apps/web/package.json`
- **Works with:** module-ws, module-chat, module-kb (any functional module)

---

## 🔄 Known Remaining Issue

### useWorkspace.ts - Session type augmentation
- **File:** `templates/_modules-functional/module-ws/frontend/hooks/useWorkspace.ts`
- **Issue:** `session?.accessToken` not resolving despite type augmentation existing
- **Cause:** Module's TypeScript compilation doesn't pick up apps/web type augmentation
- **Status:** Needs investigation - may require tsconfig adjustment or type re-export

---

## Build Error Warnings (Non-Issues)

### Lambda Authorizer pip warnings
The following pip dependency warnings during `./build.sh` are **NOT issues**:
- PyJWT 2.8.0 vs 2.9.0/2.10.1 - OK, Lambda runs in isolated environment
- cryptography 46.0.3 vs <46.0.0 - OK, Lambda has its own dependencies
- urllib3 version mismatch - OK, for Python <3.10 only

Build succeeds with `✅ Built: build/authorizer.zip` - warnings are about local vs Lambda package conflicts.

---

## 🟡 Session 122 Fixes (Previously Applied)

### Backend Fixes
1. **GET /orgs/{id}/invites - 403** - Fixed `role` → `org_role` in authorization checks
2. **PUT /ws/config - 400** - Added field_mapping for camelCase/snake_case
3. **GET /ws/config - UI display** - Added `_transform_config()` for DB→API response
4. **GET /admin/users - "No name"** - Added `_transform_user()` function

### Frontend Fixes
5. **Edit Workspace popup** - Added useEffect to sync form values
6. **Org Members display** - Updated interface to match API (`profile` vs `user`)
7. **OrgMember type** - Updated interface structure
8. **AI Config models** - Fixed `supports_chat` → `supportsChat` filters

### Tooling
9. **API Response Validator** - Added `check_untransformed_db_data()` detection

---

## 🛠️ Shared Utilities Available

### org_common Transform Utilities
**File:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`

```python
import org_common as common

# Transform DB record to API response
api_response = common.transform_record(db_record)

# Transform list of records
api_list = common.transform_records(db_records)
```

---

---

## 🚀 Fast Iteration Testing Tooling (Session 123)

**Created:** Scripts and documentation for AI-assisted testing workflow

### Scripts
1. **`scripts/sync-fix-to-project.sh`** - Syncs template fixes to existing projects
   - Intelligently detects stack vs infra repos
   - Maps core module backend Lambdas to correct location (stack repo)
   - Supports dry-run mode for preview
   
2. **`templates/_project-infra-template/scripts/deploy-lambda.sh`** - Deploys single Lambda
   - Skips full deploy-all.sh pipeline
   - Reduces deployment time from 5-7 min to 2-3 min

### Documentation
- **`docs/guides/guide_FAST-ITERATION-TESTING.md`** - Complete usage guide
- **`.clinerules`** - Updated with AI workflow instructions

### Workflow Benefits
| Change Type | Old Time | New Time | Savings |
|-------------|----------|----------|---------|
| Frontend fix | ~5-7 min | ~30 sec | 90%+ |
| Backend Lambda | ~5-7 min | ~2-3 min | 60%+ |

**Goal:** User focuses on testing, AI handles fix → sync → deploy.

---

**Updated:** January 14, 2026, 6:30 PM EST
