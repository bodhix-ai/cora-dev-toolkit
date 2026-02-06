# Eval Optimizer Phase 4 - Domain-Aware Optimization Design

**Status:** 📋 DESIGN DOCUMENT - Implementation Pending  
**Created:** February 5, 2026  
**Updated:** February 5, 2026  
**Sprint:** Sprint 2 - Phase 4 Redesign  

---

## Executive Summary

Phase 4 was initially implemented with manual prompt configuration, which is fundamentally misaligned with the product vision. The system should **automatically explore prompt configurations** using domain-aware optimization, not have BAs manually write prompts.

---

## 🚨 CRITICAL: RAG Architecture Constraint

**Module-kb is the ONLY RAG provider. DO NOT build new RAG infrastructure.**

| Component | Provider | NOT This ❌ |
|-----------|----------|-------------|
| Document Storage | **module-kb** (existing) | ❌ New storage service |
| Embeddings | **module-ai** (existing) | ❌ Direct OpenAI/Titan calls |
| Vector Search | **module-kb** (existing) | ❌ Pinecone, Weaviate, pgvector |
| Context Docs | **Workspace KB** (existing) | ❌ New eval_opt_context_docs storage |

**How it works:**
1. BA uploads context documents → stored in **workspace KB** via module-kb APIs
2. Module-kb generates embeddings via module-ai (already integrated)
3. RAG extraction uses existing module-kb vector search
4. **Zero new infrastructure required**

