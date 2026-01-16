# Module-KB Phase 0 - User Testing Plan
## AI Config Table Migration Verification

**Test Environment**: ai-sec (test-ws-23)  
**Migration Date**: January 14, 2026  
**Tables Migrated**: `sys_rag` → `ai_cfg_sys_rag`, `org_prompt_engineering` → `ai_cfg_org_prompts`  
**Status**: Ready for User Testing

---

## Overview

This testing plan verifies that the AI Config Table Migration (Phase 0) completed successfully and all functionality works with the new table names. The migration renamed two tables to comply with CORA naming standards while maintaining zero downtime via backward-compatible views.

**Test Duration**: ~2-3 hours  
**Prerequisites**: Access to ai-sec test environment, platform_admin and org_admin test accounts

---

## Testing Checklist Summary

- [x] **Section 1**: Pre-Testing Setup (10 min)
- [ ] **Section 2**: Data Integrity Verification (15 min)
- [ ] **Section 3**: RAG Configuration API Testing (30 min)
- [ ] **Section 4**: Org Prompt API Testing (30 min)
- [ ] **Section 5**: RLS Policy Testing (30 min)
- [ ] **Section 6**: Backward Compatibility Testing (15 min)
- [ ] **Section 7**: End-to-End Integration Testing (20 min)
- [ ] **Section 8**: Performance Verification (10 min)

---

## Section 1: Pre-Testing Setup (10 min)

### 1.1 Verify Test Environment

**Goal**: Confirm test environment is ready for testing

```bash
# 1. Connect to test database
cd ~/code/bodhix/testing/test-ws-23/ai-sec-infra
psql $DATABASE_URL

# 2. Verify new tables exist
\dt ai_cfg_sys_rag
\dt ai_cfg_org_prompts

# Expected: Both tables should exist

# 3. Verify backward-compatible views exist
\dv sys_rag
\dv org_prompt_engineering

# Expected: Both views should exist
```

**Checklist**:
- [x] New tables `ai_cfg_sys_rag` and `ai_cfg_org_prompts` exist
- [x] Views `sys_rag` and `org_prompt_engineering` exist
- [x] Test user has platform_admin role
- [x] Test user has access to at least one org as org_admin

### 1.2 Identify Test Accounts

**Goal**: Document test account details for RLS testing

Record the following:
- **Platform Admin User ID**: `_________________`
- **Org Admin User ID**: `_________________`
- **Regular User ID**: `_________________`
- **Test Org ID**: `_________________`

---

## Section 2: Data Integrity Verification (15 min)

### 2.1 Row Count Verification

**Goal**: Confirm all data migrated without loss

```sql
-- Connect to database
psql $DATABASE_URL

-- Check row counts match
SELECT 'ai_cfg_sys_rag' as table_name, COUNT(*) as row_count FROM ai_cfg_sys_rag
UNION ALL
SELECT 'sys_rag (view)', COUNT(*) FROM sys_rag;

-- Expected: Row counts should match

SELECT 'ai_cfg_org_prompts' as table_name, COUNT(*) as row_count FROM ai_cfg_org_prompts
UNION ALL
SELECT 'org_prompt_engineering (view)', COUNT(*) FROM org_prompt_engineering;

-- Expected: Row counts should match
```

**Checklist**:
- [x] `ai_cfg_sys_rag` row count matches `sys_rag` view
- [x] `ai_cfg_org_prompts` row count matches `org_prompt_engineering` view
- [x] Row counts > 0 (if data existed before migration)

### 2.2 Data Content Verification

**Goal**: Verify specific data fields migrated correctly

```sql
-- Check ai_cfg_sys_rag structure and sample data
SELECT id, default_ai_provider, default_embedding_model, available_embedding_models, 
       default_chat_model_id, default_embedding_model_id, created_at
FROM ai_cfg_sys_rag
LIMIT 5;

-- Expected: All columns present, data looks valid

-- Check ai_cfg_org_prompts structure and sample data
SELECT id, org_id, policy_mission_type, custom_system_prompt, 
       citation_style, configured_by, created_at
FROM ai_cfg_org_prompts
LIMIT 5;

-- Expected: All columns present, data looks valid
```

