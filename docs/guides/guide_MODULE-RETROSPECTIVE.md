# CORA Module Development Retrospective Guide

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025

## Table of Contents

1. [Overview](#overview)
2. [When to Conduct Retrospectives](#when-to-conduct-retrospectives)
3. [Retrospective Format](#retrospective-format)
4. [Questions to Answer](#questions-to-answer)
5. [Metrics to Track](#metrics-to-track)
6. [Process Update Procedure](#process-update-procedure)
7. [Retrospective Template](#retrospective-template)

---

## Overview

This guide defines the retrospective process for continuous improvement of the CORA module development workflow. After each module is developed, the team conducts a retrospective to identify what worked well, what can be improved, and what changes should be made to the process.

### Purpose

- **Continuous Improvement**: Refine the development process based on real experience
- **Knowledge Capture**: Document learnings for future module development
- **Process Optimization**: Reduce time and effort for future modules
- **Team Learning**: Share insights between human and AI collaboration

### Principles

1. **Timely**: Conduct retrospective immediately after module completion
2. **Honest**: Openly discuss what worked and what didn't
3. **Actionable**: Focus on concrete improvements, not just observations
4. **Documented**: Record insights for future reference
5. **Applied**: Actually update processes based on learnings

---

## When to Conduct Retrospectives

### Timing

**Schedule:** Immediately after Phase 4 (Validation & Deployment) completion

**Duration:** 30-60 minutes

### Participants

- **Human Developer** - Led the module development
- **AI Collaboration Record** - Summary of AI interactions and iterations
- **Optional**: Other team members who contributed or will use the process

### Prerequisites

Before retrospective:
- [ ] Module is deployed and working
- [ ] Smoke tests have passed
- [ ] Time tracking data is available
- [ ] AI collaboration log is available

---

## Retrospective Format

### Standard Agenda (30-60 minutes)

1. **Review Module Metrics** (5 minutes)
   - Time estimates vs. actual
   - Complexity assessment accuracy
   - Issues encountered count

2. **What Went Well** (10-15 minutes)
   - Identify successful patterns
   - Note effective AI prompts
   - Recognize helpful templates/tools

3. **What Can Improve** (10-15 minutes)
   - Identify pain points
   - Note where AI needed multiple iterations
   - Recognize confusing or unclear guidance

4. **What Should Change** (10-15 minutes)
   - Propose specific process modifications
   - Identify template updates needed
   - Suggest new automation opportunities

5. **Action Items** (5-10 minutes)
   - Assign specific updates to documentation
   - Set deadlines for changes
   - Prioritize improvements

---

## Questions to Answer

### 1. What Went Well?

**Discovery & Analysis Phase:**
- [ ] Was the source material (legacy code or use cases) clear and accessible?
- [ ] Did AI accurately identify entities and relationships?
- [ ] Was dependency identification straightforward?
- [ ] Was complexity assessment accurate?
- [ ] Was the module specification comprehensive?

**Design Approval Phase:**
- [ ] Was the specification clear enough for human review?
- [ ] Were any design issues caught early?
- [ ] Was the approval process smooth?

**Implementation Phase:**
- [ ] Did module scaffolding generate correctly?
- [ ] Were backend patterns easy to follow?
- [ ] Did core module integration work as expected?
- [ ] Were functional module dependencies easy to integrate?
- [ ] Did frontend components follow patterns correctly?

**Validation & Deployment Phase:**
- [ ] Did compliance checks catch real issues?
- [ ] Was deployment straightforward?
- [ ] Did the module work on first deployment?

### 2. What Can Improve?

**Time Estimation:**
- [ ] Which phases took longer than expected? Why?
- [ ] Which phases were faster than expected? Why?
- [ ] Was overall time estimate accurate?

**AI Collaboration:**
- [ ] Where did AI need multiple iterations to get it right?
- [ ] Were there any AI misunderstandings of requirements?
- [ ] Which AI prompts were most/least effective?

**Documentation:**
- [ ] Was any documentation missing or unclear?
- [ ] Were examples helpful?
- [ ] Did you need to reference external resources?

**Templates:**
- [ ] Were templates complete and accurate?
- [ ] Did templates require significant customization?
- [ ] Were any patterns missing from templates?

**Tools & Scripts:**
- [ ] Did scripts work as expected?
- [ ] Were any manual steps needed that could be automated?
- [ ] Did validation tools catch the right issues?

### 3. What Should Change?

**Process Modifications:**
- [ ] Should phase order change?
- [ ] Should any steps be added or removed?
- [ ] Should approval gates change?

**Template Updates:**
- [ ] What should be added to templates?
- [ ] What should be removed or simplified?
- [ ] Are there new patterns to capture?

**Documentation Improvements:**
- [ ] What clarifications are needed?
- [ ] What examples should be added?
- [ ] What's missing entirely?

**Automation Opportunities:**
- [ ] What manual steps could be automated?
- [ ] What new validation checks are needed?
- [ ] What new scripts would help?

### 4. Metrics

**Time Tracking:**
- Phase 1 (Discovery): Estimated \_\_\_ hours, Actual \_\_\_ hours
- Phase 2 (Approval): Estimated \_\_\_ hours, Actual \_\_\_ hours
- Phase 3 (Implementation): Estimated \_\_\_ hours, Actual \_\_\_ hours
- Phase 4 (Validation): Estimated \_\_\_ hours, Actual \_\_\_ hours
- **Total**: Estimated \_\_\_ hours, Actual \_\_\_ hours

**Iteration Counts:**
- AI iterations needed for specification: \_\_\_
- Human review iterations: \_\_\_
- Compliance check failures: \_\_\_
- Deployment attempts: \_\_\_

**Issue Tracking:**
- Number of bugs found post-deployment: \_\_\_
- Number of compliance issues: \_\_\_
- Number of dependency issues: \_\_\_
- Number of integration issues: \_\_\_

---

## Metrics to Track

### Module-Level Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Module Name** | {module-name} | - | - |
| **Complexity** | [Simple/Medium/Complex] | - | - |
| **Total Time** | \_\_ hours | 8/16-24/32-40 hours | ✅/⚠️/❌ |
| **Entities** | \_\_ | - | - |
| **Dependencies** | \_\_ functional deps | - | - |
| **API Endpoints** | \_\_ endpoints | - | - |

### Phase-Level Metrics

| Phase | Estimated | Actual | Variance | Issues |
|-------|-----------|--------|----------|--------|
| Phase 1: Discovery | \_\_ hrs | \_\_ hrs | \_\_% | \_\_ |
| Phase 2: Approval | \_\_ hrs | \_\_ hrs | \_\_% | \_\_ |
| Phase 3: Implementation | \_\_ hrs | \_\_ hrs | \_\_% | \_\_ |
| Phase 4: Validation | \_\_ hrs | \_\_ hrs | \_\_% | \_\_ |

### Quality Metrics

| Metric | Count | Notes |
|--------|-------|-------|
| Compliance issues found | \_\_ | Types of issues |
| Bugs found post-deployment | \_\_ | Severity |
| Deployment attempts | \_\_ | Reasons for retries |
| Test failures | \_\_ | What failed |

### AI Collaboration Metrics

| Metric | Count | Notes |
|--------|-------|-------|
| Specification iterations | \_\_ | Why needed |
| Code generation iterations | \_\_ | What needed fixing |
| Prompt refinements | \_\_ | What improved |
| Human interventions | \_\_ | What AI couldn't do |

---

## Process Update Procedure

### 1. Document Retrospective

Create retrospective document: `docs/retrospectives/{date}-{module-name}-retrospective.md`

### 2. Identify Action Items

For each improvement identified, create action item:

```markdown
## Action Items

### High Priority
1. **Update template X** - Add missing pattern Y - @assignee - Due: date
2. **Add validation Z** - Catch issue type Z earlier - @assignee - Due: date

### Medium Priority
3. **Clarify documentation** - Section A needs examples - @assignee - Due: date

### Low Priority
4. **Consider automation** - Automate step B - @assignee - Due: date
```

### 3. Update Documentation

**Process Guide Updates:**
- File: `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md`
- Changes: Add clarifications, update time estimates, add examples

**Template Updates:**
- Files: `templates/*.md`
- Changes: Add missing patterns, fix errors, improve structure

**Standards Updates:**
- Files: `docs/standards/*.md`
- Changes: Clarify requirements, add patterns, fix inconsistencies

### 4. Update Templates

- **Module Template**: `templates/_module-template/`
- **Specification Template**: `templates/MODULE-SPEC-TEMPLATE.md`
- **Scripts**: `scripts/*.sh`

### 5. Update Metrics

Add to module development log: `docs/MODULE-DEVELOPMENT-LOG.md`

### 6. Share Learnings

- Update process documentation
- Share with team
- Incorporate into next module planning

---

## Retrospective Template

```markdown
# {Module Name} Development Retrospective

**Date:** {date}
**Module:** {module-name}
**Participants:** {names}
**Duration:** {duration}

---

## Module Summary

- **Complexity:** [Simple | Medium | Complex]
- **Time Estimate:** {hours} hours
- **Actual Time:** {hours} hours
- **Status:** [Deployed | In Production]

---

## Metrics

### Time Breakdown

| Phase | Estimated | Actual | Variance |
|-------|-----------|--------|----------|
| Phase 1: Discovery | {hrs} | {hrs} | {%} |
| Phase 2: Approval | {hrs} | {hrs} | {%} |
| Phase 3: Implementation | {hrs} | {hrs} | {%} |
| Phase 4: Validation | {hrs} | {hrs} | {%} |
| **Total** | **{hrs}** | **{hrs}** | **{%}** |

### Quality Metrics

- Compliance issues found: {count}
- Bugs post-deployment: {count}
- Deployment attempts: {count}
- Test failures: {count}

### AI Collaboration

- Specification iterations: {count}
- Code iterations: {count}
- Human interventions: {count}

---

## What Went Well ✅

### Discovery & Analysis
- {Point 1}
- {Point 2}

### Design Approval
- {Point 1}

### Implementation
- {Point 1}
- {Point 2}

### Validation & Deployment
- {Point 1}

---

## What Can Improve ⚠️

### Discovery & Analysis
- {Issue 1} - {Root cause} - {Impact}

### Design Approval
- {Issue 1}

### Implementation
- {Issue 1}
- {Issue 2}

### Validation & Deployment
- {Issue 1}

---

## What Should Change 🔄

### Process Changes
1. **{Change}** - {Reason} - {Expected benefit}
2. **{Change}** - {Reason} - {Expected benefit}

### Template Updates
1. **{Template}** - {What to add/change} - {Why}
2. **{Template}** - {What to add/change} - {Why}

### Documentation Updates
1. **{Document}** - {What to clarify} - {Where}
2. **{Document}** - {What to add} - {Where}

### Automation Opportunities
1. **{Process}** - {What to automate} - {Estimated effort}

---

## Action Items

### High Priority
- [ ] **{Action}** - @{assignee} - Due: {date}
- [ ] **{Action}** - @{assignee} - Due: {date}

### Medium Priority
- [ ] **{Action}** - @{assignee} - Due: {date}

### Low Priority
- [ ] **{Action}** - @{assignee} - Due: {date}

---

## Specific Learnings

### Effective AI Prompts
```
{Prompt that worked well}
```
Result: {What it produced}

### Ineffective AI Prompts
```
{Prompt that didn't work}
```
Problem: {What went wrong}
Better approach: {How to improve}

### Template Gaps
- **{Template}** missing: {What was missing}
- **{Template}** unclear: {What was confusing}

### Integration Challenges
- **{Dependency}** integration: {What was difficult}
- Solution: {How we solved it}

---

## Recommendations for Next Module

1. **{Recommendation}** - {Why it will help}
2. **{Recommendation}** - {Why it will help}
3. **{Recommendation}** - {Why it will help}

---

## Updates Made

### Documentation
- [x] Updated {document} - {what changed}
- [x] Added example to {document} - {what added}

### Templates
- [x] Updated {template} - {what changed}
- [ ] TODO: Update {template} - {what to change}

### Scripts
- [x] Fixed {script} - {what fixed}
- [ ] TODO: Create {script} - {what to create}

---

**Retrospective Completed:** {date}
**Next Module:** {next-module-name}
```

---

## Example Retrospective

See: [Example - module-kb Retrospective](../retrospectives/2025-12-15-module-kb-retrospective.md)

---

## Continuous Improvement Tracking

### Module Development Log

Maintain log: `docs/MODULE-DEVELOPMENT-LOG.md`

```markdown
# CORA Module Development Log

## module-kb (2025-12-15)
- **Complexity:** Medium
- **Estimated:** 16 hours
- **Actual:** 18 hours (+12.5%)
- **Issues:** Dependency on module-ai not initially identified in Phase 1
- **Improvements Made:**
  - Added dependency decision tree to Phase 1 checklist
  - Enhanced AI prompt template to explicitly ask about AI features
- **Key Learnings:**
  - RAG functionality requires both embeddings and vector search
  - Document processing is more complex than estimated

## module-chat (2025-12-20)
- **Complexity:** Medium
- **Estimated:** 20 hours
- **Actual:** 16 hours (-20%)
- **Success Factors:**
  - Reused patterns from module-kb for document search
  - AI integration patterns were well-documented
- **Improvements Made:**
  - Created chat-specific component templates
  - Added example of module-to-module dependency integration
- **Key Learnings:**
  - Second module of similar complexity takes less time
  - Good templates significantly speed up frontend development

## module-ws (2025-12-27)
- **Complexity:** Simple
- **Estimated:** 8 hours
- **Actual:** 7 hours (-12.5%)
- **Success Factors:**
  - Single entity, straightforward CRUD
  - No complex dependencies
  - All patterns were familiar from previous modules
- **Improvements Made:**
  - None needed - process working well for simple modules
- **Key Learnings:**
  - Simple modules can be delivered faster than estimated with mature process
```

### Trend Analysis

After every 3-5 modules, analyze trends:

- Are time estimates improving?
- Are certain phases consistently over/under estimated?
- Are we finding fewer compliance issues over time?
- Are templates becoming more complete?

---

## Related Documentation

- [guide_CORA-MODULE-DEVELOPMENT-PROCESS.md](./guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Main process guide
- [standard_MODULE-REGISTRATION.md](../standards/standard_MODULE-REGISTRATION.md) - Module registration
- [standard_MODULE-DEPENDENCIES.md](../standards/standard_MODULE-DEPENDENCIES.md) - Dependency management

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
