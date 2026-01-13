# Enhanced Workspace UI Design - CJIS Audit Mockup

**Document Type:** UI/UX Design Specification  
**Status:** Draft  
**Created:** January 12, 2026  
**Context:** Enhancement 2 from activeContext.md

---

## Executive Summary

This document provides a comprehensive UI design for enhancing the CORA workspace module to support:
- **Workflows** - Automated IT policy document analysis using RAG + LLM
- **Chats** - AI-powered conversations grounded with workspace knowledge base
- **Knowledge Bases** - Document repositories for grounding AI responses

The mockup uses a **CJIS (Criminal Justice Information Systems) IT Security Audit** as the primary use case.

---

## Design Decisions Summary

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Processing Model** | Async with progress tracking (Lambda + SQS) | Long-running document analysis requires async processing |
| **Vector DB** | pgvector in Supabase Postgres | Consistent with existing Supabase stack |
| **Document Preview** | Inline preview in Docs tab | Better UX than download-only |
| **Chat Interface** | Full-page with breadcrumbs | Immersive experience with workspace context |
| **Module Structure** | Separate modules (kb, chat, workflow) | Modular architecture per CORA standards |

---

# CJIS IT Security Policy Audit - Enhanced Workspace Design

## Context

This design enhances workspaces for **Criminal Justice Information Systems (CJIS) IT Security Policy Audits**. Organizations (federal agencies, state police, local departments) undergo CJIS compliance audits on a 3-year cycle or on-demand basis to ensure their IT security policies meet FBI CJIS Security Policy requirements.

---

## Enhanced Tab 1: Activities Tab

### Updated Mockup with CJIS Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Audits > Metro County Sheriff's Office - 2026 Triennial       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────┐  Metro County Sheriff's Office - CJIS Audit 2026            [★] [⋮]│
│  │ 🔒  │  Three-year compliance audit for CJIS Security Policy v5.9         │
│  └─────┘  [cjis] [3-year-cycle] [metro-county] [2026-q1]                    │
│           6 members • Updated 3 hours ago                                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Activities]  [Docs]  [Members]  [Settings]                                │
├─────────────────────────────────────────────────────────────────────────────┤

Now I need to create a comprehensive UI design document with mockup data that reflects CJIS-specific audit scenarios. The user wants:

1. Organizations: Federal law enforcement, state police, local police departments
2. Both 3-year cycle and On-Demand audits
3. Yes to CJIS Security Policy sections
4. KB docs: CJIS Security Policy Guidance, AWS Foundational Security Best Practices, CJIS Compliance Evaluation Guide
5. Yes to sample IT security policies
6. Yes to sample findings

Let me create a comprehensive UI design document with realistic CJIS mockup data.
</thinking>

I'll create a comprehensive UI design document with CJIS-specific mockup data for the enhanced workspace. This will be a detailed design specification that can guide implementation.

<write_to_file>
<path>docs/designs/enhanced-workspace-ui-design.md</path>
<content># Enhanced Workspace UI Design - CJIS IT Security Audit Mockup

**Status:** Draft  
**Created:** January 12, 2026  
**Use Case:** IT Security Audits for Criminal Justice Information Systems (CJIS)

---

## Overview

This document specifies the enhanced workspace UI design with support for:
- **Workflows** - Automated compliance analysis using AI/RAG
- **Chats** - AI-assisted conversations grounded with knowledge base documents
- **Knowledge Base** - Document repository for grounding AI responses
- **Documents** - Policy documents uploaded for workflow processing

**Context:** CJIS IT Security Policy Audits for criminal justice agencies (federal, state, local law enforcement)

---

## Tab Structure

The enhanced workspace detail page uses a **4-tab layout**:

| Tab | Purpose | Content |
|-----|---------|---------|
| **Activities** | Primary workspace actions | Workflows + Chats |
| **Docs** | Document management | Workflow documents + Knowledge base |
| **Members** | Member management | Existing member CRUD |
| **Settings** | Workspace configuration | Existing settings |

---

## Tab 1: Activities Tab - CJIS Mockup

### Full Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Audits > Metro County Sheriff's Office - CJIS Audit 2026       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────┐  Metro County Sheriff's Office - CJIS Audit 2026      [★] [⋮]     │
│  │ 🛡️  │  Three-year cycle CJIS Security Policy compliance audit            │
│  └─────┘  [cjis] [law-enforcement] [3-year-cycle]                           │
│           6 members • Updated 2 hours ago                                   │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Activities]  [Docs]  [Members]  [Settings]                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 📋 WORKFLOWS                                        [+ New Workflow]  │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 📄 CJIS Compliance Assessment 2026                   [Running]  │ │  │
│  │  │    3-Year Compliance Audit • SOC Review Cycle                   │ │  │
│  │  │    Evaluating 18 IT security policies against CJIS Policy Areas │ │  │
│  │  │    Started: 3 hours ago • 12/18 policies processed              │ │  │
│  │  │    ████████████████████░░░░░  67%                               │ │  │
│  │  │    [View Progress] [View Findings]                              │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │

Let me create a comprehensive UI design document with realistic CJIS audit mockup data.
</thinking>

I'll create a comprehensive UI design document with realistic CJIS audit mockup data based on your specifications.

