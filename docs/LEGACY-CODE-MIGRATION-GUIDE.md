# Legacy Code Migration Guide for AI Assistants

**Systematic Process for Analyzing Legacy Code and Generating CORA Modules**

This guide provides a **repeatable workflow** for AI assistants to analyze legacy codebases, extract business requirements, propose module boundaries, and generate CORA-compliant modules.

---

## 🎯 Overview

When migrating legacy code to CORA architecture, AI assistants must:

1. **Analyze** legacy Lambda functions and database schemas
2. **Extract** business requirements and entities
3. **Propose** module boundaries (1 entity per module)
4. **Get validation** from user on proposed modules
5. **Generate** specification documents
6. **Create** CORA modules using specifications

---

## 📋 Phase 1: Discovery & Analysis

### Step 1.1: Identify Legacy Code Location

```bash
# Typical locations:
# - READ-ONLY/msoc-app-career-back/lambdas/
# - backend-archive/lambdas/
```

Ask user: "Where is the legacy code located?"

### Step 1.2: List All Lambda Functions

```bash
find <legacy-path>/lambdas -name "lambda_function.py" -type f
```

Create inventory:
```
📦 Legacy Lambda Inventory
- resumes/get/lambda_function.py
- resumes/put/lambda_function.py
- resumes/delete/lambda_function.py
- processing/process_resume_doc/lambda_function.py
- processing/process_resume_json/lambda_function.py
- helpers/resume_helper.py
```

### Step 1.3: Read and Analyze Each Lambda

For each Lambda, extract:

#### A. **Endpoints**
```python
# Look for HTTP methods and paths
if event['httpMethod'] == 'GET':
    # GET /resumes - list resumes
    # GET /resumes/{id} - get single resume
```

#### B. **Database Tables**
```python
# Look for database queries
cursor.execute("SELECT * FROM resumes WHERE...")
# Tables used: resumes, resume_skills, resume_experience
```

#### C. **Business Logic**
```python
# Look for business rules
if resume['status'] == 'draft':
    # Drafts can be edited
if len(skills) > 50:
    # Max 50 skills per resume
```

#### D. **Data Fields**
```python
# Look for data structures
resume = {
    'id': uuid,
    'title': string,
    'summary': text,
    'skills': array,
    'experience': array
}
```

#### E. **Relationships**
```python
# Look for foreign keys
resume.person_id → people.id
resume.org_id → organizations.id
```

### Step 1.4: Read Database Schema

```sql
-- Look for CREATE TABLE statements
CREATE TABLE resumes (
    id UUID PRIMARY KEY,
    person_id UUID REFERENCES people(id),
    title VARCHAR(200),
    summary TEXT,
    ...
);
```

Extract:
- Table name
- Column names and types
- Constraints (NOT NULL, UNIQUE, etc.)
- Foreign keys
- Indexes

---

## 📊 Phase 2: Entity & Module Identification

### Step 2.1: Identify Core Entities

An **entity** is a distinct business concept with its own:
- Data structure (table)
- CRUD operations
- Business rules
- Lifecycle

**Common Entities**:
- Resume (resumes table)
- Certification (certifications table)
- Skill (skills table)
- Organization (org table)
- User/Profile (profiles table)

### Step 2.2: Map Lambdas to Entities

Create a mapping:

```
📦 Resume Entity
  Lambdas:
    - resumes/get → GET /resumes, GET /resumes/:id
    - resumes/put → POST /resumes, PUT /resumes/:id
    - resumes/delete → DELETE /resumes/:id
    - processing/process_resume_doc → S3 trigger
    - processing/process_resume_json → SQS trigger
  
  Tables:
    - resumes (main)
    - resume_skills (related)
    - resume_experience (related)
    - resume_education (related)
  
  Business Logic:
    - Parse uploaded resume PDF
    - Extract skills with AI
    - Validate resume completeness
    - Generate resume PDF from JSON
```

