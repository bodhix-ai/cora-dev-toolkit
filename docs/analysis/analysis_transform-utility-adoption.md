# Transform Utility Adoption Audit

**Created:** February 4, 2026  
**Context:** Sprint S5 - Key Consistency Error Investigation  
**Purpose:** Identify Lambdas not using org_common transform utilities

---

## Executive Summary

**Finding:** 27 of 27 Lambdas (100%) are NOT using the standard transform utilities from `org_common/transform.py`.

**Impact:** 374 key_consistency errors caused by manual dict building with mixed snake_case/camelCase.

**Solution:** Update all 27 Lambdas to use `transform_record()` instead of manual response building.

---

## Audit Results by Module

| Module | Lambdas Without Transform | Key Consistency Errors | Error/Lambda Ratio |
|--------|---------------------------|------------------------|---------------------|
| **module-eval** | 3 | 87 | 29.0 |
| **module-chat** | 3 | 76 | 25.3 |
| **module-voice** | 6 | 61 | 10.2 |
| **module-ws** | 2 | 45 | 22.5 |
| **module-access** | 7 | 34 | 4.9 |
| **module-ai** | 2 | 27 | 13.5 |
| **module-mgmt** | 1 | 23 | 23.0 |
| **module-kb** | 3 | 21 | 7.0 |
| **TOTAL** | **27** | **374** | **13.9 avg** |

---

## Detailed Lambda List

### module-access (7 Lambdas, 34 errors)

1. `identities-management` - User identity management
2. `idp-config` - Identity provider configuration
3. `invites` - Organization invitations
4. `members` - Organization member management
5. `org-email-domains` - Email domain verification
6. `orgs` - Organization CRUD operations
7. `profiles` - User profile management

**Priority:** MEDIUM (4.9 errors/Lambda - lowest ratio, but most Lambdas)

---

### module-ai (2 Lambdas, 27 errors)

1. `ai-config-handler` - AI configuration management
2. `provider` - AI provider management

**Priority:** MEDIUM (13.5 errors/Lambda)

---

### module-chat (3 Lambdas, 76 errors)

1. `chat-message` - Message CRUD operations
2. `chat-session` - Session management
3. `chat-stream` - Streaming chat responses

**Priority:** HIGH (25.3 errors/Lambda - 2nd highest ratio)

---

### module-eval (3 Lambdas, 87 errors)

1. `eval-config` - Evaluation configuration (criteria, doc types, prompts, status)
2. `eval-processor` - Evaluation processing engine
3. `eval-results` - Result management and exports

**Priority:** CRITICAL (29.0 errors/Lambda - highest ratio, most total errors)

---

### module-kb (3 Lambdas, 21 errors)

1. `kb-base` - Knowledge base CRUD operations
2. `kb-document` - Document management
3. `kb-processor` - Document processing engine

**Priority:** LOW (7.0 errors/Lambda)

---

### module-mgmt (1 Lambda, 23 errors)

1. `lambda-mgmt` - Lambda configuration management

**Priority:** MEDIUM (23.0 errors/Lambda)

---

### module-voice (6 Lambdas, 61 errors)

1. `voice-analytics` - Voice analytics
2. `voice-configs` - Voice configuration
3. `voice-credentials` - Voice credentials management
4. `voice-sessions` - Session management
5. `voice-transcripts` - Transcript processing
6. `voice-websocket` - WebSocket handler

**Priority:** MEDIUM (10.2 errors/Lambda, but most Lambdas after access)

---

### module-ws (2 Lambdas, 45 errors)

1. `cleanup` - Workspace cleanup tasks
2. `workspace` - Workspace CRUD operations

**Priority:** HIGH (22.5 errors/Lambda)

---

## Fix Priority Ranking

### Tier 1: Critical (87 errors, 3 Lambdas)
1. **module-eval** (29.0 errors/Lambda)
   - Highest error density
   - Most total errors
   - Estimated: 2-3 hours

### Tier 2: High (197 errors, 5 Lambdas)
2. **module-chat** (25.3 errors/Lambda)
   - Estimated: 1.5-2 hours
3. **module-ws** (22.5 errors/Lambda)
   - Estimated: 1 hour

### Tier 3: Medium (129 errors, 10 Lambdas)
4. **module-mgmt** (23.0 errors/Lambda)
   - Estimated: 30 min
5. **module-ai** (13.5 errors/Lambda)
   - Estimated: 45 min
6. **module-voice** (10.2 errors/Lambda)
   - Estimated: 2 hours (6 Lambdas)
7. **module-access** (4.9 errors/Lambda)
   - Estimated: 2-3 hours (7 Lambdas, lowest error density)

### Tier 4: Low (21 errors, 3 Lambdas)
8. **module-kb** (7.0 errors/Lambda)
   - Estimated: 1 hour

**Total Estimated Effort:** 11-14 hours (down from 15-21 hours original estimate)

---

## Standard Pattern to Apply

### Current Pattern (Manual, Inconsistent)

