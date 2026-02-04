# Frontend API Contract Audit - CRITICAL FINDINGS

**Created:** February 4, 2026  
**Context:** Sprint S5 - Transform Utility Adoption Risk Assessment  
**Urgency:** 🚨 CRITICAL - Changes approach completely  

---

## 🚨 EXECUTIVE SUMMARY - DO NOT PROCEED WITH TRANSFORM APPROACH

**CRITICAL FINDING:** The frontend TypeScript types and runtime code **EXPECT SNAKE_CASE** field names, NOT camelCase.

**Impact:** Using `transform_record()` to convert Lambda responses to camelCase would **BREAK THE ENTIRE FRONTEND**.

**Recommendation:** DO NOT USE TRANSFORM UTILITIES. Instead, ensure Lambdas consistently return snake_case.

---

## Evidence

### 1. Frontend TypeScript Type Definitions (apps/web/lib/api.ts)

**File Size:** 2,816 lines  
**Snake_case Field Count:** 50+ explicit references

**Type Definitions Use Snake_Case:**

```typescript
export type Organization = {
  owner_name?: string;
  created_at: string;        // ✅ Snake_case
  updated_at: string;        // ✅ Snake_case
};

export type Profile = {
  organizations?: { id: string; name: string }[];
  org_members?: Member[];
  sys_role?: string;
  current_org_id?: string | null;
};

export type Member = {
  org_id?: string;           // ✅ Snake_case
  user_id: string;           // ✅ Snake_case
  role: OrgRole | string;
  profiles: {
    full_name: string;       // ✅ Snake_case
    email: string;
    avatar_url?: string;     // ✅ Snake_case
    phone?: string;
  };
  email?: string;
};

export type OrgProfile = {
  org_id: string;            // ✅ Snake_case
  display_name: string | null;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  default_timezone: string;
  default_language: string;
  created_at: string | null;  // ✅ Snake_case
  updated_at: string | null;  // ✅ Snake_case
  updated_by: string | null;  // ✅ Snake_case
};

export type OrgConfig = {
  org_id: string;             // ✅ Snake_case
  subscription_tier: "basic" | "professional" | "enterprise";
  billing_email: string | null;
  max_knowledge_bases: number;
  max_documents_total: number;
  // ... 20+ more snake_case fields
};
```

### 2. Frontend Runtime Code Uses Snake_Case

**Evidence from actual frontend code:**

```typescript
// apps/web/store/chatStore.ts
timestamp: msg.created_at,          // ✅ Accessing snake_case
updated_at: updatedSession.updated_at,  // ✅ Accessing snake_case
```

The frontend code DIRECTLY ACCESSES snake_case fields from API responses.

### 3. Variable Name Conversion Pattern

**From apps/web/lib/api.ts line 534:**

```typescript
org_id: orgId,  // JavaScript variable (camelCase) → API field (snake_case)
```

This shows the pattern:
- **JavaScript variables:** camelCase (`orgId`, `userId`)
- **API request/response fields:** snake_case (`org_id`, `user_id`)

---

## What Would Break if We Use transform_record()

### Scenario: Lambda returns camelCase (after using transform_record)

**Lambda Response (After transform_record):**
```json
{
  "userId": "123",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z",
  "orgId": "org-456"
}
```

**Frontend TypeScript Type Expects:**
```typescript
type Member = {
  user_id: string;      // ❌ Type mismatch! Lambda returns 'userId'
  created_at: string;   // ❌ Type mismatch! Lambda returns 'createdAt'
  updated_at: string;   // ❌ Type mismatch! Lambda returns 'updatedAt'
  org_id?: string;      // ❌ Type mismatch! Lambda returns 'orgId'
};
```

**Frontend Runtime Access:**
```typescript
const timestamp = msg.created_at;  // ❌ undefined! Field is 'createdAt'
const updated = session.updated_at; // ❌ undefined! Field is 'updatedAt'
```

**Result:** 
- TypeScript compilation errors (hundreds of them)
- Runtime errors (accessing undefined fields)
- Complete UI breakdown

---

## The Real Problem

### What the key_consistency Validator Detects

The validator catches **INCONSISTENCY WITHIN LAMBDA CODE**:

**Example from module-voice/voice-configs/lambda_function.py:**

```python
# Line 693: Lambda accesses snake_case from database
config = common.find_one('voice_configs', {'config_id': config_id})
# config = {'config_id': '123', 'created_at': '...', 'updated_at': '...'}

# Line 81: Lambda tries to access camelCase (WRONG!)
if config.get('configId'):  # ❌ KeyError! Should be 'config_id'
    ...

# Line 693-694: Lambda builds response with snake_case
return {
    'created_at': config['created_at'],   # ✅ Correct
    'updated_at': config['updated_at']    # ✅ Correct
}

# BUT elsewhere in same file...
# Line 337: Lambda tries to access camelCase
updated_by = config.get('updatedBy')  # ❌ Should be 'updated_by'
```

The **inconsistency** is:
- Database returns snake_case
- Some parts of Lambda access snake_case ✅
- Other parts try to access camelCase ❌
- This creates bugs where fields are accessed incorrectly

---

## Correct Solution: Ensure Consistent Snake_Case

### Current State Analysis

**What's Working:**
- Database: Returns snake_case ✅
- Frontend types: Defined as snake_case ✅
- Frontend runtime: Accesses snake_case ✅
- Some Lambdas: Return snake_case ✅

**What's Broken:**
- Some Lambdas: Try to access/return camelCase ❌
- Creates inconsistency within Lambda code
- Can cause runtime bugs (KeyError, wrong field access)

### The Fix: Consistent Snake_Case Throughout