<write_to_file>
<path>docs/designs/enhanced-workspace-ui-design.md</path>
<content># Enhanced Workspace UI Design - CJIS Compliance Audit

**Date:** January 12, 2026  
**Context:** IT Security Policy Audits for Criminal Justice Information Systems (CJIS)  
**Target Modules:** module-ws, module-workflow, module-chat, module-kb  
**Platform Label:** "Audits" (workspace_nav_label_plural)

---

## Overview

This design enhances the workspace detail page to support expanded use cases for:
- **Workflows** - IT policy document evaluation using RAG + LLM
- **Chats** - Knowledge base-grounded AI conversations
- **Documents** - Policy documents and reference materials
- **Knowledge Bases** - Reference materials for grounding AI responses

The mockup focuses on CJIS (Criminal Justice Information Systems) compliance audits for law enforcement agencies.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Processing Model** | Async with progress tracking (Lambda + SQS) | Handles long-running document analysis |
| **Vector Database** | pgvector in Supabase Postgres | Native integration, cost-effective |
| **Document Preview** | Inline preview in Docs tab | Reduces context switching |
| **Chat Interface** | Full-page with breadcrumbs | Better UX for extended conversations |
| **Module Structure** | Separate modules (workflow, chat, kb) | Derived from ~/code/policy/legacy, independently deployable |

---

## Tab Structure

The enhanced workspace detail page uses a **4-tab layout**:

| Tab | Purpose | Permissions |
|-----|---------|-------------|
| **Activities** | Workflows + Chats (primary actions) | All members (view), Owner/Admin (create) |
| **Docs** | Workflow documents + Knowledge base | All members (view), Owner/Admin (upload) |
| **Members** | Member management (existing) | All members (view), Owner (manage) |
| **Settings** | Workspace configuration (existing) | Owner/Admin only |

---

## Tab 1: Activities Tab (Default)

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Breadcrumb: Audits > State Police Bureau - CJIS Audit 2026                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────┐  State Police Bureau - CJIS Audit 2026                     [★] [⋮]    │
│  │ 🔒  │  Triennial CJIS Security Policy compliance audit                       │
│  └─────┘  [cjis] [law-enforcement] [triennial] [2026]                           │
│           6 members • Updated 1 hour ago                                        │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  [Activities]  [Docs]  [Members]  [Settings]                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 📋 WORKFLOWS                                           [+ New Workflow]   │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ Type: [All ▼]  Status: [All ▼]  Search: [🔍 Search workflows...]        │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 📄 Policy Area 5: Access Control Analysis              [Running]    │ │  │
│  │  │    Type: 3-Year Compliance Audit                                    │ │  │
│  │  │    Evaluating 18 IT security policies against CJIS Security Policy  │ │  │
│  │  │    Started: 1 hour ago • 12/18 documents processed                  │ │  │
│  │  │    ████████████████████████░░░░░░  67%                              │ │  │
│  │  │    📊 Findings: 8 non-compliant • 4 warnings • 15 compliant         │ │  │
│  │  │    [View Progress] [View Findings] [Generate Report]                │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 📄 Policy Area 10: Systems & Communications              [Complete]  │ │  │
│  │  │    Type: 3-Year Compliance Audit                                    │ │  │
│  │  │    Analyzed 8 documents • 23 findings identified                    │ │  │
│  │  │    Completed: Jan 10, 2026                                          │ │  │
│  │  │    📊 15 non-compliant • 8 warnings • 42 compliant                  │ │  │
│  │  │    [View Report] [Export PDF] [Schedule Remediation]                │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 🚨 On-Demand: Data Breach Incident Response              [Complete]  │ │  │
│  │  │    Type: On-Demand Audit (Triggered by incident)                    │ │  │
│  │  │    Analyzed 4 documents • 12 critical findings                      │ │  │
│  │  │    Completed: Jan 8, 2026                                           │ │  │
│  │  │    📊 12 critical • 5 high-severity • 3 medium-severity             │ │  │
│  │  │    [View Report] [Export PDF] [Escalate]                            │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 📄 Policy Area 13: Mobile Device Security                   [Draft]  │ │  │
│  │  │    Type: 3-Year Compliance Audit                                    │ │  │
│  │  │    0 documents • Configuration in progress                          │ │  │
│  │  │    [Configure] [Upload Documents] [Start Analysis]                  │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 💬 CHATS                                                   [+ New Chat]   │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ Filter: [All ▼]  Search: [🔍 Search chats...]                           │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 💬 Access Control Compliance Questions                   [Active]   │ │  │
│  │  │    "What specific access control gaps were identified in Policy     │ │  │
│  │  │    Area 5.4 regarding personnel screening?"                         │ │  │
│  │  │    📚 Grounded with: CJIS Audit 2026 KB (37 documents)              │ │  │
│  │  │    👥 Shared • Last: Sarah Chen (15 min ago) • 18 messages          │ │  │
│  │  │    [Continue Chat]                                                  │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 💬 Remediation Planning for Encryption Gaps              [Active]   │ │  │
│  │  │    "What are the AWS encryption best practices for CJIS data?"      │ │  │
│  │  │    📚 Grounded with: CJIS Audit 2026 KB (37 documents)              │ │  │
│  │  │    👥 Shared • Last: Michael Torres (2 hours ago) • 12 messages     │ │  │
│  │  │    [Continue Chat]                                                  │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 💬 Incident Response Plan Review                         [Active]   │ │  │
│  │  │    "Compare our incident response procedures to FBI CJIS guidance"  │ │  │
│  │  │    📚 Grounded with: CJIS Audit 2026 KB (37 documents)              │ │  │
│  │  │    👤 Private • Last: You (yesterday) • 6 messages                  │ │  │
│  │  │    [Continue Chat]                                                  │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Card Specifications

