# Phase 0: AI Config Table Migration - User Testing Plan

**Migration Date**: January 14, 2026  
**Tables Migrated**: `sys_rag` → `ai_cfg_sys_rag`, `org_prompt_engineering` → `ai_cfg_org_prompts`  
**Lambda Updated**: `module-ai/ai-config-handler`  
**Status**: Migration complete, ready for testing

---

## Overview

This testing plan verifies that the Phase 0 AI config table migration completed successfully and that full stack functionality works with the new CORA-compliant table names.

---

## Pre-Testing Verification

### 1. Database Schema Verification

**Objective**: Confirm tables exist with correct structure

```sql
-- Verify new tables exist
\dt ai_cfg_sys_rag
\dt ai_cfg_org_prompts

-- Verify column structure for ai_cfg_sys_rag
\d ai_cfg_sys_rag

-- Expected columns (28 total):
-- - id, available_embedding_models, default_embedding_model, embedding_model_costs
-- - available_chunking_strategies, default_chunking_strategy
-- - max_chunk_size_tokens, min_chunk_size_tokens
-- - search_quality_presets, default_search_quality, default_similarity_threshold
-- - max_search_results_global, max_context_tokens_global
-- - ocr_enabled, processing_timeout_minutes, max_concurrent_jobs_global
-- - vector_index_type, backup_retention_days, auto_scaling_enabled
-- - max_embedding_batch_size, embedding_cache_ttl_hours
-- - created_at, updated_at, updated_by
-- - provider_configurations, default_ai_provider, active_providers
-- - default_embedding_model_id, default_chat_model_id, system_prompt

-- Verify column structure for ai_cfg_org_prompts
\d ai_cfg_org_prompts

-- Expected columns (14 total):
-- - id, org_id, policy_mission_type, custom_system_prompt, custom_context_prompt
-- - citation_style, include_page_numbers, include_source_metadata
-- - response_tone, max_response_length
-- - created_by, updated_by, created_at, updated_at, org_system_prompt
```

**Success Criteria**:
- ✅ Both new tables exist
- ✅ All expected columns present
- ✅ Audit columns (created_by, updated_by) exist in ai_cfg_org_prompts
- ✅ No `configured_by` column in ai_cfg_org_prompts

---

### 2. Data Integrity Verification

**Objective**: Confirm all data migrated successfully

```sql
-- Check row counts
SELECT COUNT(*) FROM ai_cfg_sys_rag;
-- Expected: 1 (singleton table)

SELECT COUNT(*) FROM ai_cfg_org_prompts;
-- Expected: Number of orgs with custom AI config (may be 0 if none configured yet)

-- Verify backward-compatible views exist
\dv sys_rag
\dv org_prompt_engineering

-- Verify view data matches table data
SELECT COUNT(*) FROM sys_rag;
SELECT COUNT(*) FROM org_prompt_engineering;
```

**Success Criteria**:
- ✅ Row counts match expected values
- ✅ Backward-compatible views exist and return data
- ✅ View data matches table data

---

### 3. RLS Policy Verification

**Objective**: Confirm Row Level Security policies are active

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('ai_cfg_sys_rag', 'ai_cfg_org_prompts');

-- List policies for ai_cfg_sys_rag
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ai_cfg_sys_rag';

-- Expected policies:
-- 1. "Authenticated users can view ai_cfg_sys_rag" (SELECT)
-- 2. "System admins can modify ai_cfg_sys_rag" (ALL)

-- List policies for ai_cfg_org_prompts
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'ai_cfg_org_prompts';