```python
def lambda_handler(event, context):
    # Query database (returns snake_case)
    session = common.find_one('voice_sessions', {'session_id': session_id})
    
    # Manual dict building (inconsistent naming)
    return {
        'statusCode': 200,
        'body': json.dumps({
            'sessionId': session['session_id'],       # ✅ Converted
            'started_at': session['started_at'],      # ❌ Not converted
            'completedAt': session.get('completedAt') # ❌ Wrong key!
        })
    }
```

### New Pattern (Using Transform Utilities)

```python
from org_common import transform_record, transform_records

def lambda_handler(event, context):
    # Query database (returns snake_case)
    session = common.find_one('voice_sessions', {'session_id': session_id})
    
    # Automatic transformation (consistent)
    return {
        'statusCode': 200,
        'body': json.dumps(transform_record(session))
    }
```

### For Lists

```python
from org_common import transform_records

def lambda_handler(event, context):
    # Query database (returns list of snake_case dicts)
    sessions = common.find('voice_sessions', {'ws_id': ws_id})
    
    # Automatic transformation (consistent)
    return {
        'statusCode': 200,
        'body': json.dumps(transform_records(sessions))
    }
```

---

## Implementation Strategy

### Phase 1: Import Addition (15 min per module)

Add to top of each Lambda file:
```python
from org_common import transform_record, transform_records
```

### Phase 2: Response Building Update (30-45 min per Lambda)

Replace manual dict building with:
```python
# Single record
return common.success_response(transform_record(result))

# List of records
return common.success_response(transform_records(results))
```

### Phase 3: Nested Field Handling (As needed)

For complex nested structures, use `nested_transforms`:
```python
return common.success_response(
    transform_record(result, nested_transforms={
        'config_value': transform_warming_config
    })
)
```

---

## Validation After Each Fix

After updating each Lambda, verify:

1. **Import check:**
   ```bash
   grep "from org_common import.*transform" lambda_function.py
   ```

2. **Usage check:**
   ```bash
   grep "transform_record\|transform_records" lambda_function.py
   ```

3. **Error reduction:**
   ```bash
   python3 validation/api-tracer/cli.py validate \
     --path /path/to/stack \
     --module <module-name> \
     --prefer-terraform
   ```

---

## Multi-Session Plan

### Session 1: Tier 1 (Critical)
- **Target:** module-eval (3 Lambdas, 87 errors)
- **Duration:** 2-3 hours
- **Expected Reduction:** 87 errors → ~10-15 errors (85% reduction)

### Session 2: Tier 2 (High)
- **Target:** module-chat (3 Lambdas, 76 errors)
- **Duration:** 1.5-2 hours
- **Expected Reduction:** 76 errors → ~10 errors (87% reduction)

### Session 3: Tier 2 (High)
- **Target:** module-ws (2 Lambdas, 45 errors)
- **Duration:** 1 hour
- **Expected Reduction:** 45 errors → ~5 errors (89% reduction)

### Session 4: Tier 3 (Medium) - Part 1
- **Target:** module-mgmt (1 Lambda, 23 errors)
- **Target:** module-ai (2 Lambdas, 27 errors)
- **Duration:** 1.5 hours
- **Expected Reduction:** 50 errors → ~5 errors (90% reduction)

### Session 5: Tier 3 (Medium) - Part 2
- **Target:** module-voice (6 Lambdas, 61 errors)
- **Duration:** 2 hours
- **Expected Reduction:** 61 errors → ~10 errors (84% reduction)

### Session 6: Tier 3 & 4 (Remaining)
- **Target:** module-access (7 Lambdas, 34 errors)
- **Target:** module-kb (3 Lambdas, 21 errors)
- **Duration:** 3-4 hours
- **Expected Reduction:** 55 errors → ~5-10 errors (85% reduction)

---

## Expected Outcomes

### By Module

| Module | Before | After (Estimated) | Reduction |
|--------|--------|-------------------|-----------|
| module-eval | 87 | 10 | 88% |
| module-chat | 76 | 10 | 87% |
| module-voice | 61 | 10 | 84% |
| module-ws | 45 | 5 | 89% |
| module-access | 34 | 5 | 85% |
| module-ai | 27 | 3 | 89% |
| module-mgmt | 23 | 2 | 91% |
| module-kb | 21 | 3 | 86% |
| **TOTAL** | **374** | **48** | **87%** |

### Remaining Errors (Estimated ~48)

After adopting transform utilities, remaining errors will be:
1. **Edge cases** - Complex nested structures needing custom transforms
2. **Special fields** - Fields that intentionally don't follow snake_case/camelCase
3. **Type mismatches** - Actual bugs where wrong types are used

These will need case-by-case investigation and fixes.

---

## Next Steps

1. **Review this audit** with the team
2. **Prioritize sessions** based on availability
3. **Start with module-eval** (Tier 1 Critical)
4. **Track progress** by updating error counts after each session
5. **Document learnings** for edge cases encountered

---

## Related Documents

- **Transform utilities:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`
- **Error analysis:** Previous key_consistency error categorization
- **Sprint plan:** `docs/plans/plan_validation-errors-s5.md`
- **Context:** `memory-bank/context-error-remediation.md`