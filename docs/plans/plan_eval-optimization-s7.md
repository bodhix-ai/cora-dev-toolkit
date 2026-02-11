# Sprint 7 (S7): Testing, Refinement & Comparison

## Status: 🚀 **ACTIVE**

**Sprint Duration:** 2-3 weeks  
**Started:** February 10, 2026  
**Target Completion:** February 24-28, 2026

---

## Executive Summary

Sprint 7 focuses on validating S6 deliverables, fixing bugs, and adding execution comparison features. This sprint ensures production readiness through comprehensive testing and refinement.

**Key Goals:**
1. **Validate S6 Features** - End-to-end testing of executions and AI-assisted truth sets
2. **Fix Critical Bugs** - Address issues discovered during testing
3. **Execution Comparison** - Side-by-side comparison UI for analyzing multiple executions
4. **Performance Optimization** - Optimize backend processing and frontend rendering
5. **Documentation Updates** - Update docs based on testing feedback

---

## Sprint 6 Recap

### What Was Delivered:
- ✅ Database schema for executions (`eval_opt_run_executions`)
- ✅ 7 Lambda handlers (execution + truth set workflow)
- ✅ 5 frontend components (truth set dialogs, execution UI, collapsible sections)
- ✅ 57KB of comprehensive BA documentation (2 guides)
- ✅ Multiple executions per run (reuse truth sets)
- ✅ AI-assisted truth set creation (10x productivity gain)

### What Needs Testing:
- ❓ AI-assisted truth set workflow (download → populate → upload)
- ❓ Multiple executions workflow (create → configure → run → compare)
- ❓ Validation error handling
- ❓ Large truth sets (10+ documents)
- ❓ Parallel execution performance
- ❓ UI/UX edge cases

---

## Sprint 7 Goals

### Primary Objectives:
1. **End-to-End Testing** - Validate all S6 features work correctly
2. **Bug Fixes** - Address critical and high-priority issues
3. **Execution Comparison** - Side-by-side comparison UI
4. **Performance** - Optimize execution time and resource usage

### Success Criteria:
- ✅ All test cases pass (manual + automated)
- ✅ Zero critical bugs remaining
- ✅ Execution comparison UI functional
- ✅ Documentation accurate and complete
- ✅ Performance meets targets (< 10 min for 5 docs × 8 criteria)
- ✅ Ready for production deployment

---

## Phase 1: End-to-End Testing (Week 1)

### Goal: Validate S6 features work correctly

**Status:** 🚀 PLANNED

### Test Cases

#### TC1: AI-Assisted Truth Set Creation (Happy Path)
**Objective:** Verify complete workflow from download to upload

**Steps:**
1. Create optimization run with 3 sections, 8 criteria
2. Click "Download Template" button
3. Verify JSON template is valid and contains all sections/criteria
4. Use Claude to populate truth set (5 documents)
5. Click "Upload Truth Set" button
6. Verify preview dialog shows correct summary
7. Click "Import" and verify success notification
8. Verify truth sets appear in UI

**Expected Result:** Truth sets imported successfully, displayed in UI

**Priority:** HIGH

---

#### TC2: Multiple Executions Workflow
**Objective:** Verify multiple executions can be created and run

**Steps:**
1. Create optimization run with truth sets
2. Click "New Execution" button
3. Configure max_trials = 2
4. Click "Start Execution"
5. Wait for completion (~5-10 minutes)
6. Verify results displayed (accuracy, best variation)
7. Click "New Execution" button again
8. Configure max_trials = 5
9. Click "Start Execution"
10. Wait for completion
11. Verify both executions visible in timeline

**Expected Result:** Both executions complete successfully, results preserved

**Priority:** HIGH

---

#### TC3: Validation Error Handling
**Objective:** Verify validation errors are caught and displayed correctly

**Steps:**
1. Create truth set JSON with invalid run_id
2. Upload via "Upload Truth Set" button
3. Verify error message: "run_id mismatch"
4. Create truth set JSON with unknown criteria_id
5. Upload and verify error message
6. Create truth set JSON with invalid score (> 100)
7. Upload and verify error message
8. Create truth set JSON with duplicate evaluations
9. Upload and verify error message

