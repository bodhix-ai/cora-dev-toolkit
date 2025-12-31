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

#### Step 1.6: Generate Module Specification

**AI generates specification document** using template `templates/MODULE-SPEC-TEMPLATE.md`

**Specification includes:**
1. Module metadata (name, description, complexity)
2. Entity definitions (all identified entities)
3. API endpoints (full REST API)
4. Core module integrations (how to use access, ai, mgmt)
5. Functional module dependencies (if any)
6. Database schema (complete SQL)
7. Frontend components (list of needed components)
8. Configuration requirements (what needs to be configured)
9. Implementation checklist (phase-by-phase tasks)

### Human Activities

#### Review Specification

**Human reviews AI-generated specification:**

- [ ] Entity definitions make sense?
- [ ] API endpoints cover all use cases?
- [ ] Dependencies are correct?
- [ ] Complexity estimate reasonable?
- [ ] Any missing requirements?

**Provide Feedback:**
- Clarify ambiguities
- Request changes
- Approve or request re-analysis

### Deliverable

**Module Specification Document**: `docs/specifications/MODULE-{name}-SPEC.md`

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

#### 3.3.1: Schema Files

```sql
-- packages/{module}/db/schema/001-{entity}-table.sql

CREATE TABLE IF NOT EXISTS public.{entity} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_{entity}_org_id ON public.{entity}(org_id);
CREATE INDEX idx_{entity}_status ON public.{entity}(status);

-- Foreign keys to other modules (if applicable)
-- e.g., kb_base_id UUID REFERENCES kb_base(id)
```

#### 3.3.2: RLS Policies

```sql
-- packages/{module}/db/schema/002-apply-rls.sql

-- Enable RLS
ALTER TABLE public.{entity} ENABLE ROW LEVEL SECURITY;

-- Use core module helper functions
CREATE POLICY "{entity}_select_policy" ON public.{entity}
    FOR SELECT
    USING (can_access_org_data(org_id));

CREATE POLICY "{entity}_insert_policy" ON public.{entity}
    FOR INSERT
    WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "{entity}_update_policy" ON public.{entity}
    FOR UPDATE
    USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "{entity}_delete_policy" ON public.{entity}
    FOR DELETE
    USING (can_modify_org_data(org_id));
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

### Step 3.5: Infrastructure

**AI Implementation:**

See `standard_module-integration-spec.md` - Infrastructure as Code section

Key files:
- `infrastructure/variables.tf`
- `infrastructure/main.tf`
- `infrastructure/outputs.tf`
- `infrastructure/versions.tf`

### Step 3.6: Documentation

**AI generates:**

1. **Module README.md**
   - Overview
   - Features
   - Installation
   - Usage examples
   - API reference

2. **MODULE-CONFIG-GUIDE.md**
   - Prerequisites
   - Configuration steps
   - Environment variables
   - Validation

3. **API Reference** (if complex)
   - Full endpoint documentation
   - Request/response examples

### Human Activities

**Code Review:**
- Review AI-generated code
- Test locally
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
6. Generate a Module Specification Document

Use the template at templates/MODULE-SPEC-TEMPLATE.md

Follow the guidelines in:
- docs/standards/standard_MODULE-DEPENDENCIES.md
- docs/standards/standard_module-integration-spec.md
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
