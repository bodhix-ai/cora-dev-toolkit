# CORA Module Dependencies Standard

**Status:** Draft  
**Version:** 1.0  
**Last Updated:** December 31, 2025

## Table of Contents

1. [Overview](#overview)
2. [Core Module Dependencies](#core-module-dependencies)
3. [Functional Module Dependencies](#functional-module-dependencies)
4. [Dependency Declaration](#dependency-declaration)
5. [Integration Patterns](#integration-patterns)
6. [Dependency Management](#dependency-management)
7. [Version Compatibility](#version-compatibility)
8. [Validation](#validation)

---

## Overview

This document defines how CORA modules declare, manage, and integrate dependencies. All functional modules depend on the three core modules, and may depend on other functional modules.

### Dependency Types

1. **Core Module Dependencies** (Required for ALL modules)
   - `module-access` - Authentication, authorization, user/org management
   - `module-ai` - AI provider integration, model access
   - `module-mgmt` - Platform management, module registration, monitoring

2. **Functional Module Dependencies** (Optional, per module)
   - `module-kb` → Document storage, embeddings, RAG
   - `module-chat` → Chat interfaces, conversation management
   - Other application-specific modules

### Dependency Principles

1. **Explicit Declaration** - All dependencies declared in `module.json`
2. **Version Specification** - Semantic versioning for compatibility
3. **Shared Methods** - Import and use shared functionality, don't duplicate
4. **Circular Avoidance** - No circular dependencies allowed
5. **Minimal Coupling** - Depend only on what you actually use

---

## Core Module Dependencies

### All Modules MUST Depend On

```json
{
  "name": "my-module",
  "dependencies": {
    "modules": [
      "module-access@^1.0.0",
      "module-ai@^1.0.0",
      "module-mgmt@^1.0.0"
    ]
  }
}
```

### module-access Integration

**Purpose:** Authentication, authorization, multi-tenancy

**Required Integrations:**

1. **Backend Lambda Integration**

```python
# Import access common layer
import access_common as access

def lambda_handler(event, context):
    # Extract user info
    user_info = access.get_user_from_event(event)
    okta_uid = user_info['user_id']
    
    # Convert to Supabase user ID
    supabase_user_id = access.get_supabase_user_id_from_okta_uid(okta_uid)
    
    # Verify org access
    org_id = event['queryStringParameters']['orgId']
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': supabase_user_id, 'active': True}
    )
    
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Proceed with business logic
    return handle_request(supabase_user_id, org_id)
```

2. **Frontend Integration**

```typescript
// Import authentication client factory
import { createAuthenticatedClient } from '@{project}/api-client';
import { useSession } from 'next-auth/react';
import { useOrganizationContext } from '@{project}/module-access-frontend';

export function MyModuleComponent() {
  const { data: session } = useSession();
  const { currentOrg } = useOrganizationContext();
  
  const client = session?.accessToken 
    ? createAuthenticatedClient(session.accessToken) 
    : null;
  
  // Use client for API calls
  const { data } = useMyModuleData(client, currentOrg?.id);
  
  // ...
}
```

3. **Database RLS Integration**

```sql
-- Use access module's RLS helper functions
CREATE POLICY "my_table_select_policy" ON my_table
    FOR SELECT
    USING (can_access_org_data(org_id));

CREATE POLICY "my_table_insert_policy" ON my_table
    FOR INSERT
    WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "my_table_update_policy" ON my_table
    FOR UPDATE
    USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "my_table_delete_policy" ON my_table
    FOR DELETE
    USING (can_modify_org_data(org_id));
```

**Available Methods from module-access:**

| Method | Purpose | Usage |
|--------|---------|-------|
| `get_user_from_event(event)` | Extract user from Lambda event | Backend auth |
| `get_supabase_user_id_from_okta_uid(okta_uid)` | Convert Okta to Supabase ID | Backend auth |
| `find_one(table, filters)` | Query single record | Backend DB |
| `find_many(table, filters)` | Query multiple records | Backend DB |
| `insert_one(table, data)` | Insert record | Backend DB |
| `update_one(table, filters, data)` | Update record | Backend DB |
| `delete_one(table, filters)` | Delete record | Backend DB |
| `success_response(data)` | 200 response | Backend API |
| `created_response(data)` | 201 response | Backend API |
| `bad_request_response(msg)` | 400 response | Backend API |
| `forbidden_response(msg)` | 403 response | Backend API |
| `not_found_response(msg)` | 404 response | Backend API |
| `can_access_org_data(org_id)` | RLS read policy | Database |
| `can_modify_org_data(org_id)` | RLS write policy | Database |
| `createAuthenticatedClient(token)` | Create API client | Frontend |
| `useOrganizationContext()` | Get current org | Frontend |
| `useProfile()` | Get user profile | Frontend |

---

### module-ai Integration

**Purpose:** AI model access, provider configuration

**Required Integrations:**

1. **Backend AI Provider Access**

```python
# Import AI common layer
import ai_common as ai

def process_with_ai(user_id, org_id, prompt):
    # Get org's AI configuration
    ai_config = ai.get_org_ai_config(org_id)
    
    # Get available models for org
    models = ai.get_available_models(org_id)
    
    # Select model (from config or default)
    model_id = ai_config.get('default_model', 'gpt-4')
    
    # Get model credentials
    credentials = ai.get_model_credentials(org_id, model_id)
    
    # Call AI provider
    response = ai.call_model(
        org_id=org_id,
        model_id=model_id,
        messages=[{'role': 'user', 'content': prompt}],
        credentials=credentials
    )
    
    # Log usage for billing
    ai.log_model_usage(
        org_id=org_id,
        user_id=user_id,
        model_id=model_id,
        tokens_used=response['usage']['total_tokens'],
        cost=response['cost']
    )
    
    return response['content']
```

2. **Frontend AI Config Integration**

```typescript
// Import AI configuration hooks
import { useAIModels, useAIConfig } from '@{project}/module-ai-frontend';

export function MyAIFeature() {
  const { availableModels, loading } = useAIModels();
  const { config, updateConfig } = useAIConfig();
  
  // Display available models
  // Allow user to select model
  // Use selected model for AI operations
}
```

**Available Methods from module-ai:**

| Method | Purpose | Usage |
|--------|---------|-------|
| `get_org_ai_config(org_id)` | Get org AI settings | Backend |
| `get_available_models(org_id)` | List enabled models | Backend |
| `get_model_credentials(org_id, model)` | Get API keys | Backend |
| `call_model(org_id, model, messages)` | Call AI provider | Backend |
| `log_model_usage(org_id, user_id, usage)` | Track usage/cost | Backend |
| `create_embeddings(org_id, texts)` | Generate embeddings | Backend |
| `useAIModels()` | Get available models | Frontend |
| `useAIConfig()` | Get/set AI config | Frontend |

---

### module-mgmt Integration

**Purpose:** Module registration, Lambda management, monitoring

**Required Integrations:**

1. **Module Registration (Deployment Time)**

```bash
# In deployment script
# After successful Lambda deployment

curl -X POST https://api.example.com/platform/modules/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "module_name": "'$MODULE_NAME'",
    "module_version": "'$MODULE_VERSION'",
    "environment": "'$ENVIRONMENT'",
    "status": "ENABLED",
    "lambda_functions": ["'$LAMBDA_ARN'"],
    "api_routes": ["/api/my-module/entities"],
    "database_tables": ["my_table"],
    "dependencies": ["module-access@1.0.0", "module-ai@1.0.0", "module-mgmt@1.0.0"],
    "config_hash": "'$CONFIG_HASH'"
  }'
```

2. **Admin Card Registration**

```typescript
// Export admin card for module-mgmt to discover
import type { AdminCardConfig } from '@{project}/shared-types';

export const myModuleAdminCard: AdminCardConfig = {
  id: 'my-module-admin',
  title: 'My Module',
  description: 'Manage my module features',
  icon: <MyIcon />,
  href: '/admin/mymodule',
  color: 'primary.main',
  order: 100,
  context: 'platform',
  requiredRoles: ['platform_owner', 'platform_admin']
};

// module-mgmt discovers and displays this card
```

3. **Health Check Integration**

```python
# Implement health check endpoint for module-mgmt monitoring
def handle_health_check():
    """Health check for module-mgmt monitoring"""
    checks = {
        'database': check_database_connection(),
        'dependencies': check_dependencies(),
        'configuration': check_configuration()
    }
    
    healthy = all(checks.values())
    
    return {
        'module': 'my-module',
        'status': 'healthy' if healthy else 'unhealthy',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }
```

**Available Methods from module-mgmt:**

| Method | Purpose | Usage |
|--------|---------|-------|
| `register_module(registration)` | Register module | Deployment |
| `update_module_status(module, status)` | Update status | Runtime |
| `log_module_event(module, event)` | Log events | Runtime |
| `get_module_config(module)` | Get config | Runtime |
| Admin card export | Display in admin | Frontend |

---

## Functional Module Dependencies

### Example: module-chat → module-kb

**Use Case:** Chat needs to process and search documents from knowledge base

**Dependency Declaration:**

```json
{
  "name": "module-chat",
  "version": "1.0.0",
  "dependencies": {
    "modules": [
      "module-access@^1.0.0",
      "module-ai@^1.0.0",
      "module-mgmt@^1.0.0",
      "module-kb@^1.0.0"
    ]
  }
}
```

**Integration Pattern:**

1. **Backend Integration**

```python
# module-chat backend Lambda
import kb_common as kb
import ai_common as ai
import access_common as access

def handle_chat_message(user_id, org_id, message, chat_id):
    # Get chat context
    chat = access.find_one(table='chat', filters={'id': chat_id})
    
    # If chat has linked KB base, retrieve relevant context
    if chat.get('kb_base_id'):
        # Use kb-module methods to search
        relevant_docs = kb.search_documents(
            org_id=org_id,
            kb_base_id=chat['kb_base_id'],
            query=message,
            limit=5
        )
        
        # Build context from retrieved documents
        context = kb.format_context_for_llm(relevant_docs)
        
        # Generate AI response with context
        response = ai.call_model(
            org_id=org_id,
            model_id=chat['model_id'],
            messages=[
                {'role': 'system', 'content': f'Context: {context}'},
                {'role': 'user', 'content': message}
            ]
        )
    else:
        # No KB context, just AI response
        response = ai.call_model(
            org_id=org_id,
            model_id=chat['model_id'],
            messages=[{'role': 'user', 'content': message}]
        )
    
    return response
```

2. **Frontend Integration**

```typescript
// module-chat frontend
import { useKBBases, useKBDocuments } from '@{project}/module-kb-frontend';
import { useChatMessages } from './hooks/useChatMessages';

export function ChatWithKB() {
  const { kbBases } = useKBBases(orgId);
  const [selectedKB, setSelectedKB] = useState(null);
  const { messages, sendMessage } = useChatMessages(chatId, selectedKB);
  
  return (
    <Box>
      <Select
        value={selectedKB}
        onChange={(e) => setSelectedKB(e.target.value)}
      >
        <MenuItem value="">No KB Context</MenuItem>
        {kbBases.map(kb => (
          <MenuItem key={kb.id} value={kb.id}>{kb.name}</MenuItem>
        ))}
      </Select>
      
      <ChatMessages messages={messages} />
      <ChatInput onSend={sendMessage} />
    </Box>
  );
}
```

3. **Database Integration**

```sql
-- module-chat references module-kb tables
CREATE TABLE chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id),
    name VARCHAR(255) NOT NULL,
    kb_base_id UUID REFERENCES kb_base(id),  -- Optional link to KB
    model_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

### Example: module-wf → module-kb, module-ai

**Use Case:** Workflow needs document processing and AI analysis

**Dependency Declaration:**

```json
{
  "name": "module-wf",
  "version": "1.0.0",
  "dependencies": {
    "modules": [
      "module-access@^1.0.0",
      "module-ai@^1.0.0",
      "module-mgmt@^1.0.0",
      "module-kb@^1.0.0"
    ]
  }
}
```

**Integration Pattern:**

```python
# module-wf backend Lambda
import kb_common as kb
import ai_common as ai
import access_common as access

def execute_document_analysis_workflow(user_id, org_id, workflow_id, document_id):
    """
    Execute a workflow that analyzes a document
    Leverages kb-module for document storage/processing
    Leverages ai-module for analysis
    """
    # Get workflow definition
    workflow = access.find_one(table='workflow', filters={'id': workflow_id})
    
    # Step 1: Upload document to KB (use kb-module)
    kb_doc = kb.upload_document(
        org_id=org_id,
        kb_base_id=workflow['kb_base_id'],
        file_path=document_id,
        metadata={'workflow_id': workflow_id}
    )
    
    # Step 2: Process document (use kb-module)
    kb.process_document(
        org_id=org_id,
        document_id=kb_doc['id']
    )
    
    # Step 3: Extract text chunks (use kb-module)
    chunks = kb.get_document_chunks(
        org_id=org_id,
        document_id=kb_doc['id']
    )
    
    # Step 4: Analyze with AI (use ai-module)
    analysis_prompt = workflow['analysis_prompt']
    full_text = ' '.join([c['text'] for c in chunks])
    
    analysis = ai.call_model(
        org_id=org_id,
        model_id=workflow['model_id'],
        messages=[
            {'role': 'system', 'content': analysis_prompt},
            {'role': 'user', 'content': full_text}
        ]
    )
    
    # Step 5: Save workflow result
    result = access.insert_one(
        table='workflow_execution',
        data={
            'org_id': org_id,
            'workflow_id': workflow_id,
            'document_id': kb_doc['id'],
            'analysis': analysis['content'],
            'status': 'complete',
            'created_by': user_id
        }
    )
    
    return result
```

---

## Dependency Declaration

### module.json Schema

```json
{
  "name": "module-name",
  "version": "1.0.0",
  "description": "Module description",
  "type": "feature",
  
  "dependencies": {
    "modules": [
      "module-access@^1.0.0",
      "module-ai@^1.0.0",
      "module-mgmt@^1.0.0",
      "module-kb@^1.0.0"
    ],
    "packages": [
      "@supabase/supabase-js@^2.0.0",
      "openai@^4.0.0"
    ]
  },
  
  "provides": {
    "exports": {
      "my_common": "backend/layers/my-common",
      "useMyData": "frontend/hooks/useMyData"
    },
    "database": ["my_table"],
    "lambdas": ["my-lambda"],
    "routes": ["/api/my-module/entities"]
  }
}
```

### Semantic Versioning

```
^1.0.0  - Compatible with 1.x.x (allows minor and patch updates)
~1.2.3  - Compatible with 1.2.x (allows only patch updates)
1.2.3   - Exact version required
>=1.0.0 - Minimum version 1.0.0
```

**Recommendation:** Use `^` for most dependencies to allow compatible updates

---

## Integration Patterns

### Pattern 1: Shared Backend Methods

**When to Use:** Reuse common functionality (DB access, AI calls, document processing)

**How to Integrate:**

1. **Import the dependency's common layer**

```python
# In requirements.txt
# (Handled automatically if dependency declared in module.json)

# In Lambda function
import access_common as access
import kb_common as kb
import ai_common as ai
```

2. **Use shared methods instead of duplicating**

```python
# ❌ DON'T duplicate functionality
def my_find_one(table, filters):
    # Custom DB query implementation
    pass

# ✅ DO use shared methods
from access_common import find_one

result = find_one(table='my_table', filters={'id': entity_id})
```

### Pattern 2: Shared Frontend Components/Hooks

**When to Use:** Reuse UI components or data fetching logic

**How to Integrate:**

```typescript
// In package.json (handled automatically)
{
  "dependencies": {
    "@{project}/module-kb-frontend": "^1.0.0"
  }
}

// In component
import { useKBBases } from '@{project}/module-kb-frontend';

export function MyComponent() {
  const { kbBases, loading } = useKBBases(orgId);
  // Use KB bases in your component
}
```

### Pattern 3: Database Foreign Keys

**When to Use:** Reference entities from another module

**How to Integrate:**

```sql
-- Reference another module's table
CREATE TABLE my_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES org(id),
    kb_base_id UUID REFERENCES kb_base(id),  -- FK to kb-module
    -- ...
);
```

**Important:** Ensure module dependency is declared so migrations run in correct order

### Pattern 4: API Composition

**When to Use:** Combine data from multiple modules

**How to Integrate:**

```python
def get_enriched_data(user_id, org_id, entity_id):
    # Get entity from this module
    entity = access.find_one(table='my_entity', filters={'id': entity_id})
    
    # Enrich with KB data if linked
    if entity.get('kb_base_id'):
        kb_data = kb.get_kb_base(org_id, entity['kb_base_id'])
        entity['kb_base'] = kb_data
    
    # Enrich with AI config if applicable
    if entity.get('uses_ai'):
        ai_config = ai.get_org_ai_config(org_id)
        entity['ai_config'] = ai_config
    
    return entity
```

---

## Dependency Management

### Dependency Resolution

**Order of Initialization:**

1. Core modules (access, ai, mgmt)
2. Functional modules with no functional dependencies
3. Functional modules with dependencies (in dependency order)

**Example:**

```
1. module-access (core)
2. module-ai (core)
3. module-mgmt (core)
4. module-kb (depends on core only)
5. module-chat (depends on core + kb)
6. module-wf (depends on core + kb)
```

### Circular Dependency Prevention

**Rule:** No circular dependencies allowed

**Examples:**

```
❌ BAD:
module-chat → module-kb
module-kb → module-chat

❌ BAD:
module-a → module-b → module-c → module-a

✅ GOOD:
module-chat → module-kb
module-wf → module-kb
(Both depend on kb, but kb doesn't depend on them)
```

**If circular dependency detected:** Refactor shared functionality into a new module or core module

### Dependency Validation

**Pre-Deployment Checks:**

```bash
# scripts/validate-dependencies.sh
#!/bin/bash

MODULE_NAME=$1

echo "Validating dependencies for $MODULE_NAME"

# 1. Check module.json exists
if [ ! -f "packages/$MODULE_NAME/module.json" ]; then
    echo "❌ module.json not found"
    exit 1
fi

# 2. Extract dependencies
DEPS=$(jq -r '.dependencies.modules[]' packages/$MODULE_NAME/module.json)

# 3. Verify dependencies exist
for dep in $DEPS; do
    dep_name=$(echo $dep | cut -d'@' -f1)
    if [ ! -d "packages/$dep_name" ]; then
        echo "❌ Dependency not found: $dep_name"
        exit 1
    fi
    echo "✅ Found dependency: $dep_name"
done

# 4. Check for circular dependencies
python3 scripts/check-circular-dependencies.py $MODULE_NAME

echo "✅ Dependency validation complete"
```

---

## Version Compatibility

### Compatibility Matrix

| Dependent Module | Dependency | Min Version | Max Version | Notes |
|------------------|------------|-------------|-------------|-------|
| module-chat | module-kb | 1.0.0 | 1.x.x | Uses search API |
| module-wf | module-kb | 1.0.0 | 1.x.x | Uses document processing |
| module-wf | module-ai | 1.0.0 | 1.x.x | Uses model calling |
| ALL | module-access | 1.0.0 | 1.x.x | Core dependency |
| ALL | module-ai | 1.0.0 | 1.x.x | Core dependency |
| ALL | module-mgmt | 1.0.0 | 1.x.x | Core dependency |

### Breaking Changes

**When introducing breaking changes in a module:**

1. **Increment major version** (1.0.0 → 2.0.0)
2. **Update CHANGELOG.md** with migration guide
3. **Notify dependent modules** to update
4. **Maintain backwards compatibility** for 1 version cycle if possible

**Example Migration:**

```markdown
# module-kb v2.0.0 Breaking Changes

## Changed: search_documents signature

**Before (v1.x):**
```python
kb.search_documents(org_id, kb_base_id, query, limit=10)
```

**After (v2.x):**
```python
kb.search_documents(
    org_id=org_id,
    kb_base_id=kb_base_id,
    query=query,
    options={'limit': 10, 'threshold': 0.7}
)
```

**Migration:** Update all calls to use options dict
```

---

## Validation

### Dependency Validation Checklist

- [ ] All core modules declared (access, ai, mgmt)
- [ ] Functional dependencies declared in module.json
- [ ] Version ranges specified using semantic versioning
- [ ] No circular dependencies
- [ ] All dependencies exist in project
- [ ] Dependency versions compatible
- [ ] Migration order accounts for dependencies

### Testing Dependencies

**Unit Tests:**

```python
# Test that dependency methods are available
def test_access_dependency():
    from access_common import find_one
    assert callable(find_one)

def test_kb_dependency():
    from kb_common import search_documents
    assert callable(search_documents)
```

**Integration Tests:**

```python
# Test that dependency integration works
def test_chat_with_kb_integration():
    # Create chat with KB base
    chat = create_chat(kb_base_id='test-kb')
    
    # Send message
    response = send_message(chat['id'], 'test message')
    
    # Verify KB was used
    assert 'context' in response
```

---

## Related Documentation

- [standard_MODULE-REGISTRATION.md](./standard_MODULE-REGISTRATION.md) - Module import and configuration
- [guide_CORA-MODULE-DEVELOPMENT-PROCESS.md](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md) - Module development workflow
- [standard_module-integration-spec.md](./standard_module-integration-spec.md) - Module integration specification

---

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 31, 2025