**Expected Result:** All validation errors caught and displayed with clear messages

**Priority:** HIGH

---

#### TC4: Large Truth Sets
**Objective:** Verify system handles large truth sets (10+ documents)

**Steps:**
1. Create truth set with 10 documents, 8 criteria each (80 evaluations)
2. Upload via AI-assisted workflow
3. Verify upload succeeds
4. Create execution with max_trials = 3
5. Start execution
6. Monitor execution time
7. Verify completion (expected: < 15 minutes)
8. Verify results accuracy

**Expected Result:** Large truth set processed successfully, performance acceptable

**Priority:** MEDIUM

---

#### TC5: Collapsible Sections Behavior
**Objective:** Verify smart collapse logic works correctly

**Steps:**
1. Create new optimization run
2. Verify "Response Sections" expanded (incomplete)
3. Add 3 sections with criteria
4. Verify section collapses with "✓ 3 sections defined"
5. Verify "Truth Sets" expanded (missing)
6. Upload truth set
7. Verify section collapses with "✓ X truth sets complete"
8. Verify "Executions" expanded (ready)
9. Create and start execution
10. Verify execution card auto-expands (running)
11. Verify cannot collapse during execution

**Expected Result:** Smart collapse logic works as designed

**Priority:** MEDIUM

---

#### TC6: Execution Live Progress
**Objective:** Verify live progress updates work correctly

**Steps:**
1. Create optimization run with truth sets
2. Start execution with max_trials = 5
3. Observe OptimizationStepper phases (1-5)
4. Verify phase progress updates every 3 seconds
5. Observe VariationProgressTable during Phase 4
6. Verify variation progress bars update
7. Verify completion status changes to "complete"
8. Verify final results displayed

**Expected Result:** Live progress updates work smoothly, no UI glitches

**Priority:** MEDIUM

---

#### TC7: Concurrent Executions (Edge Case)
**Objective:** Verify system prevents concurrent executions

**Steps:**
1. Create optimization run with truth sets
2. Start execution #1
3. Attempt to start execution #2 before #1 completes
4. Verify error or disabled state
5. Wait for execution #1 to complete
6. Start execution #2
7. Verify success

**Expected Result:** System prevents concurrent executions gracefully

**Priority:** LOW

---

#### TC8: Browser Refresh During Execution
**Objective:** Verify execution state persists across page refreshes

**Steps:**
1. Create optimization run with truth sets
2. Start execution
3. Wait until Phase 3 (Variation Generation)
4. Refresh browser
5. Verify execution status restored
6. Verify progress continues from Phase 3
7. Verify completion works normally

**Expected Result:** Execution state persists, progress continues correctly

**Priority:** MEDIUM

---

### Test Deliverables
- [ ] Test plan document (this section)
- [ ] Test execution log (Google Sheet or similar)
- [ ] Bug reports for failures (GitHub issues)
- [ ] Test coverage report

---

## Phase 2: Bug Fixes & Refinement (Week 1-2)

### Goal: Address critical and high-priority issues

**Status:** 🚀 PLANNED (pending test results)

### Expected Bug Categories

#### Category 1: Backend Lambda Issues
- Truth set validation edge cases
- Execution parameter handling
- Error handling and logging
- Database transaction failures

#### Category 2: Frontend UI Issues
- Component rendering errors
- State management bugs
- API integration failures
- Loading/error states

#### Category 3: Database Issues
- RLS policy gaps
- Query performance
- Data consistency
- Migration rollback

#### Category 4: Documentation Issues
- Inaccurate instructions
- Missing screenshots
- Outdated examples
- Broken links

### Bug Prioritization

| Priority | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | Blocks core functionality, data loss | Fix within 24 hours |
| **High** | Major feature broken, workaround exists | Fix within 3 days |
| **Medium** | Minor feature broken, low impact | Fix within 1 week |
| **Low** | Cosmetic, enhancement | Fix in S8 or later |

