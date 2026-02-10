# Plan: Sprint 5 Phase 1 - Scoring Architecture Testing

**Status:** ✅ PASSED  
**Created:** February 8, 2026 9:13 PM  
**Completed:** February 9, 2026 9:51 AM  
**Branch:** `feature/eval-optimization-s5`  
**Test Project:** `/Users/aaron/code/bodhix/testing/eval-studio/`  
**Duration:** 30-45 minutes (estimated)  

---

## Overview

This plan guides you through testing the new scoring architecture implementation:
- Database-driven scoring rubric
- JSONB result storage
- Dynamic custom field capture
- Score-first approach (AI provides score, UI derives status)

---

## Prerequisites ✅

- [x] Phase 1 files synced to test project
  - [x] `scoring.ts` (frontend utility)
  - [x] `EvalQAList.tsx` (frontend component)
  - [x] `eval-processor/lambda_function.py` (backend Lambda)
- [x] `deploy-all.sh dev` completed successfully
- [x] Database migration applied (verify in Step 2)
- [x] Lambda deployed (Step 1)
- [x] Frontend restarted (Step 3)

---

## Step 1: Deploy eval-processor Lambda

**Location:** `/Users/aaron/code/bodhix/testing/eval-studio/ai-mod-infra`

```bash
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-infra
./scripts/deploy-lambda.sh module-eval/eval-processor
```

**Expected Output:**
- ✅ Build completes successfully
- ✅ Terraform detects source code change (via `source_code_hash`)
- ✅ Lambda function updates
- ✅ Deployment confirms success

**Verification:**
- [x] No build errors
- [x] Terraform shows Lambda update (not "No changes")
- [x] Deployment script completes without errors

**If errors occur:**
```bash
# Force rebuild
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack/packages/module-eval/backend
./build.sh

# Redeploy
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-infra
./scripts/deploy-lambda.sh module-eval/eval-processor
```

---

## Step 2: Verify Database Migration

**Connect to database:**
```bash
psql -h <your-db-host> -U <your-db-user> -d <your-db-name>
```

**Run verification queries:**

### Query 1: Check ai_result column type
```sql
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'eval_criteria_results' 
  AND column_name = 'ai_result';
```

**Expected:** `data_type = 'jsonb'`

- [x] Result shows `jsonb` (not `text`)

### Query 2: Check scoring_rubric column exists
```sql
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'eval_criteria_sets' 
  AND column_name = 'scoring_rubric';
```

**Expected:** `data_type = 'jsonb'`

- [x] Result shows `jsonb`

### Query 3: Check default rubric
```sql
SELECT id, name, scoring_rubric 
FROM eval_criteria_sets 
LIMIT 1;
```

**Expected:** `scoring_rubric` shows 5-tier rubric JSON

- [x] Result shows rubric with tiers array

**If migration not applied:**
```bash
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack
psql -h <db-host> -U <db-user> -d <db-name> -f packages/module-eval/db/migrations/20260208_sprint5_scoring_architecture.sql
```

---

## Step 3: Restart Frontend Dev Server

**Location:** `/Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack`

```bash
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack
./scripts/start-dev.sh
```

**Expected Output:**
- ✅ Next.js compiles successfully
- ✅ No TypeScript errors related to `scoring.ts` or `EvalQAList.tsx`
- ✅ Dev server runs on port 3000 (or configured port)

