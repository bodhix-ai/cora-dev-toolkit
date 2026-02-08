# API Routes - Eval Optimizer

**Updated:** February 5, 2026 - Workspace-centric routes (refactored from /projects/)

These API routes support the Eval Optimizer application. Routes follow CORA patterns (ADR-004: NextAuth API Client Pattern).

**Route Architecture:**
- Routes use `/ws/{wsId}/` pattern (workspace as container)
- Workspaces provide natural container + access control (via workspace_members)
- No separate "optimization project" entity needed

**RAG Constraint:** Context documents are stored in workspace KB via module-kb APIs.

---

## Projects API

### `GET /api/eval-opt/projects`

**Description:** List all optimization projects the current user has access to.

**Request:**
```typescript
// No body, uses session.accessToken for authentication
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      name: string;
      description: string;
      domain: string;
      doc_type_id: string;
      criteria_set_id: string;
      created_at: string;
      updated_at: string;
      created_by: string;
      
      // Computed fields
      total_samples?: number;
      total_evaluations?: number;
      latest_accuracy?: number;
      role?: string; // user's role in this project (owner, admin, user)
      
      // Populated fields
      doc_type_name?: string;
      criteria_set_name?: string;
      criteria_count?: number;
    }
  ]
}
```

**Database Query:**
```sql
-- Get projects where user is a member
SELECT 
  p.*,
  pm.role as user_role,
  dt.name as doc_type_name,
  cs.name as criteria_set_name,
  (SELECT COUNT(*) FROM eval_opt_document_groups WHERE project_id = p.id) as total_samples,
  (SELECT COUNT(*) FROM eval_opt_truth_keys tk 
   JOIN eval_opt_document_groups dg ON tk.document_group_id = dg.id 
   WHERE dg.project_id = p.id) as total_evaluations,
  (SELECT overall_accuracy FROM eval_opt_runs WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1) as latest_accuracy
FROM eval_optimization_projects p
JOIN eval_opt_project_members pm ON p.id = pm.project_id
LEFT JOIN eval_doc_types dt ON p.doc_type_id = dt.id
LEFT JOIN eval_criteria_sets cs ON p.criteria_set_id = cs.id
WHERE pm.user_id = :user_id
ORDER BY p.updated_at DESC;
```

---

### `POST /api/eval-opt/projects`

**Description:** Create a new optimization project.

**Request:**
```typescript
{
  name: string;
  description?: string;
  domain?: string;
  doc_type_id: string;
  criteria_set_id: string;
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    name: string;
    description: string;
    domain: string;
    doc_type_id: string;
    criteria_set_id: string;
    created_at: string;
    updated_at: string;
    created_by: string;
  }
}
```

**Database Operations:**
```sql
-- 1. Insert project
INSERT INTO eval_optimization_projects (
  name, description, domain, doc_type_id, criteria_set_id, 
  criteria_set_version, created_by
) VALUES (
  :name, :description, :domain, :doc_type_id, :criteria_set_id,
  (SELECT version FROM eval_criteria_sets WHERE id = :criteria_set_id),
  :user_id
) RETURNING *;

-- 2. Add creator as owner
INSERT INTO eval_opt_project_members (
  project_id, user_id, role, added_by
) VALUES (
  :project_id, :user_id, 'owner', :user_id
);

-- 3. Create test org (optional, for optimization runs)
-- Call module-access API: POST /access/orgs
-- Then insert into eval_opt_test_orgs
```

---

### `GET /api/eval-opt/projects/:id`

**Description:** Get details for a specific project.

**Request:**
```typescript
// No body, uses :id from URL
```

**Response:**
```typescript
{
  data: {
    id: string;
    name: string;
    description: string;
    domain: string;
    doc_type_id: string;
    criteria_set_id: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    
    // Computed fields
    total_samples?: number;
    total_evaluations?: number;
    latest_accuracy?: number;
    role?: string;
    
    // Populated fields
    doc_type_name?: string;
    criteria_set_name?: string;
    criteria_count?: number;
  }
}
```

**Authorization:**
- User must be a member of the project (check `eval_opt_project_members`)

---

### `PUT /api/eval-opt/projects/:id`

**Description:** Update project details (name, description, domain only - NOT doc_type or criteria_set).

**Request:**
```typescript
{
  name?: string;
  description?: string;
  domain?: string;
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    name: string;
    description: string;
    domain: string;
    // ... rest of project fields
  }
}
```

**Authorization:**
- User must have role: owner OR admin

---

### `DELETE /api/eval-opt/projects/:id`

**Description:** Delete a project and all associated data.

**Request:**
```typescript
// No body, uses :id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must have role: owner

**Database Operations:**
```sql
-- Cascade delete handled by foreign keys:
-- - eval_opt_project_members
-- - eval_opt_document_groups
-- - eval_opt_truth_keys
-- - eval_opt_runs
-- - eval_opt_run_results

DELETE FROM eval_optimization_projects WHERE id = :project_id;
```

---

## Members API

### `GET /api/eval-opt/projects/:id/members`

**Description:** List all members of a project.

**Request:**
```typescript
// No body, uses :id from URL
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      user_id: string;
      role: string; // owner, admin, user
      added_at: string;
      added_by: string;
      
      // User info (populated)
      user_email?: string;
      user_name?: string;
    }
  ]
}
```

**Database Query:**
```sql
SELECT 
  pm.*,
  up.email as user_email,
  up.name as user_name