### Step 2.3: Propose Module Boundaries

**RULE**: Each CORA module = One primary entity

**Good Module Boundaries**:
```
✅ resume-module
   - Manages resume entity
   - Handles resume CRUD
   - Processes resume documents
   
✅ certification-module
   - Manages certification entity
   - Handles cert CRUD
   - Integrates with Credly
   
✅ skills-module
   - Manages skill entity
   - Handles skill taxonomy
   - Suggests related skills
```

**Bad Module Boundaries**:
```
❌ data-module (too broad)
❌ resume-and-cert-module (multiple entities)
❌ processing-module (not entity-focused)
```

### Step 2.4: Present Proposed Modules to User

**TEMPLATE**:

```markdown
## 🔍 Legacy Code Analysis Complete

I analyzed the legacy codebase and identified **N entities** that should become **N CORA modules**:

### Proposed Modules

#### 1. resume-module
- **Entity**: Resume
- **Purpose**: Manage user resumes with document upload and AI parsing
- **Legacy Code**:
  - resumes/get/lambda_function.py
  - resumes/put/lambda_function.py
  - resumes/delete/lambda_function.py
  - processing/process_resume_doc/lambda_function.py
- **Database Tables**:
  - resumes (primary)
  - resume_skills (related)
  - resume_experience (related)
- **Key Features**:
  - CRUD operations for resumes
  - Upload resume PDF → S3
  - AI extraction of skills/experience
  - Generate PDF from JSON data

#### 2. certification-module
- **Entity**: Certification
- **Purpose**: Track employee certifications and integrate with Credly
- **Legacy Code**:
  - cert_campaign/lambda_function.py
  - cert_commitment/lambda_function.py
  - person_certs/lambda_function.py
- **Database Tables**:
  - certifications
  - person_certifications
  - cert_campaigns
- **Key Features**:
  - CRUD for certifications
  - Track certification status
  - Credly integration
  - Campaign management

### Questions for Validation

1. ✅ Do these module boundaries make sense?
2. ✅ Should any modules be combined or split further?
3. ✅ Are there any missing entities?
4. ✅ What order should we tackle these? (Priority)

**Please review and approve or suggest changes.**
```

---

## 📝 Phase 3: Generate Module Specifications

Once user approves modules, generate a **Module Specification** for each using the template below.

---

## 📄 Module Specification Template

**File**: `docs/specifications/MODULE-NAME-SPEC.md`

```markdown
# [Module Name] Module Specification

**Entity**: [EntityName]  
**Module Name**: [module-name]  
**Priority**: [High/Medium/Low]  
**Status**: [Planning/In Progress/Complete]

---

## 1. Overview

### Purpose
[What problem does this module solve?]

### Scope
[What is included/excluded from this module?]

### Legacy Code Reference
- Legacy Lambdas:
  - `path/to/legacy/lambda1.py`
  - `path/to/legacy/lambda2.py`
- Legacy Tables:
  - `legacy_table_name`
- Legacy Helpers:
  - `path/to/helper.py`

---

## 2. Data Model

### Primary Entity: [EntityName]

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| title | VARCHAR(200) | Yes | - | NOT NULL | [Field description] |
| summary | TEXT | No | NULL | max 2000 chars | [Field description] |
| skills | JSONB | No | '[]'::jsonb | - | Array of skill objects |
| status | VARCHAR(20) | Yes | 'draft' | enum | draft, active, archived |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Relationships

```
[EntityName]
├── belongs_to: Organization (org_id → org.id)
├── belongs_to: User (created_by → auth.users.id)
├── has_many: [RelatedEntity] (via foreign key)
└── belongs_to_many: [JoinEntity] (via join table)
```

#### Indexes

```sql
CREATE INDEX idx_[entity]_org_id ON [entity](org_id);
CREATE INDEX idx_[entity]_status ON [entity](status);
CREATE INDEX idx_[entity]_created_at ON [entity](created_at DESC);
```

#### RLS Policies

```sql
-- Users can read entities in their organizations
CREATE POLICY "[entity]_org_members_select" ON [entity]
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