**Verification:**
- [x] No compilation errors
- [x] Server starts successfully
- [x] URL shown (e.g., http://localhost:3000)

**If errors occur:**
```bash
# Kill existing dev server
pkill -f "next dev"

# Clear .next cache
rm -rf .next

# Restart
./scripts/start-dev.sh
```

---

## Step 4: Create Test Evaluation

### 4.1 Navigate to Workspace

**URL:** http://localhost:3000/ws

- [x] Open browser to dev server
- [x] Navigate to workspaces page
- [x] Select existing workspace (or create new one)

### 4.2 Upload Test Document

**Navigate to:** Data & Knowledge Base tab

- [x] Click "Upload Document" button
- [x] Select a sample document (PDF or text file)
- [x] Wait for processing indicator
- [x] Verify document appears in list

**Alternative:** Use existing document if workspace already has documents

### 4.3 Run Evaluation

**Navigate to:** Evaluations tab

- [x] Click "New Evaluation" button
- [x] Select document(s) uploaded in 4.2
- [x] Select criteria set (any available set)
- [x] Click "Start Evaluation"
- [x] Note the evaluation ID or name for reference

**Wait for completion:**
- Progress bar shows evaluation running
- Estimated time: 30-60 seconds per criterion
- Status changes to "Complete"

- [x] Evaluation completes without errors
- [x] Status shows "Complete" (not "Failed" or "Error")

---

## Step 5: Verify Database Results

**After evaluation completes, check database:**

### Query 1: Get latest results
```sql
SELECT 
    id,
    ai_result,
    ai_score_value,
    ai_confidence,
    created_at
FROM eval_criteria_results 
ORDER BY created_at DESC 
LIMIT 5;
```

**Verify:**
- [x] `ai_result` is JSONB object (not plain text string)
- [x] `ai_result` contains `score` field
- [x] `ai_result` contains `confidence` field
- [x] `ai_result` contains `explanation` field
- [x] `ai_result` contains `citations` field (array)
- [x] `ai_score_value` matches `ai_result->>'score'`

**Expected format:**
```json
{
  "score": 85,
  "confidence": 90,
  "explanation": "Document meets requirement with strong evidence...",
  "citations": ["Section 3.2.1", "Appendix A"]
}
```

### Query 2: Check for custom fields
```sql
SELECT 
    ai_result,
    jsonb_object_keys(ai_result) as field_names
FROM eval_criteria_results 
WHERE created_at > NOW() - INTERVAL '5 minutes'
LIMIT 1;
```

**Verify:**
- [x] Shows fixed fields: score, confidence, explanation, citations
- [x] May show custom fields (if AI returned any)

**Example custom fields:**
- `compliance_findings`
- `recommendations`
- `risk_level`
- `remediation_steps`

---

## Step 6: Verify UI Display

### 6.1 Navigate to Evaluation Results

**Path:** Workspace → Evaluations tab → Click completed evaluation

- [x] Evaluation results page loads
- [x] Shows list of criteria with results

### 6.2 Check Score Display Format

**Look at each criterion result card:**

**Expected format:** `{score}% - {status_label}`

Examples:
- "85% - Fully Compliant"
- "65% - Mostly Compliant"
- "45% - Partially Compliant"
- "25% - Mostly Non-Compliant"
- "10% - Non-Compliant"

**Verify:**
- [x] Score shows as percentage (e.g., "85%")
- [x] Status label shown after score
- [x] Status label matches score range (see table below)

**Score → Status Mapping:**
| Score Range | Expected Label |
|-------------|----------------|
| 81-100 | Fully Compliant |
| 61-80 | Mostly Compliant |
| 41-60 | Partially Compliant |
| 21-40 | Mostly Non-Compliant |
| 0-20 | Non-Compliant |

### 6.3 Check Status Colors

**Verify color coding:**
- [x] 81-100%: Dark green
- [x] 61-80%: Light green
- [x] 41-60%: Yellow
- [x] 21-40%: Orange
- [x] 0-20%: Red

### 6.4 Check Custom Fields Panel

**Expand a criterion result:**
- [x] Click to expand details

**Look for "Additional Response Sections" panel:**
- [x] Panel appears (blue-highlighted)
- [x] Shows custom field names (formatted: snake_case → Capitalized Words)
- [x] Shows custom field values

**Example:**
```
Additional Response Sections
─────────────────────────────
Compliance Findings
Policy addresses 8 of 10 NIST controls

Recommendations
Add MFA requirement for admin access
```

**Note:** Panel only appears if AI returned custom fields. If not present, that's expected.

- [x] Panel displays correctly (if custom fields present)
- [x] OR Panel not shown (if no custom fields - also correct)

---

## Step 7: Test Backward Compatibility

### 7.1 Find Old Evaluation (Optional)

**If you have evaluations created before migration:**

- [x] Navigate to old evaluation
- [x] Open results page

**Verify:**
- [x] Page loads without errors
- [x] Results display (even if format is legacy)
- [x] No console errors

### 7.2 Check Browser Console

**Open browser console (F12):**

- [x] No errors related to `scoring.ts`
- [x] No errors related to `EvalQAList.tsx`
- [x] No errors about JSONB parsing

---

## Step 8: End-to-End Workflow Test

### Complete User Journey

**Starting from workspace:**

1. [x] Upload document → Success
2. [x] Create evaluation → Success
3. [x] Wait for completion → Success
4. [x] View results → Shows scores correctly
5. [x] Expand criterion → Shows explanation
6. [x] Check custom fields → Displays if present
7. [x] Navigate back → No errors
8. [x] Refresh page → Results persist

**All steps complete without errors:** ✅ Phase 1 PASSED

---

## 🚨 CRITICAL ISSUE DISCOVERED (Feb 8, 2026 11:30 PM)

### Root Cause: eval-results Lambda Not Deriving effectiveStatus from Score

**Problem:** The UI shows "Not Evaluated" chips even though scores exist in database.

**Root Cause:** The `eval-results` Lambda (line 675-681) derives `effectiveStatus` from the deprecated `ai_status_id` field (now null) instead of from the score.

**Current Code (WRONG):**
```python
# Line 675-681 in eval-results/lambda_function.py
effective_status_id = (
    current_edit.get('editedStatusId') if current_edit
    else ai_result.get('ai_status_id')  # ❌ This is NULL
)
effective_status = status_map.get(effective_status_id, {})  # ❌ Returns empty dict
```

**Required Fix:**
```python
# Derive status from score using rubric
score = ai_result.get('ai_score_value')
rubric = criteria_set.get('scoring_rubric', {})
effective_status = get_tier_from_score(score, rubric)
```

**Impact:**
- RPC function works correctly ✅
- Database returns scores correctly ✅
- Lambda doesn't map score → status label ❌
- Frontend receives `effectiveStatus: null` ❌
- UI shows "Not Evaluated" chips ❌

**Resolution Steps:**
1. Add `get_tier_from_score(score, rubric)` helper function to eval-results Lambda
2. Update lines 675-681 to derive status from score
3. Handle null scores (show "Not Evaluated")
4. Handle edited statuses (use edit if present, otherwise derive from score)
5. Sync Lambda to test project
6. Rebuild and redeploy Lambda
7. Test evaluation results display

**Status:** 🔴 BLOCKING - Must fix before Phase 1 can be marked complete

**Next Session:** Complete this fix first, then proceed with original Phase 1 testing plan.

---

## Troubleshooting

### Issue: Lambda not updating

**Symptoms:**
- Database still shows TEXT results (not JSONB)
- Scores not being extracted

**Fix:**
```bash
# Force rebuild
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack/packages/module-eval/backend
./build.sh

# Force deploy
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-infra
terraform apply -var-file=envs/dev/local-secrets.tfvars -auto-approve
```

### Issue: Frontend errors about scoring.ts

**Symptoms:**
- Browser console shows "Cannot find module '../utils/scoring'"
- TypeScript errors in terminal

**Fix:**
```bash
# Verify file exists
ls /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack/packages/module-eval/frontend/utils/scoring.ts

# If missing, resync
cd ~/code/bodhix/cora-dev-toolkit
./scripts/sync-fix-to-project.sh /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack "scoring.ts"

# Restart dev server
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack
pkill -f "next dev"
./scripts/start-dev.sh
```

### Issue: Custom fields not showing

**Symptoms:**
- Database has custom fields in ai_result
- UI doesn't show "Additional Response Sections" panel

**Check:**
1. [x] Browser console for errors
2. [x] EvalQAList.tsx imported correctly
3. [x] Clear browser cache (Ctrl+Shift+R)

**Fix:**
```bash
# Resync component
cd ~/code/bodhix/cora-dev-toolkit
./scripts/sync-fix-to-project.sh /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack "EvalQAList.tsx"

# Restart
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack
pkill -f "next dev"
./scripts/start-dev.sh
```

### Issue: Migration not applied

**Symptoms:**
- Database queries return "column does not exist"
- Error: "ai_result" is not type jsonb

**Fix:**
```bash
cd /Users/aaron/code/bodhix/testing/eval-studio/ai-mod-stack
psql -h <db-host> -U <db-user> -d <db-name> -f packages/module-eval/db/migrations/20260208_sprint5_scoring_architecture.sql
```

---

## Success Criteria ✅

**Phase 1 testing is COMPLETE when all items checked:**

### Deployment
- [x] eval-processor Lambda deployed successfully
- [x] Frontend dev server running without errors
- [x] Database migration applied

### Database Verification
- [x] `ai_result` column is JSONB type
- [x] `scoring_rubric` column exists in eval_criteria_sets
- [x] New evaluation creates JSONB results
- [x] Results contain: score, confidence, explanation, citations
- [x] `ai_score_value` matches extracted score

### UI Verification
- [x] Score displays as "{score}% - {status_label}"
- [x] Status label derived from score (not hardcoded)
- [x] Status colors match rubric tiers
- [x] Custom fields panel appears (if fields present)
- [x] Custom field names formatted correctly
- [x] No console errors

### Backward Compatibility
- [x] Legacy evaluations display without errors
- [x] No breaking changes to existing data

### User Journey
- [x] Complete workflow (upload → evaluate → view) works end-to-end
- [x] Results persist after page refresh

---

## Next Steps

**After completing this plan:**

1. **Mark Phase 1 complete** in `plan_eval-optimization-s5.md`
2. **Update session log** in `context-eval-optimization.md`
3. **Begin Phase 2:** Response Sections (Fixed vs Custom)

**Phase 2 Focus:**
- Enforce fixed sections (score, confidence, explanation, citations)
- Support custom sections (user-defined fields)
- Validate AI response against structure
- Update ResponseStructureBuilder UI

---

## Testing Notes

**Date:** _________________  
**Tester:** _________________  
**Environment:** eval-studio test project  
**Branch:** feature/eval-optimization-s5  

**Issues Found:**
- _______________________________________
- _______________________________________
- _______________________________________

**Resolution:**
- _______________________________________
- _______________________________________
- _______________________________________

**Status:** ✅ PASS

**Sign-off:** Aaron (Date: February 9, 2026)