FROM eval_opt_project_members pm
LEFT JOIN user_profiles up ON pm.user_id = up.user_id
WHERE pm.project_id = :project_id
ORDER BY 
  CASE pm.role 
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'user' THEN 3
  END,
  pm.added_at ASC;
```

---

### `POST /api/eval-opt/projects/:id/members`

**Description:** Add a new member to the project.

**Request:**
```typescript
{
  email: string; // User's email
  role: string;  // owner, admin, user
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    user_id: string;
    role: string;
    added_at: string;
    added_by: string;
  }
}
```

**Authorization:**
- User must have role: owner OR admin

**Database Operations:**
```sql
-- 1. Find user by email
SELECT user_id FROM user_profiles WHERE email = :email;

-- 2. Check if already a member
SELECT id FROM eval_opt_project_members 
WHERE project_id = :project_id AND user_id = :user_id;

-- 3. If not a member, add them
INSERT INTO eval_opt_project_members (
  project_id, user_id, role, added_by
) VALUES (
  :project_id, :user_id, :role, :added_by_user_id
) RETURNING *;
```

---

### `DELETE /api/eval-opt/projects/:id/members/:member_id`

**Description:** Remove a member from the project.

**Request:**
```typescript
// No body, uses :id and :member_id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must have role: owner OR admin
- Cannot remove the last owner
- Cannot remove yourself if you're the only owner

**Database Operations:**
```sql
-- 1. Check if member exists and is not owner
SELECT role FROM eval_opt_project_members WHERE id = :member_id;

-- 2. If owner, verify there's another owner
SELECT COUNT(*) FROM eval_opt_project_members 
WHERE project_id = :project_id AND role = 'owner';

-- 3. Delete member
DELETE FROM eval_opt_project_members WHERE id = :member_id;
```

---

## Supporting API Routes (from other modules)

These routes are called by the eval-optimizer app but are provided by other CORA modules:

### `GET /api/eval/doc-types`
**Module:** module-eval  
**Purpose:** Load available document types for project creation form

### `GET /api/eval/criteria-sets`
**Module:** module-eval  
**Purpose:** Load available criteria sets for project creation form

---

## Implementation Notes

1. **Authentication:** All routes use NextAuth session + access token (ADR-004 pattern)
2. **Authorization:** Use RLS policies from Phase 0 database schemas
3. **Error Handling:** Return standard HTTP status codes:
   - 400: Bad request (validation errors)
   - 401: Unauthorized (no valid session)
   - 403: Forbidden (insufficient permissions)
   - 404: Not found (project/member doesn't exist)
   - 500: Internal server error
4. **CORS:** Follow CORA API Gateway standards (ADR-018b)
5. **Rate Limiting:** Apply standard rate limits for authenticated users

---

## Phase 2 API Routes: Sample Document Management

### `GET /api/eval-opt/projects/:id/samples`

**Description:** List all sample document groups in a project.

**Request:**
```typescript
// No body, uses :id from URL
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      project_id: string;
      name: string;
      primary_doc_id: string;
      status: "pending_evaluation" | "evaluated" | "validated";
      created_at: string;
      updated_at: string;
      
      // Populated fields
      primary_doc_name?: string;
      primary_doc_size?: number;
      artifact_count?: number;
      evaluation_progress?: {
        completed: number;
        total: number;
      };
    }
  ]
}
```

**Database Query:**
```sql
SELECT 
  dg.*,
  kb.name as primary_doc_name,
  kb.size as primary_doc_size,
  (SELECT COUNT(*) FROM eval_opt_document_group_members 
   WHERE group_id = dg.id AND doc_type IN ('proof', 'supporting')) as artifact_count,
  (SELECT COUNT(*) FROM eval_opt_truth_keys WHERE document_group_id = dg.id) as truth_key_count,
  (SELECT COUNT(*) FROM eval_criteria_items WHERE criteria_set_id = p.criteria_set_id) as total_criteria
FROM eval_opt_document_groups dg
LEFT JOIN kb_docs kb ON dg.primary_doc_id = kb.id
JOIN eval_optimization_projects p ON dg.project_id = p.id
WHERE dg.project_id = :project_id
ORDER BY dg.created_at DESC;
```

**Authorization:**
- User must be a project member

---

### `POST /api/eval-opt/projects/:id/samples/upload`

**Description:** Upload sample documents (primary + optional artifacts) and create a document group.

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  name: string;                // Document group name
  primary_doc: File;           // Primary document file
  artifact_0?: File;           // Optional artifact 1
  artifact_1?: File;           // Optional artifact 2
  // ... additional artifacts
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    project_id: string;
    name: string;
    primary_doc_id: string;
    status: "pending_evaluation";
    created_at: string;
    updated_at: string;
  }
}
```

**Authorization:**
- User must be a project member

**Implementation Flow:**
```typescript
1. Validate user is project member
2. Get project details (need workspace_id or create one)
3. Create workspace if needed (call module-ws API)
4. Upload primary document to module-kb:
   POST /kb/upload
   {
     workspace_id: string,
     file: File,
     metadata: { document_type: "eval_sample", project_id: string }
   }
