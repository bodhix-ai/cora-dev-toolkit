# CORA Module Development Toolkit - Integration Guide

## Overview

This guide walks you through integrating the CORA Module Development Toolkit into your AI module project, setting up the environment, and creating your first CORA-compliant modules.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Python 3.8+ installed (`python3 --version`)
- [ ] Git installed and configured
- [ ] AWS CLI installed (optional, for infrastructure checks)
- [ ] Access to AWS credentials (optional, for full compliance checks)
- [ ] Access to Supabase credentials (optional, for database checks)

## Integration Steps

### Step 1: Prepare Your AI Module Project

Your project should have this structure (or you'll create it):

```
your-ai-module-project/
├── packages/              # Will contain your modules
├── apps/                  # Your applications
│   └── frontend/          # Next.js frontend app
├── package.json           # Root package.json with workspace config
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── tsconfig.base.json     # Base TypeScript configuration
```

If you don't have this structure yet, create it:

```bash
# From your project root
mkdir -p packages apps/frontend
```

### Step 2: Copy Toolkit to Your Project

```bash
# From wherever you have the toolkit
cp -r module-development-toolkit /path/to/your-ai-module-project/

# Navigate to your project
cd /path/to/your-ai-module-project
```

### Step 3: Install Dependencies

#### Python Dependencies

```bash
cd module-development-toolkit/config
pip install -r requirements.txt
cd ../..
```

Or if you prefer a virtual environment:

```bash
cd module-development-toolkit/config
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### Node.js Dependencies

```bash
# If you haven't already, install pnpm globally
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Step 4: Make Scripts Executable

```bash
chmod +x module-development-toolkit/scripts/*.sh
```

### Step 5: Configure Environment Variables

Create a `.env.local` or `.env` file in your project root:

```bash
# .env.local
# AWS Credentials (optional, for infrastructure checks)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1

# Supabase Credentials (optional, for database checks)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Compliance thresholds (optional)
CORA_FRONTEND_THRESHOLD=95
CORA_BACKEND_THRESHOLD=90
```

**Important:** Add `.env.local` to your `.gitignore`!

### Step 6: Verify Toolkit Installation

```bash
# Test that scripts are accessible
./module-development-toolkit/scripts/create-cora-module.sh --help

# Test Python environment
python3 -c "import boto3, supabase; print('Python dependencies OK')"
```

## Creating Your First Module: ai-enablement

### Step 1: Generate the Module

```bash
# From project root
./module-development-toolkit/scripts/create-cora-module.sh ai-enablement
```

This will:
1. Create `packages/ai-enablement/` directory
2. Copy template files
3. Replace all placeholders with "ai-enablement"
4. Update package.json with correct module name
5. Create CORA-compliant structure

Expected output:
```
✓ Creating module: ai-enablement
✓ Copying template files...
✓ Replacing placeholders...
✓ Updating package.json...
✓ Module created successfully!

Next steps:
1. cd packages/ai-enablement
2. Review and customize the generated code
3. Run: pnpm install
4. Start development!
```

### Step 2: Install Module Dependencies

```bash
cd packages/ai-enablement
pnpm install
cd ../..
```

### Step 3: Verify Module Structure

Your new module should look like:

```
packages/ai-enablement/
├── backend/
│   ├── lambdas/
│   │   ├── ai_enablement_create.py
│   │   ├── ai_enablement_read.py
│   │   ├── ai_enablement_update.py
│   │   ├── ai_enablement_delete.py
│   │   └── ai_enablement_list.py
│   └── types/
│       └── ai_enablement_types.py
├── frontend/
│   ├── components/
│   │   ├── AiEnablementList.tsx
│   │   ├── AiEnablementDetail.tsx
│   │   └── AiEnablementForm.tsx
│   ├── hooks/
│   │   └── useAiEnablementData.ts
│   ├── api/
│   │   └── aiEnablementApi.ts
│   ├── types/
│   │   └── index.ts
│   ├── navigation/
│   │   └── aiEnablementNavConfig.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Step 4: Run Initial Compliance Check

```bash
# Check frontend compliance
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts ai-enablement

# Check backend compliance (if you have AWS/Supabase configured)
python3 module-development-toolkit/scripts/check-cora-compliance.py --module ai-enablement
```

Expected result: **95%+ frontend compliance**, **90%+ backend compliance**

### Step 5: Customize for AI Enablement

Now customize the template for your AI enablement needs:

1. **Update Types** (`frontend/types/index.ts` and `backend/types/ai_enablement_types.py`):
   - Define AI configuration interfaces
   - Add AI model settings types
   - Include prompt templates types

2. **Implement Backend** (`backend/lambdas/`):
   - Add AI-specific business logic
   - Integrate with AI services
   - Implement security checks

3. **Implement Frontend** (`frontend/components/`):
   - Build AI configuration UI
   - Create prompt management interface
   - Add AI response display components

4. **Update Navigation** (`frontend/navigation/aiEnablementNavConfig.ts`):
   - Configure menu items
   - Set up routes
   - Define permissions

## Creating Your Second Module: ai-config

```bash
# From project root
./module-development-toolkit/scripts/create-cora-module.sh ai-config

cd packages/ai-config
pnpm install
cd ../..

# Verify compliance
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts ai-config
```

Customize for AI configuration management following the same pattern as ai-enablement.

## Workspace Configuration

### Update pnpm-workspace.yaml

Ensure your `pnpm-workspace.yaml` includes the new modules:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Update Root package.json

Add workspace dependencies if needed:

```json
{
  "name": "ai-module-project",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "type-check": "pnpm -r type-check",
    "compliance-check": "python3 module-development-toolkit/scripts/check-cora-compliance.py"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  }
}
```

## Integrating ESLint Rules

### Copy ESLint Configs to Project Root

```bash
cp module-development-toolkit/config/.eslintrc.cora-auth.js .
cp module-development-toolkit/config/.eslintrc.cora-nav.js .
```

### Update Your .eslintrc.js or eslint.config.js

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    // Your existing configs
    './.eslintrc.cora-auth.js',
    './.eslintrc.cora-nav.js'
  ],
  // Your other rules...
};
```