**Fields:**
- **Name** - Descriptive workflow name (includes Policy Area for CJIS)
- **Type** - "3-Year Compliance Audit" or "On-Demand Audit"
- **Status Badge** - Draft, Running, Complete, Failed
- **Progress** - Document count (processed/total), percentage bar
- **Findings Summary** - Breakdown by severity (critical, non-compliant, warning, compliant)
- **Actions** - Context-dependent buttons

**Workflow States:**

| State | Description | Actions Available |
|-------|-------------|-------------------|
| `Draft` | Configuration in progress, no documents | Configure, Upload Documents, Start Analysis |
| `Running` | Actively processing via SQS queue | View Progress, View Findings, Pause (future) |
| `Complete` | Analysis finished, report available | View Report, Export PDF, Schedule Remediation |
| `Failed` | Processing error occurred | View Error, Retry, Edit Configuration |

**CJIS Policy Areas (for mockups):**
- Policy Area 5: Access Control
- Policy Area 6: Identification and Authentication  
- Policy Area 10: Systems and Communications Protection
- Policy Area 13: Mobile Devices

### Chat Card Specifications

**Fields:**
- **Name** - Chat topic/title
- **Preview** - First message or most recent question
- **Knowledge Base Badge** - Shows KB name and document count
- **Visibility** - 👥 Shared (workspace) or 👤 Private
- **Last Activity** - User name and timestamp
- **Message Count** - Total messages in thread

**Chat Features:**
- Clicking "Continue Chat" navigates to full-page chat interface
- Breadcrumbs maintain workspace context: `Audits > [Workspace Name] > [Chat Name]`
- Grounding with workspace KB is shown with 📚 icon
- Shared chats visible to all workspace members
- Private chats visible only to creator

---

## Tab 2: Docs Tab

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [Activities]  [Docs]  [Members]  [Settings]                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 📁 WORKFLOW DOCUMENTS                                   [+ Upload Files]  │  │
│  │    IT security policy documents from audited organization                │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ Workflow: [All ▼]  Status: [All ▼]  Search: [🔍 Search docs...]         │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  □ Name                               Workflow      Status     Date      │  │
│  │  ────────────────────────────────────────────────────────────────────────│  │
│  │  □ 📄 Physical-Security-Policy.pdf    Area 5        ✅ Analyzed Jan 10  │  │
│  │  □ 📄 Personnel-Screening-Proc.docx   Area 5        ✅ Analyzed Jan 10  │  │
│  │  □ 📄 Access-Control-Matrix.xlsx      Area 5        ✅ Analyzed Jan 10  │  │
│  │  □ 📄 Password-Authentication.pdf     Area 6        🔄 Processing Jan 12 │  │
│  │  □ 📄 MFA-Implementation-Plan.docx    Area 6        🔄 Processing Jan 12 │  │
│  │  □ 📄 Encryption-Standards.pdf        Area 10       ✅ Analyzed Jan 8   │  │
│  │  □ 📄 Network-Security-Policy.pdf     Area 10       ✅ Analyzed Jan 8   │  │
│  │  □ 📄 Firewall-Configuration.docx     Area 10       ✅ Analyzed Jan 8   │  │
│  │  □ 📄 Data-Classification.pdf         Area 10       ✅ Analyzed Jan 8   │  │
│  │  □ 📄 Incident-Response-Plan.pdf      On-Demand     ✅ Analyzed Jan 8   │  │
│  │                                                                           │  │
│  │  [Select All] [Bulk Download] [Bulk Remove]      Page 1 of 2 [Next →]   │  │
│  │                                                                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 📄 Preview: Physical-Security-Policy.pdf                            │ │  │
│  │  ├─────────────────────────────────────────────────────────────────────┤ │  │
│  │  │                                                                      │ │  │
│  │  │  PHYSICAL SECURITY POLICY                                           │ │  │
│  │  │  State Police Bureau                                                │ │  │
│  │  │  Version 2.1 | Last Updated: March 2024                            │ │  │
│  │  │                                                                      │ │  │
│  │  │  1. PURPOSE                                                         │ │  │
│  │  │  This policy establishes physical security requirements for         │ │  │
│  │  │  facilities processing Criminal Justice Information (CJI)...        │ │  │
│  │  │                                                                      │ │  │
│  │  │  2. SCOPE                                                           │ │  │
│  │  │  This policy applies to all State Police facilities that           │ │  │
│  │  │  process, store, or transmit CJI data...                           │ │  │
│  │  │                                                                      │ │  │
│  │  │  [Page 1 of 12]                                                     │ │  │
│  │  │                                                                      │ │  │
│  │  └─────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 📚 KNOWLEDGE BASE                                    [+ Add Documents]   │  │
│  │    Reference documents for grounding AI chat responses                   │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │ Category: [All ▼]  Indexed: [All ▼]  Search: [🔍 Search KB...]          │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                           │  │
│  │  □ Name                             Category       Indexed    Size       │  │
│  │  ────────────────────────────────────────────────────────────────────────│  │
│  │  □ 📘 CJIS-Security-Policy-v5.9.pdf  CJIS Guidance  ✅ Yes   8.2 MB     │  │
│  │  □ 📘 FBI-CJIS-APB-2024-001.pdf      CJIS Guidance  ✅ Yes   1.4 MB     │  │
│  │  □ 📘 AWS-Security-Best-Practices.pdf Cloud Security ✅ Yes   4.1 MB    │  │
│  │  □ 📘 NIST-800-53-Rev5.pdf           Standards      ✅ Yes   12.3 MB    │  │
│  │  □ 📘 State-CJIS-Addendum-2024.pdf   State Policy   ✅ Yes   892 KB     │  │
│  │  □ 📄 Previous-Audit-2023.pdf        Historical     ✅ Yes   3.8 MB     │  │
│  │  □ 📄 Audit-Findings-2023-Q4.docx    Historical     ✅ Yes   1.2 MB     │  │
│  │  □ 📄 Remediation-Plan-2023.pdf      Remediation    ✅ Yes   645 KB     │  │
│  │  □ 📊 Risk-Register-2026.xlsx        Risk           🔄 Indexing 1.8 MB  │  │
│  │  □ 📄 CJIS-Compliance-Eval-Guide.pdf Guidance       ✅ Yes   2.9 MB     │  │
│  │                                                                           │  │
│  │  [Select All] [Bulk Download] [Reindex Selected]  Page 1 of 1           │  │
│  │                                                                           │  │
│  │  📊 KB Statistics:                                                       │  │
│  │  • 37 documents indexed                                                  │  │
│  │  • 1,248 pages processed                                                 │  │
│  │  • 15,892 vector embeddings (pgvector)                                   │  │
│  │  • Last sync: 2 hours ago                                                │  │
│  │  • Storage: 48.3 MB total                                                │  │
│  │                                                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Document Sections Explained

