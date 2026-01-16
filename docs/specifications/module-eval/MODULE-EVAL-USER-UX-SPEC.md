# Evaluation Module - User UX Specification

**Module Name:** module-eval  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-EVAL-SPEC.md](./MODULE-EVAL-SPEC.md)

---

## Table of Contents

1. [User Personas](#1-user-personas)
2. [Use Cases](#2-use-cases)
3. [User Journeys](#3-user-journeys)
4. [Page Specifications](#4-page-specifications)
5. [Component Library Usage](#5-component-library-usage)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Mobile Responsiveness](#7-mobile-responsiveness)
8. [Accessibility Requirements](#8-accessibility-requirements)
9. [Frontend Testing Requirements](#9-frontend-testing-requirements)

---

## 1. User Personas

### 1.1 Primary Persona: Compliance Analyst

**Role:** Compliance Analyst / Document Reviewer

**Goals:**
- Quickly evaluate documents against compliance criteria
- Get AI-assisted assessments with source citations
- Edit and finalize evaluation results
- Export reports for stakeholders

**Pain Points:**
- Manual document review is time-consuming
- Inconsistent evaluation across team members
- Difficulty finding specific passages that support decisions
- Report generation requires manual compilation

**Technical Proficiency:** Intermediate

**Frequency of Use:** Daily

**Context of Use:**
- **Device:** Desktop (primary), Tablet (occasional)
- **Location:** Office or Remote
- **Time constraints:** Medium (evaluations may take 10-30 minutes)

### 1.2 Secondary Persona: Team Lead

**Role:** Compliance Team Lead / Manager

**Goals:**
- Review team's evaluation work
- Ensure consistency in evaluations
- Monitor evaluation progress
- Generate reports for leadership

**Pain Points:**
- Difficulty tracking evaluation status across team
- Inconsistent quality in evaluations
- Time spent reviewing and correcting evaluations
- Manual report compilation

**Technical Proficiency:** Intermediate

**Frequency of Use:** Weekly

**Context of Use:**
- **Device:** Desktop
- **Location:** Office
- **Time constraints:** High (reviewing multiple evaluations)

### 1.3 Tertiary Persona: Occasional User

**Role:** Subject Matter Expert / Occasional Contributor

**Goals:**
- Upload documents for evaluation
- Review AI-generated assessments
- Provide expert input on specific criteria

**Pain Points:**
- Unfamiliar with evaluation process
- Limited time for detailed reviews
- Need clear guidance on required actions

**Technical Proficiency:** Novice to Intermediate

**Frequency of Use:** Monthly

**Context of Use:**
- **Device:** Desktop
- **Location:** Office or Remote
- **Time constraints:** Low (single document evaluations)

---

## 2. Use Cases

### 2.1 Use Case: Create New Evaluation

**Actor:** Compliance Analyst

**Preconditions:**
- User is logged in and member of workspace
- At least one document type exists
- At least one criteria set exists for the document type
- User has documents to evaluate

**Main Flow:**
1. User navigates to Evaluations page (`/eval`)
2. User clicks "New Evaluation" button
3. System displays evaluation creation form
4. User selects document type from dropdown
5. System displays available criteria sets for that type
6. User selects criteria set
7. User uploads primary document (drag & drop or file picker)
8. User optionally uploads supporting documents
9. User enters evaluation name
10. User clicks "Start Evaluation"
11. System validates inputs
12. System creates evaluation record (status: pending)
13. System uploads documents to KB (if new)
14. System queues evaluation for processing
15. System navigates to evaluation detail page
16. System shows processing progress

**Alternative Flows:**
- **7a. Document already in KB:**
  - User selects from existing KB documents
  - Skip upload step

- **11a. Validation error:**
  - System displays error messages
  - User corrects input
  - Resume at step 10

- **14a. Processing queue full:**
  - System warns about potential delay
  - Evaluation still created and queued

**Postconditions:**
- Evaluation is created with pending status
- Documents are in KB
- Processing is queued
- User can track progress

**Frequency:** High (primary action)

**Business Value:** High

---

### 2.2 Use Case: View Evaluation Results

**Actor:** Compliance Analyst

**Preconditions:**
- Evaluation exists and is completed
- User has access to the workspace

**Main Flow:**
1. User navigates to Evaluations page
2. User clicks on completed evaluation
3. System displays evaluation detail page
4. User views:
   - Document summary
   - Overall compliance score
   - Evaluation summary
   - Criteria results table
5. User clicks on a criteria result
6. System expands result showing:
   - AI assessment text
   - Status badge
   - Confidence score
   - Citations with document excerpts
7. User reviews citation
8. User clicks citation to view source

**Alternative Flows:**
- **4a. Evaluation still processing:**
  - System shows progress indicator
  - User can refresh or wait
  
- **6a. No citations available:**
  - System shows "No citations" message
  - AI explanation still visible

**Postconditions:**
- User has reviewed evaluation results
- No changes made

---

### 2.3 Use Case: Edit Evaluation Result

**Actor:** Compliance Analyst

**Preconditions:**
- Evaluation is completed
- User has edit permissions

**Main Flow:**
1. User views evaluation detail page
2. User clicks "Edit" on a criteria result
3. System displays edit dialog
4. Dialog shows:
   - Original AI assessment (read-only)
   - Editable narrative field (pre-filled with AI text)
   - Status dropdown (pre-selected with AI choice)
   - Notes field (empty)
5. User modifies narrative text
6. User changes status if needed
7. User adds notes explaining changes
8. User clicks "Save Changes"
9. System creates new edit version
10. System updates display to show edited result
11. System shows edit indicator on result

**Alternative Flows:**
- **5a. Revert to AI original:**
  - User clicks "Use AI Original"
  - Fields reset to AI values
  
- **8a. Cancel edit:**
  - User clicks "Cancel"
  - No changes saved
  - Dialog closes

**Postconditions:**
- Edit is saved with version history
- Original AI result preserved
- Result shows edited values

---

### 2.4 Use Case: Export Evaluation Report

**Actor:** Compliance Analyst / Team Lead

**Preconditions:**
- Evaluation is completed
- User has export permissions

**Main Flow:**
1. User views evaluation detail page
2. User clicks "Export" button
3. System displays export options:
   - PDF Report
   - Excel Spreadsheet (XLSX)
4. User selects export format
5. System generates export file
6. System provides download link
7. User downloads file

**Alternative Flows:**
- **5a. Large evaluation:**
  - System shows "Generating..." message
  - File ready notification when complete
  
- **6a. Generation error:**
  - System shows error message
  - User can retry

**Export Contents (PDF):**
- Cover page with evaluation metadata
- Executive summary
- Document summary
- Criteria results table with status colors
- Citations appendix

**Export Contents (XLSX):**
- Sheet 1: Summary
- Sheet 2: Criteria Results (one row per criterion)
- Sheet 3: Citations

**Postconditions:**
- Export file downloaded
- No changes to evaluation

---

### 2.5 Use Case: Monitor Evaluation Progress

**Actor:** Compliance Analyst

**Preconditions:**
- Evaluation is processing
- User has access to workspace

**Main Flow:**
1. User navigates to Evaluations page
2. User sees evaluation with "Processing" status
3. User clicks on evaluation
4. System displays progress page:
   - Progress bar (0-100%)
   - Current step indicator
   - Estimated time remaining
   - Cancel button
5. System updates progress automatically (polling)
6. When complete:
   - System shows completion notification
   - Progress page transitions to results view

**Progress Steps:**
- 0-10%: Generating document summaries
- 10-90%: Evaluating criteria (shows X of Y)
- 90-100%: Generating evaluation summary

**Alternative Flows:**
- **5a. User cancels evaluation:**
  - System prompts for confirmation
  - System cancels processing
  - Evaluation marked as cancelled
  
- **6a. Processing fails:**
  - System shows error message
  - User can retry or contact support

**Postconditions:**
- User has visibility into processing status

---

### 2.6 Use Case: View Edit History

**Actor:** Team Lead / Compliance Analyst

**Preconditions:**
- Evaluation result has been edited
- User has access to workspace

**Main Flow:**
1. User views evaluation detail page
2. User clicks on result with edit indicator
3. User clicks "View History"
4. System displays edit history dialog:
   - List of versions (newest first)
   - For each version:
     - Editor name
     - Timestamp
     - Changes made (diff)
5. User can click version to view full details
6. User closes dialog

**Alternative Flows:**
- **3a. No edits made:**
  - "View History" not shown
  - Only AI original visible

**Postconditions:**
- User has reviewed edit history
- No changes made

---

## 3. User Journeys

### 3.1 Journey: First-Time Evaluation

**Scenario:** New user creates their first document evaluation

**Steps:**

1. **Discover Feature**
   - Entry: Left navigation "Evaluations" link
   - Visual: Icon with evaluation/checklist imagery
   - Action: Click to navigate to `/eval`

2. **View Empty State**
   - View: Empty evaluations list
   - Content: "Get started by creating your first evaluation"
   - Visual: Illustration showing evaluation process
   - CTA: Prominent "New Evaluation" button

3. **Create Evaluation**
   - View: Multi-step creation form
   - Step 1: Select document type
   - Step 2: Select criteria set
   - Step 3: Upload documents
   - Step 4: Review and start
   - Help: Tooltips explain each step

4. **Monitor Progress**
   - View: Progress page with real-time updates
   - Feedback: Progress bar, step indicator
   - Wait time: Typically 30-120 seconds
   - Action: Can navigate away, evaluation continues

5. **Review Results**
   - View: Completed evaluation with all results
   - Discovery: Expandable criteria results
   - Learning: Citations show how AI made decisions
   - Next: Can edit results or export

**Journey Map:**

```
Discover → Empty State → Create → Progress → Results
  (Nav)      (List)      (Form)   (Wait)    (Detail)
```

**Pain Points:**
- May not understand document types
- Criteria set selection could be confusing
- Progress wait may feel long

**Solutions:**
- Clear labels and descriptions for doc types
- Show criteria count and preview
- Progress updates with time estimates

---

### 3.2 Journey: Power User Evaluating Multiple Documents

**Scenario:** Experienced user evaluating batch of similar documents

**Steps:**

1. **Quick Navigation**
   - Entry: Direct to `/eval` from bookmarks/recent
   - Efficiency: Recent evaluations shown first
   - Speed: Familiar with interface

2. **Rapid Creation**
   - Pattern: Same doc type, same criteria set
   - Efficiency: Selections remembered from last time
   - Upload: Multiple documents queued

3. **Parallel Monitoring**
   - View: Multiple evaluations in progress
   - Status: At-a-glance status indicators
   - Efficiency: Work on other tasks while processing

4. **Batch Review**
   - Pattern: Review each completed evaluation
   - Efficiency: Quick scan of scores
   - Focus: Only edit where needed

5. **Bulk Export**
   - Action: Export multiple evaluations
   - Format: Consistent PDF/XLSX

**Journey Map:**

```
Quick Nav → Rapid Create → Monitor Multiple → Batch Review → Export
```

---

### 3.3 Journey: Editing AI Results

**Scenario:** User reviews AI assessment and makes corrections

**Steps:**

1. **Review AI Assessment**
   - View: Criteria result with AI explanation
   - Evaluate: Is this accurate?
   - Check: Review citations for context

2. **Identify Discrepancy**
   - Finding: AI missed nuance in document
   - Decision: Need to adjust status/narrative

3. **Open Edit Dialog**
   - Action: Click "Edit" button
   - View: Side-by-side AI original and edit form

4. **Make Changes**
   - Narrative: Modify explanation text
   - Status: Select correct status
   - Notes: Document reason for change

5. **Save and Verify**
   - Action: Save changes
   - Feedback: Edit indicator on result
   - Verify: Changes reflected immediately

**Journey Map:**

```
Review → Identify Issue → Open Edit → Make Changes → Save
```

---

## 4. Page Specifications

### 4.1 Page: Evaluation List

**Route:** `/eval`

**Purpose:** Display all evaluations in workspace with status and filtering

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Workspace > Evaluations                              │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Evaluations                          [+ New Evaluation]        │
├─────────────────────────────────────────────────────────────────┤
│ Filters & Search:                                                │
│   [Search...]  [Status ▼]  [Doc Type ▼]  [Date Range ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ IT Security Policy Evaluation          🟢 Completed       │   │
│ │ Created: Jan 15, 2026 by John Doe                        │   │
│ │ Doc Type: IT Security Policy | Criteria: NIST 800-53     │   │
│ │ Score: 87%                             [View] [Export]   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Vendor Risk Assessment Q1              🔄 Processing 45%  │   │
│ │ Created: Jan 15, 2026 by Jane Smith                      │   │
│ │ Doc Type: Vendor Assessment | Criteria: Standard Check   │   │
│ │                                               [View]     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Business Continuity Review             ⏳ Pending         │   │
│ │ Created: Jan 14, 2026 by John Doe                        │   │
│ │ Doc Type: BCP | Criteria: ISO 22301                      │   │
│ │                                               [View]     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Pagination: ← 1 2 3 ... 10 →                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**

| Component | Library | Props | Notes |
|-----------|---------|-------|-------|
| Breadcrumb | MUI | links, currentPage | Standard pattern |
| PageHeader | Custom | title, actions | With "New Evaluation" button |
| SearchBar | MUI TextField | value, onChange | Debounced 300ms |
| FilterSelect | MUI Select | options, value | Multiple filters |
| EvalCard | Custom | evaluation, onView | Status-aware styling |
| Pagination | MUI | page, totalPages | Standard pagination |

**States:**

- **Loading**: Skeleton cards
- **Empty**: Empty state with "Create first evaluation" CTA
- **Error**: Error alert with retry button
- **Loaded**: Evaluation cards with status indicators

**Status Indicators:**

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| Pending | ⏳ | Gray | Waiting to process |
| Processing | 🔄 | Blue | Currently evaluating |
| Completed | 🟢 | Green | Ready to view |
| Failed | 🔴 | Red | Processing failed |

**Mobile Behavior:**
- Stack filters vertically
- Single column card layout
- Bottom-anchored "New" button

---

### 4.2 Page: New Evaluation (Creation Flow)

**Route:** `/eval/new`

**Purpose:** Multi-step form to create new evaluation

**Layout - Step 1: Select Type:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Evaluations > New Evaluation                         │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Create New Evaluation                                          │
│   Step 1 of 4: Select Document Type                              │
├─────────────────────────────────────────────────────────────────┤
│ Progress: [●───────]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ What type of document are you evaluating?                        │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐     │
│ │ ○ IT Security Policy                                    │     │
│ │   Annual IT security policy documents                   │     │
│ │   3 criteria sets available                             │     │
│ ├─────────────────────────────────────────────────────────┤     │
│ │ ○ Business Continuity Plan                              │     │
│ │   Business continuity and disaster recovery             │     │
│ │   1 criteria set available                              │     │
│ ├─────────────────────────────────────────────────────────┤     │
│ │ ○ Vendor Risk Assessment                                │     │
│ │   Third-party vendor risk evaluations                   │     │
│ │   2 criteria sets available                             │     │
│ └─────────────────────────────────────────────────────────┘     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                        [Cancel]  [Next →]        │
└─────────────────────────────────────────────────────────────────┘
```

**Layout - Step 2: Select Criteria:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 2 of 4: Select Criteria Set                                 │
├─────────────────────────────────────────────────────────────────┤
│ Progress: [●●──────]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Select a criteria set for IT Security Policy:                    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────┐     │
│ │ ○ NIST 800-53 Controls v1.0                            │     │
│ │   Federal security controls for information systems     │     │
│ │   45 criteria items | 8 categories                      │     │
│ │   [Preview Criteria]                                    │     │
│ ├─────────────────────────────────────────────────────────┤     │
│ │ ○ ISO 27001 Checklist v2.0                             │     │
│ │   International security management standard            │     │
│ │   120 criteria items | 14 categories                    │     │
│ │   [Preview Criteria]                                    │     │
│ └─────────────────────────────────────────────────────────┘     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                               [← Back]  [Cancel]  [Next →]       │
└─────────────────────────────────────────────────────────────────┘
```

**Layout - Step 3: Upload Documents:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 3 of 4: Upload Documents                                    │
├─────────────────────────────────────────────────────────────────┤
│ Progress: [●●●─────]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Primary Document *                                               │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │         📁 Drop file here or click to browse              │   │
│ │                                                           │   │
│ │         Supported: PDF, DOCX, TXT                         │   │
│ │         Max size: 50MB                                    │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Supporting Documents (Optional)                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Add diagrams, screenshots, or additional context          │   │
│ │                                                           │   │
│ │         📁 Drop files here or click to browse             │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ -or- Select from Knowledge Base:                                 │
│ [Search KB documents...]                                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                               [← Back]  [Cancel]  [Next →]       │
└─────────────────────────────────────────────────────────────────┘
```

**Layout - Step 4: Review & Start:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 4 of 4: Review & Start                                      │
├─────────────────────────────────────────────────────────────────┤
│ Progress: [●●●●────]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Evaluation Name *                                                │
│ [IT Security Policy - January 2026                    ]          │
│                                                                  │
│ Summary:                                                         │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Document Type: IT Security Policy                         │   │
│ │ Criteria Set:  NIST 800-53 Controls v1.0 (45 items)      │   │
│ │                                                           │   │
│ │ Documents:                                                │   │
│ │   📄 IT-Security-Policy-2026.pdf (Primary)               │   │
│ │   📄 Network-Diagram.png                                 │   │
│ │   📄 Security-Audit-Report.pdf                           │   │
│ │                                                           │   │
│ │ Estimated processing time: 2-5 minutes                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                     [← Back]  [Cancel]  [Start Evaluation]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.3 Page: Evaluation Detail (Results)

**Route:** `/eval/[id]`

**Purpose:** Display completed evaluation with full results

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Evaluations > IT Security Policy - Jan 2026          │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   IT Security Policy - January 2026         🟢 Completed         │
│   Created: Jan 15, 2026 by John Doe                              │
│                                     [Export ▼]  [⚙️ Options]     │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Criteria Results] [Documents] [History]       │
├─────────────────────────────────────────────────────────────────┤
│ Overview Tab:                                                    │
│                                                                  │
│ ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│ │ Compliance Score        │  │ Status Distribution          │   │
│ │                         │  │                              │   │
│ │      ┌─────┐           │  │  🟢 Compliant:      32 (71%) │   │
│ │      │ 87% │           │  │  🟡 Partial:        8  (18%) │   │
│ │      └─────┘           │  │  🔴 Non-Compliant:  5  (11%) │   │
│ │                         │  │                              │   │
│ └─────────────────────────┘  └─────────────────────────────┘   │
│                                                                  │
│ Document Summary                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ This IT Security Policy document establishes the          │   │
│ │ organization's approach to information security,          │   │
│ │ including access controls, data protection, and...        │   │
│ │ [Read More]                                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Evaluation Summary                                               │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Overall, the policy demonstrates strong compliance with   │   │
│ │ NIST 800-53 controls. Key strengths include comprehensive │   │
│ │ access control procedures and audit logging. Areas for    │   │
│ │ improvement include incident response documentation...    │   │
│ │ [Read More]                                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Layout - Criteria Results Tab:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Criteria Results Tab:                                            │
│                                                                  │
│ Filter: [All Statuses ▼]  [All Categories ▼]  [Search...]       │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ▼ Access Control (8 criteria)                             │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │                                                           │   │
│ │ AC-1: Access Control Policy                 🟢 Compliant  │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ The organization has established a comprehensive    │  │   │
│ │ │ access control policy that defines user roles,      │  │   │
│ │ │ permissions, and authentication requirements...     │  │   │
│ │ │                                                     │  │   │
│ │ │ Confidence: 95%                                     │  │   │
│ │ │                                                     │  │   │
│ │ │ Citations:                                          │  │   │
│ │ │ ┌─────────────────────────────────────────────────┐│  │   │
│ │ │ │ 📄 IT-Security-Policy.pdf, Page 12             ││  │   │
│ │ │ │ "Access to information systems shall be        ││  │   │
│ │ │ │ restricted to authorized personnel only..."    ││  │   │
│ │ │ └─────────────────────────────────────────────────┘│  │   │
│ │ │                                                     │  │   │
│ │ │ [Edit]                                              │  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ │                                                           │   │
│ │ AC-2: Account Management              🟡 Partial [✏️]    │   │
│ │ [Click to expand]                                         │   │
│ │                                                           │   │
│ │ AC-3: Access Enforcement              🟢 Compliant        │   │
│ │ [Click to expand]                                         │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ▶ Audit & Accountability (6 criteria)                     │   │
│ │ [Click to expand category]                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Legend:**
- ✏️ = Has been edited (human override)
- [Edit] = Opens edit dialog

---

### 4.4 Page: Evaluation Progress

**Route:** `/eval/[id]` (when status = processing)

**Purpose:** Display real-time processing progress

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Evaluations > IT Security Policy - Jan 2026          │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   IT Security Policy - January 2026         🔄 Processing        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                      Processing Evaluation                       │
│                                                                  │
│               ┌────────────────────────────────┐                │
│               │████████████████░░░░░░░░░░░░░░░░│ 67%            │
│               └────────────────────────────────┘                │
│                                                                  │
│               Current Step: Evaluating Criteria                  │
│               Progress: 30 of 45 criteria items                  │
│               Estimated time remaining: ~45 seconds              │
│                                                                  │
│               ┌───────────────────────────────────────┐         │
│               │ ✅ Document summaries generated        │         │
│               │ 🔄 Evaluating criteria items...       │         │
│               │ ⏳ Generate evaluation summary         │         │
│               └───────────────────────────────────────┘         │
│                                                                  │
│                         [Cancel Evaluation]                      │
│                                                                  │
│ ℹ️ You can navigate away. We'll notify you when complete.        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.5 Dialog: Edit Result

**Component:** Modal dialog for editing criteria results

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Edit Evaluation Result                                   [X]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Criteria: AC-2 Account Management                                │
│                                                                  │
│ Original AI Assessment                                           │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Status: 🟡 Partial | Confidence: 78%                       │   │
│ │                                                           │   │
│ │ The policy includes basic account management procedures   │   │
│ │ but lacks specific timelines for account reviews and      │   │
│ │ deprovisioning procedures...                              │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Your Assessment                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Status                                                    │   │
│ │ [🟢 Compliant ▼]                                          │   │
│ │                                                           │   │
│ │ Narrative *                                               │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ While the AI flagged this as partial compliance,    │  │   │
│ │ │ after manual review of Section 4.3, the policy      │  │   │
│ │ │ does include specific 90-day review cycles and      │  │   │
│ │ │ termination procedures in the appendix...           │  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ │                                                           │   │
│ │ Edit Notes (why are you making this change?)             │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ AI missed Appendix B which contains detailed        │  │   │
│ │ │ account lifecycle procedures.                       │  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Use AI Original]              [Cancel]  [Save Changes]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Library Usage

### 5.1 Core Components

**Material-UI Components:**

```typescript
import {
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Alert,
  Skeleton,
  Chip,
  Breadcrumbs,
  Link,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Tooltip
} from '@mui/material';
```

**Icons:**

```typescript
import {
  Add as AddIcon,
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Description as DocumentIcon,
  FormatQuote as CitationIcon
} from '@mui/icons-material';
```

### 5.2 Custom Components

**EvalCard:**

```typescript
interface EvalCardProps {
  evaluation: EvalDocSummary;
  onView: (id: string) => void;
  onExport?: (id: string) => void;
}

export function EvalCard({ evaluation, onView, onExport }: EvalCardProps) {
  const statusConfig = getStatusConfig(evaluation.status);
  
  return (
    <Card onClick={() => onView(evaluation.id)}>
      <CardContent>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="h6">{evaluation.name}</Typography>
          <Chip 
            icon={statusConfig.icon}
            label={statusConfig.label}
            color={statusConfig.color}
            size="small"
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Created: {formatDate(evaluation.createdAt)} by {evaluation.createdBy}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Doc Type: {evaluation.docTypeName} | Criteria: {evaluation.criteriaSetName}
        </Typography>
        {evaluation.complianceScore && (
          <Typography variant="h6" color="primary">
            Score: {evaluation.complianceScore}%
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
```

**CriteriaResultItem:**

```typescript
interface CriteriaResultItemProps {
  result: EvalCriteriaResult;
  statusOptions: EvalStatusOption[];
  onEdit: (resultId: string) => void;
}

export function CriteriaResultItem({ result, statusOptions, onEdit }: CriteriaResultItemProps) {
  const [expanded, setExpanded] = useState(false);
  const status = statusOptions.find(s => s.id === (result.editedStatusId || result.aiStatusId));
  
  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" width="100%">
          <Typography sx={{ flex: 1 }}>
            {result.criteriaId}: {result.criteriaRequirement}
          </Typography>
          <Chip
            label={status?.name}
            sx={{ backgroundColor: status?.color, color: 'white' }}
            size="small"
          />
          {result.editedStatusId && (
            <Tooltip title="Human edited">
              <EditIcon fontSize="small" sx={{ ml: 1 }} />
            </Tooltip>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" gutterBottom>
          {result.editedResult || result.aiResult}
        </Typography>
        
        {result.aiCitations?.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>Citations:</Typography>
            {result.aiCitations.map((citation, idx) => (
              <CitationCard key={idx} citation={citation} />
            ))}
          </Box>
        )}
        
        <Box mt={2}>
          <Button startIcon={<EditIcon />} onClick={() => onEdit(result.id)}>
            Edit
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
```

**CitationCard:**

```typescript
interface CitationCardProps {
  citation: EvalCitation;
}

export function CitationCard({ citation }: CitationCardProps) {
  return (
    <Card variant="outlined" sx={{ mb: 1, p: 1.5 }}>
      <Box display="flex" alignItems="center" gap={1}>
        <DocumentIcon fontSize="small" color="action" />
        <Typography variant="caption">
          {citation.docName}, Page {citation.page}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', pl: 2 }}>
        "{citation.text}"
      </Typography>
    </Card>
  );
}
```

---

## 6. Interaction Patterns

### 6.1 Evaluation Creation Flow

```typescript
function NewEvaluationForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    docTypeId: '',
    criteriaSetId: '',
    primaryDocId: '',
    supportingDocIds: [],
    name: ''
  });
  
  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };
  
  const handleSubmit = async () => {
    const api = createEvalApi(client);
    const evaluation = await api.createEvaluation(formData);
    router.push(`/eval/${evaluation.id}`);
  };
  
  return (
    <Box>
      <Stepper activeStep={step - 1}>
        <Step><StepLabel>Document Type</StepLabel></Step>
        <Step><StepLabel>Criteria Set</StepLabel></Step>
        <Step><StepLabel>Documents</StepLabel></Step>
        <Step><StepLabel>Review</StepLabel></Step>
      </Stepper>
      
      {step === 1 && <DocTypeSelector value={formData.docTypeId} onChange={...} />}
      {step === 2 && <CriteriaSetSelector docTypeId={formData.docTypeId} value={...} />}
      {step === 3 && <DocumentUploader onUpload={...} />}
      {step === 4 && <ReviewSummary formData={formData} onSubmit={handleSubmit} />}
      
      <Box display="flex" justifyContent="space-between" mt={3}>
        {step > 1 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 4 && <Button onClick={handleNext}>Next</Button>}
      </Box>
    </Box>
  );
}
```

### 6.2 Progress Polling

```typescript
function useEvalProgress(evalId: string) {
  const [progress, setProgress] = useState<EvalProgress | null>(null);
  
  useEffect(() => {
    if (!evalId) return;
    
    const poll = async () => {
      const api = createEvalApi(client);
      const status = await api.getEvaluationStatus(evalId);
      setProgress(status);
      
      if (status.status === 'processing') {
        setTimeout(poll, 2000); // Poll every 2 seconds
      }
    };
    
    poll();
  }, [evalId]);
  
  return progress;
}
```

### 6.3 Edit Result Pattern

```typescript
function EditResultDialog({ result, open, onClose, onSave }) {
  const [editedResult, setEditedResult] = useState(result.editedResult || result.aiResult);
  const [editedStatusId, setEditedStatusId] = useState(result.editedStatusId || result.aiStatusId);
  const [editNotes, setEditNotes] = useState('');
  
  const handleSave = async () => {
    const api = createEvalApi(client);
    await api.editCriteriaResult(result.id, {
      editedResult,
      editedStatusId,
      editNotes
    });
    onSave();
    onClose();
  };
  
  const handleResetToAI = () => {
    setEditedResult(result.aiResult);
    setEditedStatusId(result.aiStatusId);
    setEditNotes('');
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Evaluation Result</DialogTitle>
      <DialogContent>
        {/* Original AI assessment (read-only) */}
        <Box mb={3} p={2} bgcolor="grey.100" borderRadius={1}>
          <Typography variant="subtitle2">Original AI Assessment</Typography>
          <Typography variant="body2">{result.aiResult}</Typography>
        </Box>
        
        {/* Edit form */}
        <StatusSelect value={editedStatusId} onChange={setEditedStatusId} />
        <TextField
          label="Narrative"
          multiline
          rows={4}
          value={editedResult}
          onChange={(e) => setEditedResult(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Edit Notes"
          multiline
          rows={2}
          value={editNotes}
          onChange={(e) => setEditNotes(e.target.value)}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleResetToAI}>Use AI Original</Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## 7. Mobile Responsiveness

### 7.1 Breakpoints

```typescript
// Standard MUI breakpoints
xs: 0      // Mobile portrait
sm: 600    // Mobile landscape / Small tablet
md: 900    // Tablet
lg: 1200   // Desktop
xl: 1536   // Large desktop
```

### 7.2 Responsive Layouts

**Evaluation List:**
- **Desktop (≥900px)**: Full card with all details
- **Tablet (600-899px)**: Condensed cards
- **Mobile (<600px)**: Single column, simplified cards

**Evaluation Detail:**
- **Desktop**: Side-by-side panels (summary + results)
- **Tablet/Mobile**: Stacked panels with tabs

**Creation Flow:**
- **Desktop**: Horizontal stepper
- **Mobile**: Vertical stepper with current step visible

### 7.3 Mobile-Specific Adaptations

```typescript
// Example: Responsive evaluation card
<Card>
  <CardContent>
    <Box 
      display="flex" 
      flexDirection={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
    >
      <Typography variant="h6">{evaluation.name}</Typography>
      <Chip label={status} sx={{ mt: { xs: 1, sm: 0 } }} />
    </Box>
    
    <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
      Created: {formatDate(evaluation.createdAt)}
    </Typography>
    
    <Box 
      display="flex" 
      gap={1} 
      mt={2}
      flexDirection={{ xs: 'column', sm: 'row' }}
    >
      <Button fullWidth={{ xs: true, sm: false }}>View</Button>
      <Button fullWidth={{ xs: true, sm: false }}>Export</Button>
    </Box>
  </CardContent>
</Card>
```

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Required Standards:**

- ✅ **Perceivable**
  - Status colors have text labels (not color-only)
  - Citations have clear text alternatives
  - Progress indicated by text, not just visual
  
- ✅ **Operable**
  - All interactions keyboard accessible
  - Skip links for long criteria lists
  - Focus management in dialogs
  
- ✅ **Understandable**
  - Clear form labels and error messages
  - Consistent navigation patterns
  - Help text for complex fields
  
- ✅ **Robust**
  - Valid HTML structure
  - ARIA attributes for dynamic content
  - Screen reader announcements for progress

### 8.2 Specific Implementations

**Status with Color and Text:**

```typescript
<Chip
  label={status.name}
  sx={{ backgroundColor: status.color }}
  aria-label={`Status: ${status.name}, Score: ${status.scoreValue}`}
/>
```

**Progress Announcements:**

```typescript
<Box role="status" aria-live="polite">
  Processing evaluation: {progress}% complete. 
  {currentStep}
</Box>
```

**Citation Accessibility:**

```typescript
<Card 
  role="region" 
  aria-label={`Citation from ${citation.docName}, page ${citation.page}`}
>
  <blockquote>
    <Typography>{citation.text}</Typography>
  </blockquote>
  <cite>{citation.docName}, Page {citation.page}</cite>
</Card>
```

**Keyboard Navigation:**

```typescript
// Criteria result expansion
<Accordion
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setExpanded(!expanded);
    }
  }}
>
```

---

## 9. Frontend Testing Requirements

### 9.1 Component Tests

```typescript
describe('EvalCard', () => {
  it('displays evaluation name and status', () => {
    const evaluation = mockEvaluation({ status: 'completed', complianceScore: 87 });
    render(<EvalCard evaluation={evaluation} onView={jest.fn()} />);
    
    expect(screen.getByText(evaluation.name)).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });
  
  it('shows processing indicator when processing', () => {
    const evaluation = mockEvaluation({ status: 'processing', progress: 45 });
    render(<EvalCard evaluation={evaluation} onView={jest.fn()} />);
    
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });
  
  it('calls onView when clicked', async () => {
    const onView = jest.fn();
    const evaluation = mockEvaluation();
    render(<EvalCard evaluation={evaluation} onView={onView} />);
    
    await userEvent.click(screen.getByRole('article'));
    expect(onView).toHaveBeenCalledWith(evaluation.id);
  });
});
```

### 9.2 User Flow Tests

```typescript
describe('Create Evaluation Flow', () => {
  it('completes full creation workflow', async () => {
    render(<NewEvaluationPage />);
    
    // Step 1: Select document type
    await userEvent.click(screen.getByText('IT Security Policy'));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 2: Select criteria set
    await userEvent.click(screen.getByText('NIST 800-53'));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 3: Upload document
    const file = new File(['content'], 'policy.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/upload/i);
    await userEvent.upload(input, file);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    
    // Step 4: Review and submit
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Evaluation');
    await userEvent.click(screen.getByRole('button', { name: /start evaluation/i }));
    
    // Verify navigation to detail page
    await waitFor(() => {
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });
});
```

### 9.3 Edit Result Tests

```typescript
describe('Edit Evaluation Result', () => {
  it('saves edited result', async () => {
    const result = mockCriteriaResult({ aiResult: 'Original AI text' });
    const onSave = jest.fn();
    
    render(<EditResultDialog result={result} open={true} onClose={jest.fn()} onSave={onSave} />);
    
    // Modify narrative
    const narrative = screen.getByLabelText(/narrative/i);
    await userEvent.clear(narrative);
    await userEvent.type(narrative, 'Updated assessment');
    
    // Change status
    await userEvent.click(screen.getByLabelText(/status/i));
    await userEvent.click(screen.getByText('Compliant'));
    
    // Add notes
    await userEvent.type(screen.getByLabelText(/notes/i), 'Reason for change');
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(onSave).toHaveBeenCalled();
  });
  
  it('resets to AI original when button clicked', async () => {
    const result = mockCriteriaResult({ aiResult: 'Original AI text' });
    
    render(<EditResultDialog result={result} open={true} onClose={jest.fn()} onSave={jest.fn()} />);
    
    // Modify narrative
    const narrative = screen.getByLabelText(/narrative/i);
    await userEvent.clear(narrative);
    await userEvent.type(narrative, 'Modified text');
    
    // Reset
    await userEvent.click(screen.getByRole('button', { name: /use ai original/i }));
    
    expect(narrative).toHaveValue('Original AI text');
  });
});
```

### 9.4 Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('evaluation list has no violations', async () => {
    const { container } = render(<EvaluationListPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('evaluation detail has no violations', async () => {
    const { container } = render(<EvaluationDetailPage evalId="test-id" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('edit dialog has no violations', async () => {
    const { container } = render(
      <EditResultDialog result={mockCriteriaResult()} open={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 9.5 Test Coverage Requirements

- **Component Coverage:** ≥80%
- **User Flow Coverage:** 100% of critical paths
- **Accessibility:** 100% of interactive elements
- **Responsive:** Test at xs, sm, md breakpoints

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