## Setting Up Pre-commit Hooks

### Option 1: Git Hooks (Simple)

```bash
# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
./module-development-toolkit/scripts/pre-commit-check.sh
EOF

chmod +x .git/hooks/pre-commit
```

### Option 2: Husky (Recommended)

```bash
pnpm add -D husky lint-staged

# Initialize husky
npx husky install

# Create pre-commit hook
npx husky add .git/hooks/pre-commit "pnpm lint-staged"
```

Update `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "./module-development-toolkit/scripts/type-check-staged.sh",
      "eslint --fix"
    ],
    "*.{py}": [
      "black",
      "flake8"
    ]
  }
}
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/cora-compliance.yml`:

```yaml
name: CORA Compliance Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  compliance:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install Node.js dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Install Python dependencies
        run: pip install -r module-development-toolkit/config/requirements.txt
      
      - name: TypeScript type checking
        run: pnpm -r type-check
      
      - name: ESLint
        run: pnpm -r lint
      
      - name: Frontend CORA Compliance
        run: npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
      
      - name: Backend CORA Compliance
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: python3 module-development-toolkit/scripts/check-cora-compliance.py
      
      - name: Upload compliance report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.json
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - install
  - check
  - test

variables:
  PNPM_VERSION: "8.6.0"

install:
  stage: install
  image: node:18
  script:
    - npm install -g pnpm@${PNPM_VERSION}
    - pnpm install --frozen-lockfile
  artifacts:
    paths:
      - node_modules/
      - packages/*/node_modules/
    expire_in: 1 hour

compliance:frontend:
  stage: check
  image: node:18
  dependencies:
    - install
  script:
    - npm install -g pnpm@${PNPM_VERSION}
    - npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
  allow_failure: false

compliance:backend:
  stage: check
  image: python:3.11
  dependencies:
    - install
  script:
    - pip install -r module-development-toolkit/config/requirements.txt
    - python3 module-development-toolkit/scripts/check-cora-compliance.py --skip-infra
  allow_failure: false
```

## Path Adjustments

### If Your Project Structure Differs

