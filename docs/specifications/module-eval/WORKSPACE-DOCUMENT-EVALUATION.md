# Workspace Document Evaluation - User Experience Specification

**Module:** module-eval  
**Feature:** Workspace Document Evaluation  
**Version:** 1.0  
**Last Updated:** January 19, 2026

---

## Overview

This specification defines the end-to-end user experience for evaluating documents within a workspace context. The feature integrates **module-eval** (evaluation) with **module-kb** (knowledge base) to provide AI-powered document analysis against configurable evaluation criteria.

---

## User Journey

### 1. Initiating Document Evaluation

**Context:** User is working within a workspace and has a document they want to evaluate against organizational criteria.

**Action:** User clicks **"Evaluate Document"** button

**Location:** This button appears in the workspace document management interface (exact location TBD based on workspace UI design)

**Prerequisites:**
- User must be a member of the workspace
- Organization must have at least one active document type configured
- Organization must have at least one active criteria set configured
- Workspace must have KB functionality enabled (module-kb)

---

## Processing Pipeline

### Step 1: Document Upload & Embedding

**What Happens:**
1. Document is uploaded to the workspace's knowledge base
2. Document is stored in S3 (workspace-specific bucket/prefix)
3. Document is processed for embedding generation
4. Document chunks are stored in vector database for RAG retrieval

**Technical Details:**
- **Module:** module-kb
- **Storage:** S3 bucket with workspace-specific prefix
- **Embedding:** OpenAI/Bedrock embedding models
- **Vector DB:** pgvector in Supabase
- **Status:** User sees "Uploading document..." progress indicator

**Time Estimate:** 10-30 seconds (depending on document size)

---

### Step 2: Criteria-by-Criteria Evaluation

**What Happens:**
For each evaluation criteria in the selected criteria set:

1. **RAG Search:** Query the vector database to find relevant document sections for this specific criterion
2. **LLM Call:** Send criterion + relevant context to LLM
3. **Generate Results:** LLM produces:
   - Status (e.g., "Compliant", "Non-Compliant", "Partial")
   - Score (if weighted scoring enabled)
   - Explanation/reasoning
   - Citations (references to specific document sections)

**Technical Details:**
- **Module:** module-eval + module-kb
- **RAG Provider:** module-kb vector search
- **LLM Provider:** Configured via module-ai (org or workspace AI config)
- **Parallelization:** Criteria evaluations can run in parallel for performance
- **Status:** User sees "Evaluating criteria X of Y..." progress indicator

**Example LLM Prompt Structure:**
```
System: You are evaluating a document against a specific compliance criterion.

User: Evaluate the following criterion:
Criterion ID: POL-001
Requirement: "Password complexity requirements"
Description: "Requires minimum 12 characters with mix of character types"

Relevant document sections:
[RAG-retrieved context from vector DB]

Provide your evaluation in JSON format:
{
  "status": "compliant|non_compliant|partial|not_applicable",
  "score": <0-100 if weighted>,
  "explanation": "<detailed reasoning>",
  "citations": ["<specific text from document>"]
}
```

**Time Estimate:** 5-10 seconds per criterion (parallel execution)

---

### Step 3: Overall Document Analysis Summary

**What Happens:**
1. All individual criteria results are collected
2. Results are sent to LLM for synthesis
3. LLM generates:
   - Overall compliance summary
   - Key findings
   - Recommendations
   - Overall score (aggregate of individual criteria scores)

**Technical Details:**
- **Module:** module-eval
- **LLM Provider:** Same as criteria evaluation (from module-ai config)
- **Input:** All criteria results + document metadata
- **Output:** Executive summary with overall assessment
- **Status:** User sees "Generating summary..." progress indicator

**Example LLM Prompt Structure:**
```
System: You are synthesizing individual criterion evaluations into an overall document assessment.

User: Based on the following criterion-by-criterion evaluations, provide an overall assessment:

[List of all criteria results with status, scores, explanations]

Generate an executive summary that includes:
1. Overall compliance status
2. Aggregate score (if applicable)
3. Key strengths
4. Key gaps/concerns
5. Recommended actions

Provide your summary in JSON format.
```