**Checklist**:
- [x] All columns present in `ai_cfg_sys_rag`
- [x] All columns present in `ai_cfg_org_prompts`
- [x] Sample data values look correct (no NULL where unexpected)
- [x] Timestamps preserved from original tables

### 2.3 Index Verification

**Goal**: Confirm indexes were recreated

```sql
-- Check indexes on ai_cfg_sys_rag
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ai_cfg_sys_rag';

-- Expected: idx_ai_cfg_sys_rag_provider, idx_ai_cfg_sys_rag_enabled

-- Check indexes on ai_cfg_org_prompts
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'ai_cfg_org_prompts';

-- Expected: idx_ai_cfg_org_prompts_org_id, idx_ai_cfg_org_prompts_type, idx_ai_cfg_org_prompts_enabled
```

**Checklist**:
- [x] `ai_cfg_sys_rag` has provider and enabled indexes
- [x] `ai_cfg_org_prompts` has org_id, type, and enabled indexes
- [x] All indexes use correct column names (not old table references)

---

## Section 3: RAG Configuration API Testing (30 min)

### 3.1 GET Platform Embedding Config (Read)

**Goal**: Verify ai-config-handler Lambda reads from new table

**Test Steps**:
1. Log in to ai-sec app as **platform_admin**
2. Navigate to: **Admin > Platform > AI Configuration**
3. Look for "RAG Configuration" or "AI Configuration" section

**Expected Results**:
- [x] Default AI provider displays correctly (e.g., "openai", "aws_bedrock")
- [x] Default embedding model displays correctly (e.g., "text-embedding-3-small")
- [x] Available embedding models display correctly
- [x] Configuration loads without errors (check browser console)

**API Test** (Optional - using curl):
```bash
# Get access token for platform admin
TOKEN="<your-access-token>"

# Test GET endpoint
curl -X GET \
  "https://<your-api-gateway-url>/admin/ai/config/embedding" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with embedding configuration JSON
```

### 3.2 PUT Platform Embedding Config (Write)

**Goal**: Verify ai-config-handler Lambda writes to new table

**Test Steps**:
1. In AI Configuration page, click "Edit RAG Configuration" or "Edit AI Configuration"
2. Change a config value (e.g., default_embedding_model or max_chunk_size_tokens)
3. Click "Save"

**Expected Results**:
- [ ] Save succeeds with 200 OK response
- [ ] Success message displays in UI
- [ ] Browser console shows no errors
- [ ] Page refreshes and shows updated values

**Database Verification**:
```sql
-- Verify update was written to new table
SELECT default_embedding_model, max_chunk_size_tokens, updated_at, updated_by
FROM ai_cfg_sys_rag
ORDER BY updated_at DESC
LIMIT 1;

-- Expected: Shows recent update timestamp and your user ID
```

**Checklist**:
- [ ] PUT request succeeds (200 OK)
- [ ] Data updated in `ai_cfg_sys_rag` table
- [ ] `updated_at` timestamp reflects recent change
- [ ] `updated_by` contains correct user ID

### 3.3 GET Embedding Config for KB Processor

**Goal**: Simulate module-kb kb-processor Lambda retrieving config

**Test Steps**:
```bash
# Test the endpoint that kb-processor will use
curl -X GET \
  "https://<your-api-gateway-url>/platform/ai-config/embedding" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: Returns enabled embedding configuration
```

**Expected Response**:
```json
{
  "defaultAiProvider": "openai",
  "defaultEmbeddingModel": "text-embedding-3-small",
  "availableEmbeddingModels": ["text-embedding-3-small", "text-embedding-3-large"],
  "defaultChatModelId": "uuid-or-null",
  "defaultEmbeddingModelId": "uuid-or-null",
  "providerConfigurations": {}
}
```

**Checklist**:
- [ ] Endpoint returns 200 OK
- [ ] Response includes all required fields
- [ ] `isEnabled` = true for active config
- [ ] Field names in camelCase (per API-PATTERNS standard)

---

## Section 4: Org Prompt API Testing (30 min)

### 4.1 GET Org Prompts (Read)