### Bug Fix Workflow
1. Reproduce bug in test environment
2. Create GitHub issue with repro steps
3. Fix in templates (template-first!)
4. Sync to test project
5. Deploy and verify fix
6. Update docs if needed
7. Close issue

---

## Phase 3: Execution Comparison UI (Week 2)

### Goal: Enable side-by-side comparison of executions

**Status:** 🚀 PLANNED

### Feature Specification

#### Comparison Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Execution Comparison: Run "NIST 800-171 Evaluation"        │
├─────────────────────────────────────────────────────────────┤
│ Select Executions to Compare:                               │
│ [x] Execution #1 (2 trials, 13% accuracy)                  │
│ [x] Execution #2 (5 trials, 45% accuracy)                  │
│ [x] Execution #3 (10 trials, 67% accuracy)                 │
│ [ ] Execution #4 (3 trials, 52% accuracy)                  │
│                                                             │
│ [Compare Selected]                                          │
├─────────────────────────────────────────────────────────────┤
│ Comparison Table                                            │
│ ┌──────────┬───────────┬───────────┬───────────┐          │
│ │ Metric   │ Exec #1   │ Exec #2   │ Exec #3   │          │
│ ├──────────┼───────────┼───────────┼───────────┤          │
│ │ Accuracy │ 13%       │ 45% ↑     │ 67% ↑     │          │
│ │ Trials   │ 2         │ 5         │ 10        │          │
│ │ Duration │ 6 min     │ 12 min    │ 18 min    │          │
│ │ Best Var │ v2_cite   │ v4_comp   │ v7_anal   │          │
│ └──────────┴───────────┴───────────┴───────────┘          │
│                                                             │
│ Per-Criterion Comparison                                    │
│ ┌──────────────┬──────────┬──────────┬──────────┐         │
│ │ Criterion    │ Exec #1  │ Exec #2  │ Exec #3  │         │
│ ├──────────────┼──────────┼──────────┼──────────┤         │
│ │ AC1a         │ 0% ❌    │ 50% ⚠️   │ 100% ✅  │         │
│ │ AC1b         │ 25% ⚠️   │ 75% ✅   │ 100% ✅  │         │
│ │ AC2a         │ 0% ❌    │ 25% ⚠️   │ 75% ✅   │         │
│ └──────────────┴──────────┴──────────┴──────────┘         │
│                                                             │
│ Insights & Recommendations                                  │
│ • Accuracy improved by 54% from Exec #1 to Exec #3        │
│ • Best variation: v7_analytical_detailed                   │
│ • Criteria with low accuracy: AC2a (75%)                   │
│ • Recommendation: Add more truth sets for AC2a             │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. ExecutionComparisonPage
**Location:** `apps/studio/app/ws/[id]/runs/[runId]/compare/page.tsx`

**Responsibilities:**
- Load executions for a run
- Allow selection of 2-4 executions
- Trigger comparison
- Display comparison results

#### 2. ExecutionComparisonTable
**Location:** `apps/studio/components/ExecutionComparisonTable.tsx`

**Responsibilities:**
- Display side-by-side metrics
- Highlight improvements (arrows, colors)
- Show overall accuracy trend
- Display best variation per execution

#### 3. PerCriterionComparisonTable
**Location:** `apps/studio/components/PerCriterionComparisonTable.tsx`

**Responsibilities:**
- Display per-criterion accuracy
- Color-code results (green/yellow/red)
- Show accuracy deltas between executions
- Sortable by criterion name or accuracy

#### 4. ComparisonInsights
**Location:** `apps/studio/components/ComparisonInsights.tsx`

**Responsibilities:**
- Generate insights from comparison data
- Identify accuracy trends
- Highlight problematic criteria
- Provide actionable recommendations

### API Endpoints