5. Upload artifacts (if any) to module-kb
6. Create document group record:
   INSERT INTO eval_opt_document_groups (project_id, name, primary_doc_id, status)
7. Create document group member records for artifacts:
   INSERT INTO eval_opt_document_group_members (group_id, doc_id, doc_type)
```

---

### `GET /api/eval-opt/projects/:id/samples/:group_id`

**Description:** Get details for a specific document group.

**Request:**
```typescript
// No body, uses :id and :group_id from URL
```

**Response:**
```typescript
{
  data: {
    id: string;
    project_id: string;
    name: string;
    primary_doc_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    
    // Document details
    primary_doc: {
      id: string;
      name: string;
      size: number;
      content_type: string;
      url: string;
    };
    
    artifacts: [
      {
        id: string;
        name: string;
        size: number;
        content_type: string;
        url: string;
        doc_type: "proof" | "supporting";
      }
    ];
    
    // Evaluation progress
    truth_keys_count: number;
    total_criteria: number;
  }
}
```

**Authorization:**
- User must be a project member

---

### `DELETE /api/eval-opt/projects/:id/samples/:group_id`

**Description:** Delete a document group and all associated data.

**Request:**
```typescript
// No body, uses :id and :group_id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must be a project member (owner or admin for deletion)

**Database Operations:**
```sql
-- Cascade delete handled by foreign keys:
-- - eval_opt_document_group_members
-- - eval_opt_truth_keys (if any)

-- Also need to delete documents from module-kb
DELETE FROM eval_opt_document_groups WHERE id = :group_id AND project_id = :project_id;
```

**Implementation Notes:**
- Must also call module-kb API to delete the actual document files
- Consider keeping documents in module-kb for audit trail (soft delete group only)

---

## Integration with Other Modules

### module-ws (Workspace Management)

**Create Workspace for Project:**
```typescript
POST /ws/workspaces
{
  org_id: string,
  name: string, // e.g., "Eval Optimizer - {project_name}"
  description: string
}
```

### module-kb (Knowledge Base)

**Upload Document:**
```typescript
POST /kb/upload
{
  workspace_id: string,
  file: File,
  metadata: {
    document_type: "eval_sample",
    project_id: string,
    group_id?: string
  }
}
```

**Get Document URL:**
```typescript
GET /kb/docs/:doc_id/download
// Returns pre-signed S3 URL for document access
```

**Delete Document:**
```typescript
DELETE /kb/docs/:doc_id
```

---

---

## Phase 3 API Routes: Truth Key Management (Manual Evaluation)

### `GET /api/eval-opt/projects/:id/samples/:group_id/evaluate`

**Description:** Get document content, criteria list, and status options for manual evaluation.

**Request:**
```typescript
// No body, uses :id and :group_id from URL
```

**Response:**
```typescript
{
  data: {
    document_group: {
      id: string;
      name: string;
      primary_doc_id: string;
      primary_doc_name: string;
      primary_doc_content: string; // Full text content
    };
    
    criteria: [
      {
        id: string;
        criteria_id: string;
        requirement: string;
        description?: string;
        order_index: number;
      }
    ];
    
    status_options: [
      {
        id: string;
        name: string; // e.g., "Compliant", "Non-compliant", etc.
        description?: string;
      }
    ];
    
    // Existing truth keys if document was previously evaluated
    existing_evaluations?: [
      {
        id: string;
        criteria_item_id: string;
        truth_status_id: string;
        truth_confidence: number;
        truth_explanation: string;
        truth_citations: string[];
      }
    ];
  }
}
```

**Database Query:**
```sql
-- Get document group with content
SELECT dg.*, kb.name as primary_doc_name, kb.content as primary_doc_content
FROM eval_opt_document_groups dg
LEFT JOIN kb_docs kb ON dg.primary_doc_id = kb.id
WHERE dg.id = :group_id AND dg.project_id = :project_id;

-- Get criteria for project's criteria set
SELECT ci.*
FROM eval_criteria_items ci
JOIN eval_optimization_projects p ON ci.criteria_set_id = p.criteria_set_id
WHERE p.id = :project_id
ORDER BY ci.order_index;

-- Get status options (system-level)
SELECT * FROM eval_sys_status_options ORDER BY display_order;

-- Get existing truth keys if any
SELECT * FROM eval_opt_truth_keys 
WHERE document_group_id = :group_id;
```

**Authorization:**
- User must be a project member

---

### `POST /api/eval-opt/projects/:id/truth-keys`

**Description:** Save manual evaluation (create truth keys for all criteria).

**Request:**
```typescript
{
  document_group_id: string;
  evaluations: [
    {
      criteria_item_id: string;
      status_id: string;
      confidence: number; // 0-100
      explanation: string;
      citations: string[]; // Array of quoted text from document
    }
  ];
}
```

**Response:**
```typescript
{
  data: {
    truth_keys_created: number;
    document_group_id: string;
    status_updated: "evaluated"; // Document group status updated
  }
}
```

**Authorization:**
- User must be a project member