**Goal**: Verify org prompt configuration reads from new table

**Test Steps**:
1. Log in as **org_admin** for test org
2. Navigate to: **Admin > Organization > AI Configuration** (or equivalent page)
3. Look for "Prompt Engineering" or "Org Prompts" section

**Expected Results**:
- [ ] Org-specific prompts display correctly
- [ ] Policy mission type visible (e.g., "research", "compliance", "education")
- [ ] Custom system prompt displays without truncation
- [ ] Citation style displays correctly
- [ ] No console errors

**API Test**:
```bash
# Get org prompts for test org
ORG_ID="<your-test-org-id>"
curl -X GET \
  "https://<your-api-gateway-url>/orgs/$ORG_ID/ai-config/prompts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Expected: 200 OK with array of prompts
```

### 4.2 PUT Org Prompts (Write)

**Goal**: Verify org prompt updates write to new table

**Test Steps**:
1. In Org AI Configuration page, edit an existing prompt
2. Change prompt content (e.g., add a sentence)
3. Click "Save"

**Expected Results**:
- [ ] Save succeeds with 200 OK
- [ ] Success message displays
- [ ] Updated prompt content displays after refresh

**Database Verification**:
```sql
-- Verify update in new table
SELECT policy_mission_type, custom_system_prompt, citation_style, updated_at, configured_by
FROM ai_cfg_org_prompts
WHERE org_id = '<your-test-org-id>'
ORDER BY updated_at DESC
LIMIT 1;

-- Expected: Recent update timestamp
```

**Checklist**:
- [ ] PUT request succeeds
- [ ] Data updated in `ai_cfg_org_prompts` table
- [ ] `updated_at` timestamp reflects change
- [ ] `updated_by` contains org_admin user ID

### 4.3 POST New Org Prompt (Create)

**Goal**: Verify new prompt creation writes to new table

**Test Steps**:
1. In Org AI Configuration, click "Edit Configuration"
2. Update policy mission type (e.g., "research", "compliance")
3. Update custom system prompt
4. Update citation style
5. Click "Save"

**Expected Results**:
- [ ] Create succeeds with 201 Created
- [ ] New prompt appears in list
- [ ] No console errors

**Database Verification**:
```sql
-- Verify update in table
SELECT id, policy_mission_type, custom_system_prompt, citation_style, updated_at, configured_by
FROM ai_cfg_org_prompts
WHERE org_id = '<your-test-org-id>'
ORDER BY updated_at DESC
LIMIT 1;

-- Expected: Shows updated configuration
```

**Checklist**:
- [ ] PUT/PATCH request succeeds
- [ ] Record updated in `ai_cfg_org_prompts`
- [ ] `configured_by` contains correct user ID
- [ ] `org_id` matches test org

**Note**: `ai_cfg_org_prompts` is a singleton per org (UNIQUE constraint on org_id), so UPDATE operations are used, not INSERT.

---

## Section 5: RLS Policy Testing (30 min)

### 5.1 Platform Admin Access to RAG Config

**Goal**: Verify platform admins can manage RAG config

**Test Steps**:
```sql
-- Connect as platform admin user
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<platform-admin-user-id>"}';

-- Test SELECT (read)
SELECT COUNT(*) FROM ai_cfg_sys_rag;
-- Expected: Returns row (singleton table)

-- Test UPDATE (write)
UPDATE ai_cfg_sys_rag 
SET max_chunk_size_tokens = 3000 
WHERE id = (SELECT id FROM ai_cfg_sys_rag LIMIT 1);
-- Expected: Success

-- Note: INSERT/DELETE not tested because ai_cfg_sys_rag is a singleton table
-- (only one record allowed via UNIQUE INDEX on (true))
```

**Checklist**:
- [ ] Platform admin can SELECT from `ai_cfg_sys_rag`
- [ ] Platform admin can UPDATE `ai_cfg_sys_rag`
- [ ] Platform admin can INSERT into `ai_cfg_sys_rag`
- [ ] Platform admin can DELETE from `ai_cfg_sys_rag`

### 5.2 Regular User Access to RAG Config

**Goal**: Verify authenticated users can read enabled config