**1. Workflow Documents Section**

| Feature | Description |
|---------|-------------|
| **Purpose** | IT security policies from the audited organization |
| **Filters** | Workflow name, Status (Pending/Processing/Analyzed/Failed) |
| **Status Icons** | ✅ Analyzed, 🔄 Processing, ⏳ Pending, ❌ Failed |
| **Actions** | Select → View, Download, Remove, View Findings |
| **Preview** | Inline document preview (PDF.js, DOCX rendering) |

**Sample Workflow Documents (by organization type):**

*Federal Law Enforcement:*
- FBI Physical Security Standards
- ATF Personnel Screening Procedures
- DEA Network Security Policy
- US Marshals Encryption Guidelines

*State Police:*
- State Police Bureau Access Control Policy
- State Forensics Lab Data Classification
- State Highway Patrol Mobile Device Policy
- State Bureau of Investigation Incident Response Plan

*Local Police:*
- Metro PD Password Authentication Policy
- County Sheriff Physical Security Standards
- City Police Department Personnel Security Policy
- Regional Task Force Encryption Policy

**2. Knowledge Base Section**

| Feature | Description |
|---------|-------------|
| **Purpose** | Reference documents for grounding AI chat responses |
| **Categories** | CJIS Guidance, Cloud Security, Standards, State Policy, Historical, Remediation, Risk |
| **Indexed Status** | ✅ Yes (ready for RAG), 🔄 Indexing (in progress), ❌ Failed |
| **Vector DB** | pgvector in Supabase Postgres |
| **Stats Display** | Document count, pages, embeddings, last sync, storage |

**Sample Knowledge Base Documents:**

*CJIS Guidance:*
- CJIS Security Policy v5.9 (latest official FBI document)
- FBI CJIS Advisory Policy Bulletins (APBs)
- State-specific CJIS Security Addendums
- CJIS Compliance Evaluation Guide

*Cloud Security:*
- AWS Foundational Security Best Practices
- Azure Government Cloud CJIS Compliance
- GCP Criminal Justice Reference Architecture

*Standards:*
- NIST 800-53 Rev 5 (Security and Privacy Controls)
- NIST 800-171 (Protecting CUI)
- ISO 27001 Information Security Management

*Historical:*
- Previous audit reports (2023, 2020, 2017)
- Past findings and remediation tracking
- Historical compliance trends

---

## Tab 3: Members Tab (Existing)

No changes to existing Members tab functionality. Maintains current design:
- Member list with avatars, names, roles
- Add member button (owner only)
- Role management dropdown (owner only)
- Remove member action

---

## Tab 4: Settings Tab (Existing)

No changes to existing Settings tab functionality. Maintains current design:
- Workspace details (name, description, tags, color)
- Status (active/archived)
- Danger zone (delete workspace)

---