**Database Operations:**
```sql
-- Get project details for doc_type_id, criteria_set_id, version
SELECT doc_type_id, criteria_set_id, criteria_set_version 
FROM eval_optimization_projects 
WHERE id = :project_id;

-- For each evaluation, insert or update truth key
INSERT INTO eval_opt_truth_keys (
  document_group_id,
  criteria_item_id,
  doc_type_id,
  criteria_set_id,
  criteria_set_version,
  truth_status_id,
  truth_confidence,
  truth_explanation,
  truth_citations,
  evaluated_by,
  evaluated_at,
  is_valid
) VALUES (
  :document_group_id,
  :criteria_item_id,
  :doc_type_id,
  :criteria_set_id,
  :criteria_set_version,
  :truth_status_id,
  :truth_confidence,
  :truth_explanation,
  :truth_citations::jsonb,
  :user_id,
  now(),
  true
)
ON CONFLICT (document_group_id, criteria_item_id)
DO UPDATE SET
  truth_status_id = EXCLUDED.truth_status_id,
  truth_confidence = EXCLUDED.truth_confidence,
  truth_explanation = EXCLUDED.truth_explanation,
  truth_citations = EXCLUDED.truth_citations,
  evaluated_by = EXCLUDED.evaluated_by,
  evaluated_at = now();

-- Update document group status to 'evaluated'
UPDATE eval_opt_document_groups 
SET status = 'evaluated', updated_at = now()
WHERE id = :document_group_id;
```

**Implementation Notes:**
- This is a batch operation - saves all criteria evaluations in one transaction
- Uses UPSERT pattern to allow re-evaluation (updating existing truth keys)
- Citations stored as JSONB array
- Automatically marks document group as 'evaluated'

---

### `GET /api/eval-opt/projects/:id/truth-keys`

**Description:** List all truth keys in a project (across all document groups).

**Request:**
```typescript
// Optional query params:
// ?document_group_id=<id> - Filter to specific document group
// ?criteria_item_id=<id> - Filter to specific criterion
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      document_group_id: string;
      criteria_item_id: string;
      truth_status_id: string;
      truth_confidence: number;
      truth_explanation: string;
      truth_citations: string[];
      evaluated_by: string;
      evaluated_at: string;
      is_valid: boolean;
      
      // Populated fields
      document_group_name?: string;
      criteria_id?: string;
      status_name?: string;
    }
  ]
}
```

**Authorization:**
- User must be a project member

---

### `PUT /api/eval-opt/projects/:id/truth-keys/:truth_key_id`

**Description:** Update an existing truth key (re-evaluate a single criterion).

**Request:**
```typescript
{
  status_id?: string;
  confidence?: number;
  explanation?: string;
  citations?: string[];
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    // ... updated truth key fields
  }
}
```

**Authorization:**
- User must be a project member

---

### `DELETE /api/eval-opt/projects/:id/truth-keys/:truth_key_id`

**Description:** Delete a truth key (remove evaluation for a criterion).

**Request:**
```typescript
// No body, uses :id and :truth_key_id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must be a project member (owner or admin for deletion)

**Implementation Notes:**
- If deleting causes document group to have incomplete evaluations, update status back to 'pending_evaluation'

---

---

## Phase 4A API Routes: Context Document Management (RAG)

### `GET /api/eval-opt/projects/:id/context`

**Description:** List all context documents uploaded for a project.

**Request:**
```typescript
// No body, uses :id from URL
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      workspace_id: string;
      doc_id: string;                 // kb_docs.id
      doc_type: "standard" | "guide" | "requirement" | "example";
      name: string;
      description?: string;
      is_primary: boolean;
      
      // RAG extraction metadata
      extraction_status: "pending" | "processing" | "completed" | "failed";
      extraction_completed_at?: string;
      extracted_concepts?: {
        key_concepts?: string[];
        standards?: string[];
        terminology?: Record<string, string>;
      };
      
      uploaded_by: string;
      uploaded_at: string;
      updated_at: string;
    }
  ]
}
```

**Database Query:**
```sql
SELECT 
  cd.*
FROM eval_opt_context_docs cd
JOIN eval_optimization_projects p ON cd.workspace_id = p.workspace_id
WHERE p.id = :project_id
ORDER BY cd.is_primary DESC, cd.uploaded_at ASC;
```

**Authorization:**
- User must be a project member

---

### `POST /api/eval-opt/projects/:id/context/upload`

**Description:** Upload a context document (domain standard, guide, requirement, or example).

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  file: File;                        // PDF, DOCX, or TXT file
  doc_type: "standard" | "guide" | "requirement" | "example";
  description?: string;              // Optional description
  is_primary: boolean;               // Mark as primary reference
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    workspace_id: string;
    doc_id: string;                  // kb_docs.id
    doc_type: string;
    name: string;
    description?: string;
    is_primary: boolean;
    extraction_status: "pending";    // RAG extraction queued
    uploaded_by: string;
    uploaded_at: string;
  }
}
```

**Authorization:**
- User must be a project member

**Implementation Flow:**
```typescript
1. Validate user is project member
2. Get project workspace_id (or create workspace if needed)
3. Upload document to module-kb:
   POST /kb/upload
   {
     workspace_id: string,
     file: File,
     metadata: { 
       document_type: "eval_context",
       project_id: string,
       doc_type: string
     }
   }
4. Create context doc record:
   INSERT INTO eval_opt_context_docs (
     workspace_id, doc_id, doc_type, name, description,
     is_primary, extraction_status, uploaded_by
   )
5. Queue RAG extraction job (async):
   - Extract key concepts, standards, terminology
   - Update extraction_status to 'processing'
   - Store results in extracted_concepts JSONB
   - Update extraction_status to 'completed'
```