**DO NOT use transform_record() for Lambda responses.**

**INSTEAD:**

1. **Ensure database queries return snake_case** (already correct)
2. **Build API responses with snake_case fields** (match frontend types)
3. **Remove any camelCase field access** in Lambda code

**Example Fix:**

```python
# ❌ WRONG (Mixed snake_case and camelCase)
def lambda_handler(event, context):
    # Query returns snake_case
    config = common.find_one('voice_configs', {'config_id': config_id})
    
    # INCONSISTENT: Tries to access camelCase
    if config.get('configId'):  # ❌ Wrong!
        return {
            'config_id': config['config_id'],
            'createdAt': config['created_at']  # ❌ Wrong field name!
        }

# ✅ CORRECT (Consistent snake_case)
def lambda_handler(event, context):
    # Query returns snake_case
    config = common.find_one('voice_configs', {'config_id': config_id})
    
    # CONSISTENT: Use snake_case throughout
    if config.get('config_id'):  # ✅ Correct!
        return {
            'config_id': config['config_id'],      # ✅ Correct!
            'created_at': config['created_at'],    # ✅ Correct!
            'updated_at': config['updated_at']     # ✅ Correct!
        }
```

---

## Alternative Solution: Full CamelCase Migration (NOT RECOMMENDED)

**Scope:** Would require updating:
1. All Lambda responses → camelCase
2. All frontend TypeScript types → camelCase (2,816 lines in api.ts alone)
3. All frontend runtime code → camelCase field access
4. All module-specific types → camelCase
5. All hooks → camelCase
6. All components → camelCase

**Estimated Files to Update:**
- Frontend: 500+ files
- TypeScript types: 100+ type definitions
- Lambda responses: 27 Lambdas
- Hooks: 50+ hooks
- Components: 200+ components

**Estimated Effort:** 40-60 hours

**Risk:** EXTREMELY HIGH - One missed conversion breaks the app

**Recommendation:** ❌ DO NOT PURSUE - Too risky, too expensive

---

## Revised Implementation Plan

### Step 1: Fix Lambda Inconsistencies (11-14 hours)

**Goal:** Ensure all Lambdas consistently use snake_case (not camelCase)

**Pattern to Remove:**

```python
# ❌ REMOVE: CamelCase field access
config.get('configId')
config['createdAt']
result['updatedBy']

# ✅ REPLACE WITH: Snake_case field access
config.get('config_id')
config['created_at']
result['updated_by']
```

### Step 2: DO NOT Use transform_record()

The `transform_record()` utility is designed for APIs that **should** return camelCase.

**This project's API contract is snake_case**, so transform utilities are NOT appropriate.

### Step 3: Update key_consistency Validator (Optional)

Consider updating the validator to:
- Detect camelCase field access in Lambda code
- Recommend snake_case instead
- Flag as error (not warning)

---

## Impact on Previous Analysis

### Transform Utility Adoption Audit - NOW INVALID

The document `docs/analysis/analysis_transform-utility-adoption.md` recommended using `transform_record()` to convert responses to camelCase.

**This recommendation is NOW INVALID and should NOT be followed.**

### Correct Approach

**DO NOT:**
- Import `transform_record` from org_common
- Convert responses to camelCase
- Use transform utilities for API responses

**DO:**
- Keep database queries returning snake_case
- Build API responses with snake_case field names
- Remove any camelCase field access in Lambda code
- Ensure consistency with frontend TypeScript types

---

## Key Consistency Error Breakdown - Revised Understanding

| Error Pattern | Count | Correct Fix |
|---------------|-------|-------------|
| `accessing 'created_at' but dict may have 'createdAt'` | 22 | Remove camelCase access, use snake_case only |
| `accessing 'updated_at' but dict may have 'updatedAt'` | 18 | Remove camelCase access, use snake_case only |
| `accessing 'updated_by' but dict may have 'updatedBy'` | 13 | Remove camelCase access, use snake_case only |
| `accessing 'providerId' but dict may have 'provider_id'` | 13 | Remove camelCase access, use snake_case only |

**Root Cause:** Lambdas have inconsistent field access (mixing snake_case and camelCase within same file)

**Correct Fix:** Remove ALL camelCase field access, use snake_case consistently

---

## Recommendations

### Immediate Actions

1. ✅ **DO NOT proceed with transform_record() adoption**
2. ✅ **Mark previous audit document as INVALID**
3. ✅ **Create new implementation plan for snake_case consistency**
4. ❌ **DO NOT update frontend types to camelCase** (too risky)

### Long-Term Considerations

**If the team decides to adopt camelCase API standard in the future:**

1. Create a comprehensive migration plan
2. Use automated tools for bulk updates
3. Extensive testing before deployment
4. Phased rollout per module
5. Expect 40-60 hours of effort

**Current recommendation:** Keep snake_case API contract, it's already working for 90% of the code.

---

## Related Documents

- **Original Audit (NOW INVALID):** `docs/analysis/analysis_transform-utility-adoption.md`
- **Sprint Plan:** `docs/plans/plan_validation-errors-s5.md`
- **Transform Utilities:** `templates/_modules-core/module-access/backend/layers/org-common/python/org_common/transform.py`
- **Context:** `memory-bank/context-error-remediation.md`

---

## Conclusion

**The frontend API contract is snake_case, NOT camelCase.**

Using `transform_record()` would break the entire frontend. The correct approach is to ensure Lambdas consistently return snake_case to match the frontend's expectations.

**Estimated effort to fix (revised):** 5-8 hours (down from 11-14 hours because we're NOT adding transform utilities, just removing incorrect camelCase access)

**Risk level:** LOW (removing bugs, not introducing new patterns)