## New Workflow Dialog

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Create New Workflow                                                       [X]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Workflow Type *                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ● 3-Year Compliance Audit          ○ On-Demand Audit                     │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Workflow Name *                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Policy Area 6: Identification and Authentication Review                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  CJIS Policy Area *                                                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Policy Area 6: Identification and Authentication                      ▼  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│  ↓ Available Policy Areas:                                                      │
│    • Area 5: Access Control                                                     │
│    • Area 6: Identification and Authentication                                  │
│    • Area 10: Systems and Communications Protection                             │
│    • Area 13: Mobile Devices                                                    │
│                                                                                  │
│  Compliance Criteria *                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ☑ CJIS Security Policy v5.9                                               │  │
│  │ ☑ State-specific CJIS Addendum                                            │  │
│  │ ☑ AWS Foundational Security Best Practices                                │  │
│  │ ☐ NIST 800-53 Rev 5                                                       │  │
│  │ ☐ FBI CJIS APB Bulletins                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 📁 POLICY DOCUMENTS                                                       │  │
│  │                                                                            │  │
│  │  Drag & drop IT security policy documents here, or click to browse       │  │
│  │                                                                            │  │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ 📄 Password-Authentication-Policy-v3.2.pdf              [Remove]   │  │  │
│  │  │ 📄 Multi-Factor-Authentication-Standards.docx           [Remove]   │  │  │
│  │  │ 📄 Identity-Management-Procedures.pdf                   [Remove]   │  │  │
│  │  │ 📄 Biometric-Access-Control-Policy.docx                 [Remove]   │  │  │
│  │  └────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                            │  │
│  │  4 files selected • 6.8 MB total                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Advanced Options                                                        [▼]    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ☑ Generate severity ratings for findings (Critical/High/Medium/Low)      │  │
│  │ ☑ Include remediation recommendations with cost estimates                │  │
│  │ ☑ Compare with previous audit results (2023 baseline)                    │  │
│  │ ☑ Flag potential data breach vulnerabilities                             │  │
│  │ ☐ Generate executive summary report                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ℹ️  Processing time: ~15 min for 4 documents • Cost estimate: $2.40          │
│                                                [Cancel]  [Save Draft]  [Start]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Configuration Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| **Workflow Type** | Radio | Required | "3-Year Compliance Audit" or "On-Demand Audit" |
| **Workflow Name** | Text input | 1-255 chars, unique per workspace | Auto-suggest format: "Policy Area X: [Topic]" |
| **CJIS Policy Area** | Dropdown | Required | Areas 5, 6, 10, 13 (expandable) |
| **Compliance Criteria** | Checkboxes | At least 1 required | Multi-select from KB documents |
| **Policy Documents** | File upload | PDF/DOCX/XLSX, max 50MB per file | Drag & drop or browse |
| **Advanced Options** | Checkboxes | Optional | Processing customization |

**CJIS Policy Areas (Full List):**
- Policy Area 5: Access Control
- Policy Area 6: Identification and Authentication
- Policy Area 10: Systems and Communications Protection
- Policy Area 13: Mobile Devices
- (Additional areas can be added as needed)

---

## New Chat Dialog

### Layout Mockup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Start New Chat                                                            [X]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Chat Name *                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Access Control Gap Analysis Discussion                                   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Knowledge Base Grounding                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ☑ Enable workspace knowledge base                                        │  │
│  │   📚 CJIS Audit 2026 KB (37 documents, 1,248 pages, 15,892 embeddings)   │  │
│  │                                                                            │  │
│  │   AI responses will be grounded with relevant content from:               │  │
│  │   • CJIS Security Policy v5.9                                             │  │
│  │   • AWS Foundational Security Best Practices                              │  │
│  │   • NIST 800-53 Rev 5                                                     │  │
│  │   • State-specific CJIS Addendum                                          │  │
│  │   • Previous Audit Reports (2023, 2020)                                   │  │
│  │   • + 32 more documents                                                   │  │
│  │                                                                            │  │
│  │   🔍 Retrieval Settings: [Configure]                                      │  │
│  │   • Max context chunks: 10                                                │  │
│  │   • Similarity threshold: 0.75                                            │  │
│  │   • Prefer recent documents: Yes                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Visibility *                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ ● 👥 Workspace (shared with all 6 members)                                │  │
│  │ ○ 👤 Private (only visible to you)                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  Initial Message (optional)                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Based on the Policy Area 5 workflow findings, what specific access       │  │
│  │ control gaps exist in our personnel screening procedures compared to     │  │
│  │ CJIS Security Policy Section 5.4? Please provide remediation steps       │  │
│  │ with estimated costs and timelines.                                       │  │
│  │                                                                            │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ℹ️  Chat will use module-ai configured provider (Claude Opus 4.5)            │
│                                                 [Cancel]  [Start Chat]          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Chat Configuration Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| **Chat Name** | Text input | 1-255 chars | Clear, descriptive topic |
| **Enable KB** | Checkbox | N/A | Toggle knowledge base grounding |
| **Retrieval Settings** | Expandable config | Optional | Advanced RAG configuration |
| **Visibility** | Radio | Required | Workspace (shared) or Private |
| **Initial Message** | Textarea | Optional, max 5000 chars | First question/prompt |

**Retrieval Settings (Advanced):**
- **Max context chunks** - Number of KB chunks to retrieve (default: 10)
- **Similarity threshold** - Minimum cosine similarity (default: 0.75)
- **Prefer recent documents** - Weight newer documents higher (default: Yes)
- **Document filters** - Limit to specific KB categories

---

## Workflow Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Workflow Processing Architecture                        │
└─────────────────────────────────────────────────────────────────────────────────┘

1. User Creates Workflow
   ↓
