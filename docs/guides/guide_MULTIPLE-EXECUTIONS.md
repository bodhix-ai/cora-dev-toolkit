# Guide: Multiple Optimization Executions

**Module:** module-eval-studio  
**Feature:** Multiple Executions per Run (Sprint 6)  
**Audience:** Business Analysts  
**Created:** February 10, 2026  
**Status:** Production-Ready

---

## Executive Summary

This guide explains how to run multiple optimization executions to iteratively refine evaluation prompts. Instead of recreating your entire configuration, you can run multiple tests with different parameters while reusing truth sets.

**Before (S5):**
- Create run → Configure sections → Create truth sets → Optimize once → Done (or recreate everything)

**After (S6):**
- Create run → Configure sections → Create truth sets → Run execution #1 → Analyze → Run execution #2 with different parameters → Compare → Run execution #3 → Find best configuration

---

## Table of Contents

1. [Overview](#overview)
2. [Understanding Executions](#understanding-executions)
3. [Configuring Execution Parameters](#configuring-execution-parameters)
4. [Running Multiple Executions](#running-multiple-executions)
5. [Interpreting Results](#interpreting-results)
6. [Comparing Executions](#comparing-executions)
7. [Best Practices](#best-practices)
8. [Parameter Tuning Guide](#parameter-tuning-guide)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is an Execution?

An **execution** is a single optimization run with specific parameters. Each execution:
- Reuses the same run configuration (sections, criteria, truth sets)
- Uses different optimization parameters (max_trials, temperature, etc.)
- Produces independent results for comparison
- Preserves history for analysis

### Why Multiple Executions?

**Problem with Single Execution (OLD):**
```
Run 1: Default settings → 13% accuracy
❓ What if I used more trials?
❓ What if I adjusted temperature?
❌ Must recreate entire configuration to test
```

**Solution with Multiple Executions (NEW):**
```
Run 1 Configuration (sections + criteria + truth sets)
  ├─ Execution 1: 2 trials (quick test) → 13% accuracy
  ├─ Execution 2: 5 trials (balanced) → 45% accuracy
  ├─ Execution 3: 10 trials (thorough) → 67% accuracy
  └─ Compare all three → Choose best approach
```

### Key Benefits

- ✅ **Reuse Truth Sets** - No need to recreate expensive ground truth data
- ✅ **Experiment Freely** - Test different parameters without risk
- ✅ **Compare Results** - Side-by-side comparison of approaches
- ✅ **Learn Iteratively** - Each execution informs the next
- ✅ **Preserve History** - All execution results saved for analysis

---

## Understanding Executions

### Execution Lifecycle

```
┌─────────────────────────────────────────────────┐
│ OPTIMIZATION RUN                                │
│ (Configured once: sections, criteria, truth sets) │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ EXECUTION #1                             │  │
│  │ Status: pending → running → completed    │  │
│  │ Parameters: max_trials=2                 │  │
│  │ Result: 13% accuracy                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ EXECUTION #2                             │  │
│  │ Status: pending → running → completed    │  │
│  │ Parameters: max_trials=5                 │  │
│  │ Result: 45% accuracy                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ EXECUTION #3                             │  │
│  │ Status: running                          │  │
│  │ Parameters: max_trials=10                │  │
│  │ Result: (in progress...)                 │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Execution States

| State | Meaning | Actions Available |
|-------|---------|-------------------|
| **Pending** | Created but not started | Start, Delete |
| **Running** | Currently processing | View progress, Monitor |
| **Completed** | Finished successfully | View results, Compare |
| **Failed** | Error occurred | View error, Retry |

---

## Configuring Execution Parameters

### Parameter Dialog

When you click "New Execution", you'll see a parameter configuration dialog:

```
┌────────────────────────────────────────────────┐
│ Configure Optimization Execution - Execution #2 │
├────────────────────────────────────────────────┤
│                                                │
│ ℹ️  This execution will reuse the existing     │
│    truth set configuration.                    │
│                                                │
│ Number of Trials: [5]                         │
│ ↳ Number of prompt variations to test         │
│    (2-3: quick test, 5-7: balanced, 10+: thorough) │
│                                                │
│ ▼ Advanced Parameters (Optional)               │
│   [Disabled in current version]                │
│   • Temperature Range                          │
│   • Token Limits                               │
│   • Strategy Selection                         │
│                                                │
│            [Cancel]  [Start Execution #2]      │
└────────────────────────────────────────────────┘
```

### Current Parameters (S6)

#### Max Trials (Required)

**Definition:** Number of prompt variations to generate and test.

**Range:** 1-20 (UI enforced)

**Guidance:**

| Trials | Use Case | Expected Duration | Accuracy Expectation |
|--------|----------|-------------------|----------------------|
| 2-3 | Quick test | 3-5 minutes | Low (baseline) |
| 5-7 | Balanced | 8-12 minutes | Moderate (production-ready) |
| 10-15 | Thorough | 15-25 minutes | High (best results) |
| 16-20 | Exhaustive | 25-35 minutes | Marginal improvement |

**Recommendation:**
- First execution: 2 trials (quick test, establish baseline)
- Second execution: 5-7 trials (if baseline promising)
- Third execution: 10+ trials (if targeting production accuracy)

### Future Parameters (Coming Soon)

These parameters are planned for future releases:

- **Temperature Range** (0.0-1.0): Control prompt variation creativity
- **Token Limits** (min/max): Constrain prompt length
- **Strategy Selection**: Choose which prompt strategies to test
- **Model Selection**: Test different LLMs (GPT-4, Claude, etc.)

---

## Running Multiple Executions

### Workflow Example

**Scenario:** You've created a run for NIST 800-53 compliance evaluation with 5 truth set documents.

#### Step 1: First Execution (Quick Test)

```
1. Navigate to your optimization run
2. Click "New Execution" button
3. Set max_trials = 2
4. Click "Start Execution #1"
5. Wait ~3 minutes for completion
```

**Result:**
- Overall Accuracy: 13%
- Best Variation: v1_direct
- Duration: 3 minutes
- **Analysis:** Low accuracy, but now have baseline

#### Step 2: Second Execution (Balanced)

```
1. Click "New Execution" button again
2. Set max_trials = 5
3. Click "Start Execution #2"
4. Wait ~10 minutes for completion
```

**Result:**
- Overall Accuracy: 45%
- Best Variation: v4_evidence_focused
- Duration: 10 minutes
- **Analysis:** Much better! Evidence-focused approach is promising

#### Step 3: Third Execution (Thorough)

```
1. Click "New Execution" button again
2. Set max_trials = 10
3. Click "Start Execution #3"
4. Wait ~18 minutes for completion
```

**Result:**
- Overall Accuracy: 67%
- Best Variation: v8_comprehensive
- Duration: 18 minutes
- **Analysis:** Good improvement. v8 balances evidence + context

### Execution Timeline View

Executions appear in reverse chronological order (newest first):

```
┌────────────────────────────────────────────────────────┐
│ Optimization Executions (3 executions completed)       │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ▼ Execution #3 - February 10, 2026 6:45 PM           │
│   Status: ✓ Completed                                 │
│   Trials: 10 | Accuracy: 67% | Best: v8_comprehensive│
│   Duration: 18 minutes                                 │
│   [View Results]                                       │
│                                                        │
│ ▼ Execution #2 - February 10, 2026 6:20 PM           │
│   Status: ✓ Completed                                 │
│   Trials: 5 | Accuracy: 45% | Best: v4_evidence_focused│
│   Duration: 10 minutes                                 │
│   [View Results]                                       │
│                                                        │
│ ▼ Execution #1 - February 10, 2026 6:05 PM           │
│   Status: ✓ Completed                                 │
│   Trials: 2 | Accuracy: 13% | Best: v1_direct         │
│   Duration: 3 minutes                                  │
│   [View Results]                                       │
│                                                        │
│            [+ New Execution]                          │
└────────────────────────────────────────────────────────┘
```

### Live Progress Tracking

While an execution is running, it auto-expands and shows live progress:

```
┌────────────────────────────────────────────────────────┐
│ Execution #3 - February 10, 2026 6:30 PM             │
│ Status: 🔄 Running (cannot collapse during execution) │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Phase 4: Evaluation Loop (70% complete)               │
│                                                        │
│ Variation Progress:                                    │
│  v1_direct             ████████████░ 87% (7/8)        │
│  v2_structured         ████████████░ 75% (6/8)        │
│  v3_context_rich       ████████████░ 62% (5/8)        │
│  ...                                                   │
│                                                        │
│ Elapsed: 12 minutes | Est. remaining: 6 minutes       │
└────────────────────────────────────────────────────────┘
```

---

## Interpreting Results

### Execution Result Card

When you click "View Results" for a completed execution:

```
┌────────────────────────────────────────────────────────┐
│ Execution #2 Results                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Overall Accuracy: 45%                                  │
│ Best Variation: v4_evidence_focused                    │
│ Trials Completed: 5/5                                  │
│ Duration: 10 minutes                                   │
│                                                        │
│ Top 3 Variations:                                      │
│  1. v4_evidence_focused    - 45% accuracy              │
│  2. v3_context_rich        - 38% accuracy              │
│  3. v2_structured          - 29% accuracy              │
│                                                        │
│ Performance by Criterion:                              │
│  AC-1a: Purpose & Scope    - 80% accuracy ✓           │
│  AC-1b: Roles & Responsibilities - 40% accuracy ⚠️     │
│  AC-1c: Management Commitment  - 20% accuracy ❌        │
│  ...                                                   │
│                                                        │
│ Key Insights:                                          │
│  • Strong at identifying explicit statements          │
│  • Struggles with implied responsibilities            │
│  • Needs better management commitment detection       │
│                                                        │
│ Recommendations:                                       │
│  • Use v4_evidence_focused as base                    │
│  • Run execution with more trials (10+) for better    │
│    coverage of implicit requirements                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Metrics Explained

#### Overall Accuracy

**Definition:** Percentage of evaluations that match the truth set.

**Formula:** `(Correct Evaluations / Total Evaluations) × 100`

**Example:**
```
Truth Set: 5 documents × 8 criteria = 40 evaluations
Execution #2 correct matches: 18/40
Overall Accuracy: 18/40 = 45%
```

**Interpretation:**
- < 30%: Poor - prompt needs major revision
- 30-60%: Fair - some patterns detected, needs refinement
- 60-80%: Good - suitable for production with review
- 80-95%: Excellent - high confidence in automated evaluation
- > 95%: Outstanding - rare, validate for overfitting

#### Best Variation

**Definition:** The prompt variation with the highest accuracy.

**Example:**
```
Best Variation: v4_evidence_focused (45% accuracy)

This variation emphasizes finding direct evidence in documents
before making compliance determinations. It outperformed other
approaches by focusing on explicit statements rather than
making inferences.
```

**Use Case:** This is the prompt you'd deploy to production.

#### Per-Criterion Performance

**Definition:** Accuracy broken down by evaluation criterion.

**Example:**
```
AC-1a: Purpose & Scope           - 80% (4/5 correct)
AC-1b: Roles & Responsibilities  - 40% (2/5 correct)
AC-1c: Management Commitment     - 20% (1/5 correct)
```

**Insights:**
- Criterion AC-1a is working well (explicit in documents)
- Criterion AC-1b needs improvement (implied roles hard to detect)
- Criterion AC-1c failing (signature detection issue)

**Action:** Focus next execution on improving weak criteria.

---

## Comparing Executions

### Side-by-Side Comparison

Compare multiple executions to identify trends:

| Metric | Execution 1 | Execution 2 | Execution 3 | Trend |
|--------|-------------|-------------|-------------|-------|
| **Trials** | 2 | 5 | 10 | ↑ |
| **Overall Accuracy** | 13% | 45% | 67% | ↑ Improving |
| **Best Variation** | v1_direct | v4_evidence_focused | v8_comprehensive | Different approaches |
| **Duration** | 3 min | 10 min | 18 min | ↑ Linear |
| **AC-1a Accuracy** | 20% | 80% | 100% | ↑ Solved |
| **AC-1b Accuracy** | 0% | 40% | 60% | ↑ Improving |
| **AC-1c Accuracy** | 20% | 20% | 40% | ↑ Slow progress |

### Analysis Questions

#### 1. Is More Trials Always Better?

**Look for diminishing returns:**
```
Execution 1 (2 trials):  13% accuracy (baseline)
Execution 2 (5 trials):  45% accuracy (+32% improvement)
Execution 3 (10 trials): 67% accuracy (+22% improvement)
Execution 4 (15 trials): 71% accuracy (+4% improvement) ← Diminishing
```

**Conclusion:** 10 trials hit the sweet spot (67% accuracy, reasonable time).

#### 2. Which Variation Type Works Best?

**Compare best variations across executions:**
```
Execution 1: v1_direct (simple, low accuracy)
Execution 2: v4_evidence_focused (evidence-based, moderate accuracy)
Execution 3: v8_comprehensive (evidence + context, high accuracy)
```

**Conclusion:** Evidence-based approaches outperform simple prompts.

#### 3. Which Criteria Are Hardest?

**Track per-criterion performance:**
```
Easy Criteria (> 80% by Execution 3):
  - AC-1a: Purpose & Scope (explicit statements)
  
Moderate Criteria (40-80% by Execution 3):
  - AC-1b: Roles & Responsibilities (implied assignments)
  
Hard Criteria (< 40% by Execution 3):
  - AC-1c: Management Commitment (signature detection)
```

**Conclusion:** Need better signature/approval detection logic.

#### 4. Is There a Cost/Benefit Trade-off?

**Calculate accuracy per minute:**
```
Execution 1: 13% / 3 min  = 4.3% per minute
Execution 2: 45% / 10 min = 4.5% per minute
Execution 3: 67% / 18 min = 3.7% per minute
```

**Conclusion:** Execution 2 is most efficient (5 trials, 10 minutes).

---

## Best Practices

### 1. Start Small, Scale Up

**Recommended Sequence:**

**Phase 1: Quick Validation (2-3 trials)**
- Goal: Verify truth sets are correct
- Time: 3-5 minutes
- Expected Accuracy: Low (baseline)
- Decision: If > 20%, proceed. If < 20%, check truth sets.

**Phase 2: Balanced Test (5-7 trials)**
- Goal: Find promising prompt strategies
- Time: 8-12 minutes
- Expected Accuracy: Moderate (30-60%)
- Decision: If > 50%, consider production. If < 30%, revise criteria.

**Phase 3: Production Run (10-15 trials)**
- Goal: Optimize for deployment
- Time: 15-25 minutes
- Expected Accuracy: High (60-80%)
- Decision: Deploy best variation if > 70%.

### 2. Wait Between Executions

**Why?** Analyze results before running next execution.

**What to Check:**
- Which criteria are failing?
- Which variation types work best?
- Are truth sets accurate (or is AI fundamentally correct)?
- What patterns emerge from errors?

**Time Investment:** 5-10 minutes of analysis saves 30 minutes of wasted executions.

### 3. Document Your Learnings

**Create a simple log:**

```markdown
# Execution Log: NIST AC-1 Compliance

## Execution 1 (2 trials, 13% accuracy)
- Best: v1_direct
- Insight: Prompt too simple, misses context
- Next: Try evidence-focused approach

## Execution 2 (5 trials, 45% accuracy)
- Best: v4_evidence_focused
- Insight: Evidence helps! But struggles with implied roles
- Next: Add context window for role detection

## Execution 3 (10 trials, 67% accuracy)
- Best: v8_comprehensive
- Insight: Context + evidence = best combo
- Decision: Deploy v8 to production
```

### 4. Know When to Stop

**Stop optimizing when:**
- ✅ Accuracy plateaus (< 5% improvement across 2 executions)
- ✅ Accuracy meets target (e.g., 70% for production)
- ✅ Time investment exceeds value (diminishing returns)
- ✅ Errors are in truth sets, not prompts (AI is correct!)

**Example:**
```
Execution 3: 67% accuracy
Execution 4: 71% accuracy (+4%)
Execution 5: 72% accuracy (+1%) ← Stop here, diminishing returns
```

### 5. Validate Truth Sets

**If accuracy is stuck low across multiple executions:**

**Check:**
- Are truth set evaluations actually correct?
- Did AI (used for truth sets) make mistakes?
- Are criteria definitions clear and objective?

**Action:**
- Manually review AI-generated truth sets
- Correct any errors
- Re-run executions with corrected truth sets

---

## Parameter Tuning Guide

### How Many Trials Should I Use?

**Decision Tree:**

```
Is this your first execution?
├─ YES → Use 2-3 trials (quick test)
│   ├─ Accuracy < 20% → Check truth sets, revise criteria
│   └─ Accuracy ≥ 20% → Proceed to 5 trials
│
└─ NO → Previous execution completed
    ├─ Accuracy < 30% → Use 5 trials (balanced)
    │   ├─ Still < 30% → Review criteria definitions
    │   └─ Now ≥ 30% → Proceed to 10 trials
    │
    ├─ Accuracy 30-60% → Use 10 trials (thorough)
    │   ├─ Now ≥ 70% → Deploy to production ✓
    │   └─ Still < 70% → Consider 15 trials or stop
    │
    └─ Accuracy > 60% → Use 10-15 trials (optimize)
        ├─ Now ≥ 80% → Excellent, deploy ✓
        └─ Plateaus < 80% → Stop, acceptable for production
```

### Trial Count Impact

**Variation Diversity:**
- 2 trials: Limited strategy coverage
- 5 trials: Core strategies (direct, evidence, structured, context, comprehensive)
- 10 trials: Core + hybrid strategies
- 15+ trials: All strategies + parameter variations

**Accuracy Ceiling:**
- 2 trials: ~30% max accuracy (lucky if higher)
- 5 trials: ~60% max accuracy
- 10 trials: ~80% max accuracy
- 15+ trials: ~85-90% max accuracy (marginal improvement)

**Time Investment:**
- Linear scaling: 10 trials ≈ 2× time of 5 trials
- Not exponential (thanks to parallel processing)

### Cost-Benefit Analysis

**For a typical 8-criterion, 5-document truth set:**

| Trials | Time | Expected Accuracy | Cost per % |
|--------|------|-------------------|------------|
| 2 | 3 min | 20% | 0.15 min/% |
| 5 | 10 min | 50% | 0.20 min/% |
| 10 | 18 min | 70% | 0.26 min/% |
| 15 | 25 min | 75% | 0.33 min/% |

**Conclusion:** 5-10 trials offer best value. Beyond 15 trials, diminishing returns.

---

## Troubleshooting

### Problem: Execution Fails Immediately

**Symptoms:**
- Status changes to "Failed" within seconds
- Error message displayed

**Common Causes:**

1. **Truth Set Missing**
   - Error: "No truth sets found for run"
   - Fix: Upload truth sets before starting execution

2. **Invalid Configuration**
   - Error: "Criteria not fully defined"
   - Fix: Complete all response sections and criteria

3. **Infrastructure Issue**
   - Error: "Lambda timeout" or "Service unavailable"
   - Fix: Retry in a few minutes, contact support if persistent

### Problem: Execution Stuck in "Running" State

**Symptoms:**
- Execution shows "Running" for > 30 minutes
- No progress updates

**Causes:**
- Backend Lambda crashed (rare)
- Network connectivity issue
- Large truth set (> 20 documents)

**Solutions:**
1. Wait 5 more minutes (may be completing final phase)
2. Refresh page to check if completed
3. Contact support with execution ID if stuck > 45 minutes

### Problem: Accuracy Lower Than Expected

**Symptoms:**
- Multiple executions, all show < 30% accuracy
- Even with 10+ trials, accuracy doesn't improve

**Causes & Fixes:**

**Cause 1: Truth Sets Are Wrong**
- AI-generated truth sets may contain errors
- Fix: Manually review and correct truth set evaluations

**Cause 2: Criteria Too Ambiguous**
- Subjective criteria like "policy quality" are hard to evaluate
- Fix: Make criteria more objective and explicit

**Cause 3: Documents Don't Match Criteria**
- Evaluating NIST AC-1 on documents that address different controls
- Fix: Ensure truth set documents actually address the criteria

**Cause 4: Unrealistic Expectations**
- Some domains are fundamentally hard (legal interpretation, creative writing)
- Fix: Accept 50-60% accuracy as good for complex domains

### Problem: Can't Start New Execution

**Symptoms:**
- "New Execution" button disabled
- Error message when clicking button

**Causes:**
- Another execution is already running (only 1 at a time)
- Run is archived or deleted
- Insufficient permissions

**Solutions:**
- Wait for current execution to complete
- Check run status (must be active)
- Verify workspace membership and permissions

### Problem: Results Don't Make Sense

**Symptoms:**
- Execution shows 80% accuracy but manual review shows poor quality
- Best variation doesn't seem better than others

**Causes:**
- Truth sets may be wrong (AI agrees with wrong answers)
- Overfitting to specific phrasing in truth sets
- Evaluation metrics don't capture quality

**Solutions:**
1. Manually review 5-10 random evaluations from best variation
2. If AI is consistently wrong, truth sets need correction
3. If AI is actually correct, truth sets are the issue
4. Add more diverse documents to truth set

---

## Advanced Topics

### Execution Strategies

#### Conservative Approach (Minimize Cost)
```
Execution 1: 2 trials (validate)
→ If promising (≥ 20%)
Execution 2: 5 trials (production)
→ If excellent (≥ 70%), STOP
```
**Use Case:** Budget-constrained, time-sensitive

#### Aggressive Approach (Maximize Accuracy)
```
Execution 1: 5 trials (baseline)
Execution 2: 10 trials (optimize)
Execution 3: 15 trials (maximize)
→ Deploy best regardless of diminishing returns
```
**Use Case:** Critical evaluation, accuracy paramount

#### Iterative Approach (Learn as You Go)
```
Execution 1: 2 trials → Analyze weak criteria
→ Revise criteria definitions
Execution 2: 2 trials → Validate improvements
→ Satisfied with criteria
Execution 3: 10 trials → Production optimization
```
**Use Case:** New domain, unclear criteria

### A/B Testing Strategies

**Test 1: Trial Count Impact**
```
Execution A: 5 trials
Execution B: 10 trials
Compare: Does doubling trials justify 2× time?
```

**Test 2: Document Diversity Impact**
```
Execution A: 5 similar documents (all compliant)
Execution B: 5 diverse documents (compliant, partial, non-compliant)
Compare: Which truth set produces better generalization?
```

### Execution Naming (Future Feature)

Currently executions are numbered sequentially (#1, #2, #3). In future versions, you may be able to name them:

```
Instead of: Execution #1, #2, #3
Use: "Quick Test", "Balanced Approach", "Production Candidate"
```

---

## FAQ

**Q: Can I run multiple executions simultaneously?**  
A: Not in S6. Executions run sequentially. Future versions may support parallel execution.

**Q: Can I edit an execution after it's started?**  
A: No. Parameters are locked once execution starts. Create a new execution with different parameters.

**Q: Can I delete an execution?**  
A: Yes, if it's in "Pending" state. Completed executions can be archived but not deleted (preserves history).

**Q: Can I re-run an execution with the same parameters?**  
A: Yes. Create a new execution with identical parameters. Useful for validating consistency.

**Q: Do executions cost anything?**  
A: Executions use AWS Lambda and OpenAI API. Cost scales with trial count and truth set size. Typical execution: $0.10-$1.00.

**Q: How many executions should I run per configuration?**  
A: Typically 2-4 executions. More than 5 executions usually shows diminishing returns.

**Q: Can I export execution results?**  
A: Yes (future feature). Currently, view results in UI or use API to export JSON.

---

## Summary

**Key Takeaways:**

1. **Executions enable iteration** without recreating configurations
2. **Start with 2 trials** (quick test), then scale to 5-10 trials
3. **Compare executions** to identify patterns and best approaches
4. **Know when to stop** (diminishing returns, accuracy plateau)
5. **Validate truth sets** if accuracy is consistently low

**Typical Workflow:**
```
Create Run → Configure Sections → Upload Truth Sets
  → Execution 1 (2 trials, validate)
  → Execution 2 (5 trials, optimize)
  → Execution 3 (10 trials, production)
  → Deploy Best Variation ✓
```

**Expected Outcomes:**
- 2-4 executions to find production-ready configuration
- 30-60 minutes total optimization time
- 60-80% accuracy for most domains (excellent for automated evaluation)

---

## Related Documentation

- [AI-Assisted Truth Set Creation](guide_AI-ASSISTED-TRUTH-SETS.md) - Create truth sets 10x faster
- [Optimization Run Configuration](guide_OPTIMIZATION-RUN-CONFIG.md) - Set up sections and criteria (coming soon)
- [Deploying Optimized Prompts](guide_PROMPT-DEPLOYMENT.md) - Deploy to production module-eval (coming soon)

---

**Last Updated:** February 10, 2026  
**Document Version:** 1.0  
**Feedback:** Report issues or suggestions via Eval Studio feedback button.