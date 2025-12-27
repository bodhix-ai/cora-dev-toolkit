# Duplicate Routes Investigation

**Date:** December 26, 2025  
**Status:** ✅ Complete

## Summary

Investigation into the "duplicate" routes reported in test6 validation revealed that they are not actually duplicates, but rather missing infrastructure configurations.

## Findings

### 1. Email Domains Routes - MISSING FROM INFRASTRUCTURE ❌

**Lambda Exists:**
- `module-access/backend/lambdas/org-email-domains/lambda_function.py` ✅

**Infrastructure Status:**
- Lambda function is NOT defined in `main.tf` ❌
- Routes are NOT in `outputs.tf` api_routes ❌
- **Impact:** Routes are completely orphaned - backend exists but unreachable

**Required Routes (Missing):**
```
GET    /orgs/{id}/email-domains
POST   /orgs/{id}/email-domains
PUT    /orgs/{id}/email-domains/{domainId}
DELETE /orgs/{id}/email-domains/{domainId}
```

**Action Required:**
1. Add Lambda function definition to `module-access/infrastructure/main.tf`
2. Add 4 routes to `module-access/infrastructure/outputs.tf`

---

### 2. Identities Provision Route - PROPERLY CONFIGURED ✅

**Lambda Exists:**
- `module-access/backend/lambdas/identities-management/lambda_function.py` ✅

**Infrastructure Status:**
- Lambda function defined in `main.tf` ✅
- Route properly registered in `outputs.tf` ✅

**Route:**
```
POST /identities/provision
```

**Conclusion:** No duplicate - validation report may have been counting this route multiple times due to validator logic

---

## Resolution

### Email Domains Routes

**Problem:** Lambda code exists but infrastructure is completely missing

**Solution:** Add infrastructure configuration for org-email-domains Lambda

**Files to Update:**
1. `module-access/infrastructure/main.tf` - Add Lambda function resource
2. `module-access/infrastructure/outputs.tf` - Add 4 API routes

---

## Validation Report Context

The test6 validation reported these as "duplicates" but they were actually:
- **Email domains:** Missing entirely (0 routes, should be 4)
- **Identities provision:** Configured once (1 route, correct)

The validator may have been detecting the Lambda code without corresponding infrastructure and flagging it as a configuration issue.

---

**Status:** Investigation complete - proceeding to fix missing infrastructure  
**Next:** Add org-email-domains Lambda and routes to infrastructure