**Why this matters:**
- Module-kb already provides production-grade RAG capabilities
- Embeddings already integrated via module-ai
- Consistent with CORA architecture (don't duplicate functionality)
- Reduces implementation time from weeks to days

This document specifies the redesigned Phase 4 architecture that supports:
1. **Context document management** - BA uploads domain standards/guides
2. **Response structure definition** - BA defines desired JSON output format
3. **RAG-based domain knowledge** - Extract terminology, standards, criteria from context docs
4. **LLM meta-prompting** - Generate domain-aware prompts automatically
5. **Automated variation testing** - Test 5-7 prompt variations per iteration
6. **Iterative optimization** - BA can refine based on results

---

## Problem Statement

### Original Misunderstanding

**What was implemented (WRONG):**
- BA manually writes prompts
- BA manually configures temperature/max_tokens
- BA manually runs optimization with their prompts
- BA manually iterates

**Correct Product Vision:**
- BA creates truth keys (manual evaluation)
- BA uploads domain context documents
- BA defines desired response structure
- **SYSTEM automatically generates and tests prompts**
- SYSTEM finds best configuration automatically

### Key Insight: Domain-Aware Prompt Generation

Generic prompts ("be strict", "be lenient") don't work for specialized domains:
- **IT Security Audits (CJIS):** Must reference security controls, compliance standards, evidence requirements
- **Federal Appraisals:** Must reference valuation methods, comparables, market analysis
- **FOIA Requests:** Must reference exemptions, redaction rules, public interest

The system must understand the domain and generate contextually appropriate prompts.

---

## Architecture Overview

### Complete Workflow

```
Phase 0: Project Creation
  ↓
Phase 1: Context Document Upload (NEW)
  - BA uploads domain standards (CJIS requirements, appraisal guides, etc.)
  ↓
Phase 2: Sample Document Upload
  - BA uploads sample documents (high/med/low scoring examples)
  ↓
Phase 3: Truth Key Creation + Response Structure Definition (ENHANCED)
  - BA manually evaluates samples (creates truth keys)
  - BA defines desired response structure (score_justification, compliance_gaps, recommendations)
  ↓
Phase 4: Automated Optimization (REDESIGNED)
  - System performs RAG on context documents
  - System generates domain-aware prompts via LLM
  - System tests 5-7 prompt variations
  - System compares AI results to truth keys
  - System finds best configuration
  ↓
Phase 5: Results & Recommendations
  - Show best configuration
  - Show accuracy metrics
  - Recommend improvements (more truth sets, refinement run, etc.)
```

### High-Level Components

```
┌─────────────────────────────────────────────────────────┐
│                 Frontend (React/Next.js)                 │
├─────────────────────────────────────────────────────────┤
│  - Context Document Manager                             │
│  - Response Structure Builder                           │
│  - Optimization Config UI                               │
│  - Results Display                                      │
└─────────────────────────────────────────────────────────┘
                          ↓ API calls
┌─────────────────────────────────────────────────────────┐
│              Backend API (Lambda/API Gateway)            │
├─────────────────────────────────────────────────────────┤
│  - Context Document Endpoints                           │
│  - Response Structure Endpoints                         │
│  - Optimization Run Endpoints                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│          Optimization Orchestrator (Lambda)              │
├─────────────────────────────────────────────────────────┤
│  1. RAG Pipeline (context doc knowledge extraction)      │
│  2. LLM Meta-Prompter (generate domain prompts)         │
│  3. Variation Generator (create 5-7 prompt variations)   │
│  4. Evaluation Runner (call module-eval for each)       │
│  5. Results Comparator (compare to truth keys)          │
│  6. Recommendation Engine (suggest next steps)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Data Layer (Supabase)                   │
├─────────────────────────────────────────────────────────┤
│  - eval_opt_context_docs (NEW)                          │
│  - eval_opt_response_structures (NEW)                   │
│  - eval_opt_runs (existing)                             │
│  - eval_opt_run_results (existing)                      │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Changes

### New Table: Context Documents

```sql
CREATE TABLE eval_opt_context_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    doc_id UUID NOT NULL,  -- kb_docs.id (uploaded to module-kb)
    doc_type VARCHAR(50) NOT NULL,  -- 'standard', 'guide', 'requirement', 'example'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,  -- Primary reference doc?
    
    -- RAG extraction metadata
    extraction_status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    extraction_completed_at TIMESTAMPTZ,
    extracted_concepts JSONB,  -- Array of key concepts/terms extracted
    
    uploaded_by UUID NOT NULL REFERENCES user_profiles(user_id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_opt_context_docs_project ON eval_opt_context_docs(project_id);
CREATE INDEX idx_eval_opt_context_docs_status ON eval_opt_context_docs(extraction_status);
```

### New Table: Response Structures

```sql
CREATE TABLE eval_opt_response_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES eval_optimization_projects(id) ON DELETE CASCADE,
    
    -- Structure definition (JSON schema)
    structure_schema JSONB NOT NULL,
    /*
    Example:
    {
      "sections": [
        {
          "key": "score_justification",
          "label": "Score Justification",
          "type": "text",
          "required": true,
          "description": "Explain the reasoning behind the compliance score"
        },
        {
          "key": "compliance_gaps",
          "label": "Compliance Gaps",
          "type": "array",
          "required": true,
          "description": "List specific areas of non-compliance"
        },
        {
          "key": "recommendations",
          "label": "Recommendations",
          "type": "array",
          "required": true,
          "description": "Actionable steps to achieve compliance"
        }
      ]
    }
    */
    
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_by UUID NOT NULL REFERENCES user_profiles(user_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_opt_response_structures_project ON eval_opt_response_structures(project_id);
CREATE INDEX idx_eval_opt_response_structures_active ON eval_opt_response_structures(is_active);
```

### Updated Table: Optimization Runs

```sql
-- Add new columns to existing eval_opt_runs table
ALTER TABLE eval_opt_runs ADD COLUMN IF NOT EXISTS 
    context_doc_ids UUID[],  -- Array of context doc IDs used
ALTER TABLE eval_opt_runs ADD COLUMN IF NOT EXISTS
    response_structure_id UUID REFERENCES eval_opt_response_structures(id),
ALTER TABLE eval_opt_runs ADD COLUMN IF NOT EXISTS
    generated_prompts JSONB;  -- Array of generated prompt variations tested
    /*
    Example:
    [
      {
        "variation": "evidence-focused",
        "system_prompt": "...",
        "user_prompt_template": "...",
        "temperature": 0.2,
        "max_tokens": 1500
      },
      ...
    ]
    */
```

---

## Component Specifications

### 1. Context Document Manager

**Location:** `app/projects/[id]/context/page.tsx`

**Purpose:** Allow BA to upload and manage domain context documents.

**UI Features:**
- Upload button (multiple files)
- Document list with:
  - Name
  - Type (standard, guide, requirement)
  - Extraction status (pending, processing, completed)
  - Primary flag (checkbox)
  - Delete action
- Drag-to-reorder (priority)
- View extracted concepts (after RAG)

**API Endpoints:**
```
POST   /api/eval-opt/projects/:id/context/upload
GET    /api/eval-opt/projects/:id/context
PUT    /api/eval-opt/projects/:id/context/:doc_id
DELETE /api/eval-opt/projects/:id/context/:doc_id
GET    /api/eval-opt/projects/:id/context/:doc_id/concepts  (view RAG results)
```

**Workflow:**
1. BA clicks "Upload Context Documents"
2. BA selects files (PDF, DOCX)
3. System uploads to module-kb
4. System triggers RAG extraction (async)
5. BA sees extraction status
6. BA can view extracted concepts

---

### 2. Response Structure Builder

**Location:** `app/projects/[id]/response-structure/page.tsx`

**Purpose:** Allow BA to define desired JSON response format.

**UI Features:**
- Visual builder (drag-and-drop sections)
- Section types:
  - Text field (short text)
  - Text area (long text)
  - Array (list of items)
  - Number (numeric value)
  - Boolean (yes/no)
- For each section:
  - Key (JSON key name)
  - Label (display name)
  - Type (text, array, etc.)
  - Required (checkbox)
  - Description (help text)
- Preview pane (shows JSON example)
- Save button
- Version history

**API Endpoints:**
```
POST   /api/eval-opt/projects/:id/response-structure
GET    /api/eval-opt/projects/:id/response-structure
PUT    /api/eval-opt/projects/:id/response-structure/:id
GET    /api/eval-opt/projects/:id/response-structure/versions  (history)
```

**Example UI Interaction:**
```
┌─────────────────────────────────────────────────────────┐
│  Response Structure Builder                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sections:                                               │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📄 Score Justification                         │    │
│  │    Type: Text Area                             │    │
│  │    Required: ✓                                 │    │
│  │    Description: Explain the compliance score   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ 📋 Compliance Gaps                             │    │
│  │    Type: Array                                 │    │
│  │    Required: ✓                                 │    │
│  │    Description: List areas of non-compliance   │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [+ Add Section]                                        │
│                                                          │
│  Preview:                                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ {                                              │    │
│  │   "compliance_score": 85,                      │    │
│  │   "score_justification": "...",                │    │
│  │   "compliance_gaps": ["gap1", "gap2"],         │    │
│  │   "recommendations": ["rec1", "rec2"]          │    │
│  │ }                                              │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [Cancel]  [Save Structure]                             │
└─────────────────────────────────────────────────────────┘
```

---

### 3. Simplified Optimization Config

**Location:** `app/projects/[id]/runs/new/page.tsx` (REDESIGNED)

**Purpose:** Start automated optimization with minimal configuration.

**UI Features (Simplified):**
- Run name (text input)
- Description (optional textarea)
- Thoroughness selector:
  - Fast (5 variations, ~5 min)
  - Balanced (7 variations, ~7 min) [default]
  - Thorough (12 variations, ~15 min)
- Max runtime constraint (optional)
- "Start Optimization" button

**REMOVED:**
- Manual prompt editing ❌
- Temperature slider ❌
- Max tokens slider ❌
- Prompt template textarea ❌

**API Endpoint:**
```
POST /api/eval-opt/projects/:id/runs
{
  "name": "Run 1 - Initial optimization",
  "description": "Baseline run with 3 truth sets",
  "thoroughness": "balanced"  // fast, balanced, thorough
}
```

**Workflow:**
1. BA enters run name
2. BA selects thoroughness
3. BA clicks "Start Optimization"
4. System:
   - Loads context documents
   - Performs RAG
   - Generates 7 prompt variations via LLM
   - Tests each variation
   - Compares to truth keys
   - Shows results

---

## Backend Architecture

### Component 1: RAG Pipeline

**Purpose:** Extract domain knowledge from context documents.

**Input:**
- Context document IDs
- Project ID

**Process:**
```python
def extract_domain_knowledge(context_docs: list) -> dict:
    """
    Extract key concepts, terminology, and standards from context docs.
    
    Steps:
    1. Load documents from module-kb
    2. Chunk documents (for large docs)
    3. Extract key concepts via LLM
    4. Build domain vocabulary
    5. Identify relevant standards/requirements
    6. Store in vector database (for RAG)
    
    Returns:
        {
            'key_concepts': ['CJIS 5.4.1', 'encryption at rest', ...],
            'standards': ['CJIS Security Policy 5.10', ...],
            'terminology': {...},
            'embeddings': [...]  # For semantic search
        }
    """
    
    knowledge = {
        'key_concepts': [],
        'standards': [],
        'terminology': {},
        'embeddings': []
    }
    
    for doc in context_docs:
        # Load document content
        content = load_document_from_kb(doc['doc_id'])
        
        # Chunk if large
        chunks = chunk_document(content)
        
        # Extract concepts via LLM
        for chunk in chunks:
            concepts = extract_concepts_llm(chunk)
            knowledge['key_concepts'].extend(concepts)
        
        # Generate embeddings for RAG
        embeddings = generate_embeddings(chunks)
        knowledge['embeddings'].extend(embeddings)
    
    # Store in vector DB
    store_embeddings(knowledge['embeddings'])
    
    return knowledge
```

**Technology:**
- **Embedding Model:** Module-ai (uses configured provider - OpenAI, Bedrock, etc.)
- **Vector Store:** Module-kb (existing KB vector search functionality)
- **LLM for Extraction:** Module-ai (uses configured provider for the workspace)

**IMPORTANT:** Do NOT build new embedding or vector infrastructure. Module-kb already provides:
- Document storage with chunking
- Embedding generation via module-ai integration
- Vector similarity search
- RAG retrieval APIs

Context documents are simply KB documents in the workspace - use existing module-kb upload and search APIs.

---

### Component 2: LLM Meta-Prompter

**Purpose:** Generate domain-aware prompts that produce structured responses.

**Input:**
- Domain knowledge (from RAG)
- Response structure template
- Variation type (evidence-focused, standard-focused, etc.)

**Process:**
```python
def generate_prompt_variation(
    domain_knowledge: dict,
    response_structure: dict,
    variation_type: str
) -> dict:
    """
    Use LLM to generate a domain-aware prompt.
    
    Returns:
        {
            'variation': 'evidence-focused',
            'system_prompt': '...',
            'user_prompt_template': '...',
            'temperature': 0.2,
            'max_tokens': 1500
        }
    """
    
    meta_prompt = f"""
    You are a prompt engineering expert. Generate an evaluation prompt for compliance assessment.
    
    DOMAIN CONTEXT:
    Key Standards: {domain_knowledge['standards']}
    Key Concepts: {domain_knowledge['key_concepts']}
    Terminology: {domain_knowledge['terminology']}
    
    REQUIRED OUTPUT FORMAT:
    {json.dumps(response_structure, indent=2)}
    
    PROMPT REQUIREMENTS:
    - Style: {variation_type}
    - Must produce JSON matching the output format
    - Must reference relevant standards from domain context
    - Must be clear and unambiguous
    
    Generate:
    1. System prompt (sets AI's role and behavior)
    2. User prompt template (includes variables: {{criteria_id}}, {{requirement}}, {{context}}, etc.)
    3. Recommended temperature (0.0-1.0)
    4. Recommended max_tokens
    
    Respond in JSON format:
    {{
        "system_prompt": "...",
        "user_prompt_template": "...",
        "temperature": 0.2,
        "max_tokens": 1500
    }}
    """
    
    # Call LLM to generate prompt
    response = call_llm(meta_prompt, temperature=0.3, model='gpt-4')
    
    # Parse JSON response
    prompt_config = json.loads(response)
    
    # Add variation type
    prompt_config['variation'] = variation_type
    
    return prompt_config
```

**Variation Types:**
1. **Evidence-focused:** Emphasizes citing specific evidence from document
2. **Standard-focused:** Emphasizes referencing compliance standards
3. **Risk-focused:** Emphasizes identifying risks and gaps
4. **Balanced:** Balanced approach
5. **Strict:** Conservative interpretation of compliance
6. **Lenient:** Generous interpretation (fewer false positives)
7. **Detailed:** Longer, more comprehensive explanations

---

### Component 3: Variation Generator

**Purpose:** Generate 5-7 prompt variations for testing.

**Process:**
```python
def generate_prompt_variations(
    project: dict,
    thoroughness: str
) -> list:
    """
    Generate N prompt variations based on thoroughness setting.
    
    Args:
        thoroughness: 'fast' (5), 'balanced' (7), 'thorough' (12)
    
    Returns:
        List of prompt configurations to test
    """
    
    # Define variation types to test
    variation_map = {
        'fast': [
            'balanced',
            'strict',
            'evidence-focused',
            'standard-focused',
            'risk-focused'
        ],
        'balanced': [
            'balanced',
            'strict',
            'lenient',
            'evidence-focused',
            'standard-focused',
            'risk-focused',
            'detailed'
        ],
        'thorough': [
            'balanced',
            'strict',
            'lenient',
            'evidence-focused',
            'standard-focused',
            'risk-focused',
            'detailed',
            'conservative-strict',
            'generous-lenient',
            'citation-heavy',
            'concise',
            'technical'
        ]
    }
    
    # Get domain knowledge via RAG
    domain_knowledge = extract_domain_knowledge(
        get_context_documents(project['id'])
    )
    
    # Get response structure
    response_structure = get_response_structure(project['id'])
    
    # Generate variations
    variations = []
    for variation_type in variation_map[thoroughness]:
        prompt_config = generate_prompt_variation(
            domain_knowledge=domain_knowledge,
            response_structure=response_structure,
            variation_type=variation_type
        )
        variations.append(prompt_config)
    
    return variations
```

---

### Component 4: Evaluation Runner

**Purpose:** Run module-eval for each prompt variation and collect results.

**Process:**
```python
def run_evaluation_with_prompt(
    workspace_id: str,
    doc_group_id: str,
    project: dict,
    prompt_config: dict
) -> dict:
    """
    Run module-eval with specific prompt configuration.
    
    Steps:
    1. Get document from doc_group
    2. Call module-eval with prompt override
    3. Poll for completion
    4. Return results
    
    Returns:
        {
            'eval_id': '...',
            'status': 'completed',
            'criteria_results': [...]
        }
    """
    
    # Get primary document
    doc_group = get_document_group(doc_group_id)
    primary_doc_id = doc_group['primary_doc_id']
    
    # Call module-eval
    eval_id = create_module_eval_evaluation(
        workspace_id=workspace_id,
        doc_ids=[primary_doc_id],
        doc_type_id=project['doc_type_id'],
        criteria_set_id=project['criteria_set_id'],
        prompt_override={
            'system_prompt': prompt_config['system_prompt'],
            'user_prompt_template': prompt_config['user_prompt_template'],
            'temperature': prompt_config['temperature'],
            'max_tokens': prompt_config['max_tokens']
        },
        name=f"Optimization Run - {prompt_config['variation']}"
    )
    
    # Poll for completion
    eval_result = poll_evaluation_completion(workspace_id, eval_id)
    
    # Get full results
    eval_data = get_evaluation_results(workspace_id, eval_id)
    
    return eval_data
```

---

### Component 5: Results Comparator

**Purpose:** Compare AI results to truth keys and calculate metrics.

**Process:**
```python
def compare_variation_to_truth_keys(
    variation_results: dict,
    truth_keys: list,
    prompt_config: dict
) -> dict:
    """
    Compare a single prompt variation's results to truth keys.
    
    Returns:
        {
            'variation': 'evidence-focused',
            'accuracy': 0.82,
            'precision': 0.85,
            'recall': 0.78,
            'f1_score': 0.81,
            'true_positives': 18,
            'true_negatives': 14,
            'false_positives': 3,
            'false_negatives': 5,
            'per_criterion_accuracy': {...},
            'prompt_config': {...}
        }
    """
    
    # Build truth map
    truth_map = {tk['criteria_item_id']: tk for tk in truth_keys}
    
    # Compare each criterion
    results = []
    for ai_result in variation_results['criteria_results']:
        criteria_id = ai_result['criteriaItem']['id']
        truth_key = truth_map[criteria_id]
        
        # Compare status
        status_match = (ai_result['aiResult']['statusId'] == truth_key['truth_status_id'])
        
        # Calculate confidence difference
        confidence_diff = abs(
            ai_result['aiResult'].get('confidence', 0) - 
            truth_key['truth_confidence']
        )
        
        # Classify (TP/TN/FP/FN)
        result_type = classify_result(
            truth_status_id=truth_key['truth_status_id'],
            ai_status_id=ai_result['aiResult']['statusId']
        )
        
        results.append({
            'criteria_id': criteria_id,
            'status_match': status_match,
            'confidence_diff': confidence_diff,
            'result_type': result_type
        })
    
    # Calculate overall metrics
    metrics = calculate_metrics(results)
    
    return {
        'variation': prompt_config['variation'],
        'accuracy': metrics['accuracy'],
        'precision': metrics['precision'],
        'recall': metrics['recall'],
        'f1_score': metrics['f1_score'],
        'true_positives': metrics['tp'],
        'true_negatives': metrics['tn'],
        'false_positives': metrics['fp'],
        'false_negatives': metrics['fn'],
        'per_criterion_accuracy': metrics['per_criterion'],
        'prompt_config': prompt_config
    }
```

---

### Component 6: Recommendation Engine

**Purpose:** Analyze results and provide actionable recommendations.

**Process:**
```python
def generate_recommendations(
    run_results: list,
    project: dict
) -> list:
    """
    Analyze optimization run results and generate recommendations.
    
    Returns:
        [
            {
                'type': 'improvement',  # improvement, warning, success
                'priority': 'high',     # high, medium, low
                'title': 'Add more truth sets',
                'description': 'Current: 3 truth sets. Adding 7 more could improve accuracy by ~10%.',
                'action': 'add_truth_sets',
                'estimated_improvement': 0.10
            },
            ...
        ]
    """
    
    recommendations = []
    
    # Get best variation
    best = max(run_results, key=lambda x: x['accuracy'])
    
    # Check accuracy level
    if best['accuracy'] < 0.70:
        recommendations.append({
            'type': 'warning',
            'priority': 'high',
            'title': 'Low accuracy - Need more truth sets',
            'description': f'Current accuracy: {best["accuracy"]:.0%}. This is too low for production. Add 5-10 more evaluated documents to improve reliability.',
            'action': 'add_truth_sets',
            'estimated_improvement': 0.15
        })
    
    elif best['accuracy'] < 0.80:
        recommendations.append({
            'type': 'improvement',
            'priority': 'medium',
            'title': 'Moderate accuracy - Refinement recommended',
            'description': f'Current accuracy: {best["accuracy"]:.0%}. Running a refinement optimization around the best variation could reach 80%+.',
            'action': 'run_refinement',
            'estimated_improvement': 0.08
        })
    
    else:
        recommendations.append({
            'type': 'success',
            'priority': 'low',
            'title': 'Good accuracy achieved',
            'description': f'Current accuracy: {best["accuracy"]:.0%}. This configuration is ready for production deployment.',
            'action': 'deploy',
            'estimated_improvement': 0.0
        })
    
    # Check truth set size
    truth_set_count = count_truth_sets(project['id'])
    if truth_set_count < 10:
        recommendations.append({
            'type': 'improvement',
            'priority': 'high',
            'title': f'Limited truth sets ({truth_set_count})',
            'description': f'Current: {truth_set_count} evaluated documents. Adding 7 more would improve confidence and accuracy. Target: 10-15 truth sets.',
            'action': 'add_truth_sets',
            'estimated_improvement': 0.10
        })
    
    # Check for high error rates on specific criteria
    for criteria_id, metrics in best['per_criterion_accuracy'].items():
        if metrics['accuracy'] < 0.60:
            criterion = get_criterion(criteria_id)
            recommendations.append({
                'type': 'warning',
                'priority': 'high',
                'title': f'Low accuracy on criterion: {criterion["criteria_id"]}',
                'description': f'Accuracy: {metrics["accuracy"]:.0%}. This criterion needs attention. Consider refining the criterion definition or adding more examples.',
                'action': 'review_criterion',
                'estimated_improvement': 0.15
            })
    
    # Check false positive/negative patterns
    if best['false_positives'] > best['false_negatives'] * 2:
        recommendations.append({
            'type': 'improvement',
            'priority': 'medium',
            'title': 'High false positive rate',
            'description': 'The AI is being too lenient. Consider running optimization with stricter prompt variations.',
            'action': 'try_stricter',
            'estimated_improvement': 0.08
        })
    
    elif best['false_negatives'] > best['false_positives'] * 2:
        recommendations.append({
            'type': 'improvement',
            'priority': 'medium',
            'title': 'High false negative rate',
            'description': 'The AI is being too strict. Consider running optimization with more lenient prompt variations.',
            'action': 'try_lenient',
            'estimated_improvement': 0.08
        })
    
    return recommendations
```

---

## API Specifications

### Context Documents

#### Upload Context Document
```
POST /api/eval-opt/projects/:project_id/context/upload

Request (multipart/form-data):
{
  file: File,
  doc_type: 'standard' | 'guide' | 'requirement' | 'example',
  is_primary: boolean,
  description: string (optional)
}

Response:
{
  data: {
    id: string,
    project_id: string,
    doc_id: string,  // kb_docs.id
    name: string,
    doc_type: string,
    is_primary: boolean,
    extraction_status: 'pending',
    uploaded_at: string
  }
}
```

#### List Context Documents
```
GET /api/eval-opt/projects/:project_id/context

Response:
{
  data: [
    {
      id: string,
      doc_id: string,
      name: string,
      doc_type: string,
      is_primary: boolean,
      extraction_status: 'completed',
      extracted_concepts: ['CJIS 5.4.1', ...],
      uploaded_at: string
    }
  ]
}
```

#### Get Extracted Concepts
```
GET /api/eval-opt/projects/:project_id/context/:doc_id/concepts

Response:
{
  data: {
    key_concepts: ['CJIS 5.4.1', 'encryption at rest', ...],
    standards: ['CJIS Security Policy 5.10', ...],
    terminology: {
      'encryption': 'Process of encoding information...',
      'authentication': 'Verification of identity...'
    }
  }
}
```

### Response Structure

#### Create/Update Response Structure
```
POST /api/eval-opt/projects/:project_id/response-structure

Request:
{
  structure_schema: {
    sections: [
      {
        key: 'score_justification',
        label: 'Score Justification',
        type: 'text',
        required: true,
        description: 'Explain the compliance score'
      },
      {
        key: 'compliance_gaps',
        label: 'Compliance Gaps',
        type: 'array',
        required: true,
        description: 'List gaps'
      }
    ]
  }
}

Response:
{
  data: {
    id: string,
    project_id: string,
    structure_schema: {...},
    version: 1,
    is_active: true,
    created_at: string
  }
}
```

### Optimization Runs (Updated)

#### Start Optimization Run
```
POST /api/eval-opt/projects/:project_id/runs

Request:
{
  name: string,
  description: string (optional),
  thoroughness: 'fast' | 'balanced' | 'thorough'
}

Response:
{
  data: {
    id: string,
    project_id: string,
    name: string,
    status: 'pending',
    thoroughness: 'balanced',
    variations_count: 7,  // How many prompts will be tested
    estimated_duration: 420,  // seconds
    created_at: string
  }
}

Note: System automatically:
- Loads context documents
- Performs RAG
- Generates prompt variations
- Tests each variation
- Compares to truth keys
```

#### Get Run Results with Recommendations
```
GET /api/eval-opt/projects/:project_id/runs/:run_id

Response:
{
  data: {
    id: string,
    name: string,
    status: 'completed',
    
    // Best variation found
    best_variation: {
      variation: 'evidence-focused',
      accuracy: 0.82,
      precision: 0.85,
      recall: 0.78,
      f1_score: 0.81,
      prompt_config: {
        system_prompt: '...',
        user_prompt_template: '...',
        temperature: 0.2,
        max_tokens: 1500
      }
    },
    
    // All variations tested
    all_variations: [
      {
        variation: 'evidence-focused',
        accuracy: 0.82,
        ...
      },
      {
        variation: 'standard-focused',
        accuracy: 0.78,
        ...
      },
      ...
    ],
    
    // Recommendations
    recommendations: [
      {
        type: 'improvement',
        priority: 'high',
        title: 'Add more truth sets',
        description: 'Current: 3 truth sets. Adding 7 more could improve accuracy by ~10%.',
        action: 'add_truth_sets',
        estimated_improvement: 0.10
      },
      ...
    ],
    
    completed_at: string
  }
}
```

---

## Implementation Phases

### Phase 4A: Context Document Management (Week 1)
- [ ] Database: Create eval_opt_context_docs table
- [ ] Backend: Context document upload endpoint
- [ ] Backend: RAG extraction pipeline (async)
- [ ] Frontend: Context Document Manager UI
- [ ] Frontend: View extracted concepts

### Phase 4B: Response Structure Builder (Week 1-2)
- [ ] Database: Create eval_opt_response_structures table
- [ ] Backend: Response structure CRUD endpoints
- [ ] Frontend: Response Structure Builder UI
- [ ] Frontend: JSON preview pane

### Phase 4C: Automated Optimization (Week 2-3)
- [ ] Backend: LLM meta-prompter
- [ ] Backend: Variation generator
- [ ] Backend: Evaluation runner (module-eval integration)
- [ ] Backend: Results comparator
- [ ] Backend: Recommendation engine
- [ ] Frontend: Simplified optimization config UI
- [ ] Frontend: Results display with recommendations

### Phase 4D: Testing & Refinement (Week 3)
- [ ] End-to-end testing with real domain docs
- [ ] Validate RAG extraction quality
- [ ] Validate prompt generation quality
- [ ] Validate accuracy metrics
- [ ] User acceptance testing

---

## Success Criteria

### Functional Requirements
- [ ] BA can upload context documents (PDFs, DOCX)
- [ ] System extracts domain knowledge via RAG
- [ ] BA can define response structure (JSON builder)
- [ ] BA can start optimization with one click
- [ ] System generates 5-7 domain-aware prompts
- [ ] System tests all variations automatically
- [ ] System shows best configuration
- [ ] System provides actionable recommendations
- [ ] BA can iterate (run refinement based on results)

### Quality Requirements
- [ ] RAG extraction identifies key concepts (>80% recall)
- [ ] Generated prompts reference domain standards
- [ ] Generated prompts produce structured JSON
- [ ] Optimization completes in < 15 minutes
- [ ] Results show clear accuracy improvement
- [ ] Recommendations are actionable and accurate

---

## Open Questions

1. ~~**Vector Database Selection:** Pinecone vs pgvector vs Weaviate?~~ **RESOLVED:** Use module-kb (existing)
2. ~~**Embedding Model:** OpenAI vs AWS Titan vs open source?~~ **RESOLVED:** Use module-ai (existing)
3. **LLM for Meta-Prompting:** Use workspace's configured AI provider via module-ai
4. **RAG Chunking Strategy:** Use module-kb's existing chunking (configurable per workspace)
5. **Prompt Caching:** Cache generated prompts for similar domains? (Future enhancement)
6. **Multi-model Support:** Should optimization test different AI models (GPT-4, Claude, Nova)?

---

## Dependencies

### External Services
- **module-kb:** Document storage, embeddings, and RAG retrieval (EXISTING - primary RAG provider)
- **module-ai:** AI provider abstraction for embeddings and LLM calls (EXISTING)
- **module-eval:** Evaluation execution (EXISTING)

**NOTE:** No external vector DB (Pinecone, Weaviate, pgvector) is needed. Module-kb provides all RAG functionality.

### Internal Components
- Phase 0-3 must be complete (project management, samples, truth keys)
- Response structure definition UI must be created first
- Context document upload must work before optimization

---

**Document Status:** 📋 Complete - Ready for Implementation Review  
**Next Steps:** Review with team, clarify open questions, begin Phase 4A implementation  
**Estimated Implementation Time:** 3 weeks (Phases 4A, 4B, 4C, 4D)  
**Last Updated:** February 5, 2026