**Test Steps**:
```sql
-- Connect as regular user (not platform admin)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<regular-user-id>"}';

-- Test SELECT (all authenticated users can read)
SELECT COUNT(*) FROM ai_cfg_sys_rag;
-- Expected: Returns row (singleton table)

-- Test UPDATE (should fail)
UPDATE ai_cfg_sys_rag 
SET max_chunk_size_tokens = 3000 
WHERE id = (SELECT id FROM ai_cfg_sys_rag LIMIT 1);
-- Expected: RLS policy violation error
```

**Checklist**:
- [ ] Regular users can SELECT enabled records
- [ ] Regular users CANNOT UPDATE records (RLS blocks)
- [ ] Regular users CANNOT INSERT records (RLS blocks)
- [ ] Regular users CANNOT DELETE records (RLS blocks)

### 5.3 Org Admin Access to Org Prompts

**Goal**: Verify org admins can manage their org's prompts

**Test Steps**:
```sql
-- Connect as sys admin (not org admin)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<sys-admin-user-id>"}';

-- Test SELECT for any org
SELECT COUNT(*) FROM ai_cfg_org_prompts WHERE org_id = '<test-org-id>';
-- Expected: Returns org's config (sys admins can see all)

-- Test UPDATE for any org
UPDATE ai_cfg_org_prompts 
SET custom_system_prompt = 'Updated by sys admin'
WHERE org_id = '<test-org-id>';
-- Expected: Success (sys admins can modify all orgs)

-- Note: ai_cfg_org_prompts RLS only allows sys_admin/sys_owner access
-- Org admins do NOT have direct UPDATE access to this table
-- (They may have access via module-ai Lambda API layer)
```

**Checklist**:
- [ ] Sys admin can SELECT any org's prompts
- [ ] Sys admin can UPDATE any org's prompts
- [ ] Sys admin has full access to all org configurations
- [ ] Regular users and org admins CANNOT directly access table (RLS blocks)

**Note**: Org admins access this data via the module-ai API (ai-config-handler Lambda), not directly via SQL.

### 5.4 Regular User Access to Org Prompts

**Goal**: Verify regular users CANNOT directly access org prompts table

**Test Steps**:
```sql
-- Connect as regular user (not sys admin)
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "<regular-user-id>"}';

-- Test SELECT (should return 0 rows due to RLS)
SELECT COUNT(*) FROM ai_cfg_org_prompts 
WHERE org_id = '<test-org-id>';
-- Expected: 0 rows (RLS policy blocks non-sys-admins)

-- Test UPDATE (should fail)
UPDATE ai_cfg_org_prompts 
SET custom_system_prompt = 'Unauthorized'
WHERE org_id = '<test-org-id>';
-- Expected: RLS policy violation (0 rows updated)
```

**Checklist**:
- [ ] Regular users CANNOT SELECT from `ai_cfg_org_prompts` (RLS blocks)
- [ ] Regular users CANNOT UPDATE records (RLS blocks)
- [ ] Regular users CANNOT INSERT records (RLS blocks)
- [ ] Only sys_admin/sys_owner roles have direct table access

**Note**: Regular users and org admins access this data indirectly via module-ai API endpoints.

---

## Section 6: Backward Compatibility Testing (15 min)

### 6.1 View Functionality

**Goal**: Verify backward-compatible views work correctly

**Test Steps**:
```sql
-- Test sys_rag view
SELECT COUNT(*) FROM sys_rag;
-- Expected: Returns all rows from ai_cfg_sys_rag

-- Test org_prompt_engineering view
SELECT COUNT(*) FROM org_prompt_engineering;
-- Expected: Returns all rows from ai_cfg_org_prompts

-- Test view matches table data
SELECT 
  (SELECT COUNT(*) FROM sys_rag) = (SELECT COUNT(*) FROM ai_cfg_sys_rag) as rag_match,
  (SELECT COUNT(*) FROM org_prompt_engineering) = (SELECT COUNT(*) FROM ai_cfg_org_prompts) as prompt_match;
-- Expected: Both should be TRUE
```

