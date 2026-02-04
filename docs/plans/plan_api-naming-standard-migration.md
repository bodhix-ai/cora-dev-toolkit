# CORA API Naming Standard Migration Initiative

**Status:** 📋 PLANNING  
**Priority:** HIGH - Standards Compliance  
**Created:** February 4, 2026  
**Estimated Duration:** 3-4 sprints (40-60 hours)  
**Context:** `memory-bank/context-error-remediation.md`  

---

## Executive Summary

**Goal:** Migrate CORA's API contract from snake_case to camelCase to align with JavaScript/TypeScript industry standards.

**Current State:**
- Database: snake_case (PostgreSQL standard) ✅
- Lambda responses: snake_case (non-standard for JavaScript APIs) ❌
- Frontend types: snake_case (workaround, non-standard) ❌

**Target State:**
- Database: snake_case (PostgreSQL standard) ✅
- Lambda responses: camelCase (JavaScript standard) ✅
- Frontend types: camelCase (JavaScript standard) ✅

**Impact:**
- 27 Lambdas to update (use transform utilities)
- 500+ frontend files to update (types, runtime code)
- 374 key_consistency errors will be resolved

---

## Why This Matters

### Industry Standards

**JavaScript/TypeScript API Convention:** JSON field names should use camelCase

**Examples from major APIs:**
- GitHub API: `createdAt`, `updatedAt`, `userId`
- Stripe API: `customerId`, `paymentMethod`, `createdAt`
- AWS SDK: `instanceId`, `createdTime`, `ownerId`

**Current CORA (Non-standard):**
```json
{
  "user_id": "123",
  "created_at": "2024-01-01",
  "org_id": "org-456"
}
```

**Target CORA (Standard):**
```json
{
  "userId": "123",
  "createdAt": "2024-01-01",
  "orgId": "org-456"
}
```

### Benefits of Migration

1. **Developer Experience:** JavaScript developers expect camelCase
2. **Tooling Support:** Better integration with JS ecosystem tools
3. **Code Consistency:** Aligns with React/Next.js conventions
4. **API Consumers:** Ready for external API consumers
5. **Transform Utilities:** Uses org_common utilities as originally intended

---

## Current State Analysis

### The Transform Utilities Already Exist

**Location:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`

**Purpose:** Transform database snake_case → API camelCase

**Intended Pattern:**
```python
from org_common import transform_record

def lambda_handler(event, context):
    # Database returns snake_case
    session = common.find_one('voice_sessions', {'session_id': id})
    
    # Transform to camelCase for frontend
    return common.success_response(transform_record(session))
```

**Current Reality:**
```python
def lambda_handler(event, context):
    # Database returns snake_case
    session = common.find_one('voice_sessions', {'session_id': id})
    
    # NO TRANSFORMATION - Returns snake_case directly
    return common.success_response(session)
```

### Why Frontend Uses Snake_Case

The frontend types were defined as snake_case as a **workaround** because Lambdas weren't transforming responses properly. This created a non-standard but consistent API contract.

### Key Consistency Errors

**374 errors** detected by validator catching inconsistencies where Lambdas:
- Sometimes access snake_case fields ✅
- Sometimes try to access camelCase fields ❌
- Creates bugs and confusion

**After migration:** All 374 errors will be resolved naturally.

---

## Scope

### Backend Changes (27 Lambdas)

**Pattern to Apply:**

```python
# Add imports
from org_common import transform_record, transform_records, transform_input

# For single record responses
return common.success_response(transform_record(record))

# For list responses
return common.success_response(transform_records(records))

