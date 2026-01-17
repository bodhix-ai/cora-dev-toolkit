# ADR-013: Core vs Functional Module Classification

**Status:** Accepted  
**Date:** January 17, 2026  
**Deciders:** Engineering Team  
**Context:** Establish clear criteria for classifying CORA modules as core vs functional

---

## Context

The CORA Development Toolkit provides a modular architecture with multiple modules that can be included in projects. As the number of modules grows (currently: access, ai, mgmt, kb, chat, ws, eval, voice), we need clear criteria to determine which modules are **core** (required for all CORA projects) vs **functional** (optional per-project).

This decision affects:
1. **Project creation** - Which modules are included by default via `create-cora-project.sh`
2. **Module dependencies** - Which modules can depend on which
3. **Module registry** - How modules are classified in `module-registry.yaml`
4. **Template organization** - Directory structure (`_modules-core/` vs `_modules-functional/`)
5. **Documentation** - How modules are described and recommended

---

## Current State

### Core Modules (Required)

| Module | Tier | Purpose | Why Core? |
|--------|------|---------|-----------|
| module-access | 1 | Authentication, authorization, user management, RBAC | Foundation for all user interactions |
| module-ai | 2 | AI provider management, credential management | Required for AI-enabled applications |
| module-mgmt | 3 | Platform management, monitoring, admin tools | Required for system operations |
| module-kb | 3 | Knowledge base, RAG, vector search | **Core AI capability** - fundamental for knowledge retrieval |
| module-chat | 3 | Chat & messaging, AI integration | **Core AI capability** - fundamental for AI interaction |

### Functional Modules (Optional)

| Module | Tier | Purpose | Why Functional? |
|--------|------|---------|-----------------|
| module-ws | null | Workspace management, multi-tenancy | Feature-specific, not all projects need workspaces |
| module-eval | null | Model evaluation, testing | Feature-specific, specialized use case |
| module-voice | null | Voice interaction capabilities | Feature-specific, specialized use case |

---

## Decision Drivers

1. **Framework Purpose** - CORA is an AI application framework
2. **Core AI Capabilities** - KB (knowledge retrieval) and Chat (AI interaction) are fundamental
3. **Dependency Management** - What provides foundation vs features?
4. **Flexibility** - Allow projects to select non-AI features they need
5. **Maintenance Burden** - Minimize required infrastructure while providing AI essentials

---

## Classification Criteria

### Core Module Criteria

A module qualifies as **core** if it meets ALL of the following:

1. **Universal Necessity** ✅
   - Required by virtually all CORA applications
   - Cannot build a functional CORA app without it
   - Example: Authentication (module-access) is needed by all apps

2. **Foundational Infrastructure** ✅
   - Provides base services that other modules depend on
   - Part of the architectural foundation
   - Example: AI provider management (module-ai) enables AI features

3. **Cross-Cutting Concerns** ✅
   - Handles system-wide responsibilities
   - Not feature-specific, but platform-level
   - Example: Platform monitoring (module-mgmt) applies across all features

4. **Tier Assignment** ✅
   - Has an explicit tier (1, 2, or 3) indicating boot order
   - Lower tiers are dependencies for higher tiers
   - Example: Tier 1 (access) → Tier 2 (ai) → Tier 3 (mgmt, kb, chat)

5. **Framework-Aligned Capability** ✅
   - Aligns with CORA's core purpose as an AI application framework
   - Example: KB and Chat are fundamental ways to interact with AI

### Functional Module Criteria

A module qualifies as **functional** if it meets ANY of the following:

1. **Feature-Specific** ✅
   - Implements a specific product feature
   - Not all CORA apps need this feature
   - Example: Workspace management (module-ws) is optional

2. **Optional Capability** ✅
   - Can be included or excluded based on project needs
   - Project remains functional without it
   - Example: Workspace management (module-ws) is optional

3. **Specialized Use Case** ✅
   - Serves a specialized or niche use case
   - Most projects won't need it
   - Example: Model evaluation (module-eval) is for AI testing scenarios

4. **Domain-Specific** ✅
   - Tied to a specific business domain or vertical
   - Not universally applicable
   - Example: Voice interaction (module-voice) is for voice-enabled apps

---

## Tier System

Core modules use an explicit **tier system** to define boot order and dependencies:

| Tier | Purpose | Dependencies | Examples |
|------|---------|--------------|----------|
| **Tier 1** | Foundation - Authentication & Identity | None | module-access |
| **Tier 2** | Platform Services - AI provider management | Tier 1 | module-ai |
| **Tier 3** | Management & AI Capabilities | Tier 1 + Tier 2 | module-mgmt, module-kb, module-chat |

**Note:** All Tier 3 core modules depend on Tier 1 (access) and Tier 2 (ai).

---

## Directory Organization

Modules are organized by classification:

```
templates/
├── _modules-core/              # Required modules (always included)
│   ├── module-access/          # Tier 1 - Auth & Identity
│   ├── module-ai/              # Tier 2 - AI Provider Management
│   ├── module-mgmt/            # Tier 3 - Platform Management
│   ├── module-kb/              # Tier 3 - Knowledge Base (Core AI)
│   └── module-chat/            # Tier 3 - Chat Interface (Core AI)
│
└── _modules-functional/        # Optional modules (selected per-project)
    ├── module-ws/              # Workspace Management
    ├── module-eval/            # Model Evaluation
    └── module-voice/           # Voice Interaction
```

---

## Module Registry Structure

The `module-registry.yaml` reflects the classification:

```yaml
modules:
  # ===== CORE MODULES (Tier 1-3) =====
  # Core modules are REQUIRED for all CORA projects
  
  module-access:
    type: core
    tier: 1
    required: true
    dependencies: []
    
  module-ai:
    type: core
    tier: 2
    required: true
    dependencies: [module-access]
    
  module-mgmt:
    type: core
    tier: 3
    required: true
    dependencies: [module-access]
    
  module-kb:
    type: core
    tier: 3
    required: true
    dependencies: [module-access, module-ai]
    
  module-chat:
    type: core
    tier: 3
    required: true
    dependencies: [module-access, module-ai]
  
  # ===== FUNCTIONAL MODULES =====
  # Functional modules are OPTIONAL and can be enabled per-project
  
  module-ws:
    type: functional
    tier: null
    required: false
    dependencies: [module-access]
    
  module-eval:
    type: functional
    tier: null
    required: false
    dependencies: [module-access, module-ai]
    
  module-voice:
    type: functional
    tier: null
    required: false
    dependencies: [module-access, module-ai]
```

---

## Decision

**Approved Classification:**

### Core Modules (Always Included)
- `module-access` (Tier 1) - Authentication & Authorization
- `module-ai` (Tier 2) - AI Provider Management
- `module-mgmt` (Tier 3) - Platform Management & Monitoring
- `module-kb` (Tier 3) - Knowledge Base & RAG (Core AI Capability)
- `module-chat` (Tier 3) - Chat & Messaging (Core AI Capability)

**Rationale**: CORA is an AI application framework. Knowledge retrieval (KB) and chat interaction (Chat) are fundamental capabilities for AI applications, not optional features.

### Functional Modules (Optional)
- `module-ws` - Workspace Management
- `module-eval` - Model Evaluation
- `module-voice` - Voice Interaction

---

## Usage Examples

### Example 1: Standard CORA AI App (Core Only)

```bash
./scripts/create-cora-project.sh \
  --project-name ai-app \
  --modules core
```

**Result:** Project includes module-access, module-ai, module-mgmt, module-kb, module-chat

### Example 2: AI App with Workspaces

```bash
./scripts/create-cora-project.sh \
  --project-name workspace-app \
  --modules core,ws
```

**Result:** Project includes core modules + module-ws

### Example 3: Full-Featured Application

```bash
./scripts/create-cora-project.sh \
  --project-name full-app \
  --modules core,ws,eval,voice
```

**Result:** Project includes all modules

---

## Migration Path for Existing Modules

### module-kb: Functional → Core ✅

**Current State:** Located in `templates/_modules-functional/` (incorrect)  
**Decision:** Move to `templates/_modules-core/` to match classification  
**Reason:** Knowledge base is a core AI capability, not an optional feature

### module-chat: Functional → Core ✅

**Current State:** Located in `templates/_modules-functional/` (incorrect)  
**Decision:** Move to `templates/_modules-core/` to match classification  
**Reason:** Chat is a core AI capability, not an optional feature

---

## Consequences

### Positive

- ✅ **Clear Classification** - Developers and AI agents know which modules are required
- ✅ **AI-First Framework** - CORA provides AI capabilities out of the box
- ✅ **Better Documentation** - Clear guidance on module selection
- ✅ **Scalable Architecture** - Easy to add new functional modules
- ✅ **Consistent AI Stack** - All CORA projects have KB and Chat available

### Negative

- ⚠️ **Migration Required** - module-kb and module-chat must move to core directory
- ⚠️ **Documentation Updates** - Must update guides to reflect new classification
- ⚠️ **Expanded Core** - All CORA projects will include KB and Chat by default (larger footprint)

### Neutral

- 📝 **Registry Updates** - module-registry.yaml must be updated with all modules
- 📝 **Directory Reorganization** - One-time effort to move module-kb and module-chat

---

## Implementation Tasks

1. ✅ Create ADR-013 (this document)
2. ⬜ Move module-kb from `_modules-functional/` to `_modules-core/`
3. ⬜ Move module-chat from `_modules-functional/` to `_modules-core/`
4. ⬜ Update `module-registry.yaml` with all modules (including kb, chat as core)
5. ⬜ Update documentation to reflect new classification
6. ⬜ Update CORA compliance validator to check module locations

---

## References

- `templates/_modules-core/module-registry.yaml` - Module registry
- `scripts/create-cora-project.sh` - Project creation script
- `docs/guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md` - Module development guide
- ADR-009: Module UI Integration
- ADR-006: Supabase Default Privileges (module database patterns)

---

**Status:** Accepted  
**Next Steps:** Implement migration tasks, update registry, update documentation
