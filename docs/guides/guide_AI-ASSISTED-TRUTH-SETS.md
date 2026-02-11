# Guide: AI-Assisted Truth Set Creation

**Module:** module-eval-studio  
**Feature:** AI-Assisted Truth Set Creation (Sprint 6)  
**Audience:** Business Analysts  
**Created:** February 10, 2026  
**Status:** Production-Ready

---

## Executive Summary

This guide enables Business Analysts to create evaluation truth sets **10x faster** using commercial AI assistants (Claude, GPT-4) instead of manual data entry.

**Traditional Method:** 2-4 hours (manual entry per document, per criterion)  
**AI-Assisted Method:** 5 minutes (template download → AI evaluation → upload)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Workflow](#step-by-step-workflow)
4. [AI Prompt Templates](#ai-prompt-templates)
5. [JSON Schema Reference](#json-schema-reference)
6. [Example Truth Sets](#example-truth-sets)
7. [Validation & Error Handling](#validation--error-handling)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What is a Truth Set?

A **truth set** is a collection of documents with pre-verified evaluation results (ground truth). These are used to:
- Train and optimize evaluation prompts
- Measure prompt accuracy objectively
- Establish baseline evaluation standards

### Why AI-Assisted Creation?

**Manual Process (OLD):**
```
For EACH document (5 documents):
  For EACH criterion (8 criteria):
    1. Read document carefully
    2. Determine expected value (compliant/non-compliant/partial)
    3. Type rationale (2-3 sentences)
    4. Add citations with page numbers
    5. Estimate confidence (0-1)
    
Total Time: 30-45 minutes per document × 5 = 2.5-4 hours
```

**AI-Assisted Process (NEW):**
```
1. Download evaluation template (30 seconds)
2. Upload documents + template to Claude/GPT-4 (1 minute)
3. AI evaluates all documents against all criteria (2 minutes)
4. Review and adjust AI output (1 minute)
5. Upload completed truth set to Eval Studio (30 seconds)

Total Time: ~5 minutes (10x faster!)
```

---

## Prerequisites

### Required Access
- ✅ Eval Studio access (module-eval-studio enabled)
- ✅ Optimization run created with sections and criteria defined
- ✅ Access to commercial AI assistant (Claude, GPT-4, or similar)
- ✅ Sample documents for evaluation (PDF, text, or accessible format)

### Recommended Setup
- **AI Assistant:** Claude 3.5 Sonnet or GPT-4 (best results)
- **Document Format:** PDF with clear text (not scanned images)
- **Document Count:** 5-10 documents for robust truth set
- **Time Required:** 10-15 minutes total (including AI processing)

---

## Step-by-Step Workflow

### Phase 1: Prepare Template (Eval Studio)

**Step 1.1: Navigate to Optimization Run**
```
1. Log into Eval Studio
2. Select your workspace
3. Go to "Optimization Runs"
4. Open the run you want to create truth sets for
```

**Step 1.2: Verify Configuration**

Ensure the following sections are complete:
- ✅ **Response Sections Defined** - All evaluation sections configured
- ✅ **Criteria Defined** - All evaluation criteria added with clear descriptions

**Step 1.3: Download Template**
```
1. Scroll to "Truth Sets" section
2. Click "Download Template" button
3. Save as: optimization-run-{runId}-template.json
```

**What you get:**
- JSON file with your run configuration
- All sections and criteria pre-populated
- Empty `documents` array (you'll fill this with AI)
- Schema-validated structure (ready for AI processing)

---

### Phase 2: Prepare AI Prompt (Commercial AI)

**Step 2.1: Open Your AI Assistant**

Recommended platforms:
- **Claude.ai** (Anthropic) - Excellent for document analysis
- **ChatGPT** (OpenAI) - GPT-4 or GPT-4 Turbo recommended
- **Other:** Any AI with good JSON output and document understanding

**Step 2.2: Upload Documents**

Upload your sample documents to the AI assistant:
```
Method 1: Direct file upload (if AI supports)
Method 2: Copy/paste document text
Method 3: Provide document summaries
```

**Tip:** If using PDFs, ensure they have extractable text (not scanned images).

**Step 2.3: Upload Template JSON**

Upload the template JSON file you downloaded from Eval Studio.

---

### Phase 3: Execute AI Evaluation

**Step 3.1: Use the AI Prompt Template**

Copy and paste this prompt (adjust as needed):

````markdown
# Document Evaluation Task

## Instructions

You are evaluating documents for compliance with specific criteria. I have provided:
1. A JSON template with sections and criteria definitions
2. Sample documents to evaluate

## Your Task

For each document, evaluate it against ALL criteria in the template.

Fill in the `evaluations` array for each document with:
- `expected_value`: Your evaluation (use ONLY values from `expected_values` array in template)
- `confidence`: Your confidence score (0.0 to 1.0, where 1.0 = very confident)
- `rationale`: Brief explanation of your evaluation (2-4 sentences)
- `citations`: Specific quotes from the document supporting your evaluation (include page numbers if available)

## Important Guidelines

1. **Be Consistent:** Use the same evaluation standards across all documents
2. **Use Valid Values:** Only use `expected_value` options from the template (e.g., "compliant", "non-compliant", "partial")
3. **Provide Evidence:** Include direct quotes in citations
4. **Be Honest About Confidence:** Lower confidence (0.5-0.7) is acceptable if document is ambiguous
5. **Be Thorough:** Evaluate EVERY criterion for EVERY document

## Template JSON

[Paste your downloaded template JSON here]

## Documents to Evaluate

[List your documents here, or paste their content]

Document 1: ACME Corp Security Policy.pdf
Document 2: Beta Inc Access Control Procedures.pdf
Document 3: Gamma LLC IT Governance Policy.pdf
...

## Output Format

Return the completed JSON with:
- The same structure as the template
- `documents` array filled with evaluations
- Valid JSON syntax (use online validator if needed)
- All required fields populated

**Begin evaluation now.**
````

**Step 3.2: Wait for AI Response**

The AI will:
1. Analyze each document against each criterion
2. Generate evaluations with rationales and citations
3. Return completed JSON with all evaluations filled in

**Typical processing time:** 1-3 minutes (depending on document count and AI load)

**Step 3.3: Review AI Output**

Check the AI's JSON output:
- ✅ Valid JSON syntax (no errors)
- ✅ All documents evaluated
- ✅ All criteria covered for each document
- ✅ Rationales are clear and specific
- ✅ Citations reference actual document content
- ✅ Confidence scores are reasonable (0.6-1.0 typical)

**Tip:** Copy the JSON output and validate it with an online JSON validator if needed.

---

### Phase 4: Upload Truth Set (Eval Studio)

**Step 4.1: Save AI Output**

Save the AI's completed JSON to a file:
```
File name: truth-set-{run-name}-{date}.json
Example: truth-set-nist-ac-policies-2026-02-10.json
```

**Step 4.2: Upload to Eval Studio**
```
1. Return to your optimization run in Eval Studio
2. Scroll to "Truth Sets" section
3. Click "Upload Truth Set" button
4. Select your saved JSON file
5. Click "Preview" to validate
```

**Step 4.3: Review Preview**

The preview dialog shows:
- ✅ **Documents Imported:** Count of documents detected
- ✅ **Evaluations Imported:** Count of criterion evaluations
- ✅ **Sections Processed:** Count of evaluation sections
- ⚠️ **Warnings:** Any issues detected (low confidence, missing citations, etc.)

**Step 4.4: Confirm Import**

If validation passes:
```
1. Review the summary and warnings
2. Click "Import Truth Set" button
3. Wait for success confirmation
4. Truth sets now appear in the run
```

**Step 4.5: Verify Import**

Check the Truth Sets section:
- ✅ All documents listed with evaluation counts
- ✅ Clicking a document shows all criterion evaluations
- ✅ Expected values, rationales, and citations display correctly

---

## AI Prompt Templates

### Template 1: IT Security Policies (NIST)

Use this template for NIST 800-53 compliance evaluations:

```markdown
# NIST 800-53 Compliance Evaluation

You are an IT security compliance analyst evaluating organizational policies 
against NIST 800-53 Access Control (AC) family controls.

For each document, determine if it addresses the required control elements:
- Purpose and scope
- Roles and responsibilities
- Management commitment
- Coordination among entities
- Compliance requirements

Expected values: "compliant", "non-compliant", "partial"

Confidence guidelines:
- 1.0: Explicit statement found in document
- 0.8-0.9: Clear evidence, implied coverage
- 0.6-0.7: Some evidence, incomplete coverage
- 0.5: Uncertain, ambiguous language

[Rest of template as above...]
```

### Template 2: Contract Appraisals

Use this template for contract or proposal evaluations:

```markdown
# Contract/Proposal Evaluation

You are evaluating proposals against RFP requirements.

For each criterion, determine:
- Does the proposal address this requirement?
- Is the response complete and compliant?
- Are there gaps or ambiguities?

Expected values: "meets", "exceeds", "does-not-meet", "unclear"

Confidence guidelines:
- 1.0: Explicit, detailed response
- 0.8-0.9: Clear response, minor gaps
- 0.6-0.7: Partial response, notable gaps
- 0.5: Ambiguous, requires clarification

[Rest of template as above...]
```

### Template 3: General Document Evaluation

Use this template for other document types:

```markdown
# Document Evaluation Task

You are evaluating documents for compliance with specified criteria.

For each criterion:
1. Read the criterion description carefully
2. Locate relevant content in the document
3. Determine if the document satisfies the criterion
4. Provide specific evidence (quotes with page numbers)
5. Estimate your confidence in the evaluation

Expected values will vary by criterion - use ONLY the values specified 
in the template's `expected_values` array for each criterion.

[Rest of template as above...]
```

---

## JSON Schema Reference

### Complete Truth Set Structure

```json
{
  "run_id": "uuid-of-optimization-run",
  "workspace_id": "uuid-of-workspace",
  "metadata": {
    "created_at": "2026-02-10T14:00:00Z",
    "created_by": "analyst@example.com",
    "version": "1.0"
  },
  "sections": [
    {
      "section_id": "section-uuid",
      "section_name": "Access Control",
      "description": "Evaluate access control policies",
      "criteria": [
        {
          "criteria_id": "criteria-uuid",
          "criteria_text": "AC1a: Access Control Policy...",
          "description": "Policy must address purpose, scope, roles...",
          "expected_values": ["compliant", "non-compliant", "partial"]
        }
      ]
    }
  ],
  "documents": [
    {
      "document_id": "doc-uuid",
      "document_name": "ACME Security Policy.pdf",
      "document_url": "s3://bucket/path/to/doc.pdf",
      "evaluations": [
        {
          "criteria_id": "criteria-uuid",
          "section_id": "section-uuid",
          "expected_value": "compliant",
          "confidence": 0.95,
          "rationale": "The document explicitly addresses...",
          "citations": [
            {
              "page": 1,
              "text": "This policy establishes..."
            }
          ]
        }
      ]
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_id` | UUID | Yes | Must match the optimization run |
| `workspace_id` | UUID | Yes | Must match the workspace |
| `sections` | Array | Yes | Pre-populated from template |
| `documents` | Array | Yes | You populate this with AI |
| `document_id` | UUID | Yes | Generate new UUID per document |
| `document_name` | String | Yes | Filename or document title |
| `document_url` | String | No | Optional S3 or file path |
| `evaluations` | Array | Yes | One per criterion, per document |
| `criteria_id` | UUID | Yes | Must match template criterion |
| `section_id` | UUID | Yes | Must match template section |
| `expected_value` | String | Yes | Must be from `expected_values` |
| `confidence` | Number | No | 0.0-1.0 (recommended) |
| `rationale` | String | Yes | 2-4 sentence explanation |
| `citations` | Array | No | Recommended for credibility |

---

## Example Truth Sets

### Example 1: IT Security Policy (3 Documents)

```json
{
  "run_id": "2e919950-e451-4cad-bcd0-4df762a2d7fb",
  "workspace_id": "ws-123",
  "metadata": {
    "created_at": "2026-02-10T14:30:00Z",
    "created_by": "security-analyst@example.com",
    "version": "1.0"
  },
  "sections": [
    {
      "section_id": "s1",
      "section_name": "Access Control",
      "criteria": [
        {
          "criteria_id": "c1",
          "criteria_text": "AC1a: Policy addresses purpose, scope, roles, responsibilities",
          "expected_values": ["compliant", "non-compliant", "partial"]
        }
      ]
    }
  ],
  "documents": [
    {
      "document_id": "d1",
      "document_name": "ACME Corp Security Policy.pdf",
      "evaluations": [
        {
          "criteria_id": "c1",
          "section_id": "s1",
          "expected_value": "compliant",
          "confidence": 0.95,
          "rationale": "Document explicitly addresses all required elements: purpose (Section 1.1), scope (Section 1.2), roles and responsibilities (Section 3), and includes management signature demonstrating commitment.",
          "citations": [
            {
              "page": 1,
              "text": "This policy establishes the purpose and scope of access control..."
            },
            {
              "page": 3,
              "text": "Roles and responsibilities are defined as follows: CISO, IT Manager, System Admins..."
            }
          ]
        }
      ]
    },
    {
      "document_id": "d2",
      "document_name": "Beta Inc Access Procedures.pdf",
      "evaluations": [
        {
          "criteria_id": "c1",
          "section_id": "s1",
          "expected_value": "partial",
          "confidence": 0.75,
          "rationale": "Document addresses purpose and scope clearly but lacks explicit roles and responsibilities section. Management commitment is implied but not formally documented.",
          "citations": [
            {
              "page": 1,
              "text": "These procedures define how access control is implemented..."
            }
          ]
        }
      ]
    },
    {
      "document_id": "d3",
      "document_name": "Gamma LLC Draft Policy.pdf",
      "evaluations": [
        {
          "criteria_id": "c1",
          "section_id": "s1",
          "expected_value": "non-compliant",
          "confidence": 0.90,
          "rationale": "Document is incomplete draft with only high-level statements. Missing scope definition, roles/responsibilities, and management approval. Not suitable for compliance evaluation.",
          "citations": [
            {
              "page": 1,
              "text": "DRAFT - Not for Distribution. Access control will be implemented per industry standards..."
            }
          ]
        }
      ]
    }
  ]
}
```

### Example 2: Contract Evaluation (2 Proposals)

```json
{
  "run_id": "contract-eval-001",
  "workspace_id": "ws-456",
  "sections": [
    {
      "section_id": "s1",
      "section_name": "Technical Requirements",
      "criteria": [
        {
          "criteria_id": "c1",
          "criteria_text": "Vendor must provide 24/7 support with 1-hour response time",
          "expected_values": ["meets", "exceeds", "does-not-meet"]
        }
      ]
    }
  ],
  "documents": [
    {
      "document_id": "p1",
      "document_name": "Vendor A Proposal.pdf",
      "evaluations": [
        {
          "criteria_id": "c1",
          "section_id": "s1",
          "expected_value": "exceeds",
          "confidence": 1.0,
          "rationale": "Vendor commits to 24/7 support with 30-minute response time, exceeding the 1-hour requirement. SLA includes penalties for missed targets.",
          "citations": [
            {
              "page": 12,
              "text": "We provide 24/7/365 support with guaranteed 30-minute initial response time..."
            }
          ]
        }
      ]
    },
    {
      "document_id": "p2",
      "document_name": "Vendor B Proposal.pdf",
      "evaluations": [
        {
          "criteria_id": "c1",
          "section_id": "s1",
          "expected_value": "does-not-meet",
          "confidence": 0.85,
          "rationale": "Vendor offers 24/7 support but response time is 4 hours, which does not meet the 1-hour requirement. No expedited support option mentioned.",
          "citations": [
            {
              "page": 8,
              "text": "Our support team is available 24/7 with typical response times of 2-4 hours..."
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Validation & Error Handling

### Common Validation Errors

#### Error 1: Criteria ID Mismatch

**Error Message:**
```
Document 0 eval 3: Unknown criteria_id 'c999'
```

**Cause:** AI used a criteria_id that doesn't exist in the template.

**Fix:**
1. Check the template JSON for valid `criteria_id` values
2. Ensure AI used exact IDs (case-sensitive, UUID format)
3. Re-run AI evaluation with corrected template

#### Error 2: Invalid Expected Value

**Error Message:**
```
Document 0 eval 2: Invalid expected_value 'Compliant'. Must be one of: ['compliant', 'non-compliant', 'partial']
```

**Cause:** AI used a value not in the `expected_values` array (case-sensitive).

**Fix:**
1. Check the criterion's `expected_values` in template
2. Ensure AI uses exact values (case-sensitive)
3. Update AI prompt to emphasize exact value matching

#### Error 3: Duplicate Evaluations

**Error Message:**
```
Document 0: Duplicate evaluation for criteria c1 in section s1
```

**Cause:** Same criterion evaluated twice for the same document.

**Fix:**
1. Remove duplicate entries in the `evaluations` array
2. Ensure each criterion appears only once per document

#### Error 4: Confidence Out of Range

**Error Message:**
```
Document 0 eval 1: Confidence must be 0-1, got 95
```

**Cause:** Confidence score is not between 0.0 and 1.0 (likely percentage instead).

**Fix:**
1. Convert percentages to decimals (95% → 0.95)
2. Ensure AI outputs values between 0.0 and 1.0

### Validation Warnings (Non-Blocking)

#### Warning 1: Low Confidence

**Warning Message:**
```
Document 'Old Policy.pdf' has low confidence (<0.5) for 2 evaluations
```

**Meaning:** AI is uncertain about some evaluations.

**Action:**
- Review those evaluations manually
- Consider providing more context to AI
- Acceptable if document is genuinely ambiguous

#### Warning 2: Missing Citations

**Warning Message:**
```
Document 'Brief Memo.pdf' has no citations for 3 evaluations
```

**Meaning:** Rationales lack supporting quotes.

**Action:**
- Add citations if possible (increases credibility)
- Not required, but recommended for quality

---

## Best Practices

### 1. Document Selection

**Good Truth Set Documents:**
- ✅ Representative of real-world evaluation scenarios
- ✅ Variety of compliance levels (compliant, partial, non-compliant)
- ✅ Clear, well-written with extractable text
- ✅ 5-10 documents per truth set (minimum)

**Poor Truth Set Documents:**
- ❌ All compliant or all non-compliant (no variety)
- ❌ Scanned images without OCR
- ❌ Heavily redacted or incomplete
- ❌ Too few documents (< 3) for reliable patterns

### 2. AI Prompt Engineering

**Tips for Better AI Results:**

1. **Be Specific About Expected Values**
   ```
   Use ONLY these values: "compliant", "non-compliant", "partial"
   Do NOT use: "Compliant", "Yes", "No", "N/A", "Unknown"
   ```

2. **Provide Context**
   ```
   You are evaluating IT security policies against NIST 800-53 standards.
   Focus on whether the document addresses required control elements.
   ```

3. **Give Examples**
   ```
   Example compliant document: Addresses purpose, scope, roles, has management signature
   Example non-compliant: Missing scope, no roles defined, unsigned draft
   ```

4. **Request Structured Output**
   ```
   Return valid JSON. Each evaluation must have:
   - expected_value (from allowed list)
   - confidence (0.0 to 1.0)
   - rationale (2-4 sentences)
   - citations (with page numbers)
   ```

### 3. Quality Review

**Before Uploading, Verify:**

- ✅ All documents evaluated (check count)
- ✅ All criteria covered for each document
- ✅ Rationales are specific and evidence-based
- ✅ Citations reference actual document content
- ✅ Confidence scores reflect actual certainty
- ✅ Expected values match allowed options

**Red Flags (Review Manually):**
- ⚠️ Confidence < 0.6 (AI uncertain)
- ⚠️ Generic rationales ("Document addresses requirement")
- ⚠️ Missing citations
- ⚠️ All evaluations have same result (suspicious uniformity)

### 4. Iterative Improvement

**First Truth Set:**
- Start with 3-5 documents
- Test upload and validation
- Review AI quality

**Refine Process:**
- Adjust AI prompt based on results
- Add more specific instructions
- Provide example evaluations

**Expand Truth Set:**
- Add more documents once process is working
- Aim for 10-15 documents for production use
- Ensure variety in compliance levels

---

## Troubleshooting

### Problem: AI Returns Invalid JSON

**Symptoms:**
- Upload fails with "Invalid JSON syntax"
- Preview shows parsing errors

**Solutions:**
1. Copy AI output and validate with online JSON validator
2. Common issues: Missing commas, unclosed brackets, unescaped quotes
3. Ask AI to "validate JSON syntax before returning"
4. Use AI's "regenerate" feature with emphasis on valid JSON

### Problem: AI Doesn't Follow Template Structure

**Symptoms:**
- Missing required fields
- Wrong field names
- Incorrect nesting

**Solutions:**
1. Provide clearer template instructions in prompt
2. Show example of correct structure
3. Ask AI to "match the template structure exactly"
4. Manually correct minor deviations before upload

### Problem: Evaluations Are Too Generic

**Symptoms:**
- Rationales like "Document addresses requirement"
- No specific evidence or citations
- All confidence scores are 1.0

**Solutions:**
1. Ask AI to "provide specific evidence from the document"
2. Request "direct quotes with page numbers"
3. Emphasize "be honest about uncertainty - use lower confidence if ambiguous"
4. Provide example of good vs. poor rationale

### Problem: Upload Fails Validation

**Symptoms:**
- Preview shows validation errors
- Import button disabled

**Solutions:**
1. Read error messages carefully (they're specific)
2. Fix issues in JSON file
3. Re-upload and preview again
4. Contact support if error message is unclear

### Problem: AI Evaluation Disagrees with Manual Review

**Symptoms:**
- You review AI results and disagree with assessments
- Confidence is high but evaluation seems wrong

**Solutions:**
1. This is normal - AI is imperfect
2. Edit the JSON file manually to correct evaluations
3. Update AI prompt to provide better context
4. Consider this as "draft" and review all critical evaluations

---

## Productivity Metrics

### Expected Time Savings

| Task | Manual Method | AI-Assisted Method | Speedup |
|------|---------------|-------------------|---------|
| Single document (8 criteria) | 30-45 minutes | Included in batch (~1 min) | 30x |
| 5 documents (8 criteria each) | 2.5-4 hours | 5 minutes total | 30-48x |
| 10 documents (8 criteria each) | 5-8 hours | 8 minutes total | 37-60x |

### Quality Considerations

**AI Advantages:**
- ✅ Consistent evaluation approach
- ✅ No fatigue (evaluates 100 documents same as 1)
- ✅ Fast initial draft
- ✅ Good at finding explicit statements

**Human Advantages:**
- ✅ Better at nuanced interpretation
- ✅ Domain expertise and context
- ✅ Can read between the lines
- ✅ Final quality validation

**Best Practice:** Use AI for speed, human review for quality.

---

## Appendix: Advanced Topics

### Multi-Section Documents

If documents have multiple files or sections:
```json
{
  "documents": [
    {
      "document_id": "d1",
      "document_name": "ACME Policy Suite",
      "document_url": "s3://bucket/acme-suite/",
      "evaluations": [
        {
          "criteria_id": "c1",
          "rationale": "Evidence found across multiple policy documents...",
          "citations": [
            {"page": 1, "text": "From main policy: ..."},
            {"page": 5, "text": "From procedures doc: ..."}
          ]
        }
      ]
    }
  ]
}
```

### Automated Batch Processing

For large-scale truth set creation:
1. Create template per optimization run
2. Batch documents by domain (e.g., all IT policies)
3. Use AI API (not UI) for automation
4. Validate each batch before combining
5. Upload consolidated truth set

### Version Control

Track truth set versions:
```json
{
  "metadata": {
    "version": "2.1",
    "changelog": "Updated evaluations for AC-1 based on NIST 800-53 Rev 5",
    "previous_version": "2.0"
  }
}
```

---

## Support & Resources

**Documentation:**
- JSON Schema Reference: See S6 plan documentation
- API Documentation: See module-eval-studio API docs
- Validation Rules: See error messages in preview dialog

**Training Resources:**
- Video tutorial: [Coming Soon]
- Example truth sets: See `/docs/examples/` directory
- AI prompt library: See above templates

**Support Channels:**
- In-app feedback: Use "Report Issue" button
- Email: eval-studio-support@example.com
- Slack: #eval-studio-help

---

**Last Updated:** February 10, 2026  
**Document Version:** 1.0  
**Feedback:** Please report issues or suggestions to improve this guide.