-- Expected policies:
-- 1. "Sys admins can manage prompt engineering" (ALL)
```

**Success Criteria**:
- ✅ RLS enabled on both tables
- ✅ All expected policies exist
- ✅ Policies reference correct columns (sys_role, not role)

---

## Functional Testing

### Test Suite 1: Platform AI Configuration (System Admin Only)

#### Test 1.1: View Platform AI Config

**API Endpoint**: `GET /admin/ai/config`  
**User Role**: System Admin (sys_owner or sys_admin)  
**Test Environment**: Frontend Admin Panel → AI Configuration

**Steps**:
1. Log in as system admin
2. Navigate to Admin → AI Configuration
3. Observe platform config section

**Expected Results**:
- ✅ Platform config loads without errors
- ✅ Default embedding model displayed
- ✅ Default chat model displayed
- ✅ System prompt displayed
- ✅ No "Not Found" or 403 errors

**Verification Query**:
```sql
-- Check Lambda is reading from correct table
SELECT default_embedding_model_id, default_chat_model_id, system_prompt 
FROM ai_cfg_sys_rag 
LIMIT 1;
```

---

#### Test 1.2: Update Platform AI Config

**API Endpoint**: `PUT /admin/ai/config`  
**User Role**: System Admin  
**Test Environment**: Frontend Admin Panel → AI Configuration

**Steps**:
1. As system admin, navigate to AI Configuration
2. Change default embedding model
3. Change default chat model
4. Modify system prompt (add test text: "TEST-2026-01-14")
5. Click Save
6. Refresh page

**Expected Results**:
- ✅ Save succeeds (200 OK)
- ✅ Success message displayed
- ✅ Changes persist after refresh
- ✅ System prompt includes test text

**Verification Query**:
```sql
-- Verify update was written to correct table
SELECT system_prompt, updated_at 
FROM ai_cfg_sys_rag 
WHERE system_prompt LIKE '%TEST-2026-01-14%';

-- Should return 1 row with recent updated_at timestamp
```

---

#### Test 1.3: List Available Models

**API Endpoint**: `GET /admin/ai/models`  
**User Role**: System Admin  
**Test Environment**: Frontend Model Selection Dialog

**Steps**:
1. As system admin, open model selection dialog
2. Filter by "chat" capability
3. Filter by "embedding" capability

**Expected Results**:
- ✅ Models list loads without errors
- ✅ Chat filter shows only chat-capable models
- ✅ Embedding filter shows only embedding-capable models
- ✅ Model metadata (provider, status, dimensions) displays correctly

**Verification Query**:
```sql
-- Check models exist
SELECT COUNT(*), 
       COUNT(*) FILTER (WHERE capabilities->>'chat' = 'true') as chat_count,
       COUNT(*) FILTER (WHERE capabilities->>'embedding' = 'true') as embedding_count
FROM ai_models 
WHERE status = 'available';
```

---

### Test Suite 2: Organization AI Configuration (Org Admin)

#### Test 2.1: View Org AI Config (Inherits Platform Defaults)

**API Endpoint**: `GET /orgs/{orgId}/ai/config`  
**User Role**: Org Admin (org_owner or org_admin)  
**Test Environment**: Frontend Admin Panel → Organization Settings

**Steps**:
1. Log in as org admin
2. Navigate to Admin → Organization → AI Settings
3. Observe inherited platform config
4. Check combined system prompt

**Expected Results**:
- ✅ Org AI config loads without errors
- ✅ Platform defaults displayed (embedding model, chat model, system prompt)
- ✅ Combined prompt shows platform prompt + org prompt (if org prompt exists)
- ✅ No 403 Forbidden errors

**Verification Query**:
```sql
-- Check org config exists (may be NULL if not customized)
SELECT org_id, org_system_prompt, created_by, updated_by
FROM ai_cfg_org_prompts 
WHERE org_id = '<TEST_ORG_ID>';