#### GET /ws/{wsId}/optimization/runs/{runId}/executions/compare
**Request:**
```json
{
  "execution_ids": ["exec-1", "exec-2", "exec-3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "run_id": "run-456",
    "executions": [
      {
        "execution_id": "exec-1",
        "execution_number": 1,
        "overall_accuracy": 13.0,
        "max_trials": 2,
        "best_variation": "v2_citation_focused",
        "duration_seconds": 360,
        "per_criterion_accuracy": {
          "crit-1": 0.0,
          "crit-2": 25.0,
          "crit-3": 0.0
        }
      },
      {
        "execution_id": "exec-2",
        "execution_number": 2,
        "overall_accuracy": 45.0,
        "max_trials": 5,
        "best_variation": "v4_comprehensive",
        "duration_seconds": 720,
        "per_criterion_accuracy": {
          "crit-1": 50.0,
          "crit-2": 75.0,
          "crit-3": 25.0
        }
      }
    ],
    "insights": {
      "accuracy_trend": "improving",
      "best_execution": "exec-2",
      "problematic_criteria": ["crit-3"],
      "recommendations": [
        "Add more truth sets for criterion crit-3",
        "Current best variation: v4_comprehensive"
      ]
    }
  }
}
```

### Implementation Steps
1. Create comparison page route
2. Create comparison components
3. Implement comparison API endpoint
4. Generate insights algorithm
5. Add "Compare Executions" button to run detail page
6. Test with 2-4 executions

---

## Phase 4: Performance Optimization (Week 2-3)

### Goal: Optimize execution time and resource usage

**Status:** 🚀 PLANNED

### Performance Targets

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Execution time (5 docs, 8 criteria, 5 trials) | ~12 min | < 10 min | HIGH |
| Lambda memory usage | 512 MB | < 256 MB | MEDIUM |
| Database query time | ~2-5 sec | < 1 sec | HIGH |
| Frontend initial load | ~3 sec | < 2 sec | MEDIUM |
| Truth set upload (10 docs) | ~5 sec | < 3 sec | MEDIUM |

### Optimization Areas

#### 1. Backend Lambda Performance
**Current Issues:**
- Sequential criteria evaluation (slow)
- Redundant database queries
- Large Lambda package size

**Optimizations:**
- ✅ Already implemented parallel variation processing (5x speedup)
- [ ] Batch database inserts (reduce transactions)
- [ ] Cache frequently accessed data (criteria sets)
- [ ] Optimize Lambda package size (strip debug symbols)

#### 2. Database Query Performance
**Current Issues:**
- N+1 queries in list operations
- Missing indexes on foreign keys
- Large JSONB columns without GIN indexes

**Optimizations:**
- [ ] Add indexes on `eval_opt_run_results(execution_id)`
- [ ] Add GIN index on `ai_result` JSONB column
- [ ] Use `SELECT DISTINCT ON` for deduplication
- [ ] Batch queries with `WHERE id = ANY($1)`

#### 3. Frontend Performance
**Current Issues:**
- Large component tree re-renders
- Inefficient polling (every 3 seconds)
- No memoization on heavy computations

**Optimizations:**
- [ ] Use React.memo() for expensive components
- [ ] Implement useMemo() for data transformations
- [ ] Debounce polling when tab not visible
- [ ] Lazy load execution cards (virtualization)

#### 4. Truth Set Upload Performance
**Current Issues:**
- Large JSON payloads (10+ docs)
- Synchronous validation
- No streaming support

**Optimizations:**
- [ ] Add gzip compression for uploads
- [ ] Stream validation instead of all-at-once
- [ ] Show progress bar during upload
- [ ] Chunked uploads for very large sets (> 100 docs)

### Performance Testing
1. Create benchmark suite (5 docs × 8 criteria × 5 trials)
2. Run baseline measurements
3. Apply optimizations incrementally
4. Measure improvement after each change
5. Document results in performance report

---

## Phase 5: Documentation Updates (Week 3)

### Goal: Update docs based on testing feedback

**Status:** 🚀 PLANNED

### Documentation Tasks

#### 1. Update AI-Assisted Truth Sets Guide
- [ ] Add troubleshooting section based on test failures
- [ ] Add screenshots of UI components
- [ ] Update example JSON based on validation errors
- [ ] Add FAQ entries from user questions