2. Frontend → POST /api/workflows
   ↓
3. Lambda: Create workflow record (status: draft)
   ↓
4. User Uploads Documents → S3 bucket
   ↓
5. User Clicks "Start"
   ↓
6. Lambda: Enqueue workflow job → SQS
   ↓
7. Worker Lambda (triggered by SQS):
   a. Update status: running
   b. For each document:
      - Extract text (PDF/DOCX parser)
      - Chunk text (1000 token chunks, 200 overlap)
      - Generate embeddings via module-ai
      - Store in pgvector
   c. For each compliance criterion:
      - Retrieve relevant KB chunks
      - Query LLM with RAG context
      - Extract findings (compliant/non-compliant/warning)
      - Generate severity ratings
      - Create remediation recommendations
   d. Aggregate all findings
   e. Update status: complete
   ↓
8. Frontend: Poll for status updates (every 5s)
   ↓
9. Display findings and generate report
```

**Key Components:**
- **Queue:** SQS FIFO queue for ordered processing
- **Worker Lambda:** Long-running (15 min timeout), processes one workflow at a time
- **Progress Tracking:** DynamoDB table with document-level status
- **Embeddings:** Generated via module-ai provider (OpenAI, Anthropic, or AWS Bedrock)
- **Vector Storage:** pgvector extension in Supabase Postgres

---

## Chat RAG Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Chat RAG Processing Flow                                │
└─────────────────────────────────────────────────────────────────────────────────┘

1. User Sends Message in Chat
   ↓
2. Frontend → POST /api/chats/{id}/messages
   ↓
3. Lambda: Store message in DB
   ↓
4. If KB grounding enabled:
   a. Generate embedding for user message
   b. Query pgvector for similar chunks:
      SELECT content, metadata, similarity
      FROM kb_embeddings
      WHERE workspace_id = ? AND similarity > 0.75
      ORDER BY similarity DESC
      LIMIT 10
   c. Retrieve top 10 chunks
   d. Build context from chunks
   ↓
5. Call LLM via module-ai:
   - System prompt: "You are a CJIS compliance expert..."
   - Context: Retrieved KB chunks
   - User message: User's question
   - Temperature: 0.7 (for consistent analysis)
   ↓
6. LLM Response with Citations:
   - Answer with inline citations [1], [2]
   - Reference list at end
   ↓
7. Store assistant message with metadata:
   - chunks_used (for citation tracking)
   - tokens_used (for billing)
   - model_used (from module-ai)
   ↓
8. Return response to frontend
```

**Key Features:**
- **Semantic Search:** pgvector cosine similarity for chunk retrieval
- **Citation Tracking:** Associate response with source chunks
- **Conversation History:** Include last N messages for context
- **Token Optimization:** Truncate old messages if context too large

---

## Sample CJIS Compliance Findings

### Example 1: Non-Compliant Finding

```yaml
Finding ID: F-2026-005-001
Policy Area: 5.4 - Personnel Screening
Severity: High
Status: Non-Compliant
Organization Policy: "Personnel-Screening-Procedures.docx"
CJIS Requirement: "All personnel with access to CJI must undergo FBI-approved background checks"
Gap Identified: |
  Current policy requires state-level background checks but does not specify FBI-approved 
  fingerprint-based background checks as required by CJIS Security Policy Section 5.4.2.
Evidence: |
  Policy states: "All new hires must complete state background check within 30 days of hire."
  Missing: FBI fingerprint-based check requirement.
Remediation: |
  1. Update Personnel Screening Policy to require FBI fingerprint-based background checks
  2. Partner with FBI-approved channeling agency for fingerprint submission
  3. Implement 90-day compliance window for existing personnel
  4. Estimated cost: $45,000 (150 personnel × $300 per check)
  5. Timeline: 6-8 weeks for policy update, 90 days for personnel compliance
Risk: |
  Non-compliance may result in loss of CJIS access, impacting critical law enforcement operations.
```

### Example 2: Warning Finding

```yaml
Finding ID: F-2026-010-008
Policy Area: 10.3 - Encryption
Severity: Medium
Status: Warning
Organization Policy: "Encryption-Standards-Policy.pdf"
CJIS Requirement: "CJI in transit must use FIPS 140-2 validated encryption"
Gap Identified: |
  Policy specifies "TLS 1.2 or higher" but does not explicitly require FIPS 140-2 validation.
  AWS infrastructure uses FIPS-validated modules, but policy documentation should be explicit.
Evidence: |
  Policy states: "All data transmissions must use TLS 1.2 or higher encryption."
  AWS ALB/NLB uses FIPS 140-2 validated OpenSSL, but not documented in policy.
Remediation: |
  1. Update Encryption Standards Policy to explicitly reference FIPS 140-2 validation
  2. Document AWS infrastructure FIPS compliance in policy appendix
  3. No infrastructure changes required (already compliant)
  4. Estimated cost: $2,000 (policy documentation update)
  5. Timeline: 2 weeks
Risk: |
  Documentation gap may cause confusion during formal audit, but technical controls are adequate.
```

### Example 3: Compliant Finding