-- Users can insert entities in their organizations
CREATE POLICY "[entity]_org_members_insert" ON [entity]
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

-- Similar policies for UPDATE and DELETE
```

---

## 3. API Endpoints

### Base Path: `/api/[entities]`

#### 3.1 List Entities

```
GET /api/[entities]?orgId={uuid}
```

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | Yes | - | Organization ID (multi-tenant filter) |
| status | string | No | - | Filter by status |
| limit | integer | No | 100 | Max results (1-1000) |
| offset | integer | No | 0 | Pagination offset |

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "title": "string",
      "summary": "string",
      "status": "active",
      "created_at": "2025-11-09T10:00:00Z",
      "updated_at": "2025-11-09T10:00:00Z"
    }
  ]
}
```

**Errors**:
- 400: Missing orgId
- 403: User not member of organization

#### 3.2 Get Single Entity

```
GET /api/[entities]/{id}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "title": "string",
    "summary": "string",
    "skills": [...],
    "status": "active",
    "created_at": "2025-11-09T10:00:00Z"
  }
}
```

**Errors**:
- 404: Entity not found
- 403: User not member of organization

#### 3.3 Create Entity

```
POST /api/[entities]
```

**Request Body**:
```json
{
  "org_id": "uuid",
  "title": "string",
  "summary": "string",
  "skills": [...],
  "status": "draft"
}
```

**Validation Rules**:
- `org_id`: Required, valid UUID, user must be member
- `title`: Required, 1-200 characters
- `summary`: Optional, max 2000 characters
- `skills`: Optional, max 50 items
- `status`: Optional, enum: draft|active|archived

**Response** (201 Created):
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- 400: Validation error
- 403: User not member of organization

#### 3.4 Update Entity

```
PUT /api/[entities]/{id}
```

**Request Body** (all fields optional):
```json
{
  "title": "string",
  "summary": "string",
  "status": "active"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors**:
- 400: Validation error
- 404: Entity not found
- 403: User not member of organization

#### 3.5 Delete Entity

```
DELETE /api/[entities]/{id}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Entity deleted successfully",
    "id": "uuid"
  }
}
```

**Errors**:
- 404: Entity not found
- 403: User not member of organization

---

## 4. Business Logic

### 4.1 Validation Rules

```python
# Title validation
def validate_title(title: str) -> str:
    if not title or len(title.strip()) == 0:
        raise ValidationError('Title is required')
    if len(title) > 200:
        raise ValidationError('Title must be 200 characters or less')
    return title.strip()

# Skills validation
def validate_skills(skills: List[Dict]) -> List[Dict]:
    if len(skills) > 50:
        raise ValidationError('Maximum 50 skills allowed')
    for skill in skills:
        if 'name' not in skill:
            raise ValidationError('Each skill must have a name')
    return skills
```

### 4.2 Business Rules

1. **Draft Status**: New entities start as 'draft'
2. **Activation**: User can activate draft when [condition met]
3. **Archival**: Archived entities are read-only
4. **Uniqueness**: [If applicable, e.g., one active resume per person]
5. **Cascading**: Deleting entity cascades to related records

### 4.3 Special Operations

#### [Operation Name]

**Purpose**: [What it does]

**Trigger**: [S3 upload, API call, schedule, etc.]

**Process**:
1. Step 1
2. Step 2
3. Step 3

**Example** (from legacy code):
```python
def process_entity_document(s3_key: str):
    # Legacy implementation
    # ... extract relevant logic ...