#### 2. Update Multiple Executions Guide
- [ ] Add comparison workflow section
- [ ] Update performance expectations (post-optimization)
- [ ] Add best practices from testing
- [ ] Update troubleshooting guide

#### 3. Update ADR-021 (Eval Optimizer Deployment)
- [ ] Add S6 implementation notes
- [ ] Document execution concept
- [ ] Document truth set workflow
- [ ] Add lessons learned section

#### 4. Create S7 Summary Document
- [ ] Test results summary
- [ ] Bug fixes changelog
- [ ] Performance improvements
- [ ] Outstanding issues

---

## Implementation Phases

### Phase 1: End-to-End Testing (Week 1)
**Goal:** Validate S6 features

- [x] ~~Create test plan~~ (this document)
- [ ] Execute TC1-TC8 (manual testing)
- [ ] Document test results
- [ ] Create bug reports for failures
- [ ] Prioritize bugs for fixing

**Deliverables:**
- Test execution log
- Bug report list (GitHub issues)
- Test coverage report

---

### Phase 2: Bug Fixes & Refinement (Week 1-2)
**Goal:** Address critical and high-priority issues

- [ ] Fix critical bugs (data loss, crashes)
- [ ] Fix high-priority bugs (major features broken)
- [ ] Fix medium-priority bugs (minor issues)
- [ ] Update templates with fixes
- [ ] Deploy fixes to test environment
- [ ] Re-test fixed functionality

**Deliverables:**
- Bug fixes merged to main
- Updated templates
- Test verification log

---

### Phase 3: Execution Comparison UI (Week 2)
**Goal:** Enable side-by-side comparison

- [ ] Create ExecutionComparisonPage
- [ ] Create ExecutionComparisonTable component
- [ ] Create PerCriterionComparisonTable component
- [ ] Create ComparisonInsights component
- [ ] Implement comparison API endpoint
- [ ] Add "Compare Executions" button
- [ ] Test comparison with 2-4 executions
- [ ] Update documentation

**Deliverables:**
- Comparison UI functional
- API endpoint implemented
- Documentation updated

---

### Phase 4: Performance Optimization (Week 2-3)
**Goal:** Optimize execution time and resource usage

- [ ] Create performance benchmark suite
- [ ] Run baseline measurements
- [ ] Implement database optimizations (indexes)
- [ ] Implement Lambda optimizations (batching)
- [ ] Implement frontend optimizations (memoization)
- [ ] Implement upload optimizations (compression)
- [ ] Run performance tests
- [ ] Document improvements

**Deliverables:**
- Performance improvements deployed
- Performance report (before/after)
- Updated benchmarks

---

### Phase 5: Documentation Updates (Week 3)
**Goal:** Update docs based on testing feedback

- [ ] Update AI-Assisted Truth Sets guide
- [ ] Update Multiple Executions guide
- [ ] Update ADR-021 with S6 notes
- [ ] Create S7 summary document
- [ ] Add screenshots to guides
- [ ] Update troubleshooting sections

**Deliverables:**
- Updated documentation
- S7 summary document
- Screenshot library

---

## Success Metrics

### Quantitative:
- ✅ **Test Coverage:** 100% of test cases executed
- ✅ **Bug Fix Rate:** > 90% of critical/high bugs fixed
- ✅ **Performance:** < 10 min for 5 docs × 8 criteria × 5 trials
- ✅ **Comparison UI:** Functional for 2-4 executions
- ✅ **Documentation:** Updated with test feedback

### Qualitative:
- ✅ BA reports "easy to use" for AI-assisted truth sets
- ✅ BA reports "helpful" for execution comparison
- ✅ No confusion about execution workflow
- ✅ Error messages are clear and actionable
- ✅ Performance feels responsive

---

## Risks & Mitigations

### Risk 1: Test Failures Reveal Major Issues
**Risk:** Testing may reveal critical bugs requiring significant rework  
**Mitigation:** Allocate buffer time (Week 3), prioritize ruthlessly  
**Status:** Medium risk

### Risk 2: Performance Targets Not Met
**Risk:** Optimizations may not achieve < 10 min target  
**Mitigation:** Document current performance, set realistic expectations  
**Status:** Low risk (parallel processing already 5x speedup)