**Time Estimate:** 5-10 seconds

---

### Step 4: Processing Complete

**What Happens:**
1. Evaluation record is saved to database
2. User is notified: "Evaluation complete!"
3. User can select the evaluation to view results

**Database Records Created:**
- `eval_evaluations` - Main evaluation record
- `eval_results` - Individual criteria results
- `eval_result_details` - Detailed data (citations, context, etc.)
- `kb_documents` - Document stored in KB (if not already present)

---

## Results Display

### Document Evaluation Page

**URL:** `/workspace/{workspaceId}/eval/{evaluationId}`

#### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Document Evaluation Results                                 │
│  Document: [IT Security Policy.pdf]                         │
│  Evaluated: [Jan 19, 2026 3:15 PM]                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Overall Score: 78/100  [████████░░] 78%                    │
├─────────────────────────────────────────────────────────────┤
│  Executive Summary                                           │
│                                                              │
│  This IT security policy demonstrates strong compliance with │
│  authentication and data protection requirements. Key        │
│  strengths include comprehensive MFA requirements and        │
│  AES-256 encryption standards. However, gaps exist in        │
│  incident response procedures and access logging retention. │
│                                                              │
│  Key Findings:                                               │
│  ✓ Strong authentication controls (MFA, password policy)    │
│  ✓ Robust encryption standards                              │
│  ⚠ Incomplete incident response documentation               │
│  ✗ Access logs retention period not specified               │
│                                                              │
│  Recommendations:                                            │
│  • Document detailed incident response procedures            │
│  • Specify access log retention requirements (min 1 year)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Criteria Results (5)                                        │
├─────────────────────────────────────────────────────────────┤
│  ▶ POL-001: Password complexity requirements | Score: 10/10 │
│                                                 [Compliant]   │
├─────────────────────────────────────────────────────────────┤
│  ▼ POL-002: Multi-factor authentication | Score: 12/15      │
│                                            [Partial]          │
│  ├─ Status: Partially Compliant                             │
│  ├─ Explanation:                                             │
│  │  The policy requires MFA for privileged accounts, which  │
│  │  is excellent. However, it doesn't mandate MFA for all   │
│  │  user accounts, which is recommended for maximum         │
│  │  security.                                                │
│  ├─ Citations:                                               │
│  │  • "All administrator and privileged accounts must use   │
│  │    multi-factor authentication" (Section 3.2)            │
│  └─ Document Section: [View in KB]                          │
├─────────────────────────────────────────────────────────────┤
│  ▶ POL-003: Encryption at rest | Score: 20/20 [Compliant]  │
├─────────────────────────────────────────────────────────────┤
│  ▶ POL-004: Access logging | Score: 3/8 [Non-Compliant]    │
├─────────────────────────────────────────────────────────────┤
│  ▶ POL-005: Incident response plan | Score: 8/12 [Partial] │
└─────────────────────────────────────────────────────────────┘

[Export Report] [Re-evaluate] [Share]
```

---

## UI Components

### 1. Overall Score Display

**Location:** Top of evaluation results page

**Components:**
- Numerical score (e.g., "78/100")
- Visual progress bar
- Percentage display
- Color coding:
  - Green: 80-100%
  - Yellow: 60-79%
  - Orange: 40-59%
  - Red: 0-39%

### 2. Executive Summary Card

**Location:** Below overall score

**Components:**
- Summary text (AI-generated)
- Key findings list with icons:
  - ✓ (checkmark) for strengths
  - ⚠ (warning) for concerns
  - ✗ (x) for critical gaps
- Recommendations list

### 3. Criteria Results List

**Location:** Below executive summary

**Default State:** All collapsed (collapsed by default)

**Collapsed View:**
```
▶ POL-001: Password complexity requirements | Score: 10/10 [Compliant]
```

**Expanded View:**
```
▼ POL-001: Password complexity requirements | Score: 10/10 [Compliant]
  ├─ Status: Compliant
  ├─ Explanation:
  │  The policy clearly specifies password requirements including
  │  minimum 12 characters with uppercase, lowercase, numbers, and
  │  special characters. This meets security best practices.
  ├─ Citations:
  │  • "Passwords must be at least 12 characters and include..." (Section 3.1)
  └─ Document Section: [View in KB]