-- Check platform defaults are accessible
SELECT default_embedding_model_id, default_chat_model_id, system_prompt 
FROM ai_cfg_sys_rag;
```

---

#### Test 2.2: Update Org AI Config (Custom Prompt)

**API Endpoint**: `PUT /orgs/{orgId}/ai/config`  
**User Role**: Org Admin  
**Test Environment**: Frontend Admin Panel → Organization → AI Settings

**Steps**:
1. As org admin, navigate to Organization AI Settings
2. Add custom org system prompt: "Organization-specific guidance: TEST-ORG-2026-01-14"
3. Set citation style to "inline"
4. Set response tone to "professional"
5. Click Save
6. Refresh page

**Expected Results**:
- ✅ Save succeeds (200 OK)
- ✅ Success message displayed
- ✅ Changes persist after refresh
- ✅ Combined prompt shows platform + org prompts
- ✅ **CRITICAL**: `updated_by` field populated with user ID (not NULL)
- ✅ **CRITICAL**: `created_by` field populated if new record (not NULL)

**Verification Query**:
```sql
-- Verify update written to correct table
SELECT org_id, org_system_prompt, citation_style, response_tone,
       created_by, updated_by, created_at, updated_at
FROM ai_cfg_org_prompts 
WHERE org_id = '<TEST_ORG_ID>';

-- CRITICAL: created_by and updated_by should NOT be NULL
-- updated_at should be recent (within last minute)
```

---

#### Test 2.3: Org Admin Authorization

**Objective**: Verify org admins can only access their own org config

**Steps**:
1. Log in as org admin for Org A
2. Try to access `/orgs/{orgIdB}/ai/config` (different org)
3. Expect 403 Forbidden

**Expected Results**:
- ✅ Access to own org: 200 OK
- ✅ Access to other org: 403 Forbidden
- ✅ Clear error message displayed

---

### Test Suite 3: RLS Policy Enforcement

#### Test 3.1: Non-Admin User Cannot Modify Platform Config

**API Endpoint**: `PUT /admin/ai/config`  
**User Role**: Regular user (no sys_admin role)

**Steps**:
1. Log in as regular user (org_member, not admin)
2. Attempt to call PUT /admin/ai/config via API or direct database access
3. Expect 403 Forbidden or RLS block

**Expected Results**:
- ✅ API returns 403 Forbidden
- ✅ Direct database update blocked by RLS
- ✅ Error message: "Access denied. System admin role required."

**Verification Query**:
```sql
-- Attempt update as non-admin (should fail)
SET ROLE authenticated;
SET request.jwt.claim.sub = '<NON_ADMIN_USER_ID>';

UPDATE ai_cfg_sys_rag 
SET system_prompt = 'Unauthorized change' 
WHERE id = (SELECT id FROM ai_cfg_sys_rag LIMIT 1);

-- Expected: ERROR: new row violates row-level security policy
```

---

#### Test 3.2: Non-Admin User Can View Platform Config (Read-Only)

**API Endpoint**: `GET /admin/ai/config`  
**User Role**: Authenticated user

**Steps**:
1. Log in as regular authenticated user
2. Attempt to view platform AI config

**Expected Results**:
- ✅ Read access granted (SELECT allowed)
- ✅ Platform config visible
- ✅ No sensitive data exposed (API keys sanitized)

---

#### Test 3.3: Org Admin Cannot Access Other Org's Config

**API Endpoint**: `GET /orgs/{otherOrgId}/ai/config`  
**User Role**: Org Admin of Org A

**Steps**:
1. Log in as admin of Org A
2. Attempt to access Org B's config
3. Expect 403 Forbidden

**Expected Results**:
- ✅ Access denied with 403 status
- ✅ Lambda authorization check blocks request
- ✅ Error: "Access denied. Organization admin role required."

---

### Test Suite 4: Backward Compatibility

#### Test 4.1: Views Still Function

**Objective**: Verify backward-compatible views work for any legacy code

**Steps**:
1. Query old view names directly
2. Compare results to new table names

**Verification Query**:
```sql
-- Query via view (old name)
SELECT COUNT(*), default_embedding_model_id 
FROM sys_rag;

-- Query via table (new name)
SELECT COUNT(*), default_embedding_model_id 
FROM ai_cfg_sys_rag;

-- Results should match