```yaml
Finding ID: F-2026-006-003
Policy Area: 6.2 - Advanced Authentication
Severity: N/A
Status: Compliant
Organization Policy: "Multi-Factor-Authentication-Policy.docx"
CJIS Requirement: "Advanced authentication required for remote access to CJI"
Assessment: |
  Policy requires MFA for all remote access using NIST 800-63B AAL2-compliant methods.
  Implementation uses AWS Cognito with TOTP and hardware tokens.
Evidence: |
  Policy excerpt: "All remote access to CJI systems requires multi-factor authentication 
  using NIST 800-63B Authenticator Assurance Level 2 (AAL2) compliant methods."
  Technical verification confirms AWS Cognito MFA enforcement for all remote users.
Best Practice: |
  Policy exceeds CJIS minimum requirements by supporting multiple MFA methods 
  (TOTP, hardware tokens, and biometric authentication).
```

---

## Database Schema Changes

### New Tables for Enhanced Functionality

```sql
-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('triennial', 'on-demand')),
  policy_area TEXT, -- e.g., "Policy Area 5", "Policy Area 6"
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'complete', 'failed')),
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  documents_total INTEGER DEFAULT 0,
  documents_processed INTEGER DEFAULT 0,
  findings_critical INTEGER DEFAULT 0,
  findings_non_compliant INTEGER DEFAULT 0,
  findings_warning INTEGER DEFAULT 0,
  findings_compliant INTEGER DEFAULT 0,
  compliance_criteria JSONB, -- Selected KB docs for evaluation
  advanced_options JSONB, -- Checkboxes from dialog
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Workflow documents (many-to-many)
CREATE TABLE workflow_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'analyzed', 'failed')),
  findings_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, document_id)
);

-- Workflow findings
CREATE TABLE workflow_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  finding_type TEXT NOT NULL CHECK (finding_type IN ('critical', 'non-compliant', 'warning', 'compliant')),
  policy_area TEXT NOT NULL,
  cjis_requirement TEXT NOT NULL,
  gap_identified TEXT,
  evidence TEXT,
  remediation TEXT,
  risk_description TEXT,
  estimated_cost DECIMAL(10,2),
  timeline_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents table (for both workflow docs and KB docs)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'xlsx'
  file_size_bytes BIGINT NOT NULL,
  s3_key TEXT NOT NULL, -- S3 object key
  s3_bucket TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('workflow', 'kb')),
  category TEXT, -- For KB docs: 'cjis-guidance', 'cloud-security', 'standards', etc.
  is_indexed BOOLEAN DEFAULT false, -- For KB docs: vectorized and ready for RAG
  page_count INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge base embeddings (pgvector)
CREATE TABLE kb_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL, -- Original text chunk
  embedding vector(1536), -- OpenAI ada-002 or equivalent
  metadata JSONB, -- {page_num, section, category, etc.}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create vector similarity index
CREATE INDEX kb_embeddings_embedding_idx ON kb_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'workspace' CHECK (visibility IN ('workspace', 'private')),
  kb_enabled BOOLEAN NOT NULL DEFAULT true,
  kb_settings JSONB, -- {max_chunks: 10, similarity_threshold: 0.75, prefer_recent: true}
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  chunks_used UUID[], -- Array of kb_embeddings.id for citations
  tokens_used INTEGER,
  model_used TEXT, -- From module-ai
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## API Endpoints

### Workflows

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/workflows?workspaceId={uuid}` | List workflows | Member |
| POST | `/api/workflows` | Create workflow | Owner/Admin |
| GET | `/api/workflows/:id` | Get workflow details | Member |
| PUT | `/api/workflows/:id` | Update workflow config | Owner/Admin |
| POST | `/api/workflows/:id/start` | Start workflow processing | Owner/Admin |
| DELETE | `/api/workflows/:id` | Delete workflow | Owner/Admin |
| GET | `/api/workflows/:id/findings` | Get workflow findings | Member |
| GET | `/api/workflows/:id/report` | Generate PDF report | Member |