```

---

## 5. Database Migration

### Migration File: `sql/migrations/YYYYMMDD_create_[entity]_table.sql`

```sql
-- Create primary table
CREATE TABLE IF NOT EXISTS public.[entity] (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_[entity]_org_id ON public.[entity](org_id);
CREATE INDEX idx_[entity]_status ON public.[entity](status);
CREATE INDEX idx_[entity]_created_at ON public.[entity](created_at DESC);

-- Enable RLS
ALTER TABLE public.[entity] ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "[entity]_org_members_select" ON public.[entity]
    FOR SELECT
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

CREATE POLICY "[entity]_org_members_insert" ON public.[entity]
    FOR INSERT
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

CREATE POLICY "[entity]_org_members_update" ON public.[entity]
    FOR UPDATE
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

CREATE POLICY "[entity]_org_members_delete" ON public.[entity]
    FOR DELETE
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE person_id = auth.uid() AND active = true
    ));

-- Add triggers for updated_at
CREATE TRIGGER update_[entity]_updated_at
    BEFORE UPDATE ON public.[entity]
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 6. Frontend Components

### 6.1 Custom Hooks

```typescript
// hooks/use[EntityName]s.ts
export function use[EntityName]s(orgId: string) {
  const { data: session } = useSession();
  const [entities, setEntities] = useState<[EntityName][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken || !orgId) return;
    
    const fetchEntities = async () => {
      const client = createAuthenticatedClient(session.accessToken);
      const response = await client.get(`/[entities]?orgId=${orgId}`);
      if (response.success) {
        setEntities(response.data);
      }
    };
    
    fetchEntities();
  }, [session, orgId]);

  return { entities, loading, error };
}
```

### 6.2 Components Needed

- `[EntityName]List.tsx` - List view
- `[EntityName]Detail.tsx` - Detail view
- `[EntityName]Form.tsx` - Create/Edit form
- `[EntityName]Card.tsx` - Card component

---

## 7. Testing Requirements

### 7.1 Backend Tests

```python
# test_[entity]_lambda.py

def test_get_all_entities_success():
    # Test successful GET /entities
    pass

def test_get_all_entities_missing_org_id():
    # Test missing orgId parameter (400 error)
    pass

def test_get_all_entities_no_access():
    # Test user not in organization (403 error)
    pass

def test_create_entity_success():
    # Test successful POST /entities
    pass

def test_create_entity_invalid_data():
    # Test validation errors (400 error)
    pass
```

### 7.2 Frontend Tests

```typescript
// [EntityName]List.test.tsx

describe('[EntityName]List', () => {
  it('displays loading state', () => { });
  it('displays entities after loading', async () => { });
  it('displays error state', async () => { });
  it('handles empty list', async () => { });
});
```

---

## 8. Implementation Checklist

### Phase 1: Setup
- [ ] Generate module structure: `./scripts/create-cora-module.sh [module-name] [entity]`
- [ ] Create specification document (this file)
- [ ] Review and approve specification

### Phase 2: Backend
- [ ] Create database migration SQL
- [ ] Customize Lambda handlers with business logic
- [ ] Add validation functions
- [ ] Implement special operations (if any)
- [ ] Run compliance check: `python3 scripts/check-api-compliance.py`
- [ ] Write backend tests
- [ ] Test locally

### Phase 3: Frontend
- [ ] Create custom hooks
- [ ] Create components
- [ ] Add routes
- [ ] Write frontend tests
- [ ] Test locally

### Phase 4: Deploy
- [ ] Deploy database migration
- [ ] Deploy Lambda functions
- [ ] Deploy frontend
- [ ] Integration testing
- [ ] User acceptance testing

---

## 9. Migration Notes

### Legacy Code Mapping

| Legacy Lambda | New Handler | Notes |
|---------------|-------------|-------|
| `legacy/get.py` | `handle_get_all()` | Converted to CORA patterns |
| `legacy/put.py` | `handle_create()`, `handle_update()` | Split into two handlers |
| `legacy/process.py` | [S3 trigger Lambda] | New module needed |

### Data Migration

