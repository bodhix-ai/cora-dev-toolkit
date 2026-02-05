# CORA Validation Errors - Sprint S6

**Status:** 🟡 IN PROGRESS  
**Branch:** `feature/validation-errors-s6`  
**Created:** February 5, 2026  
**Context:** `memory-bank/context-error-remediation.md`  
**Baseline:** Post S5 completion (560 errors)  
**Target:** <200 actionable errors  

---

## 📊 Executive Summary

This sprint focuses on Phase 2: Architecture Review of the remaining 560 validation errors. The primary goal is to analyze, categorize, and address the high volume of API Tracer errors through intelligent configuration and whitelisting rather than code changes.

**Primary Objectives:**
1. Analyze 400+ Code Quality/Key Consistency errors (delegate or whitelist)
2. Analyze 238 Orphaned Routes (identify webhooks vs dead code)
3. Analyze 144 Route Mismatches (identify build artifacts vs real issues)
4. Configure `validation/api-tracer/config.yaml` to reduce noise
5. Establish a clean baseline for Silver certification

---

## 🎯 Scope & Strategy

### 1. Route Mismatch Analysis (144 errors)
- **Problem:** Frontend calling routes that don't exist in API Gateway
- **Suspected Causes:**
  - `.next/` build artifacts being scanned
  - Legacy routes not yet removed
  - Dynamic route parameters not matching
- **Strategy:**
  - Exclude build artifacts
  - Verify dynamic route patterns
  - Whitelist intentional mismatches

### 2. Orphaned Route Analysis (238 warnings)
- **Problem:** Lambda handlers with no frontend calls
- **Suspected Causes:**
  - Webhooks (Stripe, Supabase)
  - Internal admin APIs
  - Dead code
- **Strategy:**
  - Whitelist known webhooks patterns (`/webhooks/*`)
  - Whitelist internal admin routes
  - Deprecate/remove actual dead code

### 3. Code Quality Analysis (403 occurrences)
- **Problem:** High volume of style/convention errors
- **Major Component:** Key Consistency (snake_case vs camelCase) - 374 errors
- **Strategy:**
  - Confirm these are covered by API Naming Migration Plan
  - Configure validator to ignore or warn-only for these specific patterns
  - Focus on fixing the remaining ~30 non-naming errors

---

## 📝 Implementation Plan

### Phase 2.1: Configuration & Exclusion (2 hours)
- [ ] Create `validation/api-tracer/config.yaml` (if not exists) or update it
- [ ] Add exclusions for `.next`, `node_modules`, `dist`, `build`
- [ ] Add exclusions for test directories
- [ ] Run validation to measure impact

### Phase 2.2: Route Whitelisting (1-2 hours)
- [ ] Identify webhook patterns
- [ ] Identify internal API patterns
- [ ] Update config with `valid_orphans` list
- [ ] Update config with `valid_missing_routes` list

### Phase 2.3: Tech Debt Documentation (1 hour)
- [ ] Document remaining actionable errors
- [ ] Categorize into "Fix Now", "Fix Later", "Won't Fix"
- [ ] Update API Naming Migration plan with specifics from analysis

---

## ✅ Success Criteria

- [ ] `.next/` and build artifacts excluded from scanning
- [ ] Webhooks and internal APIs whitelisted
- [ ] Error count reduced from 560 → <200
- [ ] Clear path to Silver certification documented
- [ ] No new code changes required (config only)

---

## 🔗 Related Resources

- [Context: Error Remediation](../memory-bank/context-error-remediation.md)
- [Plan: API Naming Migration](plan_api-naming-standard-migration.md)
- [Plan: Validator Enhancements](plan_validator-enhancements.md)