If your project has a different structure, you may need to adjust paths in scripts:

#### For create-cora-module.sh

Edit `module-development-toolkit/scripts/create-cora-module.sh`:

```bash
# Change this line if packages/ is in a different location
PACKAGES_DIR="packages"  # Adjust if needed
```

#### For Compliance Scripts

Edit path references in:
- `check-cora-compliance.py`
- `check-frontend-compliance.ts`
- `check-api-compliance.py`

Look for hardcoded paths like:
```python
PACKAGES_DIR = "packages"  # Adjust this
BACKEND_DIR = "backend/lambdas"  # Adjust this
```

## Testing Your Integration

### Complete Integration Test

Run these commands to verify everything works:

```bash
# 1. Create test module
./module-development-toolkit/scripts/create-cora-module.sh test-module

# 2. Install dependencies
cd packages/test-module && pnpm install && cd ../..

# 3. Run compliance checks
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts test-module
python3 module-development-toolkit/scripts/check-cora-compliance.py --module test-module --skip-infra

# 4. Type check
cd packages/test-module && pnpm type-check && cd ../..

# 5. Lint
cd packages/test-module && pnpm lint && cd ../..

# 6. Clean up test module (if satisfied)
rm -rf packages/test-module
```

Expected results:
- ✅ Module created successfully
- ✅ Dependencies installed without errors
- ✅ Frontend compliance: 95%+
- ✅ Backend compliance: 90%+
- ✅ No TypeScript errors
- ✅ No lint errors

## Common Integration Issues

### Issue 1: Module Creation Fails - "packages/ directory not found"

**Solution:**
```bash
mkdir -p packages
```

### Issue 2: Python Dependencies Installation Fails

**Solution:**
```bash
# Use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r module-development-toolkit/config/requirements.txt
```

### Issue 3: TypeScript Can't Find Module Dependencies

**Solution:**
```bash
# From project root
pnpm install
pnpm -r build  # Build all packages in order
```

### Issue 4: ESLint Rules Not Being Applied

**Solution:**
```bash
# Ensure ESLint configs are in project root
cp module-development-toolkit/config/.eslintrc.cora-*.js .

# Update your ESLint config to extend them
# Clear ESLint cache
rm -rf node_modules/.cache/eslint
```

### Issue 5: Compliance Scripts Can't Find AWS/Supabase

**Solution:**
```bash
# Skip infrastructure checks during initial setup
python3 module-development-toolkit/scripts/check-cora-compliance.py --skip-infra

# Or set environment variable
export SKIP_INFRA_CHECKS=true
```

## Next Steps After Integration

### 1. Develop Your Modules

- **ai-enablement**: AI service integration and configuration
- **ai-config**: AI model and prompt management

### 2. Maintain CORA Compliance

Run compliance checks frequently:
```bash
# Quick check
./module-development-toolkit/scripts/pre-commit-check.sh

# Full check
python3 module-development-toolkit/scripts/check-cora-compliance.py
npx ts-node module-development-toolkit/scripts/check-frontend-compliance.ts
```

### 3. Import Modules into STS Career Stack

Once your AI modules are complete and CORA-compliant:

1. **Package modules for transfer:**
   ```bash
   # Create tarball of completed modules
   tar -czf ai-modules.tar.gz packages/ai-enablement packages/ai-config
   ```

2. **Transfer to STS Career Stack:**
   ```bash
   # In STS Career Stack project
   tar -xzf ai-modules.tar.gz
   pnpm install
   ```

3. **Integrate into main app:**
   - Update navigation in frontend app
   - Configure API endpoints
   - Add infrastructure definitions
   - Run full compliance check

4. **Verify integration:**
   ```bash
   cd sts-career-stack
   python3 scripts/check-cora-compliance.py
   npx ts-node scripts/check-frontend-compliance.ts
   ```

### 4. Documentation

Document your modules:
- Update module README.md files
- Document AI configuration options
- Create user guides
- Add API documentation
- Document integration points

## Support and Help

### Documentation References

