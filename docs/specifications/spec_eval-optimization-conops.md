# Concept of Operations: Evaluation Optimization System

**Document Type:** Technical Specification  
**Status:** Draft v1.0  
**Created:** February 4, 2026  
**Last Updated:** February 4, 2026  
**Related Docs:** 
- [Eval Optimization Context](../../memory-bank/context-eval-optimization.md)
- [Sprint 1 Plan](../plans/plan_eval-optimization-s1.md)

---

## Executive Summary

### Purpose

The Evaluation Optimization System is a **companion application** to the main CORA platform that enables **business analysts** to systematically improve document evaluation accuracy through sample-driven prompt optimization. The system addresses the core problem that generic prompts produce suboptimal results across different document domains (IT security policies, appraisals, proposals, etc.).

### Approach

**Sample-Driven Optimization** uses human-verified "truth keys" to establish ground truth for evaluation results. Analysts upload sample documents with known correct answers, then iteratively test and refine prompts, AI models, and configuration parameters until evaluation results consistently match the truth keys.

### Target Users

- **Business Analysts** - Configure and optimize evaluation parameters for document domains
- **Domain Experts** - Create truth keys based on domain knowledge
- **System Administrators** - Manage access and deploy optimized configurations

### Value Proposition

| Problem | Solution | Impact |
|---------|----------|--------|
| Generic prompts → high false positive/negative rates | Domain-specific prompt optimization | Measurable accuracy improvement |
| No systematic prompt improvement process | Iterative test-measure-refine workflow | Consistent methodology |
| Unclear when prompts are "good enough" | Statistical confidence metrics by sample size | Data-driven production readiness |
| Manual prompt testing is time-consuming | Batch optimization runs with automated metrics | 10x faster iteration cycles |

---

## 1. Core Concepts

### 1.1 Document Domain

A **document domain** is a category of documents with similar structure, purpose, and evaluation criteria.

**Examples:**
- IT Security Policies (NIST controls, compliance frameworks)
- Land Appraisals (valuation methods, property characteristics)
- FOIA Requests (redaction criteria, exemptions)
- Government Proposals (cost structure, technical approach)

**Domain Characteristics:**
- Unique terminology and language patterns
- Specific compliance or quality criteria
- Common document structures (sections, tables, formats)
- Domain-specific evaluation challenges

### 1.2 Truth Key

A **truth key** is a human expert's verification of correct evaluation results for a sample document or document group. It serves as the "answer key" for measuring optimization quality.