```

**Components per Criterion:**
- Criterion ID and title
- Score (if weighted)
- Status badge (color-coded)
- Expand/collapse icon
- When expanded:
  - Status
  - Detailed explanation
  - Citations from document
  - Link to view source in KB

### 4. Status Badges

**Visual Design:**
- Pill-shaped badges
- Color-coded background
- White text

**Status Options (configurable per org):**
- **Compliant:** Green background
- **Partial / Partially Compliant:** Yellow/orange background
- **Non-Compliant:** Red background
- **Not Applicable:** Gray background

---

## Integration Points

### Module-KB Integration

**Purpose:** Document storage and RAG retrieval

**Touch Points:**
1. **Document Upload:** Uses KB document upload API
2. **Embedding Generation:** Uses KB embedding service
3. **RAG Search:** Uses KB vector search for each criterion
4. **Citation Linking:** Links evaluation results back to KB document sections

**APIs Used:**
- `POST /kb/documents` - Upload document
- `POST /kb/search` - Vector search for RAG
- `GET /kb/documents/{id}` - Retrieve document for display

### Module-AI Integration

**Purpose:** AI provider and model selection

**Touch Points:**
1. **LLM Selection:** Uses org/workspace AI configuration for model selection
2. **API Credentials:** Uses module-ai credential management
3. **Prompt Templates:** Evaluation prompts configured via eval_cfg_org_prompts

**APIs Used:**
- `GET /ai/config` - Get AI configuration for workspace
- Used internally by eval processor for LLM calls

---

## Data Flow Diagram

```
┌──────────────┐
│ User clicks  │
│ "Evaluate    │
│  Document"   │
└──────┬───────┘
       │
       v