- **Toolkit README**: `module-development-toolkit/README.md`
- **CORA Standards**: `module-development-toolkit/docs/CORA-FRONTEND-STANDARDS.md`
- **Compliance Scripts**: `module-development-toolkit/docs/README-CORA-COMPLIANCE.md`
- **Lessons Learned**: `module-development-toolkit/docs/CORA-COMPLIANCE-REMEDIATION-LOG.md`

### Learning from Examples

Study the module template:
```bash
# Explore template structure
cd module-development-toolkit/templates/_module-template
# Review each file to understand patterns
```

### Troubleshooting Commands

```bash
# Verify Node.js and pnpm
node --version && pnpm --version

# Verify Python and packages
python3 --version && pip list | grep -E "(boto3|supabase)"

# List all packages
pnpm list --depth 0

# Check workspace structure
pnpm list -r

# Rebuild everything
pnpm -r clean && pnpm -r build

# Check Git hooks
ls -la .git/hooks/
```

## Integration Checklist

Use this checklist to track your integration progress:

- [ ] Project structure created (packages/, apps/)
- [ ] Toolkit copied to project
- [ ] Python dependencies installed
- [ ] Node.js dependencies installed
- [ ] Scripts made executable
- [ ] Environment variables configured
- [ ] Created ai-enablement module
- [ ] Created ai-config module
- [ ] Ran compliance checks on both modules
- [ ] ESLint rules integrated
- [ ] Pre-commit hooks configured
- [ ] CI/CD pipeline configured
- [ ] Integration tests passed
- [ ] Documentation updated
- [ ] Team trained on toolkit usage
- [ ] Ready to develop AI features!

## Success Criteria

Your integration is complete when:

1. ✅ Both modules created successfully
2. ✅ Frontend compliance: 95%+
3. ✅ Backend compliance: 90%+
4. ✅ No TypeScript errors
5. ✅ No ESLint errors
6. ✅ Pre-commit hooks working
7. ✅ CI/CD pipeline passing
8. ✅ Team can create new modules independently

## Timeline Estimate

- **Basic Integration**: 1-2 hours
- **Full Integration with CI/CD**: 3-4 hours
- **Team Training**: 1-2 hours
- **Total**: 5-8 hours

---

## Module-KB Integration

### Overview

Module-KB provides RAG (Retrieval-Augmented Generation) capabilities with multi-scope document management. This section covers integrating module-kb into your CORA project.

### Scope Hierarchy

Module-KB supports four scopes with cascading access control:

| Scope | Description | Managed By | Auto-Created |
|-------|-------------|------------|--------------|
| Global (sys) | Platform-wide KBs | Platform Admin | No |
| Organization | Org-level KBs | Org Admin | No |
| Workspace | Per-workspace KBs | Users | Yes (on first upload) |
| Chat | Per-chat KBs | Users | Yes (on first upload) |

### KB Toggle UX Pattern

**Key Concept**: Regular users don't manage KBs directly. Instead, they:
1. Upload documents to workspace/chat (auto-creates KB)
2. Toggle available KBs from org/global pools

**Admin Flow**:
1. Platform admin creates global KBs → associates with orgs
2. Org admin creates org KBs → enables for workspaces
3. Users toggle KBs in workspace/chat context

### Frontend Integration

#### Install Module-KB Components

```typescript
// Import from module-kb
import { 
  KBToggleSelector,
  DocumentUploadZone,
  DocumentTable,
  WorkspaceDataKBTab 
} from '@cora/module-kb/frontend';

// Import hooks
import { 
  useKnowledgeBase,
  useKbDocuments,
  useOrgKbs,
  useSysKbs 
} from '@cora/module-kb/frontend/hooks';
```

#### Workspace Integration

```typescript
// In your workspace page
import { WorkspaceDataKBTab } from '@cora/module-kb/frontend';

function WorkspaceDataTab({ workspaceId }) {
  return (
    <WorkspaceDataKBTab
      workspaceId={workspaceId}
      onUploadComplete={() => console.log('Upload complete')}
    />
  );
}
```

#### Custom KB Selector

