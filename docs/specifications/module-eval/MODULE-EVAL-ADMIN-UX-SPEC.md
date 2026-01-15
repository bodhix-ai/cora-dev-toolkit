# Evaluation Module - Admin UX Specification

**Module Name:** module-eval  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 15, 2026  
**Last Updated:** January 15, 2026

**Parent Specification:** [MODULE-EVAL-SPEC.md](./MODULE-EVAL-SPEC.md)

---

## Table of Contents

1. [Admin Personas](#1-admin-personas)
2. [Admin Use Cases](#2-admin-use-cases)
3. [Admin Configuration Flows](#3-admin-configuration-flows)
4. [Platform Admin UI](#4-platform-admin-ui)
5. [Organization Admin UI](#5-organization-admin-ui)
6. [Admin Card Design](#6-admin-card-design)
7. [Monitoring & Analytics](#7-monitoring--analytics)
8. [Admin Testing Requirements](#8-admin-testing-requirements)

---

## 1. Admin Personas

### 1.1 Platform Admin (Sys Admin)

**Role:** Platform Owner / Platform Admin

**Responsibilities:**
- Configure platform-wide evaluation defaults
- Enable/disable AI configuration delegation per organization
- Manage default status options for all organizations
- Configure default prompts and AI models for evaluation
- Monitor evaluation usage across all organizations
- View analytics and identify issues

**Access Level:** Full access to all organizations and settings

**Goals:**
- Ensure consistent evaluation quality across platform
- Control which organizations can customize AI settings
- Set sensible defaults that work for most use cases
- Monitor for AI cost overruns or processing issues

**Technical Proficiency:** Advanced

**Key Decisions:**
- Which organizations get AI configuration delegation
- Default scoring mode (boolean vs detailed)
- Default prompts that balance quality and cost
- Token limits and model selections

### 1.2 Organization Admin (Delegated)

**Role:** Organization Owner / Organization Admin with AI delegation enabled

**Responsibilities:**
- Configure organization-specific evaluation settings
- Customize AI prompts and model selections
- Manage document types for the organization
- Import and manage criteria sets
- Configure custom status options
- Monitor organization evaluation usage

**Access Level:** Organization-scoped with full AI configuration

**Goals:**
- Optimize evaluations for organization's specific documents
- Customize prompts for domain-specific language
- Select AI models that balance cost and quality
- Define document types and criteria sets for team

**Technical Proficiency:** Intermediate to Advanced

**Special Access:**
- ✅ Scoring configuration
- ✅ Status options management
- ✅ AI prompt customization
- ✅ AI model selection
- ✅ Document types & criteria

### 1.3 Organization Admin (Not Delegated)

**Role:** Organization Owner / Organization Admin without AI delegation

**Responsibilities:**
- Configure organization-specific display settings
- Manage custom status options
- Manage document types and criteria sets
- Monitor organization evaluation usage

**Access Level:** Organization-scoped without AI configuration

**Goals:**
- Configure scoring display for organization needs
- Define document types and criteria for team
- Review evaluation results and usage

**Technical Proficiency:** Intermediate

**Special Access:**
- ✅ Scoring display configuration
- ✅ Status options management
- ❌ AI prompt customization (uses platform defaults)
- ❌ AI model selection (uses platform defaults)
- ✅ Document types & criteria

---

## 2. Admin Use Cases

### 2.1 Use Case: Configure Platform Defaults (Sys Admin)

**Actor:** Platform Admin

**Preconditions:**
- User is logged in as sys_admin or sys_owner
- User navigates to Platform Admin area

**Main Flow:**
1. Admin clicks "Evaluation Config" card on Platform Admin dashboard
2. System displays platform configuration page
3. Admin configures default settings:
   - Categorical mode (boolean/detailed)
   - Show numerical score toggle
4. Admin clicks "Save Changes"
5. System validates and saves configuration
6. System displays success message

**Alternative Flows:**
- **3a. View current settings only**
  - Admin reviews current settings
  - Admin exits without changes

**Postconditions:**
- Platform defaults are updated
- New organizations will use these defaults
- Existing organizations without overrides see changes

---

### 2.2 Use Case: Manage Organization Delegation (Sys Admin)

**Actor:** Platform Admin

**Preconditions:**
- User is logged in as sys_admin
- At least one organization exists

**Main Flow:**
1. Admin navigates to Platform Admin > Evaluation Config > Organizations tab
2. System displays list of organizations with delegation status
3. Admin locates target organization
4. Admin toggles delegation switch for organization
5. System prompts for confirmation
6. Admin confirms change
7. System updates delegation status
8. System displays success message

**Alternative Flows:**
- **4a. Enable delegation**
  - Org gains access to AI prompt/model configuration
  - Org admin can now customize prompts
  
- **4b. Disable delegation**
  - System warns about existing org prompt configs
  - Org loses AI customization (falls back to platform)
  - Existing org prompts are preserved but unused

**Postconditions:**
- Organization delegation status is updated
- Org admin access is adjusted accordingly

---

### 2.3 Use Case: Configure Organization Evaluation Settings (Org Admin)

**Actor:** Organization Admin

**Preconditions:**
- User is logged in as org_admin or org_owner
- User's organization has module-eval enabled

**Main Flow:**
1. Org admin clicks "Evaluation Settings" card on Org Admin dashboard
2. System displays organization evaluation config page
3. Admin configures settings:
   - Categorical mode override (optional)
   - Show numerical score override (optional)
4. Admin clicks "Save Changes"
5. System validates settings
6. System saves configuration
7. System displays success message

**Alternative Flows:**
- **3a. Reset to platform defaults**
  - Admin clears override settings
  - Organization uses platform defaults

**Postconditions:**
- Organization configuration is updated
- Users see updated settings in evaluations

---

### 2.4 Use Case: Manage Document Types (Org Admin)

**Actor:** Organization Admin

**Preconditions:**
- User is logged in as org_admin
- Module-eval is enabled for organization

**Main Flow:**
1. Admin navigates to Org Admin > Evaluation > Document Types
2. System displays list of document types
3. Admin clicks "Create Document Type"
4. System displays creation form
5. Admin enters:
   - Name (required)
   - Description (optional)
6. Admin clicks "Create"
7. System validates and creates document type
8. System displays success, returns to list

**Alternative Flows:**
- **Edit existing type:**
  - Admin clicks edit on existing type
  - Form pre-populated with current values
  - Admin modifies and saves
  
- **Deactivate type:**
  - Admin clicks deactivate
  - System soft-deletes (is_active = false)
  - Existing evaluations preserved
  - Cannot create new evaluations with this type

**Postconditions:**
- Document type is created/updated
- Type available for criteria set assignment

---

### 2.5 Use Case: Import Criteria Set from Spreadsheet (Org Admin)

**Actor:** Organization Admin

**Preconditions:**
- At least one document type exists
- Admin has CSV or XLSX file with criteria

**Main Flow:**
1. Admin navigates to Org Admin > Evaluation > Criteria Sets
2. Admin clicks "Import Criteria Set"
3. System displays import wizard (Step 1: Upload)
4. Admin selects document type from dropdown
5. Admin uploads CSV/XLSX file
6. System parses file and displays preview (Step 2: Preview)
7. Admin reviews parsed criteria:
   - Validates columns detected
   - Reviews first 5-10 rows
   - Sees validation errors if any
8. Admin enters criteria set metadata:
   - Name (required)
   - Description (optional)
   - Version (default: "1.0")
   - Use weighted scoring (toggle)
9. Admin clicks "Import"
10. System creates criteria set and items
11. System displays success with summary:
    - X criteria imported successfully
    - Y criteria skipped (with reasons)

**Alternative Flows:**
- **6a. Parse error:**
  - System displays error message
  - Admin uploads corrected file
  
- **7a. Validation errors:**
  - System highlights rows with issues
  - Admin can proceed (skip errors) or re-upload

**Import File Format:**

| Column | Required | Description |
|--------|----------|-------------|
| criteria_id | YES | Unique ID within set |
| requirement | YES | Requirement text |
| description | NO | Additional guidance |
| category | NO | Grouping category |
| weight | NO | Score weight (default: 1.0) |

**Postconditions:**
- Criteria set is created
- Criteria items are imported
- Set is available for evaluations

---

### 2.6 Use Case: Configure AI Prompts (Delegated Org Admin)

**Actor:** Organization Admin with delegation enabled

**Preconditions:**
- Organization has ai_config_delegated = true
- Admin is org_admin or org_owner

**Main Flow:**
1. Admin navigates to Org Admin > Evaluation > Prompts
2. System displays prompt configuration page
3. Admin sees three prompt types:
   - Document Summary
   - Evaluation
   - Evaluation Summary
4. Admin clicks "Edit" on a prompt type
5. System displays prompt editor:
   - AI Provider dropdown
   - AI Model dropdown
   - System prompt textarea
   - User prompt template textarea
   - Temperature slider
   - Max tokens input
6. Admin modifies settings
7. Admin clicks "Save"
8. System validates and saves
9. System displays success message

**Alternative Flows:**
- **5a. Test prompt:**
  - Admin clicks "Test Prompt"
  - System shows test dialog
  - Admin enters sample input
  - System calls AI and shows response
  - Admin evaluates quality
  
- **7a. Reset to platform default:**
  - Admin clicks "Reset to Default"
  - System removes org override
  - Platform prompt used instead

**Postconditions:**
- Org prompt configuration is updated
- New evaluations use org prompts
- Existing evaluations unaffected

---

### 2.7 Use Case: Manage Status Options (Org Admin)

**Actor:** Organization Admin

**Preconditions:**
- Admin is org_admin or org_owner
- Module-eval is enabled

**Main Flow:**
1. Admin navigates to Org Admin > Evaluation > Status Options
2. System displays current status options:
   - If org has custom options: show org options
   - If no org options: show "Using platform defaults"
3. Admin clicks "Customize Status Options"
4. System displays status option editor
5. Admin can:
   - Add new status option
   - Edit existing option (name, color, score)
   - Reorder options (drag/drop)
   - Deactivate option
6. Admin clicks "Save Changes"
7. System validates and saves
8. System displays success message

**Validation Rules:**
- At least 2 active status options required
- Names must be unique within organization
- Score values between 0-100

**Postconditions:**
- Org status options are updated
- New evaluations use org options
- Existing results reference old options (preserved)

---

## 3. Admin Configuration Flows

### 3.1 Flow: First-Time Platform Configuration

**Scenario:** Platform admin sets up evaluation module for first time

```
┌─────────────────────────────────────────────────────────────────┐
│                 FIRST-TIME PLATFORM SETUP                        │
│                                                                  │
│  Step 1: Configure Defaults                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/sys/eval/config                                       ││
│  │                                                              ││
│  │ Categorical Mode: [Boolean ▼] / [Detailed ▼]                ││
│  │ Show Numerical Score: [✓]                                   ││
│  │                                                              ││
│  │ [Save Changes]                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 2: Configure Default Prompts                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/sys/eval/prompts                                      ││
│  │                                                              ││
│  │ Document Summary Prompt: [Edit] [Test]                       ││
│  │ Evaluation Prompt: [Edit] [Test]                             ││
│  │ Evaluation Summary Prompt: [Edit] [Test]                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 3: Review Status Options                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Boolean Mode: Non-Compliant, Compliant                       ││
│  │ Detailed Mode: Non-Compliant, Major Issues, Minor Issues,   ││
│  │                Partial, Compliant, Exceeds                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 4: Enable for Organizations                                │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Organization    Enabled    Delegation                        ││
│  │ ─────────────────────────────────────────────────────────── ││
│  │ Org A          [✓]        [Enable ▼]                        ││
│  │ Org B          [✓]        [Disable ▼]                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ✅ Platform Configuration Complete                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Flow: Organization Setup (Org Admin)

**Scenario:** Org admin configures evaluation for their organization

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORGANIZATION SETUP FLOW                        │
│                                                                  │
│  Step 1: Configure Org Settings (optional)                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/org/eval/config                                       ││
│  │                                                              ││
│  │ Override categorical mode? [No ▼]                           ││
│  │ Override show score? [No ▼]                                 ││
│  │                                                              ││
│  │ ⚠️ AI Config Delegation: [Not Enabled]                       ││
│  │    Contact platform admin to enable prompt customization     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 2: Create Document Types                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/org/eval/doc-types                                    ││
│  │                                                              ││
│  │ [+ Create Document Type]                                     ││
│  │                                                              ││
│  │ Name: "IT Security Policy"                                   ││
│  │ Description: "Annual IT security policy documents"           ││
│  │                                                              ││
│  │ [Create]                                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 3: Import Criteria Set                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/org/eval/criteria                                     ││
│  │                                                              ││
│  │ [+ Import from Spreadsheet]                                  ││
│  │                                                              ││
│  │ 1. Select Document Type: [IT Security Policy ▼]             ││
│  │ 2. Upload File: [security-criteria.xlsx]                     ││
│  │ 3. Preview: 45 criteria items found                          ││
│  │ 4. Metadata: Name, Version, Weighted Scoring                ││
│  │                                                              ││
│  │ [Import]                                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                              ↓                                   │
│  Step 4: (Optional) Customize Status Options                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ /admin/org/eval/status-options                               ││
│  │                                                              ││
│  │ Currently using: Platform defaults                           ││
│  │                                                              ││
│  │ [Customize for Organization]                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ✅ Organization Ready for Evaluations                           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Flow: Delegation Change Impact

```
┌─────────────────────────────────────────────────────────────────┐
│              DELEGATION ENABLE/DISABLE IMPACT                    │
│                                                                  │
│  ENABLING DELEGATION:                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Before: Org uses platform prompts                            ││
│  │ After:  Org can create custom prompts                        ││
│  │                                                              ││
│  │ No data loss - org starts with platform defaults             ││
│  │ Org admin sees new "Prompts" section in admin UI             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  DISABLING DELEGATION:                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Before: Org has custom prompts                               ││
│  │ After:  Org falls back to platform prompts                   ││
│  │                                                              ││
│  │ ⚠️ Warning: Org's custom prompts preserved but unused        ││
│  │ ⚠️ Re-enabling restores org's custom prompts                  ││
│  │                                                              ││
│  │ Org admin loses "Prompts" section in admin UI                ││
│  │ New evaluations use platform prompts                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Platform Admin UI

### 4.1 Page: Platform Admin Dashboard

**Route:** `/admin`

**Evaluation Card Location:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Platform Administration                                          │
├─────────────────────────────────────────────────────────────────┤
│ Core Modules:                                                    │
│   [Access] [AI] [Management]                                    │
├─────────────────────────────────────────────────────────────────┤
│ Functional Modules:                                              │
│   [Workspace] [KB] [Chat] [Evaluation] ...                      │
│                               ↑                                  │
│                     module-eval card                             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Page: Platform Evaluation Configuration

**Route:** `/admin/sys/eval/config`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin > Evaluation Configuration                     │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Evaluation Module Configuration                                │
│   Status: [Active Badge]                                         │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [Settings] [Status Options] [Organizations]               │
├─────────────────────────────────────────────────────────────────┤
│ Settings Tab:                                                    │
│                                                                  │
│ Platform Defaults                                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Categorical Mode                                          │   │
│ │ ○ Boolean (Compliant / Non-Compliant)                    │   │
│ │ ● Detailed (6-level scale with partial compliance)       │   │
│ │                                                           │   │
│ │ Show Numerical Score                                      │   │
│ │ [✓] Display compliance percentage in evaluations          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [Save Changes]                                                   │
│                                                                  │
│ ℹ️ These defaults apply to all organizations unless overridden   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Page: Platform Prompts Configuration

**Route:** `/admin/sys/eval/prompts`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Admin > Evaluation > Prompts                         │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Default AI Prompts                                             │
│   ℹ️ Used by organizations without AI delegation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Document Summary Prompt                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Provider: [OpenAI ▼]  Model: [gpt-4o ▼]                   │   │
│ │ Temperature: [0.3]    Max Tokens: [2000]                  │   │
│ │                                                           │   │
│ │ System Prompt:                                            │   │
│ │ ┌───────────────────────────────────────────────────────┐│   │
│ │ │ You are a document analysis assistant...              ││   │
│ │ └───────────────────────────────────────────────────────┘│   │
│ │                                                           │   │
│ │ User Prompt Template:                                     │   │
│ │ ┌───────────────────────────────────────────────────────┐│   │
│ │ │ Summarize the following document:                     ││   │
│ │ │ {document_name}                                       ││   │
│ │ │ {document_content}                                    ││   │
│ │ └───────────────────────────────────────────────────────┘│   │
│ │                                                           │   │
│ │ [Test Prompt]  [Save Changes]                            │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Evaluation Prompt                                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Collapsed - Click to Expand]                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Evaluation Summary Prompt                                        │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Collapsed - Click to Expand]                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Page: Platform Status Options

**Route:** `/admin/sys/eval/config` (Status Options Tab)

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Status Options Tab                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Boolean Mode Status Options                                      │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ #  Name            Color     Score    Actions             │   │
│ │ ───────────────────────────────────────────────────────── │   │
│ │ 1  Non-Compliant   🔴 #f44336  0      [Edit] [Delete]     │   │
│ │ 2  Compliant       🟢 #4caf50  100    [Edit] [Delete]     │   │
│ │                                                           │   │
│ │ [+ Add Status Option]                                     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Detailed Mode Status Options                                     │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ #  Name            Color     Score    Actions             │   │
│ │ ───────────────────────────────────────────────────────── │   │
│ │ 1  Non-Compliant   🔴 #f44336  0      [Edit] [Delete]     │   │
│ │ 2  Major Issues    🟠 #ff9800  25     [Edit] [Delete]     │   │
│ │ 3  Minor Issues    🟡 #ffeb3b  50     [Edit] [Delete]     │   │
│ │ 4  Partial         🟢 #8bc34a  75     [Edit] [Delete]     │   │
│ │ 5  Compliant       🟢 #4caf50  100    [Edit] [Delete]     │   │
│ │ 6  Exceeds         🔵 #2196f3  100    [Edit] [Delete]     │   │
│ │                                                           │   │
│ │ [+ Add Status Option]                                     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Page: Organization Delegation Management

**Route:** `/admin/sys/eval/config` (Organizations Tab)

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Organizations Tab                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Search organizations...]                                        │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Organization     Evaluations  Custom Config  AI Delegation│   │
│ │ ─────────────────────────────────────────────────────────│   │
│ │ Acme Corp        45           ✓              [Enable ▼]   │   │
│ │ Beta Inc         123          -              [Disable ▼]  │   │
│ │ Gamma LLC        0            -              [Enable ▼]   │   │
│ │ Delta Co         67           ✓              [Enabled ▼]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Legend:                                                          │
│ • Custom Config ✓ = Org has overridden platform defaults         │
│ • AI Delegation = Controls org's ability to customize prompts    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Organization Admin UI

### 5.1 Page: Organization Admin Dashboard

**Route:** `/admin/org` (within organization context)

**Evaluation Card Location:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Organization Administration: Acme Corp                           │
├─────────────────────────────────────────────────────────────────┤
│ Organization Settings:                                           │
│   [General] [Members] [Billing]                                 │
├─────────────────────────────────────────────────────────────────┤
│ Module Settings:                                                 │
│   [Workspace] [KB] [AI] [Evaluation] ...                        │
│                              ↑                                   │
│                    module-eval card                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Page: Organization Evaluation Configuration

**Route:** `/admin/org/eval/config`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Org Admin > Evaluation Settings                      │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Evaluation Settings for Acme Corp                              │
├─────────────────────────────────────────────────────────────────┤
│ Tabs: [Settings] [Doc Types] [Criteria] [Status] [Prompts*]     │
│                                                     (* if deleg) │
├─────────────────────────────────────────────────────────────────┤
│ Settings Tab:                                                    │
│                                                                  │
│ Scoring Configuration                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Categorical Mode                                          │   │
│ │ [Use Platform Default: Detailed ▼]                        │   │
│ │   - Use Platform Default: Detailed                        │   │
│ │   - Override: Boolean                                     │   │
│ │   - Override: Detailed                                    │   │
│ │                                                           │   │
│ │ Show Numerical Score                                      │   │
│ │ [Use Platform Default: Yes ▼]                             │   │
│ │   - Use Platform Default: Yes                             │   │
│ │   - Override: Yes                                         │   │
│ │   - Override: No                                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ AI Configuration                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Status: ❌ Not Delegated                                   │   │
│ │                                                           │   │
│ │ Your organization is using platform-wide AI configuration.│   │
│ │ Contact your platform administrator to request AI         │   │
│ │ configuration delegation.                                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [Save Changes]                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Page: Document Types Management

**Route:** `/admin/org/eval/doc-types`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Org Admin > Evaluation > Document Types              │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Document Types                          [+ Create Doc Type]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Name                     Criteria Sets  Evaluations  Actions│  │
│ │ ─────────────────────────────────────────────────────────── │  │
│ │ IT Security Policy       2              45           [⚙️]   │   │
│ │ Business Continuity      1              12           [⚙️]   │   │
│ │ Vendor Risk Assessment   3              67           [⚙️]   │   │
│ │ Financial Statement      0              0            [⚙️]   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Empty State (if no doc types):                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                     📄                                     │   │
│ │                                                           │   │
│ │     No document types defined yet                         │   │
│ │                                                           │   │
│ │     Create document types to categorize the documents     │   │
│ │     your organization evaluates.                          │   │
│ │                                                           │   │
│ │              [Create First Document Type]                 │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Page: Criteria Sets Management

**Route:** `/admin/org/eval/criteria`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Org Admin > Evaluation > Criteria Sets               │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   Criteria Sets               [+ Create] [+ Import Spreadsheet]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Filter: [All Document Types ▼]                                   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ IT Security Policy                                        │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ NIST 800-53 Controls v1.0          45 criteria      │  │   │
│ │ │ Imported from: nist-800-53.xlsx    [View] [Edit] [⚙️]│  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ ISO 27001 Checklist v2.0           120 criteria     │  │   │
│ │ │ Imported from: iso-27001.csv       [View] [Edit] [⚙️]│  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Vendor Risk Assessment                                    │   │
│ │ ┌─────────────────────────────────────────────────────┐  │   │
│ │ │ Standard Vendor Checklist v1.0     30 criteria      │  │   │
│ │ │ Created manually                   [View] [Edit] [⚙️]│  │   │
│ │ └─────────────────────────────────────────────────────┘  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Dialog: Criteria Set Import Wizard

**Components:** Multi-step dialog

```
┌─────────────────────────────────────────────────────────────────┐
│ Import Criteria Set                                      [X]     │
├─────────────────────────────────────────────────────────────────┤
│ Step 1 of 3: Upload File                                         │
│ ───────────────────────────────────────────────────────────────  │
│                                                                  │
│ Document Type *                                                  │
│ [IT Security Policy ▼]                                          │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │              📁 Drop file here or click to browse         │   │
│ │                                                           │   │
│ │              Supported: CSV, XLSX                         │   │
│ │              Max size: 5MB                                │   │
│ │                                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Required Columns:                                                │
│ • criteria_id - Unique identifier                                │
│ • requirement - The requirement text                             │
│                                                                  │
│ Optional Columns:                                                │
│ • description - Additional guidance                              │
│ • category - Grouping category                                   │
│ • weight - Score weight (default: 1.0)                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                               [Cancel] [Next →]                  │
└─────────────────────────────────────────────────────────────────┘
```

**Step 2: Preview**

```
┌─────────────────────────────────────────────────────────────────┐
│ Import Criteria Set                                      [X]     │
├─────────────────────────────────────────────────────────────────┤
│ Step 2 of 3: Preview Data                                        │
│ ───────────────────────────────────────────────────────────────  │
│                                                                  │
│ File: security-criteria.xlsx                                     │
│ Rows detected: 45                                                │
│ Columns found: criteria_id, requirement, category, weight        │
│                                                                  │
│ Preview (first 5 rows):                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ID      Requirement                      Category  Weight │   │
│ │ ─────────────────────────────────────────────────────────│   │
│ │ AC-1    Access Control Policy must...    Access    1.0   │   │
│ │ AC-2    Account management procedures... Access    1.0   │   │
│ │ AC-3    Access enforcement mechanisms... Access    1.0   │   │
│ │ AU-1    Audit and accountability pol...  Audit     1.0   │   │
│ │ AU-2    Audit events must be defined...  Audit     1.5   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ⚠️ Validation Issues: 0                                          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         [← Back] [Cancel] [Next →]               │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3: Metadata**

```
┌─────────────────────────────────────────────────────────────────┐
│ Import Criteria Set                                      [X]     │
├─────────────────────────────────────────────────────────────────┤
│ Step 3 of 3: Set Metadata                                        │
│ ───────────────────────────────────────────────────────────────  │
│                                                                  │
│ Criteria Set Name *                                              │
│ [NIST 800-53 Controls                               ]            │
│                                                                  │
│ Description                                                      │
│ [Federal security controls for information systems   ]           │
│                                                                  │
│ Version                                                          │
│ [1.0                                                 ]            │
│                                                                  │
│ Scoring Options                                                  │
│ [ ] Use weighted scoring (weights from 'weight' column)          │
│                                                                  │
│ Summary:                                                         │
│ • Document Type: IT Security Policy                              │
│ • Criteria Items: 45                                             │
│ • Categories: 8                                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                         [← Back] [Cancel] [Import]               │
└─────────────────────────────────────────────────────────────────┘
```

### 5.6 Page: Organization Prompts (Delegated Only)

**Route:** `/admin/org/eval/prompts`

**Visibility:** Only shown if `ai_config_delegated = true`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Breadcrumb: Org Admin > Evaluation > AI Prompts                  │
├─────────────────────────────────────────────────────────────────┤
│ Header:                                                          │
│   AI Prompt Configuration                                        │
│   ✅ AI Configuration Delegated to Your Organization              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Document Summary Prompt          [Using: Custom ▼]               │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Provider: [Anthropic ▼]   Model: [claude-3-sonnet ▼]      │   │
│ │ Temperature: [0.2]        Max Tokens: [1500]              │   │
│ │                                                           │   │
│ │ System Prompt:                                            │   │
│ │ ┌───────────────────────────────────────────────────────┐│   │
│ │ │ You are a document analyst specializing in...         ││   │
│ │ └───────────────────────────────────────────────────────┘│   │
│ │                                                           │   │
│ │ [Test Prompt] [Reset to Default] [Save Changes]          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Evaluation Prompt                [Using: Platform Default]       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Customize for Organization]                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Evaluation Summary Prompt        [Using: Platform Default]       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Customize for Organization]                               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.7 Page: Organization Status Options

**Route:** `/admin/org/eval/config` (Status Tab)

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Status Options Tab                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Current Configuration: [Using Platform Defaults]                 │
│                                                                  │
│ Platform Default Status Options:                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🔴 Non-Compliant (0)                                       │   │
│ │ 🟠 Major Issues (25)                                       │   │
│ │ 🟡 Minor Issues (50)                                       │   │
│ │ 🟢 Partial (75)                                            │   │
│ │ 🟢 Compliant (100)                                         │   │
│ │ 🔵 Exceeds (100)                                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [Customize for Organization]                                     │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ After Customization:                                             │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Organization Status Options                               │   │
│ │                                                           │   │
│ │ #  Name            Color     Score    Actions             │   │
│ │ ───────────────────────────────────────────────────────── │   │
│ │ ⠿ 1  Non-Compliant   🔴 #f44336  0     [Edit] [❌]         │   │
│ │ ⠿ 2  Needs Work      🟠 #ff9800  40    [Edit] [❌]         │   │
│ │ ⠿ 3  Satisfactory    🟢 #8bc34a  80    [Edit] [❌]         │   │
│ │ ⠿ 4  Excellent       🔵 #2196f3  100   [Edit] [❌]         │   │
│ │                                                           │   │
│ │ [+ Add Status Option]                                     │   │
│ │                                                           │   │
│ │ [Reset to Platform Defaults] [Save Changes]               │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Admin Card Design

### 6.1 Platform Admin Card

```typescript
// frontend/adminCards/evalPlatformAdminCard.tsx

import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { AdminCardConfig } from '@cora/shared-types';

export const evalPlatformAdminCard: AdminCardConfig = {
  id: 'eval-platform-admin',
  title: 'Evaluation Config',
  description: 'Configure platform evaluation defaults, prompts, and organization delegation',
  icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
  href: '/admin/sys/eval/config',
  color: 'primary.main',
  order: 500,  // After core modules, with other functional modules
  context: 'platform',
  requiredRoles: ['sys_owner', 'sys_admin'],
  badge: null,
  stats: [
    { label: 'Organizations', value: '12', trend: null },
    { label: 'Delegated', value: '4', trend: null },
    { label: 'Evaluations (30d)', value: '234', trend: '+12%' }
  ]
};
```

### 6.2 Organization Admin Card

```typescript
// frontend/adminCards/evalOrgAdminCard.tsx

import React from 'react';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type { AdminCardConfig } from '@cora/shared-types';

export const evalOrgAdminCard: AdminCardConfig = {
  id: 'eval-org-admin',
  title: 'Evaluation Settings',
  description: 'Configure document types, criteria sets, and evaluation options',
  icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
  href: '/admin/org/eval/config',
  color: 'primary.main',
  order: 500,
  context: 'organization',
  requiredRoles: ['org_owner', 'org_admin'],
  badge: null,
  stats: [
    { label: 'Doc Types', value: '5', trend: null },
    { label: 'Criteria Sets', value: '8', trend: null },
    { label: 'Evaluations', value: '67', trend: '+8%' }
  ]
};
```

### 6.3 Card Component Implementation

```typescript
// Standard card component following CORA admin card pattern

import React from 'react';
import { Card, CardContent, Box, Typography, Chip, Stack } from '@mui/material';

interface AdminCardProps {
  config: AdminCardConfig;
  onClick: () => void;
}

export function AdminCard({ config, onClick }: AdminCardProps) {
  return (
    <Card 
      onClick={onClick}
      sx={{ 
        cursor: 'pointer',
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
        <Box sx={{ color: config.color, mb: 2 }}>
          {config.icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {config.title}
          {config.badge && (
            <Chip label={config.badge} size="small" sx={{ ml: 1 }} />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {config.description}
        </Typography>
        
        {config.stats && (
          <Stack direction="row" spacing={2} justifyContent="center">
            {config.stats.map((stat, index) => (
              <Box key={index} sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 7. Monitoring & Analytics

### 7.1 Platform Analytics (Sys Admin)

**Route:** `/admin/sys/eval/analytics`

**Metrics:**

| Metric | Description | Visualization |
|--------|-------------|---------------|
| Total Evaluations | All-time count | Number card |
| Evaluations (30d) | Recent activity | Number card with trend |
| Active Organizations | Orgs using module | Number card |
| Processing Queue | Pending evaluations | Number card |
| Avg Processing Time | Mean evaluation time | Number card |
| Error Rate | Failed evaluations % | Number card |
| Token Usage | AI tokens consumed | Line chart |
| Evaluations by Org | Distribution | Bar chart |

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Platform Evaluation Analytics           [Last 30 Days ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │  1,234  │ │   234   │ │    12   │ │   3.2%  │ │  45 sec │    │
│ │  Total  │ │  30 Day │ │  Orgs   │ │  Error  │ │ Avg Time│    │
│ │         │ │  +12%   │ │         │ │         │ │         │    │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│                                                                  │
│ Evaluations Over Time                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                    📈 Line Chart                           │   │
│ │                   (30-day trend)                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Top Organizations by Evaluations                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                    📊 Bar Chart                            │   │
│ │                 (Top 10 by count)                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ AI Token Usage by Model                                          │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                    📈 Stacked Line                         │   │
│ │              (Token consumption trend)                     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Organization Analytics (Org Admin)

**Route:** `/admin/org/eval/analytics`

**Metrics:**

| Metric | Description | Visualization |
|--------|-------------|---------------|
| Total Evaluations | Org total | Number card |
| Evaluations (30d) | Recent activity | Number card with trend |
| By Status | Completed/Failed/Processing | Pie chart |
| By Doc Type | Distribution | Bar chart |
| Top Users | Most active | Table |
| Processing Queue | Pending count | Number card |

---

## 8. Admin Testing Requirements

### 8.1 Platform Admin Tests

```typescript
describe('Platform Admin - Evaluation Configuration', () => {
  beforeEach(() => {
    // Login as platform admin
    loginAsSysAdmin();
  });
  
  it('displays admin card on platform dashboard', () => {
    render(<PlatformAdminDashboard />);
    expect(screen.getByText('Evaluation Config')).toBeInTheDocument();
  });
  
  it('navigates to evaluation configuration', async () => {
    render(<PlatformAdminDashboard />);
    await userEvent.click(screen.getByText('Evaluation Config'));
    expect(screen.getByText('Evaluation Module Configuration')).toBeInTheDocument();
  });
  
  it('saves platform default settings', async () => {
    render(<SysEvalConfigPage />);
    
    // Change scoring mode
    const modeSelect = screen.getByLabelText(/categorical mode/i);
    await userEvent.click(modeSelect);
    await userEvent.click(screen.getByText('Boolean'));
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
  
  it('manages organization delegation', async () => {
    render(<SysEvalOrgsPage />);
    
    // Find org and toggle delegation
    const orgRow = screen.getByText('Acme Corp').closest('tr');
    const toggleBtn = within(orgRow!).getByRole('button', { name: /enable/i });
    await userEvent.click(toggleBtn);
    
    // Confirm
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));
    
    // Verify change
    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });
  
  it('configures default prompts', async () => {
    render(<SysEvalPromptsPage />);
    
    // Edit doc summary prompt
    await userEvent.click(screen.getByText('Document Summary Prompt'));
    
    // Modify system prompt
    const promptInput = screen.getByLabelText(/system prompt/i);
    await userEvent.clear(promptInput);
    await userEvent.type(promptInput, 'New system prompt...');
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });
});
```

### 8.2 Organization Admin Tests

```typescript
describe('Organization Admin - Evaluation Settings', () => {
  beforeEach(() => {
    loginAsOrgAdmin('acme-corp');
  });
  
  it('displays admin card on org dashboard', () => {
    render(<OrgAdminDashboard orgSlug="acme-corp" />);
    expect(screen.getByText('Evaluation Settings')).toBeInTheDocument();
  });
  
  it('creates document type', async () => {
    render(<OrgEvalDocTypesPage />);
    
    // Open create dialog
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Fill form
    await userEvent.type(screen.getByLabelText(/name/i), 'IT Security Policy');
    await userEvent.type(
      screen.getByLabelText(/description/i), 
      'Annual IT security policies'
    );
    
    // Submit
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    
    // Verify
    await waitFor(() => {
      expect(screen.getByText('IT Security Policy')).toBeInTheDocument();
    });
  });
  
  it('imports criteria set from spreadsheet', async () => {
    render(<OrgEvalCriteriaPage />);
    
    // Open import wizard
    await userEvent.click(screen.getByRole('button', { name: /import/i }));
    
    // Step 1: Select doc type and upload file
    await userEvent.selectOptions(
      screen.getByLabelText(/document type/i),
      'IT Security Policy'
    );
    
    const file = new File(['criteria_id,requirement\nAC-1,Access control'], 
      'criteria.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/upload/i);
    await userEvent.upload(input, file);
    
    // Step 2: Preview
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('1 rows detected')).toBeInTheDocument();
    
    // Step 3: Metadata
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Criteria');
    
    // Import
    await userEvent.click(screen.getByRole('button', { name: /import/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/imported successfully/i)).toBeInTheDocument();
    });
  });
  
  it('shows prompts tab only when delegated', () => {
    // Not delegated
    render(<OrgEvalConfigPage delegated={false} />);
    expect(screen.queryByText('Prompts')).not.toBeInTheDocument();
    
    // Delegated
    render(<OrgEvalConfigPage delegated={true} />);
    expect(screen.getByText('Prompts')).toBeInTheDocument();
  });
  
  it('customizes status options', async () => {
    render(<OrgEvalStatusPage />);
    
    // Customize
    await userEvent.click(screen.getByRole('button', { name: /customize/i }));
    
    // Add new status
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    await userEvent.type(screen.getByLabelText(/name/i), 'Needs Review');
    await userEvent.type(screen.getByLabelText(/score/i), '60');
    
    // Save
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Needs Review')).toBeInTheDocument();
    });
  });
});
```

### 8.3 Delegation Access Control Tests

```typescript
describe('Delegation Access Control', () => {
  it('hides prompt config when not delegated', () => {
    const orgConfig = { ai_config_delegated: false };
    render(<OrgEvalConfigPage orgConfig={orgConfig} />);
    
    expect(screen.queryByText('AI Prompts')).not.toBeInTheDocument();
    expect(screen.getByText(/not delegated/i)).toBeInTheDocument();
  });
  
  it('shows prompt config when delegated', () => {
    const orgConfig = { ai_config_delegated: true };
    render(<OrgEvalConfigPage orgConfig={orgConfig} />);
    
    expect(screen.getByText('AI Prompts')).toBeInTheDocument();
  });
  
  it('prevents non-delegated org from saving prompts', async () => {
    const api = createEvalApi(client);
    
    await expect(
      api.updateOrgPrompt('non-delegated-org-id', 'doc_summary', {
        system_prompt: 'New prompt'
      })
    ).rejects.toThrow(/delegation not enabled/i);
  });
});
```

### 8.4 Test Coverage Requirements

- **Admin UI Coverage:** ≥80%
- **Configuration Flows:** 100%
- **Role-Based Access:** 100%
- **Platform/Org Separation:** 100%
- **Delegation Logic:** 100%
- **Import Wizard:** 100%

---

**Document Version:** 1.0  
**Last Updated:** January 15, 2026