---

### `GET /api/eval-opt/projects/:id/context/:doc_id/concepts`

**Description:** Get extracted domain knowledge for a context document.

**Request:**
```typescript
// No body, uses :id and :doc_id from URL
```

**Response:**
```typescript
{
  data: {
    doc_id: string;
    doc_name: string;
    extraction_status: string;
    extraction_completed_at?: string;
    
    extracted_concepts: {
      key_concepts: string[];        // e.g., ["CJIS 5.4.1", "encryption at rest"]
      standards: string[];           // e.g., ["CJIS Security Policy 5.10"]
      terminology: {
        [term: string]: string;      // e.g., { "encryption": "Process of encoding..." }
      };
    };
  }
}
```

**Database Query:**
```sql
SELECT 
  id,
  name,
  extraction_status,
  extraction_completed_at,
  extracted_concepts
FROM eval_opt_context_docs
WHERE id = :doc_id AND workspace_id IN (
  SELECT workspace_id FROM eval_optimization_projects WHERE id = :project_id
);
```

**Authorization:**
- User must be a project member
- Document must have extraction_status = 'completed'

---

### `DELETE /api/eval-opt/projects/:id/context/:doc_id`

**Description:** Delete a context document.

**Request:**
```typescript
// No body, uses :id and :doc_id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must be a project member (owner or admin for deletion)

**Implementation:**
```typescript
1. Get context doc record
2. Delete from module-kb: DELETE /kb/docs/{doc_id}
3. Delete context doc record:
   DELETE FROM eval_opt_context_docs WHERE id = :doc_id
```

---

## RAG Extraction Pipeline (Phase 4C - Backend)

The RAG extraction pipeline is triggered asynchronously after document upload. It uses LLM to analyze the document and extract domain knowledge.

### Extract Domain Knowledge (Background Job)

**Input:** Context document ID

**Process:**
```python
1. Load document content from module-kb
2. Chunk document if large (e.g., 1000 token chunks)
3. Extract key concepts via LLM:
   - Prompt: "Extract key security controls, standards, and technical terms from this document..."
   - Response: JSON with key_concepts, standards, terminology
4. Generate embeddings (for future RAG retrieval):
   - Use OpenAI text-embedding-3-small or AWS Titan Embeddings
   - Store in vector database (Pinecone, Weaviate, or pgvector)
5. Update context doc record:
   - extraction_status = 'completed'
   - extraction_completed_at = now()
   - extracted_concepts = JSON results
```

**LLM Prompt Example:**
```
You are analyzing a compliance standards document to extract domain knowledge.

Extract the following from this document:
1. Key concepts: Important technical terms, requirements, or controls
2. Standards: Specific standard references (e.g., "CJIS 5.4.1", "NIST SP 800-53")
3. Terminology: Definitions of domain-specific terms

Document excerpt:
{document_content}

Respond in JSON format:
{
  "key_concepts": ["concept1", "concept2", ...],
  "standards": ["standard1", "standard2", ...],
  "terminology": {
    "term1": "definition1",
    "term2": "definition2"
  }
}
```

---

**Last Updated:** February 5, 2026  
**Phase:** Phase 4A (Context Documents + RAG)

---

## Phase 4 API Routes: Optimization Runs

### `POST /api/eval-opt/projects/:id/runs`

**Description:** Start a new optimization run. The system will:
1. Load all evaluated document groups (with truth keys)
2. For each document, call module-eval to run AI evaluation
3. Compare AI results to truth keys
4. Calculate accuracy metrics (TP/TN/FP/FN)
5. Store results in eval_opt_runs and eval_opt_run_results

**Request:**
```typescript
{
  name: string;                    // Run name (e.g., "Run 1 - Baseline prompt")
  description?: string;            // Optional notes about this run
  
  // Prompt configuration to test
  systemPrompt: string;            // System prompt for evaluation
  userPromptTemplate: string;      // User prompt template with {variables}
  temperature: number;             // 0.0 - 1.0
  maxTokens: number;               // Max response tokens
  
  // Optional: AI provider override
  aiProviderId?: string;           // Use specific provider (default: org config)
  aiModelId?: string;              // Use specific model (default: org config)
}
```

**Response:**
```typescript
{
  data: {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    
    // Prompt config snapshot
    systemPrompt: string;
    userPromptTemplate: string;
    temperature: number;
    maxTokens: number;
    
    // Run status
    status: "pending" | "running" | "completed" | "failed";
    progress: number;              // 0-100
    errorMessage?: string;
    
    startedAt?: string;
    completedAt?: string;
    
    // Results summary (null until completed)
    totalSamples?: number;
    totalCriteria?: number;
    overallAccuracy?: number;      // Percentage
    
    createdBy: string;
    createdAt: string;
  }
}
```

**Authorization:**
- User must be a project member

**Implementation Flow:**
```typescript
1. Validate user is project member
2. Get project details (doc_type_id, criteria_set_id)
3. Count evaluated document groups (status = 'evaluated')
   - If 0, return error: "No evaluated samples found"