```typescript
import { KBToggleSelector } from '@cora/module-kb/frontend';
import { useKnowledgeBase } from '@cora/module-kb/frontend/hooks';

function MyKBSelector({ workspaceId }) {
  const { availableKBs, toggleKB, loading } = useKnowledgeBase(workspaceId);
  
  return (
    <KBToggleSelector
      availableKBs={availableKBs}
      onToggle={toggleKB}
      loading={loading}
    />
  );
}
```

### Backend Integration

#### RAG Search Integration

```python
# In your Lambda that needs RAG context
import requests

def get_rag_context(query: str, kb_ids: list[str], top_k: int = 5) -> list[dict]:
    """
    Get relevant document chunks for RAG context.
    
    Args:
        query: User query to search for
        kb_ids: List of enabled KB IDs
        top_k: Number of chunks to return
        
    Returns:
        List of relevant chunks with citations
    """
    response = requests.post(
        f"{API_URL}/kb/search",
        json={
            "query": query,
            "kbIds": kb_ids,
            "topK": top_k
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    return response.json()["chunks"]
```

#### Chat Integration Pattern

```python
# In chat-stream Lambda
async def handle_chat_message(message: str, chat_id: str, user_id: str):
    # 1. Get enabled KBs for this chat
    enabled_kbs = await get_enabled_kbs_for_chat(chat_id, user_id)
    
    # 2. Search for relevant context
    if enabled_kbs:
        kb_ids = [kb["id"] for kb in enabled_kbs]
        context_chunks = await search_kb(message, kb_ids)
        
        # 3. Build prompt with RAG context
        context = "\n".join([chunk["content"] for chunk in context_chunks])
        prompt = f"""Answer based on this context:
        
{context}

User question: {message}"""
    else:
        prompt = message
    
    # 4. Send to AI provider
    response = await generate_ai_response(prompt)
    
    return response
```

### Admin Page Integration

#### Org Admin Dashboard

Add KB card to org admin dashboard:

```typescript
import { orgKnowledgeBaseCard } from '@cora/module-kb/frontend/adminCard';

// Add to your admin cards array
const orgAdminCards = [
  // ... other cards
  orgKnowledgeBaseCard,
];
```

#### Platform Admin Dashboard

Add KB card to platform admin dashboard:

```typescript
import { platformKnowledgeBaseCard } from '@cora/module-kb/frontend/adminCard';

// Add to your admin cards array
const platformAdminCards = [
  // ... other cards
  platformKnowledgeBaseCard,
];
```

### Database Setup

Module-KB requires pgvector extension. Run migrations in order:

```bash
# Run KB schema migrations
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/001-kb-bases.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/002-kb-docs.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/003-kb-chunks.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/004-kb-access-sys.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/005-kb-access-orgs.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/006-kb-access-ws.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/007-kb-access-chats.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/008-kb-rpc-functions.sql
psql $DATABASE_URL -f templates/_modules-core/module-kb/db/schema/009-kb-rls.sql
```

### Infrastructure Requirements

Module-KB requires these AWS resources (included in Terraform):

- **S3 Bucket**: Document storage with CORS configured
- **SQS Queue**: Async document processing queue
- **Lambda Functions**: kb-base, kb-document, kb-processor
- **API Gateway Routes**: All KB endpoints

### Configuration

#### Embedding Model

Default: AWS Bedrock Titan Text Embeddings V2 (1024 dimensions)

Configure via module-ai platform settings:
- OpenAI (ada-002, text-embedding-3)
- Azure OpenAI
- AWS Bedrock (Titan)
- Google Vertex AI

#### File Limits

| Setting | Default | Configurable |
|---------|---------|--------------|
| Max file size | 50 MB | Yes (Terraform variable) |
| Presigned URL expiration | 15 min | Yes |
| Supported types | PDF, DOCX, TXT, MD | Yes (add parsers) |

#### Chunking

| Setting | Default | Per-KB Override |
|---------|---------|-----------------|
| Chunk size | 1000 chars | Yes |
| Overlap | 200 chars | Yes |

### API Routes Reference

#### Workspace Scoped
- `GET /workspaces/{id}/kb` - Get workspace KB
- `POST /workspaces/{id}/kb/documents` - Get upload URL
- `GET /workspaces/{id}/available-kbs` - List toggleable KBs