```sql
-- If migrating from legacy table
INSERT INTO public.[entity] (
    id, org_id, title, summary, created_at, created_by
)
SELECT 
    id, 
    organization_id AS org_id,
    name AS title,
    description AS summary,
    created_date AS created_at,
    creator_id AS created_by
FROM legacy.[legacy_table]
WHERE deleted_at IS NULL;
```

### Breaking Changes

- [ ] API path changed: `/old-path` → `/api/[entities]`
- [ ] Field renamed: `name` → `title`
- [ ] Response format changed: flat → nested with `success` + `data`
- [ ] Authentication changed: API key → NextAuth JWT

---

## 10. Reference

### Legacy Code Files
- `READ-ONLY/path/to/legacy/lambda1.py`
- `READ-ONLY/path/to/legacy/lambda2.py`

### Related Documentation
- [CORA Patterns Cookbook](./CORA-PATTERNS-COOKBOOK.md)
- [AI Module Development Guide](./AI-MODULE-DEVELOPMENT-GUIDE.md)
- [Module Development Guide](./MODULE-DEVELOPMENT-GUIDE.md)

### Similar Modules
- [Reference Module] - Use as pattern reference

---

**Generated**: [Date]  
**Status**: [Draft/Approved/In Progress/Complete]
```

---

## 🤖 AI Workflow: Complete Process

### Input from User

```
User: "Migrate the legacy resume code to CORA"
```

### AI Process

```
1. DISCOVERY PHASE
   Read legacy code:
   - READ-ONLY/msoc-app-career-back/lambdas/resumes/
   - READ-ONLY/msoc-app-career-back/sql/01-final_ddl.sql
   
   Extract:
   - Entities: Resume
   - Tables: resumes, resume_skills, resume_experience
   - Operations: CRUD + PDF upload + AI parsing
   
2. PROPOSAL PHASE
   Present to user:
   """
   I analyzed the legacy code and propose:
   
   1. resume-module
      - Entity: Resume
      - Features: CRUD, PDF upload, AI parsing
      - Tables: resumes, resume_skills, resume_experience
   
   Should I proceed with this module boundary?
   Or would you prefer different grouping?
   """
   
3. SPECIFICATION PHASE
   (After user approval)
   Generate: docs/specifications/RESUME-MODULE-SPEC.md
   
   Fill in:
   - Data model from legacy tables
   - API endpoints from legacy Lambdas
   - Business logic from legacy code
   - Validation rules from legacy code
   
   Present to user:
   """
   I've created the specification document.
   Please review:
   - docs/specifications/RESUME-MODULE-SPEC.md
   
   Key decisions needed:
   1. Should resume uploads go to S3 or Supabase Storage?
   2. Should we use AI extraction immediately or allow manual entry?
   3. What's the max number of resume versions per person?
   """
   
4. GENERATION PHASE
   (After user approves specification)
   
   Run generator:
   ```
   ./scripts/create-cora-module.sh resume-module resume
   ```
   
   Customize handlers using specification:
   - Add resume-specific fields
   - Add resume-specific validation
   - Add PDF processing logic
   - Keep ALL CORA patterns intact
   
   Verify compliance:
   ```
   python3 scripts/check-api-compliance.py
   ```
   
5. TESTING PHASE
   Create database migration
   Test locally
   Deploy
```

---

## 📊 Example: Resume Module Migration

See: [Example Resume Module Specification](./examples/RESUME-MODULE-SPEC-EXAMPLE.md)

This shows a complete specification generated from legacy code analysis.

---

## ✅ Summary

This guide provides a **systematic, repeatable process** for:

1. ✅ Analyzing legacy code
2. ✅ Identifying entities and module boundaries
3. ✅ Proposing modules to user for validation
4. ✅ Generating detailed specifications
5. ✅ Using specifications to create CORA modules
6. ✅ Ensuring 100% compliance throughout

**Key Innovation**: AI can now systematically refactor legacy code into CORA modules with user validation at each step.