┌────────────────────────────────────────────────────────┐
│ Step 1: Upload to KB                                   │
│ - Store document in S3                                 │
│ - Generate embeddings                                  │
│ - Save to vector DB                                    │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ Step 2: Evaluate Each Criterion (Parallel)            │
│                                                        │
│ For each criterion:                                    │
│   ┌──────────────────────────────────────────┐       │
│   │ 2a. RAG Search (module-kb)               │       │
│   │ - Query: Criterion requirement            │       │
│   │ - Returns: Relevant document sections    │       │
│   └────────────┬─────────────────────────────┘       │
│                │                                       │
│                v                                       │
│   ┌──────────────────────────────────────────┐       │
│   │ 2b. LLM Evaluation (module-ai)           │       │
│   │ - Input: Criterion + RAG context         │       │
│   │ - Output: Status, score, explanation     │       │
│   └────────────┬─────────────────────────────┘       │
│                │                                       │
│                v                                       │
│   ┌──────────────────────────────────────────┐       │
│   │ 2c. Save Result to DB                    │       │
│   │ - eval_results table                     │       │
│   │ - eval_result_details table              │       │
│   └──────────────────────────────────────────┘       │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ Step 3: Generate Overall Summary                       │
│ - Input: All criteria results                         │
│ - LLM synthesizes executive summary                   │
│ - Calculate aggregate score                            │
│ - Save summary to DB                                   │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ Step 4: Display Results                                │
│ - Notify user evaluation is complete                  │
│ - User navigates to evaluation results page           │
│ - Display summary + criteria results                  │
└────────────────────────────────────────────────────────┘
```

---

## User Actions

### During Processing

**User Sees:**
1. Progress indicator showing current step
2. Estimated time remaining
3. Option to minimize and continue working (processing in background)

**User Can:**
- Minimize notification and check back later
- Navigate away (processing continues in background)
- View processing logs (if admin)

### After Processing

**User Receives:**
- In-app notification: "Document evaluation complete"
- Email notification (optional, configured per user)
- Badge/counter on workspace evaluation list

**User Can:**
- Click notification to view results
- Navigate to evaluations list and select completed evaluation
- Export results as PDF report
- Share evaluation results with team members
- Re-evaluate document with updated criteria

---

## Error Handling

### Upload Failures

**Scenarios:**
- File too large (>100MB)
- Unsupported file format
- S3 upload failure

**User Experience:**
- Clear error message explaining the issue
- Suggested action (e.g., "Please use a file smaller than 100MB")
- Option to retry

### Processing Failures

**Scenarios:**
- LLM API timeout
- LLM API rate limit
- Insufficient credits/quota
- Vector search failure

**User Experience:**
- Evaluation status shows "Failed"
- Detailed error log available
- Option to retry failed evaluation
- Admin notification if quota/config issue

### Partial Completion

**Scenario:** Some criteria complete, others fail

**User Experience:**
- Partial results are saved and displayed
- Failed criteria marked as "Processing Error"
- Option to re-run only failed criteria
- Summary generated from available results with disclaimer

---

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing:** Run criteria evaluations in parallel
2. **Caching:** Cache document embeddings for re-evaluation
3. **Streaming:** Stream results as they complete (progressive display)
4. **Background Processing:** Use SQS queues for async processing
5. **Batch Operations:** Batch multiple document evaluations

### Expected Timelines

| Step | Time Estimate |
|------|---------------|
| Document upload & embedding | 10-30 seconds |
| Per-criterion evaluation | 5-10 seconds |
| 10 criteria (parallel) | ~10-15 seconds |
| Overall summary generation | 5-10 seconds |
| **Total (10 criteria)** | **~25-55 seconds** |

---

## Future Enhancements

### Phase 2 Features

1. **Batch Evaluation:** Evaluate multiple documents at once
2. **Comparison View:** Compare evaluations of different documents
3. **Trend Analysis:** Track compliance improvements over time
4. **Custom Weighting:** Allow users to adjust criterion weights
5. **Collaborative Review:** Multiple reviewers can comment on results
6. **Automated Re-evaluation:** Trigger evaluation on document updates

### Phase 3 Features

1. **AI Recommendations:** Suggest specific document changes to improve compliance
2. **Gap Analysis:** Visualize compliance gaps across multiple documents
3. **Regulatory Mapping:** Map criteria to specific regulations (NIST, HIPAA, etc.)
4. **Document Comparison:** Compare current vs. previous versions
5. **Risk Scoring:** Calculate risk scores based on non-compliance

---

## Appendix

### Database Schema

**Core Tables:**
- `eval_evaluations` - Main evaluation records
- `eval_results` - Per-criterion results
- `eval_result_details` - Detailed result data (citations, context)
- `eval_doc_types` - Document type definitions
- `eval_criteria_sets` - Criteria set definitions
- `eval_criteria_items` - Individual criteria

### API Endpoints

**Evaluation:**
- `POST /eval/evaluations` - Create new evaluation
- `GET /eval/evaluations/{id}` - Get evaluation results
- `GET /eval/evaluations` - List evaluations (workspace filtered)
- `POST /eval/evaluations/{id}/retry` - Retry failed evaluation

**Configuration:**
- `GET /admin/org/eval/doc-types` - List document types
- `GET /admin/org/eval/criteria-sets` - List criteria sets

### Related Documentation

- [Module-Eval Specification](./MODULE-EVAL-SPEC.md)
- [Module-KB Integration](../module-kb/KB-INTEGRATION.md)
- [Admin Configuration Guide](./ADMIN-CONFIG-GUIDE.md)

---

**Document Status:** Draft  
**Review Status:** Pending  
**Approval Required:** Product, Engineering, UX  
**Target Implementation:** Phase 2 (After admin config validation)