4. Create run record with status = 'pending'
5. Trigger async processing:
   - For each document group:
     a. Get truth keys for document
     b. Create workspace in module-ws (or reuse project workspace)
     c. Upload document to module-kb
     d. Call module-eval: POST /ws/{wsId}/eval
        {
          docIds: [docId],
          criteriaSetId: project.criteria_set_id,
          docTypeId: project.doc_type_id,
          // Override prompt config from run
          promptOverride: {
            systemPrompt: run.systemPrompt,
            userPromptTemplate: run.userPromptTemplate,
            temperature: run.temperature,
            maxTokens: run.maxTokens
          }
        }
     e. Poll module-eval: GET /ws/{wsId}/eval/{evalId}/status
        - Wait until status = 'completed' or 'failed'
     f. Get results: GET /ws/{wsId}/eval/{evalId}
     g. Compare AI results to truth keys:
        - For each criteria item:
          * Match ai_status_id vs truth_status_id
          * Calculate confidence_diff
          * Classify: TP/TN/FP/FN
          * Save to eval_opt_run_results
     h. Update run progress: (current_doc / total_docs) * 100
   - Calculate overall accuracy
   - Update run status to 'completed'
```

**Database Operations:**
```sql
-- 1. Create run record
INSERT INTO eval_opt_runs (
  project_id, name, description,
  system_prompt, user_prompt_template, temperature, max_tokens,
  status, started_at, total_samples, total_criteria,
  created_by
) VALUES (
  :project_id, :name, :description,
  :system_prompt, :user_prompt_template, :temperature, :max_tokens,
  'pending', now(),
  (SELECT COUNT(*) FROM eval_opt_document_groups WHERE project_id = :project_id AND status = 'evaluated'),
  (SELECT COUNT(*) FROM eval_criteria_items WHERE criteria_set_id = (SELECT criteria_set_id FROM eval_optimization_projects WHERE id = :project_id)),
  :user_id
) RETURNING *;

-- 2. For each document group, for each criteria result:
INSERT INTO eval_opt_run_results (
  run_id, document_group_id, criteria_item_id, truth_key_id,
  ai_status_id, ai_confidence, ai_explanation, ai_citations,
  status_match, confidence_diff, result_type
) VALUES (
  :run_id, :doc_group_id, :criteria_item_id, :truth_key_id,
  :ai_status_id, :ai_confidence, :ai_explanation, :ai_citations::jsonb,
  :status_match, :confidence_diff, :result_type
);

-- 3. Update run when complete
UPDATE eval_opt_runs SET
  status = 'completed',
  progress = 100,
  completed_at = now(),
  overall_accuracy = :accuracy
WHERE id = :run_id;
```

**Classification Logic (TP/TN/FP/FN):**
```typescript
// Simplified: Based on status match
// Truth: Compliant (positive), AI: Compliant (positive) → TP
// Truth: Non-compliant (negative), AI: Non-compliant (negative) → TN
// Truth: Non-compliant (negative), AI: Compliant (positive) → FP
// Truth: Compliant (positive), AI: Non-compliant (negative) → FN

// For multi-class (detailed mode), simplify to binary:
// - "Compliant", "Fully Compliant" → Positive
// - "Non-compliant", "Partially Compliant", "Not Applicable" → Negative

function classifyResult(truthStatus: string, aiStatus: string): string {
  const positiveStatuses = ['compliant', 'fully compliant'];
  const truthPositive = positiveStatuses.includes(truthStatus.toLowerCase());
  const aiPositive = positiveStatuses.includes(aiStatus.toLowerCase());
  
  if (truthPositive && aiPositive) return 'true_positive';
  if (!truthPositive && !aiPositive) return 'true_negative';
  if (!truthPositive && aiPositive) return 'false_positive';
  if (truthPositive && !aiPositive) return 'false_negative';
}
```

---

### `GET /api/eval-opt/projects/:id/runs`

**Description:** List all optimization runs for a project.

**Request:**
```typescript
// Query params:
// ?limit=20
// ?offset=0
// ?status=completed (filter by status)
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      projectId: string;
      name: string;
      description?: string;
      status: string;
      progress: number;
      overallAccuracy?: number;
      totalSamples: number;
      totalCriteria: number;
      startedAt?: string;
      completedAt?: string;
      createdBy: string;
      createdAt: string;
      
      // Creator info
      creatorName?: string;
      creatorEmail?: string;
    }
  ],
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  }
}
```

**Database Query:**
```sql
SELECT 
  r.*,
  up.email as creator_email,
  up.name as creator_name