#### Chat Scoped
- `GET /chats/{id}/kb` - Get chat KB
- `GET /chats/{id}/available-kbs` - List available KBs
- `POST /chats/{id}/kbs/{kbId}/toggle` - Toggle KB

#### Admin - Organization
- `GET /admin/org/kbs` - List org KBs
- `POST /admin/org/kbs` - Create org KB
- `PATCH /admin/org/kbs/{id}` - Update org KB
- `DELETE /admin/org/kbs/{id}` - Delete org KB

#### Admin - Platform
- `GET /admin/sys/kbs` - List global KBs
- `POST /admin/sys/kbs` - Create global KB
- `POST /admin/sys/kbs/{id}/orgs` - Associate with org
- `DELETE /admin/sys/kbs/{id}/orgs/{orgId}` - Remove association

#### RAG Search
- `POST /kb/search` - Semantic search across enabled KBs

### Documentation

- [Module-KB README](templates/_modules-core/module-kb/README.md)
- [Developer Guide](docs/guides/guide_MODULE-KB-DEVELOPMENT.md)
- [Technical Specification](docs/specifications/module-kb/MODULE-KB-TECHNICAL-SPEC.md)
- [User UX Specification](docs/specifications/module-kb/MODULE-KB-USER-UX-SPEC.md)
- [Admin UX Specification](docs/specifications/module-kb/MODULE-KB-ADMIN-UX-SPEC.md)

---

## Module-Chat Integration

### Overview

Module-Chat provides AI-powered conversation capabilities with streaming responses, KB grounding, workspace context, and sharing features. This section covers integrating module-chat into your CORA project.

### Architecture

Module-Chat consists of three Lambda functions:

| Lambda | Purpose | Memory | Timeout |
|--------|---------|--------|---------|
| chat-session | Session CRUD, KB grounding, sharing | 512 MB | 30s |
| chat-message | Message CRUD, RAG context retrieval | 512 MB | 30s |
| chat-stream | AI response streaming with SSE | 1024 MB | 300s |

### Chat Scopes

| Scope | Description | KB Access |
|-------|-------------|-----------|
| Workspace | Chats tied to a workspace | Workspace KB + org/global KBs |
| User-Level | Personal chats (no workspace) | Org/global KBs only |

### Frontend Integration

#### Install Module-Chat Components

```typescript
// Import from module-chat
import { 
  ChatSessionList,
  ChatMessage,
  ChatInput,
  ChatOptionsMenu,
  ShareChatDialog,
  KBGroundingSelector
} from '@cora/module-chat/frontend';

// Import hooks
import { 
  useChatSessions,
  useChatSession,
  useChatStream,
  useChatKBGrounding,
  useChatSharing,
  useChatFavorites
} from '@cora/module-chat/frontend/hooks';

// Import store
import { useChatStore } from '@cora/module-chat/frontend/store';
```

#### Basic Chat Page

```typescript
import { ChatSessionList, ChatMessage, ChatInput } from '@cora/module-chat/frontend';
import { useChatSession, useChatStream } from '@cora/module-chat/frontend/hooks';

function ChatPage({ sessionId }) {
  const { session, messages, loading } = useChatSession(sessionId);
  const { streaming, streamingContent, sendMessage, cancel } = useChatStream(sessionId);
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {streaming && (
          <ChatMessage 
            message={{ role: 'assistant', content: streamingContent }}
            isStreaming
          />
        )}
      </div>
      <ChatInput 
        onSend={sendMessage}
        onCancel={cancel}
        disabled={streaming}
      />
    </div>
  );
}
```

#### Workspace Integration

```typescript
// In your workspace detail page
import { ChatSessionList } from '@cora/module-chat/frontend';
import { useChatSessions } from '@cora/module-chat/frontend/hooks';

function WorkspaceChatSection({ workspaceId }) {
  const { sessions, loading, createSession } = useChatSessions(workspaceId);
  
  return (
    <div>
      <h2>Workspace Chats</h2>
      <button onClick={() => createSession()}>New Chat</button>
      <ChatSessionList 
        sessions={sessions}
        loading={loading}
        onSelect={(id) => navigate(`/chat/${id}`)}
      />
    </div>
  );
}
```