**Checklist**:
- [ ] `sys_rag` view returns same data as `ai_cfg_sys_rag` table
- [ ] `org_prompt_engineering` view returns same data as `ai_cfg_org_prompts` table
- [ ] Views include all columns from tables
- [ ] Views support SELECT operations

### 6.2 Legacy Code Simulation

**Goal**: Verify old code (using view names) still works

**Test Steps**:
```sql
-- Simulate legacy query using old table name
SELECT default_ai_provider, default_embedding_model 
FROM sys_rag 
LIMIT 5;
-- Expected: Returns data successfully

-- Simulate legacy query for org prompts
SELECT policy_mission_type, custom_system_prompt 
FROM org_prompt_engineering 
WHERE org_id = '<test-org-id>'
LIMIT 5;
-- Expected: Returns data successfully
```

**Checklist**:
- [ ] SELECT queries using old table names work via views
- [ ] Data returned is identical to querying new tables directly
- [ ] No errors or warnings in query execution

---

## Section 7: End-to-End Integration Testing (20 min)

### 7.1 AI Config Workflow Test

**Goal**: Test complete workflow from UI to database

**Scenario**: Platform admin updates embedding configuration

**Test Steps**:
1. Log in as **platform_admin**
2. Navigate to **Admin > Platform > AI Configuration**
3. Note current max_chunk_size_tokens (write it down: `_______`)
4. Click "Edit RAG Configuration"
5. Change max_chunk_size_tokens to a different value (e.g., 3000)
6. Click "Save"
7. Verify success message
8. Refresh page
9. Verify new value displays

**Database Verification**:
```sql
-- Check that update hit the correct table
SELECT max_chunk_size_tokens, default_embedding_model, updated_at, updated_by
FROM ai_cfg_sys_rag
ORDER BY updated_at DESC
LIMIT 1;

-- Verify view also reflects change
SELECT max_chunk_size_tokens, default_embedding_model
FROM sys_rag
ORDER BY updated_at DESC
LIMIT 1;

-- Expected: Both show new value
```

**Checklist**:
- [ ] UI update succeeds without errors
- [ ] New value saved to `ai_cfg_sys_rag` table (not old table)
- [ ] View reflects updated value
- [ ] Page refresh shows updated value
- [ ] Browser console has no errors

### 7.2 Org Prompt Workflow Test

**Goal**: Test complete org prompt management workflow

**Scenario**: Org admin creates, updates, and deletes org prompt

**Test Steps**:
1. Log in as **sys_admin** (not org_admin - see RLS note above)
2. Navigate to **Admin > Organization > AI Configuration**
3. For a test org, edit the configuration:
   - Policy mission type: "research"
   - Custom system prompt: "Test prompt for Phase 0 verification"
   - Citation style: "inline"
4. Click "Save"
5. Verify configuration updated
6. Edit again:
   - Custom system prompt: "Updated test prompt"
7. Click "Save"
8. Verify updated content displays

**Database Verification**:
```sql
-- After initial save
SELECT id, policy_mission_type, custom_system_prompt, citation_style, created_at
FROM ai_cfg_org_prompts
WHERE custom_system_prompt LIKE '%Phase 0 verification%';
-- Expected: Shows created/updated config

-- After update
SELECT custom_system_prompt, updated_at
FROM ai_cfg_org_prompts
WHERE custom_system_prompt LIKE '%Updated test prompt%';
-- Expected: Shows updated content
```

**Checklist**:
- [ ] Create/update org config succeeds (writes to `ai_cfg_org_prompts`)
- [ ] Update org config succeeds (updates `ai_cfg_org_prompts`)
- [ ] All operations use new table (not old table)
- [ ] No console errors throughout workflow
- [ ] Config is singleton per org (one record per org_id)

---

## Section 8: Performance Verification (10 min)

### 8.1 Query Performance Test

**Goal**: Ensure indexes are working and queries are fast