### Documents

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/documents?workspaceId={uuid}&type={workflow|kb}` | List documents | Member |
| POST | `/api/documents/upload` | Upload document | Owner/Admin |
| GET | `/api/documents/:id` | Get document metadata | Member |
| GET | `/api/documents/:id/download` | Download document | Member |
| DELETE | `/api/documents/:id` | Delete document | Owner/Admin |
| POST | `/api/documents/:id/reindex` | Re-index KB document | Owner/Admin |

### Chats

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/chats?workspaceId={uuid}` | List chats (workspace + user's private) | Member |
| POST | `/api/chats` | Create chat | Member |
| GET | `/api/chats/:id` | Get chat details | Member (with visibility check) |
| PUT | `/api/chats/:id` | Update chat settings | Creator |
| DELETE | `/api/chats/:id` | Delete chat | Creator |
| GET | `/api/chats/:id/messages` | Get chat messages | Member (with visibility check) |
| POST | `/api/chats/:id/messages` | Send message | Member (with visibility check) |

---

## Frontend Components

### New Components Needed

| Component | Purpose | Location |
|-----------|---------|----------|
| `WorkflowList` | Display workflow cards | `module-workflow/frontend/components/` |
| `WorkflowCard` | Individual workflow card | `module-workflow/frontend/components/` |
| `WorkflowForm` | Create/edit workflow dialog | `module-workflow/frontend/components/` |
| `WorkflowProgress` | Progress bar with stats | `module-workflow/frontend/components/` |
| `FindingsList` | Display findings table | `module-workflow/frontend/components/` |
| `FindingCard` | Individual finding detail | `module-workflow/frontend/components/` |
| `ChatList` | Display chat cards | `module-chat/frontend/components/` |
| `ChatCard` | Individual chat card | `module-chat/frontend/components/` |
| `ChatForm` | Create chat dialog | `module-chat/frontend/components/` |
| `ChatInterface` | Full-page chat UI | `module-chat/frontend/pages/` |
| `MessageList` | Chat message thread | `module-chat/frontend/components/` |
| `MessageInput` | Chat message composer | `module-chat/frontend/components/` |
| `DocumentList` | Document table with filters | `module-kb/frontend/components/` |
| `DocumentUpload` | Drag & drop upload | `module-kb/frontend/components/` |
| `DocumentPreview` | Inline document viewer | `module-kb/frontend/components/` |
| `KBStats` | KB statistics display | `module-kb/frontend/components/` |

### Enhanced Workspace Detail Page

```typescript
// module-ws/frontend/pages/WorkspaceDetailPage.tsx (enhanced)

export function WorkspaceDetailPage() {
  const [activeTab, setActiveTab] = useState<'activities' | 'docs' | 'members' | 'settings'>('activities');
  
  return (
    <Container maxWidth="lg">
      <Breadcrumbs />
      <WorkspaceHeader />
      
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
        <Tab label="Activities" value="activities" />
        <Tab label="Docs" value="docs" />
        <Tab label="Members" value="members" />
        <Tab label="Settings" value="settings" />
      </Tabs>
      
      {activeTab === 'activities' && (
        <>
          <WorkflowList workspaceId={workspaceId} />
          <ChatList workspaceId={workspaceId} />
        </>
      )}
      
      {activeTab === 'docs' && (
        <>
          <DocumentList workspaceId={workspaceId} type="workflow" />
          <DocumentList workspaceId={workspaceId} type="kb" />
        </>
      )}
      
      {activeTab === 'members' && <MemberList />}
      {activeTab === 'settings' && <WorkspaceSettings />}
    </Container>
  );
}
```

---

## Implementation Checklist

When ready to toggle to Act Mode, the implementation will follow these steps:

- [ ] **Database Schema**
  - [ ] Create workflows table
  - [ ] Create workflow_documents table
  - [ ] Create workflow_findings table
  - [ ] Create documents table
  - [ ] Create kb_embeddings table with pgvector
  - [ ] Create chats table
  - [ ] Create chat_messages table

- [ ] **Backend - module-workflow**
  - [ ] Create workflow Lambda (CRUD operations)
  - [ ] Create workflow processor Lambda (SQS worker)
  - [ ] Implement document text extraction (PDF/DOCX)
  - [ ] Implement chunking and embedding generation
  - [ ] Implement RAG-based compliance evaluation
  - [ ] Implement findings aggregation
  - [ ] Implement PDF report generation

- [ ] **Backend - module-chat**
  - [ ] Create chat Lambda (CRUD operations)
  - [ ] Implement message storage
  - [ ] Implement RAG retrieval from pgvector
  - [ ] Implement LLM integration via module-ai
  - [ ] Implement citation tracking

- [ ] **Backend - module-kb**
  - [ ] Create document Lambda (CRUD operations)
  - [ ] Implement S3 upload/download
  - [ ] Implement document indexing to pgvector
  - [ ] Implement KB statistics calculation

- [ ] **Frontend - module-workflow**
  - [ ] WorkflowList component
  - [ ] WorkflowCard component
  - [ ] WorkflowForm dialog
  - [ ] FindingsList component
  - [ ] Workflow progress polling

- [ ] **Frontend - module-chat**
  - [ ] ChatList component
  - [ ] ChatCard component
  - [ ] ChatForm dialog
  - [ ] ChatInterface full-page
  - [ ] MessageList with citations
  - [ ] MessageInput with file attachments

- [ ] **Frontend - module-kb**
  - [ ] DocumentList component with filters
  - [ ] DocumentUpload drag & drop
  - [ ] DocumentPreview inline viewer
  - [ ] KBStats display

- [ ] **Frontend - module-ws (enhancements)**
  - [ ] Update WorkspaceDetailPage with tabs
  - [ ] Integrate WorkflowList into Activities tab
  - [ ] Integrate ChatList into Activities tab
  - [ ] Integrate DocumentList into Docs tab

- [ ] **Infrastructure**
  - [ ] Create S3 bucket for document storage
  - [ ] Create SQS FIFO queue for workflow processing
  - [ ] Deploy pgvector extension to Supabase
  - [ ] Configure Lambda timeouts (15 min for processor)
  - [ ] Set up CloudWatch alarms for queue depth

- [ ] **Testing**
  - [ ] Unit tests for workflow processing
  - [ ] Integration tests for RAG retrieval
  - [ ] End-to-end tests for full workflow
  - [ ] Load testing for concurrent workflows
  - [ ] Validate CJIS compliance criteria accuracy

---

**Document Status:** Ready for Review  
**Next Steps:** User review and feedback, then toggle to Act Mode for implementation  
**Estimated Implementation Time:** 40-60 hours (10-15 days at 4-6 hours/day)
