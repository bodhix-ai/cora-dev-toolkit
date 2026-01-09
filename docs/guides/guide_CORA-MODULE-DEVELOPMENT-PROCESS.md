# CORA Module Development Process Guide

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025

## Table of Contents

1. [Overview](#overview)
2. [Process Summary](#process-summary)
3. [Complexity Classification](#complexity-classification)
4. [Phase 0: Prerequisites](#phase-0-prerequisites)
5. [Phase 1: Discovery & Analysis](#phase-1-discovery--analysis)
6. [Phase 2: Design Approval](#phase-2-design-approval)
7. [Phase 3: Implementation](#phase-3-implementation)
8. [Phase 4: Validation & Deployment](#phase-4-validation--deployment)
9. [Continuous Improvement](#continuous-improvement)
10. [AI Prompting Templates](#ai-prompting-templates)

---

## Overview

This guide defines the **AI-driven, human-supported process** for developing CORA-compliant modules in ≤8 hours (simple modules) to ≤40 hours (complex modules).

### Goals

- **Speed**: Deliver working modules quickly (8-40 hours)
- **Quality**: Ensure CORA compliance and integration
- **Collaboration**: AI performs analysis/implementation, human provides approval/guidance
- **Improvement**: Continuous process refinement through retrospectives

### Key Principles

1. **AI-Driven Development**: AI performs most technical work
2. **Human Approval Gates**: Critical decisions require human sign-off
3. **Template-Based**: Leverage existing templates and patterns
4. **Standards-Compliant**: All modules follow CORA standards
5. **Iterative Improvement**: Process refined based on retrospectives

---

## Process Summary

```
┌─────────────────────────────────────────────────────────┐
│ Phase 0: Prerequisites (Before Starting)                │
│ ✓ Module registration system ready                      │
│ ✓ Core modules available (access, ai, mgmt)            │
│ ✓ Source code or use cases identified                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Discovery & Analysis (1-8 hours)              │
│ AI: Analyze source, extract entities, identify deps     │
│ AI: Generate Module Specification Document              │
│ Human: Review findings                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 2: Design Approval (Approval Gate)               │
│ Human: Review specification                             │
│ Human: Approve/request changes                          │
│ Human: Confirm dependency approach                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 3: Implementation (4-24 hours)                    │
│ AI: Generate module scaffolding                         │
│ AI: Implement backend, frontend, database               │
│ AI: Integrate with core modules                         │
│ AI: Generate documentation                              │
│ Human: Code review                                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Phase 4: Validation & Deployment (2-8 hours)           │
│ AI: Run compliance checks                               │
│ AI: Generate configuration guide                        │
│ AI: Register module                                     │
│ Human: Final approval and deployment                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Retrospective: Continuous Improvement                   │
│ Team: What went well? What can improve?                 │
│ Team: Update process documentation                      │
└─────────────────────────────────────────────────────────┘
```

---

## Complexity Classification

| Level | Time Estimate | Characteristics | Examples |
|-------|--------------|-----------------|----------|
| **Simple** | 8 hours | • Single entity<br>• CRUD operations<br>• Standard core module integrations<br>• Minimal AI features | `module-ws` (workspace/project) |
| **Medium** | 16-24 hours | • 2-3 entities<br>• Moderate AI integration<br>• 1-2 functional dependencies<br>• Custom business logic | `module-kb` (knowledge base)<br>`module-chat` (chat with KB) |
| **Complex** | 32-40 hours | • Multiple entities<br>• Deep AI integration<br>• Multiple dependencies<br>• Workflow orchestration<br>• Legacy code migration | `module-wf` (workflow engine)<br>`module-interview` (AI interview) |

**Determine complexity during Phase 1 (Discovery & Analysis)**

---

## Phase 0: Prerequisites

**Before starting any module development**, ensure these prerequisites are met.

### System Prerequisites

- [ ] **Module Registration System Ready**
  - Module import script exists: `scripts/import-module.sh`
  - Module configuration system defined
  - Module registry database tables created

- [ ] **Core Modules Available**
  - `module-access` - v1.0.0+
  - `module-ai` - v1.0.0+
  - `module-mgmt` - v1.0.0+

- [ ] **Development Environment**
  - Target project setup ({project}-stack, {project}-infra)
  - Database access configured
  - AWS credentials configured
  - Development tools installed (terraform, pnpm, python3)

### Input Prerequisites

**Choose ONE source for module development:**

**Option A: Legacy Code Migration**
- [ ] Legacy codebase identified
- [ ] Access to source code repository
- [ ] Understanding of business requirements

**Option B: Use Case Driven**
- [ ] Written use cases documented
- [ ] Business requirements defined
- [ ] User stories available

### Tools & Templates

- [ ] `cora-dev-toolkit` cloned and updated
- [ ] `scripts/create-cora-module.sh` available
- [ ] `templates/_module-template/` exists
- [ ] `docs/standards/` documentation reviewed

---

## Phase 1: Discovery & Analysis

**Time Estimate:** 1-8 hours (depending on complexity)  
**AI-Driven:** 90% | **Human:** 10%

### Objectives

1. Understand source code or use cases
2. Identify entities and database schema
3. Map API endpoints and business logic
4. Identify dependencies (core + functional)
5. Generate Module Specification Document

### AI Activities

#### Step 1.1: Analyze Source Material

**For Legacy Code Migration:**

```bash
# AI reads legacy codebase
read_file: /path/to/legacy/lambda_function.py
read_file: /path/to/legacy/schema.sql
search_files: /path/to/legacy/ regex:"def.*handler"
```

**AI Extraction Checklist:**
- [ ] Identify all Lambda functions
- [ ] Extract database tables and columns
- [ ] Map HTTP endpoints to handlers
- [ ] Identify business logic patterns
- [ ] List external dependencies
- [ ] Find data relationships

**For Use Case Driven:**

```bash
# AI reads use case documents
read_file: use-cases/module-feature-requirements.md
read_file: user-stories/epic-123.md
```

**AI Extraction Checklist:**
- [ ] Identify user roles and permissions
- [ ] List required features
- [ ] Define data entities
- [ ] Map user workflows
- [ ] Identify integration points

#### Step 1.2: Identify Entities

**AI Entity Analysis:**

For each identified entity, determine:
- **Entity Name** (singular, lowercase)
- **Primary Fields** (id, name, description, etc.)
- **Relationships** (belongs_to, has_many)
- **Business Rules** (validation, state transitions)
- **Multi-tenancy** (org_id required?)

**Example Output:**

```markdown
## Identified Entities

### 1. kb_base (Knowledge Base)
- **Purpose**: Container for documents in a knowledge base
- **Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to org)
  - name (VARCHAR, required)
  - description (TEXT, optional)
  - embedding_model (VARCHAR, AI config)
  - status (VARCHAR, enum: active/archived)
- **Relationships**:
  - belongs_to: org
  - has_many: kb_document
- **Business Rules**:
  - Unique name per organization
  - Cannot delete if has documents
```

#### Step 1.3: Identify API Endpoints

**AI Endpoint Mapping:**

For each entity, map CRUD operations:
- GET /api/{module}/{entities}?orgId={uuid}
- POST /api/{module}/{entities}
- GET /api/{module}/{entities}/{id}
- PUT /api/{module}/{entities}/{id}
- DELETE /api/{module}/{entities}/{id}

Plus any custom operations (search, process, etc.)

#### Step 1.4: Identify Dependencies

**Core Module Dependencies (Always Required):**
- [ ] `module-access` - For authentication, authorization, DB access
- [ ] `module-ai` - For AI model access (if using AI features)
- [ ] `module-mgmt` - For module registration

**Functional Module Dependencies:**

**Analysis Questions:**
- Does this module need document storage? → Depends on `module-kb`
- Does this module need chat features? → Depends on `module-chat`
- Does this module orchestrate workflows? → May depend on other modules

**Dependency Decision Tree:**

```
Is there document upload/processing?
  YES → Depends on module-kb
  NO → Continue

Is there chat/messaging?
  YES → Depends on module-chat (which may depend on module-kb)
  NO → Continue

Is there workflow orchestration?
  YES → Depends on module-wf (if exists)
  NO → Continue

Does it call other module APIs?
  YES → Add those modules as dependencies
  NO → No additional functional dependencies
```

#### Step 1.5: Determine Complexity

**AI Complexity Assessment:**

```python
def assess_complexity(module_analysis):
    score = 0
    
    # Entity count
    if entities > 3:
        score += 2
    elif entities > 1:
        score += 1
    
    # AI integration depth
    if uses_embeddings or uses_llm_orchestration:
        score += 2
    elif uses_simple_llm_calls:
        score += 1
    
    # Functional dependencies
    score += len(functional_dependencies)
    
    # Legacy code complexity
    if legacy_code_lines > 1000:
        score += 2
    elif legacy_code_lines > 500:
        score += 1
    
    # Business logic complexity
    if has_state_machines or has_workflows:
        score += 1
    
    # Classify
    if score <= 2:
        return "Simple" # 8 hours
    elif score <= 5:
        return "Medium" # 16-24 hours
    else:
        return "Complex" # 32-40 hours
```

#### Step 1.6: Generate Module Specifications

**AI generates multiple specification documents** to separate concerns and improve maintainability.

**Specification Structure:**

```
docs/specifications/{module-name}/
├── MODULE-{MODULE_NAME}-SPEC.md (Parent - 200-300 lines)
├── MODULE-{MODULE_NAME}-TECHNICAL-SPEC.md (800-4000 lines)
├── MODULE-{MODULE_NAME}-USER-UX-SPEC.md (400-2000 lines)
└── MODULE-{MODULE_NAME}-ADMIN-UX-SPEC.md (300-1500 lines)
```

**1. Parent Specification** (Template: `MODULE-SPEC-PARENT-TEMPLATE.md`)

**Contents:**
- Module overview and purpose
- Complexity assessment and time estimates
- References to subordinate specifications
- High-level architecture summary
- Entity summary table
- Integration points overview
- Implementation phases checklist
- Configuration requirements
- Success criteria
- Approval sign-off section

**Size:** 200-300 lines (regardless of complexity)

**2. Technical Specification** (Template: `MODULE-SPEC-TECHNICAL-TEMPLATE.md`)

**Contents:**
- Complete data model (entities, fields, relationships)
- Database schema (migrations, indexes, triggers)
- RLS policies and security
- API endpoints (request/response schemas, validation)
- Core module integrations (access, ai, mgmt)
- Functional module dependencies
- Backend implementation patterns
- Infrastructure requirements (Terraform, IAM)
- Backend testing requirements

**Size:** 
- Simple modules: 800-1200 lines
- Medium modules: 1200-2000 lines
- Complex modules: 2000-4000 lines

**3. User UX Specification** (Template: `MODULE-SPEC-USER-UX-TEMPLATE.md`)

**Contents:**
- User personas and use cases
- User journey maps and flow diagrams
- Page-by-page UI specifications
- Component library usage
- User interaction patterns (forms, lists, detail views)
- Mobile responsiveness requirements
- Accessibility requirements (WCAG 2.1 AA)
- Frontend testing requirements (user flows)

**Size:**
- Simple modules: 400-600 lines
- Medium modules: 600-1000 lines
- Complex modules: 1000-2000 lines

**4. Admin UX Specification** (Template: `MODULE-SPEC-ADMIN-UX-TEMPLATE.md`)

**Contents:**
- Admin personas and use cases
- Admin configuration flows
- Platform admin UI design (module config page)
- Organization admin UI design (module management)
- Monitoring and analytics interfaces
- Admin card design and integration
- Admin testing requirements

**Size:**
- Simple modules: 300-500 lines
- Medium modules: 500-800 lines
- Complex modules: 800-1500 lines

**Benefits of Split Specifications:**

1. **Separation of Concerns**: Technical, user UX, and admin UX kept separate
2. **Scalability**: Can handle complex modules with 3000-5000 total lines split across documents
3. **Parallel Work**: Different team members can work on different specs simultaneously
4. **Easier Review**: Reviewers can focus on specific aspects (UX vs technical)
5. **Reusability**: Technical patterns can be reviewed independently from UX
6. **Maintainability**: Changes to UX don't require re-reading entire technical spec

### Human Activities

#### Review Specifications

**Human reviews AI-generated specifications:**

**Parent Specification Review:**
- [ ] Module overview clear and accurate?
- [ ] Complexity assessment reasonable?
- [ ] High-level architecture makes sense?
- [ ] All subordinate specs referenced correctly?

**Technical Specification Review:**
- [ ] Entity definitions make sense?
- [ ] API endpoints cover all use cases?
- [ ] Database schema appropriate?
- [ ] Dependencies are correct?
- [ ] Integration patterns clear?

**User UX Specification Review:**
- [ ] User personas accurate?
- [ ] User journeys cover all workflows?
- [ ] UI specifications clear and complete?
- [ ] Accessibility requirements defined?

**Admin UX Specification Review:**
- [ ] Admin use cases covered?
- [ ] Configuration flows clear?
- [ ] Admin card design appropriate?
- [ ] Monitoring requirements defined?

**Provide Feedback:**
- Clarify ambiguities
- Request changes to specific specs
- Approve or request re-analysis

### Deliverable

**Module Specification Documents**: 
- `docs/specifications/{module-name}/MODULE-{MODULE_NAME}-SPEC.md` (Parent)
- `docs/specifications/{module-name}/MODULE-{MODULE_NAME}-TECHNICAL-SPEC.md`
- `docs/specifications/{module-name}/MODULE-{MODULE_NAME}-USER-UX-SPEC.md`
- `docs/specifications/{module-name}/MODULE-{MODULE_NAME}-ADMIN-UX-SPEC.md`

---

## Phase 2: Design Approval

**Time Estimate:** 0.5-2 hours  
**Human-Driven:** 90% | **AI:** 10%

### Objectives

1. Human reviews and approves module design
2. Validate dependency approach
3. Confirm core module integration points
4. Approve implementation plan
5. Sign-off to proceed to implementation

### Approval Checklist

#### Module Design Review

- [ ] **Module Purpose Clear**: Is it clear what problem this module solves?
- [ ] **Entities Well-Defined**: Do the entities match business requirements?
- [ ] **API Design Appropriate**: Are endpoints RESTful and complete?
- [ ] **Scope Appropriate**: Is scope too broad or too narrow?

#### Dependency Review

- [ ] **Core Dependencies**: All 3 core modules included?
- [ ] **Functional Dependencies**: Are functional deps necessary and correct?
- [ ] **No Circular Dependencies**: Dependency graph is acyclic?
- [ ] **Dependency Integration**: Is integration approach clear?

#### Integration Review

- [ ] **module-access Integration**: Auth, multi-tenancy, DB access patterns defined?
- [ ] **module-ai Integration**: AI provider usage clear?
- [ ] **module-mgmt Integration**: Module registration approach defined?
- [ ] **Functional Module Integration**: Shared method usage clear?

#### Implementation Plan Review

- [ ] **Database Schema**: Schema design appropriate?
- [ ] **Migration Strategy**: Clear path from legacy (if applicable)?
- [ ] **Time Estimate**: Realistic based on complexity?
- [ ] **Milestones**: Implementation broken into clear phases?

### Decision

**Option 1: Approve**
- Sign-off to proceed to Phase 3 (Implementation)

**Option 2: Request Changes**
- Provide feedback to AI
- AI updates specification
- Re-review (iterate until approved)

**Option 3: Reject**
- Module scope needs rethinking
- Return to Phase 1 with new guidance

### Deliverable

**Approved Specification** with human sign-off

---

## Phase 3: Implementation

**Time Estimate:** 4-24 hours (depending on complexity)  
**AI-Driven:** 85% | **Human:** 15%

### Objectives

1. Generate module scaffolding
2. Implement backend (Lambdas, common layer)
3. Implement database (schema, migrations, RLS)
4. Implement frontend (components, hooks)
5. Integrate with core modules
6. Integrate with functional modules (if applicable)
7. Generate module documentation

### Step 3.1: Module Scaffolding

**AI Activity:**

```bash
# Generate module structure from template
cd cora-dev-toolkit
./scripts/create-cora-module.sh {module-name} {primary-entity}

# Result: packages/{module-name}/ created with:
# - backend/lambdas/{entity}/lambda_function.py
# - backend/layers/module-common/
# - db/schema/*.sql
# - frontend/components/
# - frontend/hooks/
# - infrastructure/
# - module.json
# - README.md
```

**Post-Generation Updates:**

AI updates `module.json` with:
- Correct dependencies
- Configuration schema
- Provided exports

### Step 3.2: Backend Implementation

**AI Implementation Sequence:**

#### 3.2.1: Lambda Function (CRUD Handlers)

**Use existing template pattern from `guide_AI-MODULE-DEVELOPMENT.md`**

```python
# packages/{module}/backend/lambdas/{entity}/lambda_function.py

import json
from typing import Dict, Any
import access_common as access  # Core dependency
import ai_common as ai  # Core dependency (if using AI)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    print(json.dumps(event, default=str))
    
    try:
        # Extract user (use module-access)
        user_info = access.get_user_from_event(event)
        user_id = access.get_supabase_user_id_from_okta_uid(user_info['user_id'])
        
        # Route to handlers
        http_method = event.get('httpMethod')
        
        if http_method == 'GET':
            return handle_get(event, user_id)
        elif http_method == 'POST':
            return handle_create(event, user_id)
        elif http_method == 'PUT':
            return handle_update(event, user_id)
        elif http_method == 'DELETE':
            return handle_delete(event, user_id)
        else:
            return access.bad_request_response('Invalid method')
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return access.internal_error_response('Internal error')

def handle_get(event, user_id):
    query_params = event.get('queryStringParameters', {}) or {}
    org_id = query_params.get('orgId')
    
    # Validate org access (use module-access)
    if not org_id:
        raise access.ValidationError('orgId required')
    
    org_id = access.validate_uuid(org_id, 'orgId')
    
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    
    if not membership:
        return access.forbidden_response('No access to org')
    
    # Query entities (filter by org_id!)
    entities = access.find_many(
        table='{entity}',
        filters={'org_id': org_id},
        select='*'
    )
    
    return access.success_response(access.format_records(entities))

# Implement handle_create, handle_update, handle_delete following template
```

#### 3.2.2: Common Layer (Shared Methods)

If module exports shared functionality for other modules:

```python
# packages/{module}/backend/layers/{module}-common/python/{module}_common/__init__.py

from typing import Dict, Any, List
import access_common as access

def search_documents(org_id: str, kb_base_id: str, query: str, limit: int = 10) -> List[Dict]:
    """
    Search documents in KB base
    Used by other modules (e.g., module-chat)
    """
    # Implementation
    pass

def upload_document(org_id: str, kb_base_id: str, file_path: str) -> Dict:
    """
    Upload document to KB
    Used by other modules (e.g., module-wf)
    """
    # Implementation
    pass

# Export public API
__all__ = ['search_documents', 'upload_document']
```

#### 3.2.3: Core Module Integration

**module-access Integration:**
- Use `access_common` for all DB operations
- Use standard response functions
- Verify org membership before all operations

**module-ai Integration (if using AI):**
```python
import ai_common as ai

# Get org's AI config
ai_config = ai.get_org_ai_config(org_id)

# Call AI model
response = ai.call_model(
    org_id=org_id,
    model_id=ai_config['default_model'],
    messages=[{'role': 'user', 'content': prompt}]
)

# Log usage
ai.log_model_usage(
    org_id=org_id,
    user_id=user_id,
    model_id=ai_config['default_model'],
    tokens_used=response['usage']['total_tokens']
)
```

**module-mgmt Integration:**
- Export health check endpoint
- Provide module metadata for registration

#### 3.2.4: Functional Module Integration (if applicable)

**Example: module-chat using module-kb**

```python
import kb_common as kb

# Search KB for context
if chat.get('kb_base_id'):
    relevant_docs = kb.search_documents(
        org_id=org_id,
        kb_base_id=chat['kb_base_id'],
        query=user_message,
        limit=5
    )
    context = kb.format_context_for_llm(relevant_docs)
```

### Step 3.3: Database Implementation

**AI Implementation Sequence:**

#### 3.3.1: Schema File Pattern

**CRITICAL: One SQL file per table, containing ALL related components**

Each table gets its own SQL file that includes:
1. Table definition with constraints
2. Indexes
3. Comments
4. RLS policies (enable + all policy definitions)
5. Triggers
6. Seed data (if applicable)
7. Grants

**Why this pattern?**
- **Idempotency**: Each file can be re-run safely
- **Atomicity**: All related components for a table are together
- **Readability**: One file = one table = complete definition
- **Reference**: See `templates/_cora-core-modules/module-mgmt/db/schema/001-platform-lambda-config.sql` for example

**File naming convention:**
```
db/schema/
├── 001-{entity1}.sql        # First entity (complete definition)
├── 002-{entity2}.sql        # Second entity (complete definition)
├── 003-{entity3}.sql        # Third entity (complete definition)
└── 00N-{module}-rpc-functions.sql  # Shared RPC functions (if any cross multiple tables)
```

**❌ WRONG Pattern (Do NOT do this):**
```
db/schema/
├── 001_create_tables.sql      # All tables in one file
├── 002_helper_functions.sql   # Functions separate
└── 003_rls_policies.sql       # RLS separate
```

**✅ CORRECT Pattern:**
```
db/schema/
├── 001-workspace.sql          # workspace table + indexes + comments + RLS + triggers
├── 002-ws-member.sql          # ws_member table + indexes + comments + RLS + triggers
├── 003-ws-config.sql          # ws_config table + indexes + comments + RLS + triggers + seed
├── 004-ws-favorite.sql        # ws_favorite table + indexes + comments + RLS + triggers
└── 005-workspace-rpc-functions.sql  # RPC functions that span multiple tables
```

#### 3.3.2: Complete Schema File Template

```sql
-- =============================================
-- MODULE-{MODULE}: {Entity} Table
-- =============================================
-- Purpose: {Description of the entity}
-- Source: Created for CORA toolkit {Date}

-- =============================================
-- {ENTITY} TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.{entity} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT {entity}_status_check CHECK (status IN ('active', 'archived'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_{entity}_org_id ON public.{entity}(org_id);
CREATE INDEX IF NOT EXISTS idx_{entity}_status ON public.{entity}(status);
CREATE INDEX IF NOT EXISTS idx_{entity}_created_at ON public.{entity}(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_{entity}_updated_at ON public.{entity}(updated_at DESC);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.{entity} IS '{Description of table purpose}';
COMMENT ON COLUMN public.{entity}.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.{entity}.name IS '{Column description}';
-- Add comments for all columns

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.{entity} ENABLE ROW LEVEL SECURITY;

-- Select policy (who can read)
DROP POLICY IF EXISTS "{Entity} members can view" ON public.{entity};
CREATE POLICY "{Entity} members can view" ON public.{entity}
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = {entity}.org_id
        AND org_members.person_id = auth.uid()
        AND org_members.active = true
    )
);

-- Insert policy (who can create)
DROP POLICY IF EXISTS "Org members can create {entity}" ON public.{entity};
CREATE POLICY "Org members can create {entity}" ON public.{entity}
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_members.org_id = {entity}.org_id
        AND org_members.person_id = auth.uid()
        AND org_members.active = true
    )
);

-- Update policy (who can modify)
DROP POLICY IF EXISTS "Authorized users can update {entity}" ON public.{entity};
CREATE POLICY "Authorized users can update {entity}" ON public.{entity}
FOR UPDATE
TO authenticated
USING (can_modify_org_data(org_id))
WITH CHECK (can_modify_org_data(org_id));

-- Delete policy (who can delete)
DROP POLICY IF EXISTS "Authorized users can delete {entity}" ON public.{entity};
CREATE POLICY "Authorized users can delete {entity}" ON public.{entity}
FOR DELETE
TO authenticated
USING (can_modify_org_data(org_id));

-- Service role bypass (for Lambda access)
DROP POLICY IF EXISTS "Service role full access to {entity}" ON public.{entity};
CREATE POLICY "Service role full access to {entity}" ON public.{entity}
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Grant usage
GRANT SELECT, INSERT, UPDATE, DELETE ON public.{entity} TO authenticated;

-- Policy comments
COMMENT ON POLICY "{Entity} members can view" ON public.{entity} IS 'Only org members can view records';

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================

CREATE OR REPLACE FUNCTION update_{entity}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS {entity}_updated_at ON public.{entity};
CREATE TRIGGER {entity}_updated_at 
    BEFORE UPDATE ON public.{entity}
    FOR EACH ROW
    EXECUTE FUNCTION update_{entity}_updated_at();

-- =============================================
-- SEED DATA (if applicable)
-- =============================================
-- Use ON CONFLICT for idempotency

-- INSERT INTO public.{entity} (col1, col2)
-- VALUES ('value1', 'value2')
-- ON CONFLICT (unique_column) DO UPDATE SET col2 = EXCLUDED.col2;
```

### Step 3.4: Frontend Implementation

**AI Implementation Sequence:**

#### 3.4.1: API Client (Factory Pattern)

```typescript
// packages/{module}/frontend/lib/api.ts

import type { AuthenticatedClient } from '@{project}/api-client';
import type { Entity, EntityCreate } from '../types';

export interface EntityApiClient {
  getEntities: (orgId: string) => Promise<Entity[]>;
  getEntity: (id: string) => Promise<Entity>;
  createEntity: (entity: EntityCreate) => Promise<Entity>;
  updateEntity: (id: string, entity: Partial<Entity>) => Promise<Entity>;
  deleteEntity: (id: string) => Promise<void>;
}

export function createEntityClient(client: AuthenticatedClient): EntityApiClient {
  return {
    getEntities: (orgId: string) => 
      client.get(`/{module}/entities?orgId=${orgId}`),
    getEntity: (id: string) => 
      client.get(`/{module}/entities/${id}`),
    createEntity: (entity: EntityCreate) => 
      client.post('/{module}/entities', entity),
    updateEntity: (id: string, entity: Partial<Entity>) => 
      client.put(`/{module}/entities/${id}`, entity),
    deleteEntity: (id: string) => 
      client.delete(`/{module}/entities/${id}`)
  };
}
```

#### 3.4.2: Custom Hooks

```typescript
// packages/{module}/frontend/hooks/useEntities.ts

import { useState, useCallback, useEffect } from 'react';
import type { AuthenticatedClient } from '@{project}/api-client';
import { createEntityClient } from '../lib/api';
import type { Entity, EntityCreate } from '../types';

export function useEntities(client: AuthenticatedClient | null, orgId: string) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    if (!client || !orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const api = createEntityClient(client);
      const data = await api.getEntities(orgId);
      setEntities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, orgId]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  return { entities, loading, error, refetch: fetchEntities };
}
```

#### 3.4.3: Components

```typescript
// packages/{module}/frontend/components/EntityList.tsx

'use client';

import React from 'react';
import { Box, List, ListItem, ListItemText, CircularProgress, Alert } from '@mui/material';
import { useSession } from 'next-auth/react';
import { createAuthenticatedClient } from '@{project}/api-client';
import { useOrganizationContext } from '@{project}/module-access-frontend';
import { useEntities } from '../hooks/useEntities';

export function EntityList() {
  const { data: session } = useSession();
  const { currentOrg } = useOrganizationContext();
  
  const client = session?.accessToken 
    ? createAuthenticatedClient(session.accessToken) 
    : null;
  
  const { entities, loading, error } = useEntities(client, currentOrg?.id || '');

  if (!session) return <Alert severity="warning">Please log in</Alert>;
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <List>
      {entities.map(entity => (
        <ListItem key={entity.id}>
          <ListItemText primary={entity.name} secondary={entity.description} />
        </ListItem>
      ))}
    </List>
  );
}
```

#### 3.4.4: Admin Card (if applicable)

```typescript
// packages/{module}/frontend/adminCard.tsx

import React from 'react';
import MyIcon from '@mui/icons-material/MyIcon';
import type { AdminCardConfig } from '@{project}/shared-types';

export const myModuleAdminCard: AdminCardConfig = {
  id: '{module}-admin',
  title: '{Module} Management',
  description: 'Manage {module} features and settings',
  icon: <MyIcon sx={{ fontSize: 48 }} />,
  href: '/admin/{module}',
  color: 'primary.main',
  order: 100,
  context: 'platform',  // or 'organization'
  requiredRoles: ['platform_owner', 'platform_admin']
};
```

### Step 3.5: Infrastructure (CRITICAL)

**⚠️ IMPORTANT:** The infrastructure folder is REQUIRED for all CORA modules. Without it, the module cannot be deployed and API routes cannot be integrated with API Gateway.

**AI Implementation:**

See `standard_module-integration-spec.md` - Infrastructure as Code section for detailed patterns.

#### Required Infrastructure Files

```
module-{name}/
└── infrastructure/
    ├── README.md         # Infrastructure documentation
    ├── versions.tf       # Terraform version constraints
    ├── variables.tf      # Module input variables
    ├── main.tf           # Lambda, IAM, EventBridge resources
    └── outputs.tf        # CRITICAL: API routes for APIGW integration
```

#### 3.5.1: versions.tf

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

#### 3.5.2: variables.tf (Required Variables)

```hcl
variable "environment" {
  description = "Environment name (dev, tst, stg, prd)"
  type        = string
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "supabase_secret_arn" {
  description = "ARN of Supabase credentials in AWS Secrets Manager"
  type        = string
  sensitive   = true
}

variable "org_common_layer_arn" {
  description = "ARN of the org_common Lambda layer"
  type        = string
}

# Plus: aws_region, log_level, sns_topic_arn, lambda_timeout, etc.
```

#### 3.5.3: main.tf (Core Resources)

```hcl
locals {
  module_name = "module-{name}"
  name_prefix = "${var.environment}-${var.project_name}-{name}"
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda" { ... }

# Lambda Function
resource "aws_lambda_function" "entity" {
  function_name = "${local.name_prefix}-entity"
  layers        = [var.org_common_layer_arn]
  ...
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "entity_apigw" { ... }

# EventBridge rules (if needed for scheduled tasks)
resource "aws_cloudwatch_event_rule" "..." { ... }
```

#### 3.5.4: outputs.tf (CRITICAL - API Routes)

**This is the most critical file!** The `api_routes` output is consumed by the infra repo's scripts to configure API Gateway.

```hcl
# CRITICAL: API routes for API Gateway integration
output "api_routes" {
  description = "API Gateway routes for this module"
  value = [
    {
      method      = "GET"
      path        = "/api/{module}/{entities}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "List entities"
    },
    {
      method      = "POST"
      path        = "/api/{module}/{entities}"
      integration = aws_lambda_function.entity.invoke_arn
      description = "Create entity"
    },
    # ... more routes matching Lambda handler
  ]
}

output "lambda_function_arns" { ... }
output "lambda_function_names" { ... }
output "iam_role_arn" { ... }
```

**⚠️ CRITICAL:** The `api_routes` output MUST stay in sync with the Lambda handler's route dispatcher!

#### Infrastructure Checklist

- [ ] `infrastructure/` directory created
- [ ] `versions.tf` with Terraform >= 1.5.0
- [ ] `variables.tf` with all required variables
- [ ] `main.tf` with Lambda, IAM, and permissions
- [ ] `outputs.tf` with `api_routes` output (CRITICAL!)
- [ ] `README.md` documenting infrastructure usage
- [ ] All API endpoints in Lambda handler have matching routes in `outputs.tf`

### Step 3.6: Module UI Integration Configuration

**⚠️ IMPORTANT:** All modules must configure their UI integration in `module.config.yaml` to appear in navigation and admin pages.

**See:** `docs/arch decisions/ADR-009-MODULE-UI-INTEGRATION.md` for full architecture details.

#### 3.6.1: Navigation Configuration

**For functional modules that users access directly**, add navigation configuration:

```yaml
# module.config.yaml
module_{name}:
  display_name: "My Module Name"
  
  # Navigation configuration (optional - only for user-facing modules)
  navigation:
    label_singular: "Item"           # Singular form (e.g., "Workspace")
    label_plural: "Items"             # Plural form used in nav (e.g., "Workspaces")
    icon: "FolderIcon"                # Must exist in iconMap.tsx
    show_in_main_nav: true            # Set to true to appear in left sidebar
    nav_priority: 20                  # Lower = higher in list (10-90)
```

**When to add navigation:**
- ✅ Functional modules with user-facing pages (`module-ws`, `module-kb`, `module-chat`)
- ✅ Modules where users browse/manage items
- ❌ Core modules that are infrastructure only (`module-access`, `module-ai`, `module-mgmt`)
- ❌ Modules with no user-facing UI

**Icon Names:**

Icons must exist in `templates/_project-stack-template/apps/web/lib/iconMap.tsx`:

```typescript
// Common icons available:
Dashboard, Shield, SmartToy, Settings, People, Business
WorkspaceIcon, Workspaces, LibraryBooks, Chat, Folder
```

**To add a new icon:**

1. Import from MUI in `iconMap.tsx`:
   ```typescript
   import MyIcon from "@mui/icons-material/MyIcon";
   ```

2. Add to `iconMap`:
   ```typescript
   export const iconMap: Record<string, ReactNode> = {
     // ...
     MyIcon: <MyIcon />,
   };
   ```

3. Use in config:
   ```yaml
   icon: "MyIcon"
   ```

#### 3.6.2: Admin Card Configuration

**All modules should provide an admin card** for configuration and management:

```yaml
# module.config.yaml
module_{name}:
  display_name: "My Module Name"
  
  # Admin card configuration (recommended for all modules)
  admin_card:
    enabled: true                     # Set to true to show admin card
    path: "/admin/{module}"           # Link to admin page
    title: "My Module Settings"       # Card title
    description: "Manage module configuration and settings"
    icon: "FolderIcon"                # Must exist in iconMap.tsx
    priority: 50                      # Lower = higher priority (10-90)
    context: "platform"               # or "organization" or omit for both
```

**Context Options:**

- `context: "platform"` - Card appears **only** on Platform Admin page
  - Use for: Platform-level settings, global configurations
  - Examples: `module-mgmt`, `module-ai` (AI providers)

- `context: "organization"` - Card appears **only** on Organization Admin page
  - Use for: Org-specific settings, org member management
  - Examples: Org-specific module configurations

- **Omit context** - Card appears on **both** Platform and Org Admin pages
  - Use for: Modules with both platform and org settings
  - Example: `module-access` (platform IDP config + org member management)

**Priority Guidelines:**

- **10-20**: Critical core modules (`module-access`, `module-ai`, `module-mgmt`)
- **30-50**: Primary functional modules (`module-ws`, `module-kb`)
- **60-80**: Secondary functional modules
- **90+**: Optional/utility modules

Lower priority = appears first in admin page.

#### 3.6.3: Complete Example

**Functional module with navigation and admin card:**

```yaml
# module-ws/module.config.yaml
module_ws:
  display_name: "Workspace Management"
  
  # User navigation
  navigation:
    label_singular: "Workspace"
    label_plural: "Workspaces"
    icon: "WorkspaceIcon"
    show_in_main_nav: true
    nav_priority: 10
  
  # Admin card
  admin_card:
    enabled: true
    path: "/admin/workspaces"
    title: "Workspace Management"
    description: "Manage workspaces, members, and configurations"
    icon: "WorkspaceIcon"
    priority: 40
    context: "platform"
  
  # Module features, settings, etc.
  features:
    enable_favorites: true
    enable_tags: true
    # ...
```

**Core module (no navigation, admin card only):**

```yaml
# module-ai/module.config.yaml
module_ai:
  display_name: "AI Provider Management"
  
  # No navigation (infrastructure module, no user-facing pages)
  
  # Admin card only
  admin_card:
    enabled: true
    path: "/admin/ai"
    title: "AI Providers"
    description: "Configure AI providers and models"
    icon: "SmartToy"
    priority: 20
    context: "platform"  # Platform-level only
  
  # AI-specific configuration
  providers:
    # ...
```

#### 3.6.4: How It Works

**Build Time:**
1. Project creation merges all `module.config.yaml` files
2. Creates: `apps/web/config/cora-modules.config.yaml`

**Runtime:**
1. **Layout (Server Component)** calls `buildNavigationConfig()`
   - Reads merged config YAML
   - Filters modules with `show_in_main_nav: true`
   - Maps icon strings to React components
   - Returns `NavigationConfig`

2. **Sidebar (Client Component)** receives navigation as prop
   - Renders MUI List dynamically
   - No hardcoded navigation items

3. **Admin Pages (Server Components)** call `getPlatformAdminCards()` or `getOrganizationAdminCards()`
   - Reads merged config YAML
   - Filters by `enabled: true` and `context`
   - Sorts by `priority`
   - Returns `AdminCardConfig[]`

**Result:** Modules automatically appear in navigation and admin pages - no code changes needed!

#### 3.6.5: Validation Checklist

After adding module UI configuration:

- [ ] `module.config.yaml` created with required sections
- [ ] Icon name exists in `iconMap.tsx` (or added)
- [ ] Navigation config added if module has user-facing pages
- [ ] Admin card config added (recommended for all modules)
- [ ] Admin card context set appropriately
- [ ] Priority set (10-90 range)
- [ ] Admin page created at path specified in config
- [ ] User page created (if navigation enabled)

### Step 3.7: Documentation

**AI generates:**

1. **Module README.md**
   - Overview
   - Features
   - Installation
   - Usage examples
   - API reference
   - UI configuration reference

2. **MODULE-CONFIG-GUIDE.md**
   - Prerequisites
   - Configuration steps
   - Environment variables
   - Navigation and admin card setup
   - Validation

3. **API Reference** (if complex)
   - Full endpoint documentation
   - Request/response examples

### Human Activities

**Code Review:**
- Review AI-generated code
- Verify UI integration config
- Test navigation and admin cards
- Provide feedback for adjustments

---

## Phase 4: Validation & Deployment

**Time Estimate:** 2-8 hours  
**AI-Driven:** 70% | **Human:** 30%

### Step 4.1: Automated Compliance Checks

**AI runs validation:**

```bash
# API compliance
python3 scripts/check-api-compliance.py {module-name}

# Frontend compliance
pnpm run check:frontend {module-name}

# Module dependencies
./scripts/validate-dependencies.sh {module-name}

# Database schema
./scripts/validate-schema.sh {module-name}
```

**Fix any issues found**

### Step 4.2: Module Configuration

**AI creates configuration guide** and validates all required config defined

### Step 4.3: Module Registration

**AI prepares registration:**

```json
{
  "project_id": "{project}",
  "module_name": "{module}",
  "module_version": "1.0.0",
  "environment": "dev",
  "status": "CONFIGURED",
  "dependencies": [
    "module-access@1.0.0",
    "module-ai@1.0.0",
    "module-mgmt@1.0.0"
  ]
}
```

### Step 4.4: Deployment

**Human activities:**

1. **Review Deployment Plan**
   - Database migrations reviewed
   - Infrastructure changes reviewed
   - Configuration validated

2. **Deploy Database**
   ```bash
   cd {project}-infra
   ./scripts/run-database-migrations.sh dev {module-name}
   ```

3. **Deploy Infrastructure**
   ```bash
   terraform plan -var-file=dev.tfvars
   terraform apply -var-file=dev.tfvars
   ```

4. **Verify Deployment**
   - Lambda functions deployed
   - API routes accessible
   - Module registered in module-mgmt

### Step 4.5: Testing

**Smoke Tests:**
- [ ] GET /api/{module}/entities returns 200
- [ ] POST /api/{module}/entities creates entity
- [ ] Frontend renders without errors
- [ ] Module appears in admin dashboard (if applicable)

### Deliverable

**Deployed, working module** registered in module-mgmt

---

## Continuous Improvement

### Retrospective After Each Module

**Schedule:** Immediately after Phase 4 completion

**Participants:** Human developer + AI collaboration record

**Questions to Answer:**

1. **What Went Well?**
   - Which phases were smooth?
   - Which AI prompts were effective?
   - Which templates were helpful?

2. **What Can Improve?**
   - Which phases took longer than expected?
   - Where did AI need multiple iterations?
   - What was confusing or unclear?

3. **What Should Change?**
   - Process modifications
   - Template updates
   - Documentation improvements
   - New automation opportunities

4. **Metrics:**
   - Actual time vs. estimated time per phase
   - Number of AI iterations needed
   - Number of human interventions
   - Compliance issues found

### Process Updates

**Based on retrospective:**

1. Update this guide with learnings
2. Update templates with improvements
3. Update AI prompting templates
4. Add new validation checks if needed
5. Refine time estimates

### Tracking

**Maintain log:**

```markdown
# Module Development Log

## module-kb (2025-12-15)
- Complexity: Medium
- Estimated: 16 hours
- Actual: 18 hours
- Issues: Dependency on module-ai not initially identified
- Improvements: Added dependency decision tree to Phase 1

## module-chat (2025-12-20)
- Complexity: Medium
- Estimated: 20 hours
- Actual: 16 hours
- Success: Reused patterns from module-kb
- Improvements: Created chat-specific templates
```

---

## AI Prompting Templates

### Phase 1: Discovery Prompt

```
I need to analyze [legacy code / use cases] to create a CORA module.

Source: [path to code or description]

Please:
1. Identify all entities (database tables, data structures)
2. Map API endpoints (REST operations)
3. Extract business logic and validation rules
4. Identify dependencies on other modules
5. Assess complexity (Simple/Medium/Complex)
6. Generate Module Specification Documents (split into 4 separate documents)

Create a directory: docs/specifications/{module-name}/

Generate these specifications using the templates:
1. MODULE-{MODULE_NAME}-SPEC.md (Parent) - Use templates/MODULE-SPEC-PARENT-TEMPLATE.md
2. MODULE-{MODULE_NAME}-TECHNICAL-SPEC.md - Use templates/MODULE-SPEC-TECHNICAL-TEMPLATE.md
3. MODULE-{MODULE_NAME}-USER-UX-SPEC.md - Use templates/MODULE-SPEC-USER-UX-TEMPLATE.md
4. MODULE-{MODULE_NAME}-ADMIN-UX-SPEC.md - Use templates/MODULE-SPEC-ADMIN-UX-TEMPLATE.md

Follow the guidelines in:
- docs/standards/standard_MODULE-DEPENDENCIES.md
- docs/standards/standard_module-integration-spec.md
- docs/standards/standard_CORA-FRONTEND.md
```

### Phase 3: Implementation Prompt

```
I need to implement the module based on this approved specification:
[paste specification or reference file]

Please:
1. Generate module scaffolding using create-cora-module.sh
2. Implement backend Lambda handlers following guide_AI-MODULE-DEVELOPMENT.md
3. Implement database schema with RLS policies
4. Implement frontend components using NextAuth pattern
5. Integrate with core modules (access, ai, mgmt)
6. Integrate with functional dependencies: [list]
7. Generate module documentation

Ensure 100% CORA compliance. Run compliance checks as you implement.
```

### Phase 4: Validation Prompt

```
The module implementation is complete. Please:

1. Run all compliance checks:
   - check-api-compliance.py
   - Frontend compliance
   - Dependency validation
   - Schema validation

2. Generate configuration guide (MODULE-CONFIG-GUIDE.md)

3. Prepare module registration data for module-mgmt

4. Create deployment checklist for human review

Fix any compliance issues found.
```

---

## Known Issues and Gotchas (Lessons from module-ws)

> **Updated:** January 7, 2026 - Based on module-ws development experience

### Critical Backend Requirements

#### 1. Python Runtime Must Be 3.11

**CRITICAL:** All Lambda functions MUST use `python3.11` to match the org-common layer.

```hcl
# In infrastructure/main.tf
resource "aws_lambda_function" "my_lambda" {
  runtime = "python3.11"  # MUST match org-common layer
}
```

**Symptom if wrong:** `ImportModuleError: No module named 'pydantic_core._pydantic_core'`

**Why:** The org-common layer (from module-access) is built with Python 3.11 binaries. Using python3.13 or another version causes binary incompatibility.

#### 2. org_id Comes from Query Parameters

**CRITICAL:** Get `org_id` from query parameters, NOT from authorizer context.

```python
# ✅ CORRECT - Get org_id from query parameters
query_params = event.get('queryStringParameters') or {}
org_id = query_params.get('org_id')

if not org_id:
    return common.bad_request_response('org_id query parameter is required')

# ❌ WRONG - get_user_from_event does NOT return org_id
user_info = common.get_user_from_event(event)
org_id = user_info.get('org_id')  # This will be None!
```

**Symptom if wrong:** `400 Bad Request: org_id is required`

**Why:** The `get_user_from_event()` function extracts user identity (user_id, email, name) but NOT org_id. The frontend passes org_id as a query parameter.

### Infrastructure Gotchas

#### 3. Lambda Code Change Detection (CRITICAL)

**CRITICAL:** Lambda functions MUST use proper Terraform configuration to detect code changes.

```hcl
resource "aws_lambda_function" "my_lambda" {
  filename         = var.lambda_zip
  source_code_hash = filebase64sha256(var.lambda_zip)  # ✅ REQUIRED
  runtime          = "python3.11"  # MUST match org-common layer
  
  lifecycle {
    create_before_destroy = true  # ✅ Blue-green deployment
  }
  
  # ❌ NEVER use ignore_changes on source_code_hash or filename
}
```

**Symptom if wrong:** Lambda code doesn't update when rebuilt. Testing cycles fail with stale code, wasting 2-8 hours per module.

**Why this matters:** During module-ws development, the template had `ignore_changes = [source_code_hash]` which prevented Terraform from detecting code changes entirely.

**See:** [Lambda Deployment Standard](../../docs/standards/standard_LAMBDA-DEPLOYMENT.md) for complete documentation.

#### 4. All Routes Need Authorizer

Every API Gateway route must have an authorizer attached:

```hcl
resource "aws_apigatewayv2_route" "my_route" {
  authorization_type = "CUSTOM"
  authorizer_id      = var.authorizer_id  # CRITICAL!
  # ...
}
```

**Symptom if missing:** `401 Unauthorized` or requests bypass auth entirely.

#### 5. Lambda Permission for API Gateway

API Gateway needs explicit permission to invoke Lambda:

```hcl
resource "aws_lambda_permission" "api_gateway" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_execution_arn}/*/*"
}
```

**Symptom if missing:** `500 Internal Server Error` when calling API.

### Frontend/Config Gotchas

#### 6. Module Config Must Be Merged

When adding modules manually (not via `create-cora-project.sh`), ensure `cora-modules.config.yaml` is updated.

**Symptom if missing:** Navigation items or admin cards don't appear.

### Pre-Deployment Checklist

Before deploying any new functional module, verify:

- [ ] Lambda runtime is `python3.11` (not 3.12, 3.13, etc.)
- [ ] Lambda has org-common layer attached
- [ ] Lambda gets org_id from `queryStringParameters`
- [ ] All routes have authorizer configured
- [ ] Lambda has permission for API Gateway
- [ ] Module config merged into cora-modules.config.yaml

---

## Related Documentation

- [standard_MODULE-REGISTRATION.md](../standards/standard_MODULE-REGISTRATION.md) - Module import and configuration
- [standard_MODULE-DEPENDENCIES.md](../standards/standard_MODULE-DEPENDENCIES.md) - Dependency management
- [guide_AI-MODULE-DEVELOPMENT.md](./guide_AI-MODULE-DEVELOPMENT.md) - AI-specific development patterns
- [guide_LEGACY-CODE-MIGRATION.md](./guide_LEGACY-CODE-MIGRATION.md) - Legacy code analysis
- [guide_MODULE-RETROSPECTIVE.md](./guide_MODULE-RETROSPECTIVE.md) - Retrospective guide

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