**Test Steps**:
```sql
-- Enable query timing
\timing on

-- Test indexed query on ai_cfg_sys_rag
EXPLAIN ANALYZE
SELECT * FROM ai_cfg_sys_rag 
WHERE default_ai_provider = 'openai';
-- Expected: Uses idx_ai_cfg_sys_rag_active_providers or sequential scan (small table)

-- Test indexed query on ai_cfg_org_prompts
EXPLAIN ANALYZE
SELECT * FROM ai_cfg_org_prompts 
WHERE org_id = '<test-org-id>';
-- Expected: Uses idx_ai_cfg_org_prompts_org_id

-- Test view performance
EXPLAIN ANALYZE
SELECT * FROM sys_rag;
-- Expected: Should access underlying table directly
```

**Checklist**:
- [ ] Queries on `ai_cfg_sys_rag` use appropriate indexes
- [ ] Queries on `ai_cfg_org_prompts` use appropriate indexes
- [ ] Query execution times < 50ms for small datasets
- [ ] Views don't add significant overhead (should be minimal)

### 8.2 Lambda Response Time Test

**Goal**: Verify Lambda functions respond quickly with new tables

**Test Steps**:
1. Open browser DevTools (Network tab)
2. Navigate to AI Configuration page
3. Check response times for API calls:
   - `GET /admin/ai/config/embedding`
   - `GET /orgs/{orgId}/ai-config/prompts`

**Expected Results**:
- [ ] GET requests complete in < 500ms
- [ ] PUT requests complete in < 1000ms
- [ ] No noticeable slowdown compared to pre-migration (if data available)

---

## Testing Results Summary

### Overall Assessment

**Date Tested**: `_______________`  
**Tested By**: `_______________`  
**Duration**: `_______________`

**Result**: ☐ PASS  ☐ FAIL  ☐ PARTIAL

### Issues Found

| # | Issue Description | Severity | Section | Notes |
|---|-------------------|----------|---------|-------|
| 1 |                   | ☐ High ☐ Medium ☐ Low |         |       |
| 2 |                   | ☐ High ☐ Medium ☐ Low |         |       |
| 3 |                   | ☐ High ☐ Medium ☐ Low |         |       |

### Critical Checks (Must All Pass)

- [ ] Zero data loss (row counts match pre-migration)
- [ ] All APIs return 200 OK for valid requests
- [ ] RLS policies enforce correct access controls
- [ ] No console errors in browser during normal usage
- [ ] New tables used by Lambda (not old tables)
- [ ] Backward-compatible views work correctly

### Sign-Off

**If all critical checks pass, Phase 0 is verified and ready for Phase 1 (Foundation & Specification).**

**Tester Signature**: `_______________`  
**Date**: `_______________`

---

## Rollback Criteria

**Trigger rollback if ANY of these occur:**

1. **Data Loss**: Row counts don't match between old and new tables
2. **API Failures**: Critical APIs (embedding config, org prompts) return 500 errors
3. **RLS Violations**: Users can access data they shouldn't (e.g., org members editing prompts)
4. **Performance Degradation**: Query times > 5x slower than pre-migration
5. **Lambda Errors**: CloudWatch logs show repeated Lambda failures

**Rollback Procedure**: See `scripts/migrations/ROLLBACK-20260114_ai_config_tables_migration.md`

---

## Next Steps After Successful Testing

1. **Update Memory Bank**: Mark Phase 0 testing as complete in `memory-bank/activeContext.md`
2. **Remove Views** (after 1 week stability): Drop backward-compatible views
3. **Monitor Production**: Watch CloudWatch logs for ai-config-handler Lambda
4. **Proceed to Phase 1**: Begin Module-KB Foundation & Specification work
5. **Documentation**: Update any external docs referencing old table names

---

## Additional Notes

**Testing Environment**:
- **Database**: `_______________`
- **API Gateway URL**: `_______________`
- **Lambda Version**: `_______________`

**Test Data Used**:
- **Platform Admin Email**: `_______________`
- **Org Admin Email**: `_______________`
- **Test Org Name**: `_______________`

**Special Observations**:
```
(Add any additional notes, observations, or concerns here)
```

---

**Document Version**: 1.0  
**Created**: January 14, 2026  
**Last Updated**: January 14, 2026  
**Related Plan**: [Module-KB Implementation Plan](./plan_module-kb-implementation.md#phase-0-prerequisite---ai-config-table-migration--complete-session-127)