FROM eval_opt_runs r
LEFT JOIN user_profiles up ON r.created_by = up.user_id
WHERE r.project_id = :project_id
ORDER BY r.created_at DESC
LIMIT :limit OFFSET :offset;
```

**Authorization:**
- User must be a project member

---

### `GET /api/eval-opt/projects/:id/runs/:run_id`

**Description:** Get detailed results for a specific optimization run.

**Request:**
```typescript
// No body, uses :id and :run_id from URL
```

**Response:**
```typescript
{
  data: {
    id: string;
    projectId: string;
    name: string;
    description?: string;
    
    // Prompt configuration used
    systemPrompt: string;
    userPromptTemplate: string;
    temperature: number;
    maxTokens: number;
    
    // Status
    status: string;
    progress: number;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
    
    // Overall metrics
    totalSamples: number;
    totalCriteria: number;
    overallAccuracy: number;       // Percentage
    
    // Aggregated metrics
    truePositives: number;
    trueNegatives: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;             // TP / (TP + FP)
    recall: number;                // TP / (TP + FN)
    f1Score: number;               // 2 * (precision * recall) / (precision + recall)
    
    // Per-criterion breakdown
    criteriaBreakdown: [
      {
        criteriaItemId: string;
        criteriaId: string;
        requirement: string;
        
        // Metrics for this criterion
        totalSamples: number;
        correctCount: number;
        accuracy: number;            // Percentage
        avgConfidenceDiff: number;   // Average abs(ai_conf - truth_conf)
        
        // Classification counts
        truePositives: number;
        trueNegatives: number;
        falsePositives: number;
        falseNegatives: number;
      }
    ],
    
    createdBy: string;
    createdAt: string;
  }
}
```

**Database Query:**
```sql
-- Get run
SELECT * FROM eval_opt_runs WHERE id = :run_id AND project_id = :project_id;

-- Get overall classification counts
SELECT 
  result_type,
  COUNT(*) as count
FROM eval_opt_run_results
WHERE run_id = :run_id
GROUP BY result_type;

-- Get per-criterion breakdown
SELECT 
  ci.id as criteria_item_id,
  ci.criteria_id,
  ci.requirement,
  COUNT(*) as total_samples,
  SUM(CASE WHEN rr.status_match THEN 1 ELSE 0 END) as correct_count,
  ROUND(AVG(rr.confidence_diff), 2) as avg_confidence_diff,
  SUM(CASE WHEN rr.result_type = 'true_positive' THEN 1 ELSE 0 END) as true_positives,
  SUM(CASE WHEN rr.result_type = 'true_negative' THEN 1 ELSE 0 END) as true_negatives,
  SUM(CASE WHEN rr.result_type = 'false_positive' THEN 1 ELSE 0 END) as false_positives,
  SUM(CASE WHEN rr.result_type = 'false_negative' THEN 1 ELSE 0 END) as false_negatives
FROM eval_criteria_items ci
JOIN eval_opt_run_results rr ON ci.id = rr.criteria_item_id
WHERE rr.run_id = :run_id
GROUP BY ci.id, ci.criteria_id, ci.requirement
ORDER BY ci.order_index;
```

**Authorization:**
- User must be a project member

---

### `GET /api/eval-opt/projects/:id/runs/:run_id/results`

**Description:** Get detailed per-sample, per-criterion results (for error analysis).

**Request:**
```typescript
// Query params:
// ?resultType=false_positive (filter by TP/TN/FP/FN)
// ?criteriaItemId=uuid (filter by criterion)
// ?limit=50
// ?offset=0
```

**Response:**
```typescript
{
  data: [
    {
      id: string;
      runId: string;
      documentGroupId: string;
      documentGroupName: string;
      criteriaItemId: string;
      criteriaId: string;
      requirement: string;
      
      // Truth key (expected)
      truthKey: {
        id: string;
        statusId: string;
        statusName: string;
        confidence: number;
        explanation: string;
        citations: string[];
      };
      
      // AI result (actual)
      aiResult: {
        statusId: string;
        statusName: string;
        confidence: number;
        explanation: string;
        citations: string[];
      };
      
      // Comparison
      statusMatch: boolean;
      confidenceDiff: number;
      resultType: "true_positive" | "true_negative" | "false_positive" | "false_negative";
      
      createdAt: string;
    }
  ],
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  }
}
```

**Database Query:**
```sql
SELECT 
  rr.*,
  dg.name as document_group_name,
  ci.criteria_id,
  ci.requirement,
  tk.truth_status_id,
  ts.name as truth_status_name,
  tk.truth_confidence,
  tk.truth_explanation,
  tk.truth_citations,
  ais.name as ai_status_name
FROM eval_opt_run_results rr
JOIN eval_opt_document_groups dg ON rr.document_group_id = dg.id
JOIN eval_criteria_items ci ON rr.criteria_item_id = ci.id
JOIN eval_opt_truth_keys tk ON rr.truth_key_id = tk.id
JOIN eval_sys_status_options ts ON tk.truth_status_id = ts.id
JOIN eval_sys_status_options ais ON rr.ai_status_id = ais.id
WHERE rr.run_id = :run_id
  AND (:result_type IS NULL OR rr.result_type = :result_type)
  AND (:criteria_item_id IS NULL OR rr.criteria_item_id = :criteria_item_id)
ORDER BY dg.name, ci.order_index
LIMIT :limit OFFSET :offset;
```

**Authorization:**
- User must be a project member

---

### `DELETE /api/eval-opt/projects/:id/runs/:run_id`

**Description:** Delete an optimization run and all associated results.

**Request:**
```typescript
// No body, uses :id and :run_id from URL
```

**Response:**
```typescript
{
  success: true
}
```

**Authorization:**
- User must be a project member (owner or admin for deletion)

**Database Operations:**
```sql
-- Cascade delete handled by foreign keys:
-- - eval_opt_run_results