# For input transformation (camelCase → snake_case for DB)
db_input = transform_input(api_input)
```

**Modules to Update:**

| Module | Lambdas | Errors | Estimated Effort |
|--------|---------|--------|------------------|
| module-kb | 3 | 21 | 1-2 hours |
| module-ai | 2 | 27 | 1 hour |
| module-mgmt | 1 | 23 | 30 min |
| module-access | 7 | 34 | 2-3 hours |
| module-ws | 2 | 45 | 1-2 hours |
| module-voice | 6 | 61 | 2-3 hours |
| module-chat | 3 | 76 | 2-3 hours |
| module-eval | 3 | 87 | 2-3 hours |
| **TOTAL** | **27** | **374** | **12-19 hours** |

### Frontend Changes (500+ files)

**TypeScript Types:** Update all type definitions to camelCase

**Example:**
```typescript
// Current (snake_case)
export type Organization = {
  owner_name?: string;
  created_at: string;
  updated_at: string;
  org_id: string;
};

// Target (camelCase)
export type Organization = {
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  orgId: string;
};
```

**Files to Update:**
- Type definitions: 100+ type files
- Runtime code: 400+ component/hook files
- API client: apps/web/lib/api.ts (2,816 lines)

**Estimated Effort:** 25-35 hours

---

## Phased Approach

### Sprint 1: Pilot Module (module-kb) - 8-12 hours

**Goal:** Validate approach with lowest-risk module

**Tasks:**
1. Update kb Lambdas (3 files)
   - Add transform_record imports
   - Update all response building
   - Test locally
   
2. Update kb frontend types (10-15 type files)
   - Convert all snake_case → camelCase
   - Update type exports
   
3. Update kb frontend runtime (20-30 component files)
   - Update field access
   - Update hooks
   - Update API calls
   
4. Testing
   - Unit tests pass
   - Integration tests pass
   - Manual UI testing
   - Deploy to dev environment
   
5. Monitor & Validate
   - Check CloudWatch logs
   - Verify no runtime errors
   - Validate API responses
   - Get user feedback

**Success Criteria:**
- ✅ All kb Lambdas return camelCase
- ✅ All kb frontend types use camelCase
- ✅ kb UI works correctly
- ✅ No production errors
- ✅ Key consistency errors for kb: 21 → 0

**Deliverables:**
- Updated kb Lambda code
- Updated kb frontend code
- Test results
- Lessons learned document

---

### Sprint 2: Medium Modules - 10-15 hours

**Modules:** module-ai (2), module-mgmt (1), module-access (7)

**Goal:** Apply proven pattern to 10 more Lambdas

**Tasks:**
1. Update Lambdas (10 files)
2. Update frontend types (30-40 type files)
3. Update frontend runtime (80-100 component files)
4. Testing per module
5. Deploy per module
6. Monitor per module

**Success Criteria:**
- ✅ All module Lambdas return camelCase
- ✅ All module frontend types use camelCase
- ✅ UIs work correctly
- ✅ Key consistency errors: 84 → 0 (cumulative)

---

### Sprint 3: Large Modules - 12-18 hours

**Modules:** module-ws (2), module-voice (6), module-chat (3), module-eval (3)

**Goal:** Complete remaining 14 Lambdas

**Tasks:**
1. Update Lambdas (14 files)
2. Update frontend types (50-60 type files)
3. Update frontend runtime (200+ component files)
4. Comprehensive testing
5. Phased deployment
6. Monitoring

**Success Criteria:**
- ✅ ALL Lambdas return camelCase
- ✅ ALL frontend types use camelCase
- ✅ Full platform works correctly
- ✅ Key consistency errors: 374 → 0 (100%)

---

### Sprint 4: Testing & Refinement - 5-10 hours

**Goal:** Comprehensive validation and edge case handling

**Tasks:**
1. End-to-end testing
   - All user flows
   - All admin flows
   - Cross-module interactions
   
2. Performance testing
   - API response times
   - Frontend rendering
   - Transform overhead
   
3. Edge case handling
   - Complex nested structures
   - Special field names
   - Legacy integrations
   
4. Documentation
   - API documentation updates
   - Developer guide updates
   - Migration guide for future modules
   
5. Cleanup
   - Remove temporary workarounds
   - Update validation rules
   - Archive old type definitions

**Success Criteria:**
- ✅ All tests pass
- ✅ Performance acceptable
- ✅ Documentation complete
- ✅ No outstanding issues

---

## Risk Assessment & Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking API contracts | HIGH | CRITICAL | Phased rollout, extensive testing |
| Missed field conversions | MEDIUM | HIGH | Automated tools, code review |
| Type errors in frontend | MEDIUM | HIGH | TypeScript compilation, validation |
| Performance degradation | LOW | MEDIUM | Monitor transform overhead |
| User-facing bugs | MEDIUM | CRITICAL | Comprehensive testing, rollback plan |

### Mitigation Strategies

**1. Phased Rollout**
- Start with module-kb (lowest risk)
- One module at a time
- Monitor each before proceeding
- Rollback capability for each module

**2. Automated Tooling**
- Script to find/replace snake_case → camelCase
- TypeScript compiler for type safety
- Linting rules for consistency
- Validation after each change

**3. Testing Strategy**
- Unit tests for all Lambdas
- Integration tests for APIs
- E2E tests for user flows
- Manual testing by QA
- Beta testing with select users

**4. Rollback Plan**
- Keep old Lambda versions
- Version API responses
- Feature flags for gradual rollout
- Rollback script per module

**5. Communication**
- Notify team before each sprint
- Daily updates during migration
- Incident response plan
- User communication if issues

---

## Module-Specific Considerations

### module-kb (Pilot - Sprint 1)

**Complexity:** LOW  
**Risk:** LOW  
**Why Pilot:** Fewest errors (21), simple data structures, clear boundaries

**Special Considerations:**
- Document upload/download fields
- Search result formatting
- KB configuration objects

---

### module-eval (High Complexity)

**Complexity:** HIGH  
**Risk:** MEDIUM  
**Errors:** 87 (highest)

**Special Considerations:**
- Complex nested structures (criteria, doc types, prompts)
- JSONB config fields
- Evaluation result formatting
- Need `nested_transforms` for complex fields

**Example:**
```python
return transform_record(evaluation, nested_transforms={
    'criteria_set': transform_criteria_set,
    'doc_type_config': transform_doc_type_config
})
```

---

### module-chat (Real-time Data)

**Complexity:** MEDIUM  
**Risk:** HIGH (user-facing)

**Special Considerations:**
- Real-time message formatting
- Session management
- Message history
- High visibility if bugs occur

**Mitigation:**
- Extra testing
- Deploy during low-traffic hours
- Monitor closely

---

### module-voice (Timestamp Critical)

**Complexity:** MEDIUM  
**Risk:** MEDIUM

**Special Considerations:**
- Timestamp fields (started_at, completed_at) critical for analytics
- Session tracking
- Transcript formatting

**Mitigation:**
- Verify timestamp transformations
- Test analytics dashboard thoroughly

---

## Success Criteria

### Technical Success

- [ ] All 27 Lambdas use `transform_record()` for responses
- [ ] All frontend types use camelCase
- [ ] All frontend runtime code uses camelCase
- [ ] TypeScript compilation with 0 errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Key consistency errors: 374 → 0

### Business Success

- [ ] No user-reported bugs from migration
- [ ] API response times within acceptable range
- [ ] Development velocity maintained
- [ ] External API consumers ready
- [ ] Documentation updated

---

## Implementation Guidelines

### Backend Pattern

```python
from org_common import transform_record, transform_records, transform_input