### Risk 3: Comparison UI Complexity
**Risk:** Comparison UI may be more complex than estimated  
**Mitigation:** Start with simple version, iterate based on feedback  
**Status:** Medium risk

### Risk 4: Documentation Gaps
**Risk:** Docs may not address all user questions  
**Mitigation:** Collect feedback during testing, update iteratively  
**Status:** Low risk

---

## Out of Scope for S7

These are good ideas but not in S7 scope:

- ❌ Execution templates (save/reuse configurations)
- ❌ Advanced parameters (model selection, temperature ranges)
- ❌ Parallel execution support (multiple executions simultaneously)
- ❌ Multi-run comparison (compare across different runs)
- ❌ Automated parameter suggestions (AI recommends parameters)
- ❌ Real-time collaboration (multiple BAs working together)
- ❌ Export/import optimization runs

---

## Dependencies

### External:
- None (all internal CORA systems)

### Internal:
- S6 must be merged to main ✅
- Test environment available
- Database accessible
- CloudWatch logs accessible

---

## Rollback Plan

If S7 needs to be rolled back:

1. **Testing Phase:** No rollback needed (no changes deployed)
2. **Bug Fixes:** Revert individual commits if needed
3. **Comparison UI:** Feature flag to disable if issues
4. **Performance:** Revert optimization commits individually

**Rollback triggers:**
- Critical bug introduced by S7 changes
- Performance regression
- Data corruption issues

---

## Documentation Requirements

### For BAs:
- [ ] Updated "AI-Assisted Truth Set Creation Guide"
- [ ] Updated "Running Multiple Optimization Executions"
- [ ] New "Comparing Execution Results" guide
- [ ] Updated troubleshooting sections

### For Developers:
- [ ] S7 summary document (test results, bug fixes, performance)
- [ ] Performance report (benchmarks, optimizations)
- [ ] Updated API documentation (comparison endpoint)

### For Support:
- [ ] Updated FAQ with common issues
- [ ] Test execution log for reference
- [ ] Bug fix changelog

---

## Sprint 7 Completion Checklist

### Phase 1: Testing
- [ ] All 8 test cases executed
- [ ] Test execution log complete
- [ ] Bugs documented in GitHub issues
- [ ] Test coverage report generated

### Phase 2: Bug Fixes
- [ ] All critical bugs fixed
- [ ] All high-priority bugs fixed
- [ ] Templates updated with fixes
- [ ] Fixes deployed and verified

### Phase 3: Comparison UI
- [ ] Comparison page functional
- [ ] Comparison API endpoint implemented
- [ ] Documentation updated
- [ ] Feature tested with 2-4 executions

### Phase 4: Performance
- [ ] Performance benchmarks complete
- [ ] Optimizations implemented
- [ ] Performance targets met (or documented)
- [ ] Performance report published

### Phase 5: Documentation
- [ ] All guides updated
- [ ] Screenshots added
- [ ] S7 summary document created
- [ ] ADR-021 updated

### Sprint Completion
- [ ] S7 retrospective held
- [ ] S8 planning initiated (if needed)
- [ ] Production deployment plan created
- [ ] BA training scheduled

---

## Next: Sprint 8 Planning (If Needed)

**Potential S8 scope:**
- Execution templates (save/reuse configurations)
- Advanced parameters (model selection, temperature ranges)
- Multi-run comparison dashboard
- Automated optimization suggestions
- BA training and onboarding
- Production deployment

**To be determined based on S7 learnings and BA feedback.**

---

## Sprint Contacts

**Product Owner:** TBD  
**Tech Lead:** TBD  
**BA Liaison:** TBD  
**QA Lead:** TBD

**Sprint Kick-off:** February 10, 2026  
**Daily Standups:** TBD  
**Sprint Review:** February 24-28, 2026  
**Sprint Retro:** February 24-28, 2026

---

*Document created: 2026-02-10*  
*Last updated: 2026-02-10*  
*Status: ACTIVE*