**Truth Key Components:**
- Document identifier(s)
- Expected compliance score
- Per-criterion expected status (Compliant, Partial, Non-Compliant, N/A)
- Expected findings or risk flags
- Confidence level (analyst's certainty in the truth key)

**Truth Key Format:** Excel/CSV spreadsheet uploaded alongside sample documents

### 1.3 Optimization Run

An **optimization run** tests a specific configuration (prompt + AI model + parameters) against the entire truth key set to measure accuracy.

**Configuration Elements:**
- AI model (Claude 3.5 Sonnet, GPT-4 Turbo, Nova, etc.)
- Prompt text (system + user prompts)
- Model parameters (temperature, max_tokens, top_p)
- Context strategy (RAG chunk selection, window size)

**Output:** Accuracy metrics comparing AI results to truth keys

### 1.4 Document Group

A **document group** is a primary document plus supporting artifacts that are evaluated together as a unit.

**IT Security Example:**
- **Primary:** Access Control Policy (20 pages)
- **Artifacts:** 
  - User access review log (spreadsheet)
  - MFA configuration screenshots
  - Audit log export
- **Evaluation:** Does the policy + artifacts demonstrate NIST AC-2 compliance?

**Why Groups Matter:**
- Real-world evaluations often require multiple documents
- Context from artifacts influences primary document assessment
- Truth keys must account for multi-document relationships

---

## 2. Sample-Driven Optimization Theory

### 2.1 Why Truth Keys Work

**Ground Truth Establishment:**
- Human domain experts provide authoritative "correct answers"
- Removes ambiguity about what "good" evaluation looks like
- Enables objective measurement of AI performance

**Statistical Validity:**
- Larger sample sets → higher confidence in optimization quality
- Diverse samples → better generalization to new documents
- Edge cases in samples → robust handling of unusual scenarios

### 2.2 Optimization Iteration Model

```
┌─────────────────────────────────────────────────┐
│ 1. Configure                                    │
│    - Select AI model                            │
│    - Write/edit prompt                          │
│    - Set parameters (temp, tokens)              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 2. Test                                         │
│    - Run optimization batch                     │
│    - Process all samples in truth key set       │
│    - Generate evaluation results                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 3. Measure                                      │
│    - Compare AI results vs truth keys           │
│    - Calculate accuracy metrics                 │
│    - Identify patterns in errors                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 4. Analyze                                      │
│    - Review false positives/negatives           │
│    - Identify prompt weaknesses                 │
│    - Determine next iteration approach          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│ 5. Refine                                       │
│    - Adjust prompt based on error patterns      │
│    - Try different model if needed              │
│    - Tune parameters                            │
└────────────────┬────────────────────────────────┘
                 │
                 └──────────► (Repeat until target accuracy reached)
```

### 2.3 Multi-Model Optimization

The system supports testing **multiple AI models** to find the best fit for a domain:

**Model Comparison Matrix:**
| Model | Strengths | Typical Use Cases |
|-------|-----------|-------------------|
| Claude 3.5 Sonnet | Long context, nuanced reasoning | Complex policies, legal documents |
| GPT-4 Turbo | Structured output, consistent format | Standardized forms, checklists |
| Amazon Nova | Cost-effective, fast | High-volume routine evaluations |
| GPT-4o | Balanced performance | General-purpose evaluations |

**Optimization Approach:**
1. Test same prompt across multiple models
2. Compare accuracy, cost, and speed
3. Select best model for domain
4. Fine-tune prompt for chosen model

### 2.4 Configuration Parameter Optimization

Beyond prompts and models, the system optimizes **configuration parameters**:

**Temperature:**
- **Low (0.1-0.3):** Deterministic, consistent → Good for compliance checks
- **Medium (0.4-0.6):** Balanced creativity → Good for risk identification
- **High (0.7-1.0):** Creative, varied → Rarely used in evaluations

**Max Tokens:**
- **Conservative (1000-2000):** Concise responses → Simple criteria
- **Moderate (2000-4000):** Detailed explanations → Complex criteria
- **Generous (4000+):** Comprehensive analysis → Multi-step reasoning

**Context Strategy:**
- Chunk size for RAG retrieval
- Number of chunks to include
- Relevance threshold for chunk selection

### 2.5 Confidence Metrics by Sample Size

**Statistical Guidance for Analysts:**

| Sample Size | Confidence Level | Interpretation | Recommended Action |
|-------------|-----------------|----------------|---------------------|
| 1-5 samples | ⚠️ Very Low | Single examples may not generalize | Add more diverse samples before production |
| 6-15 samples | 🟡 Low | Limited pattern detection | Acceptable for initial testing only |
| 16-50 samples | 🟢 Moderate | Reasonable coverage of common cases | Good for beta deployment |
| 51-100 samples | ✅ High | Strong statistical confidence | Production-ready |
| 100+ samples | ✅✅ Very High | Excellent coverage including edge cases | Production-ready with high confidence |

**Edge Case Coverage:**
- Diversity of samples matters as much as quantity
- System tracks coverage: document length, format, complexity
- Suggests gap areas: "No samples with embedded tables"

---

## 3. Analyst Workflow

### 3.1 Workflow Overview

```
Phase 1: Project Setup
    ↓
Phase 2: Sample Collection
    ↓
Phase 3: Truth Key Creation
    ↓
Phase 4: Optimization Cycles
    ↓
Phase 5: Validation
    ↓
Phase 6: Production Deployment
```

### 3.2 Phase 1: Project Setup

**Goal:** Create optimization project for a document domain

**Steps:**
1. Navigate to Eval Optimizer app (port 3001)
2. Click "New Optimization Project"
3. **Configure Project:**
   - Name: "IT Security Policy Optimization"
   - Domain: IT Security Policies
   - Target Criteria Set: NIST 800-53 Controls
   - Description: Optimize for federal agency policy audits
4. **Set Permissions:**
   - Assign Owner (yourself)
   - Add Admins (can run optimizations)
   - Add Users (can view results)
5. Create project

**Output:**
- Project created in `eval_optimization_projects` table
- Test organization created in module-access (naming: `eval-opt-{domain}-{timestamp}`)
- Test workspace created in module-ws

### 3.3 Phase 2: Sample Collection

**Goal:** Gather representative sample documents with variety

**Sample Selection Criteria:**
- **Document length variation:** Short (5 pages), medium (20 pages), long (50+ pages)
- **Quality variation:** Excellent, good, poor compliance examples
- **Format variation:** Text-heavy, tables, diagrams
- **Complexity variation:** Simple policies, complex multi-section documents
- **Edge cases:** Ambiguous language, missing sections, non-standard formats

**IT Security Example - Sample Set:**
1. **Sample 1:** Strong access control policy + complete artifacts (truth key: 95% compliant)
2. **Sample 2:** Basic policy, no artifacts (truth key: 40% compliant)
3. **Sample 3:** Policy with tables + partial artifacts (truth key: 70% compliant)
4. **Sample 4:** Non-standard format policy (truth key: edge case handling test)
5. ... (continue to target sample size)

**Document Group Upload:**
1. Select "Upload Sample"
2. Upload primary document (PDF/DOCX)
3. Upload supporting artifacts (optional)
4. Tag document group (e.g., "strong-compliance", "edge-case-tables")
5. Repeat for all samples

**Output:**
- Documents uploaded to module-kb in test workspace
- Document groups created in `eval_opt_document_groups` table

### 3.4 Phase 3: Truth Key Creation

**Goal:** Create expert-verified expected results for each sample

**Truth Key Spreadsheet Format:**

```
| document_group_id | criteria_id | expected_status | expected_score | confidence | notes |
|-------------------|-------------|-----------------|----------------|------------|-------|
| doc-group-001     | AC-2.1      | Compliant       | 100            | High       | Policy explicitly addresses user access review quarterly |
| doc-group-001     | AC-2.2      | Partial         | 60             | Medium     | MFA mentioned but no artifact proving implementation |
| doc-group-002     | AC-2.1      | Non-Compliant   | 0              | High       | No access review process documented |
```

**Columns:**
- `document_group_id`: Identifier linking to uploaded document group
- `criteria_id`: Reference to eval_criteria_items.id
- `expected_status`: Compliant | Partial | Non-Compliant | N/A
- `expected_score`: 0-100 (optional, if scoring is used)
- `confidence`: High | Medium | Low (analyst's certainty in this truth key)
- `notes`: Explanation of why this is the correct answer

**Overall Document Compliance:**
```
| document_group_id | overall_compliance_score | overall_status | key_findings |
|-------------------|--------------------------|----------------|--------------|
| doc-group-001     | 85                       | Partial        | Strong policy, weak artifact evidence |
| doc-group-002     | 30                       | Non-Compliant  | Missing critical access controls |
```

**Upload Process:**
1. Download truth key template spreadsheet
2. Fill in expected results for each sample
3. Upload spreadsheet to optimization project
4. System validates:
   - Document group IDs exist
   - Criteria IDs exist
   - Status values are valid
   - No missing required fields
5. Import truth keys to `eval_opt_truth_keys` table

**Output:**
- Truth keys persisted in database
- Linked to document groups and criteria
- Ready for optimization runs

### 3.5 Phase 4: Optimization Cycles

**Goal:** Iteratively improve configuration to match truth keys

#### Cycle 1: Baseline

**Configuration:**
- Model: Claude 3.5 Sonnet
- Prompt: Default CORA eval prompt (generic)
- Temperature: 0.3
- Max Tokens: 2000

**Run Optimization:**
1. Click "New Optimization Run"
2. Select configuration
3. Click "Run Batch"
4. System processes all samples:
   - For each document group:
     - Upload to test workspace (if not already)
     - Run evaluation via module-eval
     - Store results in `eval_opt_run_results`
5. Wait for completion (~5-10 min for 20 samples)

**Review Results:**
```
Accuracy: 62%
False Positives: 18%
False Negatives: 20%
Per-Criteria Breakdown:
  - AC-2.1: 80% accuracy
  - AC-2.2: 45% accuracy (worst performer)
  - AC-2.3: 70% accuracy
```

**Analysis:**
- AC-2.2 (MFA requirement) has low accuracy
- False negatives: AI too strict, marks partial as non-compliant
- Review specific errors: AI doesn't recognize proof artifacts

#### Cycle 2: Prompt Refinement

**Insight:** Prompt needs explicit instruction to consider artifacts

**Updated Prompt:**
```
You are evaluating compliance for IT security policies.

IMPORTANT: If supporting artifacts (logs, screenshots, configs) are provided,
consider them as proof of implementation even if the policy text is brief.

[rest of prompt...]
```

**Run Optimization:**
- Same model, same params, updated prompt
- Run batch

**Results:**
```
Accuracy: 78% (+16%)
False Positives: 10% (-8%)
False Negatives: 12% (-8%)
Per-Criteria Breakdown:
  - AC-2.2: 75% accuracy (+30% - major improvement!)
```

**Analysis:**
- Artifact consideration improved AC-2.2
- Still some false negatives - AI too strict on policy language

#### Cycle 3: Temperature Adjustment

**Hypothesis:** Higher temperature may allow more flexible interpretation

**Configuration:**
- Same prompt
- Temperature: 0.3 → 0.5
- Run batch

**Results:**
```
Accuracy: 72% (-6%)
False Positives: 18% (+8%)
False Negatives: 10% (-2%)
```

**Analysis:**
- Higher temp increased false positives (too lenient)
- Rollback temperature to 0.3

#### Cycle 4: Multi-Model Comparison

**Test:** Run same prompt (Cycle 2 version) on different models

| Model | Accuracy | FP | FN | Cost/Sample | Speed |
|-------|----------|----|----|-------------|-------|
| Claude 3.5 Sonnet | 78% | 10% | 12% | $0.15 | 8s |
| GPT-4 Turbo | 82% | 8% | 10% | $0.20 | 12s |
| Nova | 68% | 15% | 17% | $0.05 | 5s |

**Decision:** GPT-4 Turbo has best accuracy, acceptable cost for this domain

#### Cycle 5: Final Tuning on GPT-4

**Refinements:**
- Adjust prompt for GPT-4 response style
- Increase max_tokens to 3000 (GPT-4 more verbose)
- Run batch

**Results:**
```
Accuracy: 88%
False Positives: 6%
False Negatives: 6%
```

**Decision:** Target accuracy reached (>85%), ready for validation

### 3.6 Phase 5: Validation

**Goal:** Verify optimization generalizes to new documents

**Holdout Testing:**
1. Set aside 20% of samples as holdout set (not used in optimization)
2. Run final configuration on holdout set
3. Measure accuracy on unseen data

**Expected:** Accuracy on holdout ≥ 80% of optimization set accuracy
- Optimization accuracy: 88%
- Holdout accuracy: 85% ✅ (96% of optimization accuracy)

**If holdout accuracy drops significantly:**
- Overfitting detected
- Add more diverse samples
- Simplify prompt (reduce specificity)

### 3.7 Phase 6: Production Deployment

**Goal:** Deploy optimized configuration to module-eval for real evaluations

**Deployment Process:**
1. Review final configuration:
   - Model: GPT-4 Turbo
   - Prompt version: v5 (artifact-aware)
   - Params: temp=0.3, max_tokens=3000
2. Create version entry:
   - Version: "IT-Security-v1.0"
   - Status: Production
   - Effective Date: 2026-02-15
3. Deploy to module-eval:
   - **Option A:** Update `eval_cfg_org_prompts` for specific org
   - **Option B:** Update `eval_cfg_sys_prompts.domain_specific_prompts` (if multi-tenant)
4. Map domain to configuration:
   - Document Type: "IT Security Policy"
   - Prompt: IT-Security-v1.0
5. Test in production:
   - Run 3-5 real evaluations
   - Verify results match expectations
6. Monitor performance:
   - Track accuracy over time
   - Collect feedback from users
   - Plan for re-optimization when accuracy degrades

**Rollback Plan:**
- If production results are poor, revert to previous prompt version
- Investigate: new document types? criteria changes?
- Re-run optimization with new samples

---

## 4. Truth Key Specification

### 4.1 Spreadsheet Format

**File Types:** Excel (.xlsx) or CSV (.csv)

**Required Sheets:**

#### Sheet 1: Document-Level Truth Keys
```
| document_group_id | overall_compliance_score | overall_status | key_findings | analyst_name | confidence |
```

**Columns:**
- `document_group_id` (TEXT, required): Unique identifier for document group
- `overall_compliance_score` (INTEGER, 0-100, optional): Expected overall score
- `overall_status` (TEXT, required): Compliant | Partial | Non-Compliant
- `key_findings` (TEXT, optional): Expected top findings (comma-separated)
- `analyst_name` (TEXT, required): Expert who created this truth key
- `confidence` (TEXT, required): High | Medium | Low

#### Sheet 2: Criteria-Level Truth Keys
```
| document_group_id | criteria_id | expected_status | expected_confidence | notes | citations |
```

**Columns:**
- `document_group_id` (TEXT, required): Links to document group
- `criteria_id` (TEXT, required): Criteria item identifier or code
- `expected_status` (TEXT, required): Compliant | Partial | Non-Compliant | N/A
- `expected_confidence` (INTEGER, 0-100, optional): AI confidence level
- `notes` (TEXT, required): Why this is the correct answer
- `citations` (TEXT, optional): Expected document quotes (pipe-separated)

### 4.2 Validation Rules

**On Upload:**
1. ✅ All required columns present
2. ✅ Document group IDs exist in uploaded documents
3. ✅ Criteria IDs exist in selected criteria set
4. ✅ Status values match allowed options
5. ✅ Confidence levels are valid (High/Medium/Low)
6. ✅ Scores are 0-100
7. ✅ No duplicate document_group_id + criteria_id combinations

**Warnings (not blocking):**
- Low confidence truth keys (< 30% of total)
- Missing notes on criteria-level keys
- Document groups with no criteria-level keys

### 4.3 Import Process

```
1. User uploads spreadsheet
       ↓
2. System validates format
       ↓
3. Parse sheets into staging tables
       ↓
4. Validate references (doc groups, criteria)
       ↓
5. Check for duplicates
       ↓
6. Insert into eval_opt_truth_keys table
       ↓
7. Link to optimization project
       ↓
8. Display import summary
```

**Import Summary Example:**
```
✅ Import Successful

Document-Level Truth Keys: 15 imported
Criteria-Level Truth Keys: 180 imported
Total Document Groups: 15
Total Criteria: 12
Average Confidence: High (87%)

⚠️ Warnings:
- 3 truth keys marked Low confidence
- 2 document groups missing overall_compliance_score
```

---

## 5. Prompt Version Management

### 5.1 Current State

**As-Is (module-eval today):**
- Prompts entered via admin UI config screen
- Stored in `eval_cfg_sys_prompts` and `eval_cfg_org_prompts`
- No versioning - updates overwrite previous prompts
- No audit trail of changes
- No A/B comparison capability

### 5.2 Proposed Versioning Approach

#### Option A: Database-Driven Versioning (Recommended)

**New Table: `eval_prompt_versions`**

```sql
CREATE TABLE eval_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id),
    version_number VARCHAR(50) NOT NULL,  -- "v1.0", "v2.3", "IT-Security-v1.0"
    prompt_type VARCHAR(50) NOT NULL,  -- 'evaluation', 'doc_summary', 'eval_summary'
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    ai_provider_id UUID REFERENCES ai_providers(id),
    ai_model_id UUID REFERENCES ai_models(id),
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'testing', 'production', 'archived'
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deployed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    notes TEXT,
    -- Metadata
    parent_version_id UUID REFERENCES eval_prompt_versions(id),  -- Track lineage
    change_summary TEXT  -- What changed from parent version
);

CREATE INDEX idx_prompt_versions_project ON eval_prompt_versions(project_id);
CREATE INDEX idx_prompt_versions_status ON eval_prompt_versions(status);
```

**Version Lifecycle:**
```
draft → testing → production → archived
  ↓         ↓          ↓           ↓
  edit    run tests   deploy    retire
```

**Versioning Workflow:**

1. **Create New Version:**
   - Analyst clicks "New Version" or "Duplicate v2.3"
   - System creates draft with `parent_version_id` = previous version
   - Edit prompt text in UI
   - Save draft

2. **Test Version:**
   - Run optimization batch with draft version
   - Compare metrics to parent version
   - If better, promote to "testing" status

3. **Deploy to Production:**
   - Admin reviews testing results
   - Click "Deploy to Production"
   - System updates `eval_cfg_org_prompts` or `eval_cfg_sys_prompts`
   - Mark version status = "production"
   - Set `deployed_at` timestamp

4. **Archive Old Version:**
   - When new version deployed, old version → "archived"
   - Archived versions retained for audit/rollback
   - Can view but not edit

**Benefits:**
- ✅ Full audit trail (who, when, what changed)
- ✅ A/B comparison (run v1 vs v2 on same samples)
- ✅ Rollback capability (revert to previous version)
- ✅ Version lineage (trace evolution of prompts)

#### Option B: Git-Based Versioning (Alternative)

**Approach:**
- Store prompts as markdown files in Git repo
- Use Git commits for versioning
- Import prompts to DB from repo

**Pros:**
- Leverage existing version control tooling
- Diff/merge support
- Branching for experimental prompts

**Cons:**
- Requires Git knowledge from analysts
- Import/sync complexity
- Less integrated with UI workflow

**Recommendation:** Start with Option A (DB-driven), consider Git integration later for advanced users

### 5.3 A/B Comparison Capability

**Use Case:** Compare two prompt versions side-by-side

**UI:**
```
┌────────────────────────────────────────────────┐
│ Compare Versions                               │
├────────────────────────────────────────────────┤
│ Version A: IT-Security-v2.3 (Current Prod)     │
│ Version B: IT-Security-v3.0 (Testing)          │
│                                                │
│ Run Comparison on Sample Set: [Holdout Set ▼] │
│                              [Run Comparison]  │
└────────────────────────────────────────────────┘

Results:
┌─────────────────────┬──────────┬──────────┐
│ Metric              │ v2.3     │ v3.0     │
├─────────────────────┼──────────┼──────────┤
│ Accuracy            │ 82%      │ 88% ✅   │
│ False Positives     │ 12%      │ 6% ✅    │
│ False Negatives     │ 6%       │ 6%       │
│ Avg Confidence      │ 78       │ 85 ✅    │
│ Avg Processing Time │ 8.2s     │ 9.1s     │
│ Cost per Eval       │ $0.15    │ $0.20    │
└─────────────────────┴──────────┴──────────┘

Per-Criteria Comparison:
[Interactive chart showing accuracy by criteria]
```

### 5.4 Rollback Mechanism

**Scenario:** New prompt version deployed to production shows poor results

**Rollback Process:**
1. Navigate to version history
2. Select previous production version (IT-Security-v2.3)
3. Click "Rollback to This Version"
4. System confirms:
   ```
   ⚠️ Rollback Confirmation
   
   Current: IT-Security-v3.0 (deployed Feb 15, 2026)
   Rollback to: IT-Security-v2.3 (deployed Jan 20, 2026)
   
   This will:
   - Update production configuration to v2.3
   - Archive v3.0 (marked as 'archived')
   - Notify admins of rollback
   
   Reason for rollback: [____________________]
   
   [Cancel] [Confirm Rollback]
   ```
5. On confirm:
   - Update `eval_cfg_org_prompts` with v2.3 prompt
   - Set v3.0 status = 'archived'
   - Create audit log entry
   - Send notification to project team

**Audit Trail:**
```
2026-02-15 10:00 - v3.0 deployed by Alice (Admin)
2026-02-18 14:30 - v3.0 rolled back by Bob (Owner) - Reason: High false positive rate in production
2026-02-18 14:30 - v2.3 restored to production
```

---

## 6. Quality Metrics

### 6.1 Core Accuracy Metrics

#### Overall Accuracy
```
Accuracy = (Correct Predictions / Total Predictions) × 100

Correct Prediction = AI status matches truth key status
```

**Example:**
- 20 samples × 12 criteria = 240 predictions
- 210 correct matches
- Accuracy = 210/240 = 87.5%

#### Precision & Recall

**Precision** (How many AI "Compliant" predictions are actually compliant?)
```
Precision = True Positives / (True Positives + False Positives)
```

**Recall** (How many actual compliant items did AI correctly identify?)
```
Recall = True Positives / (True Positives + False Negatives)
```

**F1 Score** (Balanced measure)
```
F1 = 2 × (Precision × Recall) / (Precision + Recall)
```

**Example:**
```
Truth Key: 50 Compliant, 50 Non-Compliant
AI Results: 45 Compliant, 55 Non-Compliant

True Positives: 42 (AI said Compliant, truth key Compliant)
False Positives: 3 (AI said Compliant, truth key Non-Compliant)
False Negatives: 8 (AI said Non-Compliant, truth key Compliant)
True Negatives: 47 (AI said Non-Compliant, truth key Non-Compliant)

Precision = 42 / (42 + 3) = 93.3%
Recall = 42 / (42 + 8) = 84.0%
F1 = 2 × (0.933 × 0.840) / (0.933 + 0.840) = 88.4%
```

### 6.2 Error Analysis

#### False Positive Rate
```
FP Rate = False Positives / (False Positives + True Negatives)
```

**Impact:** AI too lenient → marks non-compliant as compliant → **HIGH RISK**

#### False Negative Rate
```
FN Rate = False Negatives / (False Negatives + True Positives)
```

**Impact:** AI too strict → marks compliant as non-compliant → Lower efficiency

**Risk Prioritization:**
- **False Positives > False Negatives** for compliance use cases
- Failing to catch non-compliance is worse than over-flagging

### 6.3 Confidence Calibration

**Question:** When AI says 85% confident, is it actually correct 85% of the time?

**Calibration Analysis:**
```
Group predictions by confidence bands:
- 90-100% confident: 50 predictions → 48 correct = 96% accuracy ✅ Well calibrated
- 80-89% confident: 80 predictions → 68 correct = 85% accuracy ✅ Well calibrated
- 70-79% confident: 60 predictions → 38 correct = 63% accuracy ⚠️ Overconfident
```

**Action:** If AI consistently overconfident, adjust prompt to be more conservative

### 6.4 Per-Criteria Performance

**Breakdown:** Which criteria are hard vs easy for AI?

```
Criteria Performance Report:
┌──────────┬─────────────────────────────┬──────────┬────────┬────────┐
│ Criteria │ Description                 │ Accuracy │ FP     │ FN     │
├──────────┼─────────────────────────────┼──────────┼────────┼────────┤
│ AC-2.1   │ User access review process  │ 95%      │ 2%     │ 3%     │
│ AC-2.2   │ MFA requirement             │ 68%      │ 18%    │ 14%    │ ⚠️
│ AC-2.3   │ Privilege escalation        │ 88%      │ 6%     │ 6%     │
│ AC-2.4   │ Account termination         │ 92%      │ 4%     │ 4%     │
└──────────┴─────────────────────────────┴──────────┴────────┴────────┘
```

**Insight:** AC-2.2 (MFA) needs prompt improvement - likely ambiguous in documents

### 6.5 Document Complexity Analysis

**Hypothesis:** Longer documents = lower accuracy?

**Analysis:**
```
Accuracy by Document Length:
- Short (< 10 pages): 92%
- Medium (10-30 pages): 85%
- Long (> 30 pages): 78%
```

**Possible Causes:**
- Context window limits
- Relevant info buried in long docs
- Prompt doesn't scale to complex documents

**Action:** Improve RAG chunk selection for long documents

### 6.6 Statistical Confidence Intervals

**Question:** How confident are we in the 88% accuracy result?

**Confidence Interval Calculation:**
```
Sample size: 240 predictions
Accuracy: 88%
95% Confidence Interval: 88% ± 4% = [84%, 92%]

Interpretation: We're 95% confident the true accuracy is between 84% and 92%
```

**Sample Size Impact:**
```
Sample Size → CI Width
50 predictions → ± 11%
100 predictions → ± 8%
240 predictions → ± 4%
500 predictions → ± 3%
```

**Guidance:** Larger sample sets → narrower CI → higher confidence in results

---

## 7. Scalability Design

### 7.1 Scale Tiers

| Tier | Sample Count | Use Case | Processing Time | Infrastructure |
|------|--------------|----------|-----------------|----------------|
| **Exploratory** | 1-10 | Initial testing, proof of concept | < 5 min | Synchronous processing |
| **Validation** | 11-50 | Iterative optimization | 5-20 min | Synchronous or async |
| **Production Prep** | 51-200 | Final validation, holdout testing | 20-60 min | Async (SQS queue) |
| **Large Scale** | 201-1000+ | Comprehensive domain coverage | 1-6 hours | Async + parallel processing |

### 7.2 Processing Architecture

#### Small Scale (1-50 samples)
```
User clicks "Run Optimization"
        ↓
Lambda processes synchronously
        ↓
For each sample:
  - Upload to test workspace
  - Run evaluation
  - Store result
  - Compare to truth key
        ↓
Return results to UI (< 20 min)
```

**Pros:** Simple, immediate feedback  
**Cons:** User waits, timeout risk for 50+ samples

#### Large Scale (50+ samples)
```
User clicks "Run Optimization"
        ↓
API enqueues batch job (SQS)
        ↓
Background processor (eval-batch-processor Lambda)
        ↓
Parallel processing (5-10 samples at a time)
        ↓
Progress updates via WebSocket or polling
        ↓
Completion notification
```

**Pros:** Scalable, no timeout risk  
**Cons:** Async complexity, delayed results

### 7.3 Parallel Processing Strategy

**Batch Size:** 10 samples per batch

**Processing:**
```python
import concurrent.futures

def process_optimization_batch(samples, config):
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(evaluate_sample, sample, config)
            for sample in samples
        ]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
    return results
```

**Constraints:**
- Max 5 concurrent evaluations (avoid rate limits)
- Each evaluation ~30-60 seconds
- 50 samples × 60s / 5 workers = 10 minutes

### 7.4 Cost Estimation

**AI API Costs:**

| Model | Cost per 1K Tokens | Avg Tokens per Eval | Cost per Sample |
|-------|-------------------|---------------------|-----------------|
| GPT-4 Turbo | $0.01 input, $0.03 output | 5K in, 2K out | $0.11 |
| Claude 3.5 Sonnet | $0.003 input, $0.015 output | 5K in, 2K out | $0.045 |
| Nova | $0.0008 input, $0.0032 output | 5K in, 2K out | $0.01 |

**Total Cost Example:**
```
200 samples × 12 criteria × $0.045 = $108 per optimization run
10 optimization cycles = $1,080 total for domain optimization

Amortized over 1000 production evals = $1.08 per production eval
```

### 7.5 Progress Tracking

**For large batches, show real-time progress:**

```
Optimization Run: IT-Security-v3.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 75% Complete

Samples Processed: 150 / 200
Current Sample: doc-group-151 (AC Policy Template)
Elapsed Time: 45 minutes
Estimated Remaining: 15 minutes

Preliminary Metrics (150 samples):
  Accuracy: 86%
  False Positives: 7%
  False Negatives: 7%
```

**Technical Implementation:**
- Store progress in `eval_opt_runs` table
- Update `progress_percent`, `samples_processed`, `current_sample_id`
- Frontend polls every 5 seconds for updates
- Or use WebSocket for real-time updates

---

## 8. Access Control Model

### 8.1 Role Definitions

Aligns with CORA standard role model (Owner, Admin, User)

#### Owner
**Permissions:**
- Create/delete optimization projects
- Manage project members (assign Owner, Admin, User)
- Deploy configurations to production
- Delete truth keys, samples, optimization runs
- Full access to all project features

**Use Case:** Lead analyst or project manager

#### Admin
**Permissions:**
- Upload samples and truth keys
- Create/edit prompt versions
- Run optimization batches
- View all results and metrics
- Cannot delete project or change ownership

**Use Case:** Business analysts performing optimization work

#### User
**Permissions:**
- View optimization results
- View prompt versions (read-only)
- Suggest changes (comments)
- Upload samples (if granted by Admin)
- Cannot run optimizations or edit prompts

**Use Case:** Domain experts providing samples and feedback

### 8.2 Project-Level Permissions

**Table:** `eval_opt_project_members`

```sql
CREATE TABLE eval_opt_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(user_id),
    role VARCHAR(20) NOT NULL,  -- 'owner', 'admin', 'user'
    granted_by UUID REFERENCES user_profiles(user_id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);
```

**Role Assignment:**
- Project creator automatically assigned "owner"
- Owner can assign additional owners, admins, users
- Admin can assign users (but not admins or owners)
- At least one owner required (cannot remove last owner)

### 8.3 Operation Authorization Matrix

| Operation | Owner | Admin | User |
|-----------|-------|-------|------|
| View project dashboard | ✅ | ✅ | ✅ |
| View optimization results | ✅ | ✅ | ✅ |
| Upload samples | ✅ | ✅ | ⚠️ (if granted) |
| Upload truth keys | ✅ | ✅ | ❌ |
| Create prompt version | ✅ | ✅ | ❌ |
| Edit prompt (draft) | ✅ | ✅ | ❌ |
| Run optimization batch | ✅ | ✅ | ❌ |
| Deploy to production | ✅ | ❌ | ❌ |
| Rollback version | ✅ | ❌ | ❌ |
| Manage members | ✅ | ⚠️ (users only) | ❌ |
| Delete project | ✅ | ❌ | ❌ |

### 8.4 Production Deployment Safeguards

**Deployment requires Owner role:**

**Rationale:** Deploying to production affects real user evaluations - requires highest privilege

**Workflow:**
1. Admin optimizes prompt, gets good results
2. Admin requests deployment (creates "deployment request")
3. Owner reviews:
   - Optimization metrics
   - Holdout test results
   - Change summary
4. Owner approves → deploys to production
5. Or owner rejects → provides feedback

**Emergency Rollback:**
- Owner can rollback without approval
- System logs rollback reason
- Notification sent to project team

---

## 9. Production Deployment

### 9.1 Deployment Workflow

```
┌───────────────────────────────────────────┐
│ Optimization Complete                     │
│ - Final version: IT-Security-v3.0         │
│ - Accuracy: 88%                           │
│ - Holdout accuracy: 85%                   │
│ - Status: Ready for production            │
└────────────────┬──────────────────────────┘
                 ↓
┌───────────────────────────────────────────┐
│ Owner Review                              │
│ - Review optimization report              │
│ - Verify metrics meet thresholds          │
│ - Check sample coverage                   │
│ - Approve for deployment                  │
└────────────────┬──────────────────────────┘
                 ↓
┌───────────────────────────────────────────┐
│ Domain Configuration Mapping              │
│ - Document Type: "IT Security Policy"    │
│ - Linked Criteria Set: NIST 800-53       │
│ - Prompt Version: IT-Security-v3.0        │
│ - Effective Date: 2026-02-20              │
└────────────────┬──────────────────────────┘
                 ↓
┌───────────────────────────────────────────┐
│ Production Deployment                     │
│ [Option A] Org-specific config            │
│ - Update eval_cfg_org_prompts             │
│ - Scope: Single organization              │
│                                           │
│ [Option B] System-wide config             │
│ - Update eval_cfg_sys_prompts             │
│ - Domain mapping in config                │
│ - Scope: All organizations                │
└────────────────┬──────────────────────────┘
                 ↓
┌───────────────────────────────────────────┐
│ Production Testing                        │
│ - Run 3-5 real evaluations                │
│ - Compare to truth keys (if available)    │
│ - Verify expected behavior                │
│ - Monitor for errors                      │
└────────────────┬──────────────────────────┘
                 ↓
┌───────────────────────────────────────────┐
│ Ongoing Monitoring                        │
│ - Track accuracy metrics                  │
│ - User feedback collection                │
│ - Detect accuracy degradation             │
│ - Plan re-optimization when needed        │
└───────────────────────────────────────────┘
```

### 9.2 Deployment Options

#### Option A: Organization-Specific (Recommended for Initial Rollout)

**Scope:** Single organization tests optimized config before wider deployment

**Database Update:**
```sql
-- Create or update org-specific prompt config
INSERT INTO eval_cfg_org_prompts (
    org_id,
    prompt_type,
    system_prompt,
    user_prompt_template,
    ai_provider_id,
    ai_model_id,
    temperature,
    max_tokens,
    version,
    created_at,
    updated_at
) VALUES (
    '{org_id}',
    'evaluation',
    '{system_prompt from IT-Security-v3.0}',
    '{user_prompt_template from IT-Security-v3.0}',
    '{gpt4_provider_id}',
    '{gpt4_model_id}',
    0.3,
    3000,
    'IT-Security-v3.0',
    now(),
    now()
)
ON CONFLICT (org_id, prompt_type)
DO UPDATE SET
    system_prompt = EXCLUDED.system_prompt,
    user_prompt_template = EXCLUDED.user_prompt_template,
    ai_model_id = EXCLUDED.ai_model_id,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    version = EXCLUDED.version,
    updated_at = now();
```

**Resolution Logic (existing in module-eval):**
```
1. Check for org-specific prompt (eval_cfg_org_prompts)
2. If not found, fall back to system prompt (eval_cfg_sys_prompts)
```

#### Option B: Domain-Specific Mapping (System-Wide)

**Scope:** All orgs using "IT Security Policy" document type get optimized config

**Approach:** Add domain mapping to system prompts

**New Column in eval_cfg_sys_prompts:**
```sql
ALTER TABLE eval_cfg_sys_prompts 
ADD COLUMN domain_mappings JSONB;

-- Example domain mapping
{
  "IT Security Policy": {
    "version": "IT-Security-v3.0",
    "ai_model_id": "{gpt4_model_id}",
    "temperature": 0.3,
    "max_tokens": 3000,
    "system_prompt_override": "...",
    "user_prompt_override": "..."
  },
  "Land Appraisal": {
    "version": "Appraisal-v2.1",
    ...
  }
}
```

**Resolution Logic:**
```python
def get_prompt_config(org_id, document_type):
    # 1. Check org-specific config
    org_config = get_org_prompt_config(org_id)
    if org_config:
        return org_config
    
    # 2. Check system domain mapping
    sys_config = get_system_prompt_config()
    domain_mapping = sys_config.domain_mappings.get(document_type)
    if domain_mapping:
        return domain_mapping
    
    # 3. Fall back to default system config
    return sys_config.default
```

### 9.3 Deployment Validation

**Pre-Deployment Checklist:**
- [ ] Optimization accuracy ≥ 85%
- [ ] Holdout test accuracy ≥ 80% of optimization accuracy
- [ ] Sample size ≥ 50 (or justified if lower)
- [ ] No critical errors in optimization runs
- [ ] Owner approval obtained
- [ ] Deployment plan reviewed

**Post-Deployment Testing:**
1. Run 3-5 production evaluations manually
2. Compare results to expected outcomes (use truth keys if available)
3. Check CloudWatch logs for errors
4. Verify response times acceptable (< 60s per evaluation)

**Rollback Triggers:**
- Accuracy drops > 20% in production
- Errors in > 10% of evaluations
- User reports of obviously wrong results

### 9.4 Monitoring & Feedback Loop

**Production Metrics to Track:**

```sql
-- Evaluation success rate
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_evals,
    COUNT(*) FILTER (WHERE status = 'completed') as successful,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 1) as success_rate
FROM eval_doc_summaries
WHERE doc_type_id IN (SELECT id FROM eval_cfg_doc_types WHERE name = 'IT Security Policy')
  AND created_at > (SELECT deployed_at FROM eval_prompt_versions WHERE version = 'IT-Security-v3.0')
GROUP BY DATE(created_at);

-- Average compliance scores (detect drift)
SELECT 
    DATE(created_at) as date,
    AVG(compliance_score) as avg_score,
    STDDEV(compliance_score) as score_variance
FROM eval_doc_summaries
WHERE doc_type_id = '{IT Security Policy type id}'
  AND created_at > '{deployment_date}'
GROUP BY DATE(created_at);
```

**User Feedback Collection:**
- In eval results UI, add "Was this evaluation accurate?" (thumbs up/down)
- Collect specific feedback on incorrect results
- Aggregate feedback → identify re-optimization needs

**Re-Optimization Triggers:**
- Accuracy drops below threshold (e.g., 75%)
- User feedback indicates pattern of errors
- New document types not covered by current optimization
- AI model updated/changed by provider

---

## 10. Database Schema (Summary)

### 10.1 Core Tables

```sql
-- Optimization projects
CREATE TABLE eval_optimization_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) NOT NULL,  -- 'IT Security', 'Appraisal', etc.
    criteria_set_id UUID REFERENCES eval_criteria_sets(id),
    description TEXT,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project members and roles
CREATE TABLE eval_opt_project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(user_id),
    role VARCHAR(20) NOT NULL,  -- 'owner', 'admin', 'user'
    granted_by UUID REFERENCES user_profiles(user_id),
    granted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Document groups (primary doc + artifacts)
CREATE TABLE eval_opt_document_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    group_name VARCHAR(255),
    primary_doc_id UUID REFERENCES kb_docs(id),
    artifact_doc_ids UUID[],  -- Array of kb_docs.id
    tags TEXT[],
    uploaded_by UUID REFERENCES user_profiles(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Truth keys
CREATE TABLE eval_opt_truth_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    document_group_id UUID REFERENCES eval_opt_document_groups(id) ON DELETE CASCADE,
    criteria_item_id UUID REFERENCES eval_criteria_items(id),  -- NULL for doc-level
    
    -- Document-level truth (if criteria_item_id IS NULL)
    overall_compliance_score INTEGER,  -- 0-100
    overall_status VARCHAR(50),
    key_findings TEXT,
    
    -- Criteria-level truth (if criteria_item_id IS NOT NULL)
    expected_status VARCHAR(50),
    expected_confidence INTEGER,  -- 0-100
    notes TEXT,
    expected_citations TEXT,
    
    -- Metadata
    analyst_name VARCHAR(255),
    confidence_level VARCHAR(20),  -- 'High', 'Medium', 'Low'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt versions
CREATE TABLE eval_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    version_number VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT NOT NULL,
    ai_provider_id UUID REFERENCES ai_providers(id),
    ai_model_id UUID REFERENCES ai_models(id),
    temperature DECIMAL(3,2),
    max_tokens INTEGER,
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deployed_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    parent_version_id UUID REFERENCES eval_prompt_versions(id),
    change_summary TEXT
);

-- Optimization runs
CREATE TABLE eval_opt_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    prompt_version_id UUID REFERENCES eval_prompt_versions(id),
    run_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    
    -- Progress tracking
    total_samples INTEGER,
    samples_processed INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    
    -- Results summary
    accuracy DECIMAL(5,2),
    false_positive_rate DECIMAL(5,2),
    false_negative_rate DECIMAL(5,2),
    avg_confidence DECIMAL(5,2),
    
    -- Metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual run results
CREATE TABLE eval_opt_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES eval_opt_runs(id) ON DELETE CASCADE,
    document_group_id UUID REFERENCES eval_opt_document_groups(id),
    truth_key_id UUID REFERENCES eval_opt_truth_keys(id),
    
    -- AI result
    ai_status VARCHAR(50),
    ai_confidence INTEGER,
    ai_result TEXT,
    
    -- Comparison
    matches_truth BOOLEAN,
    error_type VARCHAR(50),  -- 'false_positive', 'false_negative', NULL if correct
    
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.2 Schema Relationships

```
eval_optimization_projects
    ├── eval_opt_project_members (role-based access)
    ├── eval_opt_document_groups (sample docs)
    │   └── eval_opt_truth_keys (expected results)
    ├── eval_prompt_versions (prompt iteration)
    └── eval_opt_runs (optimization batches)
        └── eval_opt_run_results (individual results)
```

---

## 11. Success Criteria

### 11.1 System-Level Success

**Must Have:**
- [ ] Analysts can upload samples (docs + truth keys) via spreadsheet
- [ ] System runs optimization batches comparing AI to truth keys
- [ ] Accuracy metrics displayed (overall, per-criteria, FP/FN rates)
- [ ] Prompt versioning tracks changes over time
- [ ] Optimized configs can be deployed to production module-eval
- [ ] Access control enforces Owner/Admin/User roles

**Should Have:**
- [ ] A/B comparison of prompt versions
- [ ] Multi-model testing (GPT-4, Claude, Nova)
- [ ] Confidence interval calculations
- [ ] Production monitoring dashboard

**Nice to Have:**
- [ ] Automated prompt suggestions based on error patterns
- [ ] Cross-domain optimization (apply lessons from one domain to another)
- [ ] Cost tracking and budgeting

### 11.2 Business Outcomes

**Evaluation Quality:**
- 20%+ improvement in accuracy for optimized domains vs generic prompts
- False positive rate < 10%
- Holdout test accuracy within 10% of optimization accuracy (no overfitting)

**Analyst Productivity:**
- Optimization cycle time < 30 minutes (from config change to results)
- 5+ optimization iterations per domain in first week
- Clear actionable metrics guide prompt improvements

**Production Impact:**
- User-reported accuracy issues reduced 50%+
- Evaluation confidence scores increase 15%+
- Production deployment process < 1 hour from approval to live

### 11.3 Technical Performance

**Scalability:**
- Support 1000+ sample optimization runs
- Batch processing completes within 6 hours for 1000 samples
- No timeouts or memory errors

**Reliability:**
- 99%+ optimization run success rate
- Graceful error handling for API failures
- Automatic retry for transient failures

**Usability:**
- Analysts can complete end-to-end workflow without technical support
- Truth key upload validation catches errors before processing
- Clear error messages guide troubleshooting

---

## 12. Implementation Roadmap

### Sprint 2: Core Workflow (2-3 weeks)
- Project creation and member management
- Sample upload (documents + truth keys)
- Basic optimization run (single config)
- Metrics display (accuracy, FP/FN)

### Sprint 3: Prompt Versioning (1-2 weeks)
- Prompt version CRUD
- Version comparison (A/B testing)
- Deployment workflow (draft → testing → production)

### Sprint 4: Production Integration (1-2 weeks)
- Deploy optimized config to module-eval
- Domain mapping for document types
- Production monitoring dashboard

### Sprint 5: Scale & Polish (1-2 weeks)
- Async batch processing for large runs
- Multi-model support
- UI/UX improvements based on feedback

---

## 13. Open Questions & Future Enhancements

### Open Questions
1. Should optimizer create temporary test orgs or reuse existing orgs?
2. What retention policy for optimization runs? (archive after 90 days?)
3. How to handle criteria changes mid-optimization? (invalidate truth keys?)

### Future Enhancements
1. **Automated Prompt Generation:** AI suggests prompt improvements based on error patterns
2. **Cross-Domain Learning:** Apply patterns from one domain to bootstrap new domain optimization
3. **Cost Optimization:** Recommend cheaper models if accuracy difference < 5%
4. **Continuous Learning:** Collect production feedback → auto-trigger re-optimization
5. **Explainability:** Show which prompt sections influenced specific AI decisions

---

**Document Status:** Draft v1.0  
**Review Status:** Pending stakeholder review  
**Next Steps:** 
1. Review with product owner and lead analyst
2. Validate technical feasibility with engineering
3. Create Sprint 2 implementation plan
4. Begin database schema development

---

**End of Concept of Operations**