def lambda_handler(event, context):
    # 1. Transform input (camelCase → snake_case for DB)
    if event.get('body'):
        input_data = json.loads(event['body'])
        db_input = transform_input(input_data)
    
    # 2. Query database (returns snake_case)
    record = common.find_one('table_name', db_input)
    
    # 3. Transform output (snake_case → camelCase for frontend)
    return common.success_response(transform_record(record))
```

### Frontend Pattern

```typescript
// 1. Update type definitions
export type Organization = {
  orgId: string;           // Changed from org_id
  createdAt: string;       // Changed from created_at
  updatedAt: string;       // Changed from updated_at
};

// 2. Update API calls (no change needed - client handles JSON)
const org = await client.get<Organization>('/organizations/123');

// 3. Update field access
console.log(org.orgId);        // Changed from org.org_id
console.log(org.createdAt);    // Changed from org.created_at
```

---

## Validation After Each Module

**Checklist:**

- [ ] Backend: Verify all Lambdas import transform utilities
- [ ] Backend: Run unit tests
- [ ] Backend: Deploy to dev
- [ ] Backend: Test API responses manually
- [ ] Frontend: Verify TypeScript compilation
- [ ] Frontend: Run unit tests
- [ ] Frontend: Test UI manually
- [ ] Integration: Test cross-module interactions
- [ ] Monitoring: Check CloudWatch logs
- [ ] Validation: Run key_consistency validator
- [ ] Sign-off: Get approval before next module

---

## Rollback Procedures

### Per-Module Rollback

**If issues detected:**

1. **Identify failing module** (CloudWatch logs, user reports)
2. **Revert Lambda deployment**
   ```bash
   cd {project}-infra
   ./scripts/deploy-lambda.sh {module}/{lambda} --version previous
   ```
3. **Revert frontend changes** (git revert)
4. **Deploy frontend rollback**
5. **Verify rollback** (test affected features)
6. **Document issue** (add to lessons learned)
7. **Fix in templates** (address root cause)
8. **Re-test and re-deploy**

### Full Rollback (Worst Case)

If multiple modules affected:

1. **Emergency meeting** (stakeholders)
2. **Deploy previous release** (full stack)
3. **Verify stability**
4. **Root cause analysis**
5. **Updated migration plan**
6. **Schedule re-attempt**

---

## Timeline & Resource Allocation

### Estimated Timeline

**Total Duration:** 8-10 weeks (part-time)

| Sprint | Duration | Module(s) | Hours |
|--------|----------|-----------|-------|
| Sprint 1 | Week 1-2 | module-kb | 8-12 |
| Sprint 2 | Week 3-5 | module-ai, module-mgmt, module-access | 10-15 |
| Sprint 3 | Week 6-8 | module-ws, module-voice, module-chat, module-eval | 12-18 |
| Sprint 4 | Week 9-10 | Testing & refinement | 5-10 |
| **TOTAL** | **10 weeks** | **All modules** | **35-55 hours** |

### Resource Requirements

**Backend Developer:** 12-19 hours
- Lambda transformations
- Transform utility integration
- Testing

**Frontend Developer:** 25-35 hours
- Type definition updates
- Component updates
- Hook updates
- Testing

**QA Engineer:** 10-15 hours
- Test planning
- Manual testing
- Regression testing
- Bug validation

**DevOps:** 5-10 hours
- Deployment automation
- Monitoring setup
- Rollback procedures

---

## Related Documents

- **Frontend Audit:** `docs/analysis/analysis_frontend-api-contract-audit.md`
- **Transform Utilities:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`
- **Context:** `memory-bank/context-error-remediation.md`
- **Sprint S5:** `docs/plans/plan_validation-errors-s5.md` (delegated scope)

---

## Decision Log

### February 4, 2026 - Initiative Approved

**Decision:** Proceed with API naming standard migration (Option A)

**Rationale:**
- Industry standards alignment
- Better developer experience
- Transform utilities exist for this purpose
- Phased approach reduces risk

**Approved By:** [Product Owner / Tech Lead Name]

**Next Steps:**
1. Create initiative plan ✅
2. Begin Sprint 1 (module-kb pilot)
3. Monitor and adapt based on learnings

---

## Status Tracking

**Sprint 1:** 📋 NOT STARTED  
**Sprint 2:** 📋 NOT STARTED  
**Sprint 3:** 📋 NOT STARTED  
**Sprint 4:** 📋 NOT STARTED  

**Overall Progress:** 0% (0/374 errors fixed)

---

## Notes

- All changes follow template-first workflow
- Each module gets its own branch
- PR reviews required before merging
- Comprehensive testing before deployment
- User communication if any issues