-- Repeat for org prompts
SELECT COUNT(*) FROM org_prompt_engineering;
SELECT COUNT(*) FROM ai_cfg_org_prompts;
```

**Expected Results**:
- ✅ Views return data
- ✅ View data matches table data
- ✅ No errors accessing views

---

## Integration Testing

### Test Suite 5: End-to-End Workflow

#### Test 5.1: Complete Platform AI Setup Flow

**Scenario**: System admin sets up platform AI configuration for the first time

**Steps**:
1. Log in as system admin
2. Navigate to Admin → AI Configuration
3. Select default embedding model (e.g., "text-embedding-3-small")
4. Select default chat model (e.g., "gpt-4")
5. Set system prompt: "You are a helpful AI assistant. Always provide accurate, evidence-based answers."
6. Save configuration
7. Log out
8. Log in as org admin
9. Navigate to Organization → AI Settings
10. Verify platform defaults are inherited
11. Add org-specific prompt: "Focus on our industry regulations and compliance requirements."
12. Save org config
13. Log out

**Expected Results**:
- ✅ Platform config saves successfully
- ✅ Org admin sees inherited platform defaults
- ✅ Org config saves successfully
- ✅ Combined prompt = platform prompt + org prompt
- ✅ All audit fields populated (created_by, updated_by)
- ✅ No errors in browser console
- ✅ No Lambda errors in CloudWatch logs

**Verification Query**:
```sql
-- Verify complete setup
SELECT 
    (SELECT COUNT(*) FROM ai_cfg_sys_rag) as platform_config_count,
    (SELECT default_embedding_model_id IS NOT NULL FROM ai_cfg_sys_rag LIMIT 1) as has_embedding_model,
    (SELECT default_chat_model_id IS NOT NULL FROM ai_cfg_sys_rag LIMIT 1) as has_chat_model,
    (SELECT COUNT(*) FROM ai_cfg_org_prompts WHERE org_system_prompt IS NOT NULL) as orgs_with_custom_prompts;

-- All should return expected values
```

---

#### Test 5.2: Module-KB RAG Retrieval (Future Integration)

**Scenario**: Verify kb-processor Lambda can retrieve embedding config

**API Endpoint**: `GET /platform/ai-config/embedding` (internal call from kb-processor)

**Steps**:
1. Simulate kb-processor Lambda calling ai-config-handler
2. Request embedding configuration
3. Verify response includes: provider, model, dimensions, API key

**Expected Results**:
- ✅ Embedding config retrieved successfully
- ✅ Response includes all required fields
- ✅ Dimensions match selected model (e.g., 1024 for Bedrock Titan V2)
- ✅ API key sanitized in public responses, real key available to Lambda

**Note**: This integration will be tested during Module-KB Phase 5 implementation.

---

## Rollback Testing (Optional)

### Test 6.1: Rollback Verification

**Objective**: Verify rollback procedure works if needed

**Steps**:
1. Follow rollback instructions in `scripts/migrations/ROLLBACK-20260114_ai_config_tables_migration.md`
2. Verify old tables restored
3. Verify data integrity
4. Re-run forward migration

**Expected Results**:
- ✅ Rollback completes without errors
- ✅ Old tables contain all data
- ✅ Forward migration can be re-run successfully

---

## Performance Testing

### Test 7.1: Query Performance

**Objective**: Verify no performance degradation

```sql
-- Time platform config query
EXPLAIN ANALYZE 
SELECT * FROM ai_cfg_sys_rag LIMIT 1;

-- Expected: < 5ms execution time

-- Time org config query with join
EXPLAIN ANALYZE
SELECT opc.*, org.name as org_name
FROM ai_cfg_org_prompts opc
JOIN orgs org ON org.id = opc.org_id
WHERE opc.org_id = '<TEST_ORG_ID>';