#### KB Grounding Integration

```typescript
import { KBGroundingSelector } from '@cora/module-chat/frontend';
import { useChatKBGrounding } from '@cora/module-chat/frontend/hooks';

function ChatKBSelector({ sessionId }) {
  const { groundedKbs, availableKbs, addKB, removeKB } = useChatKBGrounding(sessionId);
  
  return (
    <KBGroundingSelector
      groundedKbs={groundedKbs}
      availableKbs={availableKbs}
      onAdd={addKB}
      onRemove={removeKB}
    />
  );
}
```

### Backend Integration

#### Streaming Response Pattern

Module-Chat uses Server-Sent Events (SSE) for streaming AI responses:

```typescript
// Frontend: Consuming SSE stream
function streamMessage(
  sessionId: string, 
  message: string, 
  onChunk: (chunk: string) => void,
  onComplete: (msg: ChatMessage) => void,
  onError: (error: Error) => void
): () => void {
  const eventSource = new EventSource(
    `${API_URL}/chats/${sessionId}/stream?message=${encodeURIComponent(message)}`
  );
  
  eventSource.onmessage = (event) => {
    if (event.data === '[DONE]') {
      eventSource.close();
      return;
    }
    
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'session':
        // Session info received (sessionId, messageId)
        break;
      case 'chunk':
        onChunk(data.content);
        break;
      case 'context':
        // Citations available in data.citations
        break;
      case 'complete':
        onComplete(data.message);
        break;
      case 'error':
        onError(new Error(data.error));
        break;
    }
  };
  
  // Return cancel function
  return () => eventSource.close();
}
```

#### SSE Event Types

| Event Type | Data | Description |
|------------|------|-------------|
| `session` | `{sessionId, messageId}` | Sent first with IDs |
| `chunk` | `{content}` | Streaming token content |
| `context` | `{citations[]}` | RAG citations (if KB grounded) |
| `complete` | `{message, usage}` | Final message with token usage |
| `error` | `{error}` | Error occurred |
| `[DONE]` | - | Stream complete signal |

#### RAG Integration with Module-KB

Module-Chat integrates with Module-KB for grounded responses:

```python
# In chat-stream Lambda
async def handle_stream(session_id: str, message: str):
    # 1. Get grounded KBs for this chat
    grounded_kbs = await get_grounded_kbs(session_id)
    
    # 2. If KBs are grounded, retrieve RAG context
    context = ""
    citations = []
    if grounded_kbs:
        kb_ids = [kb["id"] for kb in grounded_kbs]
        context, citations = await retrieve_rag_context(message, kb_ids)
    
    # 3. Build system prompt with context
    system_prompt = build_rag_prompt(context) if context else None
    
    # 4. Get conversation history
    history = await get_conversation_history(session_id, max_messages=10)
    
    # 5. Stream AI response
    async for chunk in stream_ai_response(system_prompt, history, message):
        yield {"type": "chunk", "content": chunk}
    
    # 6. Send citations if available
    if citations:
        yield {"type": "context", "citations": citations}
    
    # 7. Save and return complete message
    saved_message = await save_assistant_message(session_id, full_content, citations)
    yield {"type": "complete", "message": saved_message}
```

### Multi-Provider AI Support

Module-Chat supports multiple AI providers via module-ai configuration:

| Provider | Streaming Support | Notes |
|----------|-------------------|-------|
| OpenAI | ✅ Native SSE | GPT-4, GPT-4 Turbo |
| Anthropic | ✅ Native SSE | Claude 3, Claude 3.5 |
| AWS Bedrock | ✅ InvokeModelWithResponseStream | Claude, Titan, Llama |

Configure the provider in module-ai org settings:

```typescript
// Via module-ai admin UI
{
  "chatModel": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "chatProvider": "bedrock",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

### Database Setup

Run chat schema migrations in order:

```bash
# Run chat schema migrations
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/001-chat-sessions.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/002-chat-messages.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/003-chat-kb-grounding.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/004-chat-shares.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/005-chat-favorites.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/006-chat-rpc-functions.sql
psql $DATABASE_URL -f templates/_modules-functional/module-chat/db/schema/007-chat-rls.sql
```

### Infrastructure Requirements

Module-Chat requires these AWS resources (included in Terraform):

- **Lambda Functions**: chat-session, chat-message, chat-stream
- **API Gateway Routes**: 24 routes for sessions, messages, streaming, shares, favorites
- **IAM Roles**: Lambda execution + Bedrock access for AI streaming
- **CloudWatch Logs**: Log groups for all 3 Lambdas

### API Routes Reference

#### Workspace-Scoped Sessions
- `GET /workspaces/{id}/chats` - List workspace chats
- `POST /workspaces/{id}/chats` - Create workspace chat
- `GET /workspaces/{id}/chats/{sessionId}` - Get chat details
- `PATCH /workspaces/{id}/chats/{sessionId}` - Update chat
- `DELETE /workspaces/{id}/chats/{sessionId}` - Delete chat

#### User-Level Sessions
- `GET /users/me/chats` - List personal chats
- `POST /users/me/chats` - Create personal chat

#### Chat Operations
- `GET /chats/{sessionId}` - Get any accessible chat
- `PATCH /chats/{sessionId}` - Update chat
- `DELETE /chats/{sessionId}` - Delete chat

#### Messages
- `GET /chats/{sessionId}/messages` - List messages (paginated)
- `POST /chats/{sessionId}/messages` - Send message
- `GET /chats/{sessionId}/messages/{messageId}` - Get single message

#### Streaming
- `POST /chats/{sessionId}/stream` - Stream AI response (SSE)

#### KB Grounding
- `GET /chats/{sessionId}/kbs` - List grounded KBs
- `POST /chats/{sessionId}/kbs` - Add KB grounding
- `DELETE /chats/{sessionId}/kbs/{kbId}` - Remove KB grounding

#### Sharing
- `GET /chats/{sessionId}/shares` - List shares
- `POST /chats/{sessionId}/shares` - Share chat
- `DELETE /chats/{sessionId}/shares/{shareId}` - Remove share

#### Favorites
- `POST /chats/{sessionId}/favorite` - Toggle favorite

### Navigation Integration

Module-Chat integrates into the left navigation:

```typescript
// Navigation config (automatically included)
{
  name: 'Chats',
  href: '/chat',
  icon: ChatBubbleIcon,
  roles: ['user', 'admin', 'platform_admin'] // All users
}
```

**Routes:**
- `/chat` - Chat list (all accessible chats)
- `/chat/[id]` - Chat detail page

### Testing

Use the integration test checklist at:
`templates/_modules-functional/module-chat/INTEGRATION-TEST-CHECKLIST.md`

Key test categories:
1. Session Management (5 tests)
2. Messaging (5 tests)
3. KB Grounding (4 tests)
4. Sharing (4 tests)
5. Favorites (2 tests)
6. Integration (4 tests)
7. Error Handling (5 tests)
8. UI/UX (4 tests)
9. Performance (3 tests)
10. Validation (3 tests)

### Documentation

- [Module-Chat README](templates/_modules-functional/module-chat/README.md)
- [Developer Guide](docs/guides/guide_MODULE-CHAT-DEVELOPMENT.md)
- [Technical Specification](docs/specifications/module-chat/MODULE-CHAT-TECHNICAL-SPEC.md)
- [User UX Specification](docs/specifications/module-chat/MODULE-CHAT-USER-UX-SPEC.md)
- [Admin UX Specification](docs/specifications/module-chat/MODULE-CHAT-ADMIN-UX-SPEC.md)
- [Integration Test Checklist](templates/_modules-functional/module-chat/INTEGRATION-TEST-CHECKLIST.md)

---

## Conclusion

You now have a fully integrated CORA Module Development Toolkit! You can:

- Create new CORA-compliant modules in minutes
- Validate compliance automatically
- Maintain high code quality standards
- Develop AI modules that seamlessly integrate with STS Career Stack
- Use module-kb for RAG-powered knowledge base features
- Use module-chat for AI-powered conversations with KB grounding

Start developing your AI enablement and AI config modules, and reach out if you encounter any issues!