DELETE FROM eval_opt_runs WHERE id = :run_id AND project_id = :project_id;
```

---

## Integration with module-eval

The optimization run backend orchestrator integrates with module-eval's evaluation API:

### Create Evaluation
```typescript
POST /ws/{wsId}/eval
{
  docIds: [string],              // Document IDs to evaluate
  criteriaSetId: string,         // Criteria set from project
  docTypeId: string,             // Doc type from project
  name: string                   // Auto-generated name
}

Response:
{
  id: string,                    // Eval ID for polling
  status: "pending",
  ...
}
```

### Poll Evaluation Status
```typescript
GET /ws/{wsId}/eval/{evalId}/status

Response:
{
  id: string,
  status: "pending" | "processing" | "completed" | "failed",
  progress: number,              // 0-100
  errorMessage?: string
}
```

### Get Evaluation Results
```typescript
GET /ws/{wsId}/eval/{evalId}

Response:
{
  id: string,
  status: "completed",
  criteriaResults: [
    {
      criteriaItem: { id, criteriaId, requirement, ... },
      aiResult: {
        statusId: string,
        scoreValue: number,
        confidence: number,
        result: string,         // Explanation
        citations: string[]
      },
      effectiveStatus: { id, name, color, scoreValue }
    }
  ],
  ...
}
```

---

---

## Workspace-Centric API Routes (Phase 4A+)

The following routes use workspace as the container for optimization work.

### `GET /api/eval-opt/workspaces`

**Description:** List workspaces with eval-optimizer enabled.

**Response:**
```typescript
{
  data: [
    {
      id: string;
      name: string;
      description?: string;
      org_id: string;
      
      // Optimization stats (computed)
      sample_count?: number;
      truth_key_count?: number;
      run_count?: number;
      latest_accuracy?: number;
      
      created_at: string;
      updated_at: string;
    }
  ]
}
```

---

### `GET /api/eval-opt/workspaces/{wsId}`

**Description:** Get workspace details with optimization stats.

---

### `GET /api/eval-opt/workspaces/{wsId}/samples`

**Description:** List sample document groups in workspace.

---

### `POST /api/eval-opt/workspaces/{wsId}/samples/upload`

**Description:** Upload sample document to workspace KB.

**Request:**
```typescript
// Content-Type: multipart/form-data
{
  file: File;
  name: string;
}
```

---

### `GET /api/eval-opt/workspaces/{wsId}/samples/{groupId}`

**Description:** Get document group details.

---

### `GET /api/eval-opt/workspaces/{wsId}/samples/{groupId}/document`

**Description:** Get primary document content for evaluation UI.

---

### `GET /api/eval-opt/workspaces/{wsId}/samples/{groupId}/truth-keys`

**Description:** Get existing truth keys for a document group.

---

### `POST /api/eval-opt/workspaces/{wsId}/samples/{groupId}/truth-keys`

**Description:** Save truth keys (batch upsert from evaluation UI).

**Request:**
```typescript
{
  truth_keys: [
    {
      criteria_item_id: string;
      truth_status_id: string;
      truth_confidence: number;
      truth_explanation: string;
      truth_citations: string[];
    }
  ]
}
```

---

### `GET /api/eval-opt/workspaces/{wsId}/criteria`

**Description:** Get criteria items for workspace's criteria set.

---

### `GET /api/eval-opt/workspaces/{wsId}/runs`

**Description:** List optimization runs for workspace.

---

### `POST /api/eval-opt/workspaces/{wsId}/runs`

**Description:** Start new optimization run with thoroughness setting.

**Request:**
```typescript
{
  name: string;
  description?: string;
  thoroughness: "fast" | "balanced" | "thorough"; // 5, 7, or 12 variations
}
```

The system automatically:
1. Uses context docs from workspace KB for RAG
2. Generates domain-aware prompts via LLM meta-prompting
3. Creates 5-12 prompt variations based on thoroughness
4. Tests all variations against truth keys
5. Returns best configuration + recommendations

---

### `GET /api/eval-opt/workspaces/{wsId}/runs/{runId}`

**Description:** Get optimization run details and results.

---

### `GET /api/eval-opt/workspaces/{wsId}/response-structure`

**Description:** Get workspace's response structure configuration.

**Response:**
```typescript
{
  data: {
    id: string;
    ws_id: string;
    name: string;
    description?: string;
    sections: [
      {
        id: string;
        name: string;
        description: string;
        type: "text" | "list" | "object" | "number" | "boolean";
        required: boolean;
      }
    ];
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }
}
```

---

### `POST /api/eval-opt/workspaces/{wsId}/response-structure`

**Description:** Create response structure for workspace.

**Request:**
```typescript
{
  name: string;
  description?: string;
  sections: ResponseSection[];
  is_active: boolean;
}
```

---

### `PUT /api/eval-opt/workspaces/{wsId}/response-structure/{structureId}`

**Description:** Update existing response structure.

---

## Status Options API

### `GET /api/eval/status-options`

**Description:** Get system-level evaluation status options.

**Response:**
```typescript
{
  data: [
    {
      id: string;
      name: string;           // e.g., "Compliant", "Non-compliant"
      description?: string;
      display_order: number;
    }
  ]
}
```

---

**Last Updated:** February 5, 2026  
**Phase:** Phase 4A+ (Workspace-centric routes)