-- Expected: < 10ms execution time with proper indexes
```

**Success Criteria**:
- ✅ Queries execute in < 10ms
- ✅ Indexes used (check EXPLAIN ANALYZE output)
- ✅ No sequential scans on large tables

---

## Sign-Off Checklist

### Database Migration
- [ ] Both tables exist with correct names
- [ ] All data migrated (row counts match)
- [ ] Backward-compatible views work
- [ ] RLS policies active and correct
- [ ] Indexes created
- [ ] Foreign keys enforced
- [ ] Audit columns present (created_by, updated_by)

### Lambda Code
- [ ] ai-config-handler updated to use new table names
- [ ] Lambda deployed successfully
- [ ] No errors in CloudWatch logs
- [ ] Lambda writes to created_by/updated_by fields

### API Functionality
- [ ] GET platform config works (sys admin)
- [ ] PUT platform config works (sys admin)
- [ ] GET org config works (org admin)
- [ ] PUT org config works (org admin)
- [ ] PUT org config populates audit fields (created_by, updated_by)
- [ ] Models list works
- [ ] Authorization checks enforce RLS

### Frontend Integration
- [ ] Platform admin can view/edit config
- [ ] Org admin can view/edit config
- [ ] No console errors
- [ ] Changes persist after refresh
- [ ] Combined prompts display correctly

### Documentation
- [ ] Migration documented in plan
- [ ] Rollback procedure documented
- [ ] activeContext.md updated
- [ ] Template schemas updated

---

## Common Issues & Troubleshooting

### Issue 1: "Table does not exist" error

**Symptom**: Lambda returns "relation ai_cfg_sys_rag does not exist"  
**Cause**: Migration not run, or wrong database  
**Solution**: Run migration SQL, verify database connection

### Issue 2: 403 Forbidden for org admin

**Symptom**: Org admin gets 403 when accessing own org config  
**Cause**: RLS policy missing or incorrect role check  
**Solution**: Verify RLS policies use `sys_role` and `org_role` (not just `role`)

### Issue 3: Audit fields (created_by/updated_by) are NULL

**Symptom**: After saving org config, `updated_by` is NULL  
**Cause**: Lambda not setting audit fields, or migration didn't add columns  
**Solution**: 
1. Run `20260114_ai_cfg_org_prompts_add_audit_columns.sql` migration
2. Verify Lambda code sets `created_by` and `updated_by`
3. Rebuild and redeploy Lambda

### Issue 4: View does not exist after dropping configured_by

**Symptom**: "relation org_prompt_engineering does not exist"  
**Cause**: View wasn't recreated after dropping configured_by column  
**Solution**: Run view recreation SQL:
```sql
CREATE VIEW org_prompt_engineering AS SELECT * FROM ai_cfg_org_prompts;
```

---

## Test Results Template

```
# Phase 0 AI Config Migration Test Results

**Tester**: [Your Name]
**Date**: [Date]
**Environment**: [dev/staging/test]
**Test Duration**: [Time]

## Summary
- Total Tests: 24
- Passed: __
- Failed: __
- Skipped: __

## Test Suite Results

### Suite 1: Platform AI Configuration
- [ ] Test 1.1: View Platform AI Config
- [ ] Test 1.2: Update Platform AI Config
- [ ] Test 1.3: List Available Models

### Suite 2: Organization AI Configuration
- [ ] Test 2.1: View Org AI Config
- [ ] Test 2.2: Update Org AI Config (Audit Fields)
- [ ] Test 2.3: Org Admin Authorization

### Suite 3: RLS Policy Enforcement
- [ ] Test 3.1: Non-Admin Cannot Modify
- [ ] Test 3.2: Non-Admin Can View
- [ ] Test 3.3: Org Admin Isolation

### Suite 4: Backward Compatibility
- [ ] Test 4.1: Views Still Function

### Suite 5: End-to-End Workflow
- [ ] Test 5.1: Complete Platform AI Setup Flow

### Suite 7: Performance Testing
- [ ] Test 7.1: Query Performance

## Issues Found
[List any issues discovered during testing]

## Sign-Off
- [ ] All critical tests passed
- [ ] No data loss
- [ ] Performance acceptable
- [ ] Ready for production use

**Approved by**: _______________  
**Date**: _______________
```

---

**Testing Status**: ⏳ Awaiting user execution  
**Next Steps**: 
1. Run this test plan in test environment
2. Document results
3. Fix any issues found
4. Re-test
5. Sign off when all tests pass
6. Proceed to Module-KB Phase 1
