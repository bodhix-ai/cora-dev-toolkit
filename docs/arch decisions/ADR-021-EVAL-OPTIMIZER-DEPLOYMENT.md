# ADR-021: Eval Optimizer Deployment Architecture

## Status

**Accepted** - February 5, 2026

## Context

### The Problem

Module-eval's evaluation processing pipeline is mechanically functional (documents can be uploaded, evaluations can be triggered, and results are stored), but **evaluation accuracy is suboptimal**. The current approach uses generic prompts across all document domains (IT security policies, appraisals, proposals, etc.), leading to:

1. **High False Positive/Negative Rates**: Generic prompts don't capture domain-specific nuances
2. **No Systematic Improvement Process**: No structured way to optimize prompts based on real-world feedback
3. **Lack of Quality Metrics**: No statistical confidence measures to determine when prompts are "production-ready"
4. **Manual Trial-and-Error**: Prompt tuning is ad-hoc and time-consuming

### The Solution

Build a **companion application** (Eval Optimizer) that enables business analysts to systematically improve evaluation accuracy through **sample-driven prompt optimization**:

- Upload sample documents with human-verified "truth keys" (expected correct answers)
- Test prompt configurations against truth keys
- Measure accuracy metrics (precision, recall, false positive/negative rates)
- Iterate prompts until target accuracy achieved
- Deploy optimized configurations to production module-eval

### Architecture Decision Required

Sprint 1 evaluated three deployment options for this companion application:

**Option A**: Same stack repo (`{project}-stack/apps/eval-optimizer/`)  
**Option B**: Separate repository (`eval-optimizer-stack/`)  
**Option C**: Toolkit utility (`cora-dev-toolkit/tools/eval-optimizer/`)

A minimal prototype was built for Option A to validate feasibility and inform the architecture decision.

## Decision

**We will deploy Eval Optimizer as a standalone Next.js application within the same stack repository** (`{project}-stack/apps/eval-optimizer/`).

### Rationale

#### Evidence from Prototype (Sprint 1 Phase 2)

The Option A prototype successfully demonstrated:

1. ✅ **Shared Authentication Works**: NextAuth with same Cognito/Okta configuration as main app
2. ✅ **API Integration Proven**: Successfully called all 4 required module APIs (access, ws, kb, eval)
3. ✅ **Zero Code Duplication**: Direct imports from workspace packages (`@{project}/api-client`, `@{project}/ui-library`)
4. ✅ **Independent Build/Deploy**: Runs on separate port (3001), independent dev server
5. ✅ **End-to-End Workflow**: Create org → create workspace → upload doc → run eval

#### Key Advantages

**1. Code Reuse & Type Safety**
```typescript
// Eval Optimizer imports shared packages
import { createAuthenticatedClient } from "@{project}/api-client";
import { Button, Card, Alert } from "@{project}/ui-library";
import type { Organization, Workspace } from "@{project}/types";
```
- No duplicate authentication logic
- Shared type definitions ensure consistency
- UI components match main app look-and-feel

**2. Single Identity System**
- Same Cognito user pool as main app
- Users have one set of credentials across both apps
- Unified user profile and permissions

**3. Minimal Infrastructure**
- No additional Cognito pools, API Gateways, or databases
- Optimizer tables live in same PostgreSQL database with clear namespacing (`eval_opt_*`)
- Shared RLS policies and access control

**4. Simplified Deployment**
- Deploy as part of stack repo CI/CD pipeline
- Environment variables shared (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- Single Terraform workspace manages all resources

**5. Developer Experience**
- Familiar monorepo patterns (workspace packages)
- One codebase for code review and collaboration
- Easier onboarding (no separate repo setup)

### Architecture Pattern

```
{project}-stack/
├── apps/
│   ├── web/                    # Main CORA application (port 3000)
│   └── eval-optimizer/         # Eval Optimizer companion (port 3001)
│       ├── app/                # Next.js app router
│       ├── lib/api-client.ts   # Wraps @{project}/api-client
│       ├── auth.ts             # Shared NextAuth config
│       └── package.json        # Dependencies (minimal, imports workspace packages)
├── packages/
│   ├── api-client/             # Shared API client factory (ADR-004)
│   ├── ui-library/             # Shared UI components
│   └── types/                  # Shared TypeScript types
└── ...
```

**Independent Deployment:**
- `npm run dev --workspace=apps/web` → Main app on :3000
- `npm run dev --workspace=apps/eval-optimizer` → Optimizer on :3001
- Deployed as separate services (e.g., `app.example.com` and `eval-optimizer.example.com`)

## Consequences

### Benefits

1. **Zero Code Duplication**
   - Authentication setup reused (ADR-004 NextAuth pattern)
   - API client factory reused (module-access, ws, kb, eval)
   - UI components reused (consistent UX)
   - Type definitions shared (no drift)

2. **Simplified Infrastructure**
   - One Cognito user pool
   - One database (optimizer tables namespaced: `eval_opt_*`)
   - One CI/CD pipeline
   - Shared secrets management

3. **Unified Identity**
   - Single sign-on across main app and optimizer
   - Consistent role-based access control
   - Same user profiles and permissions

4. **Maintainability**
   - One repo for bug fixes and security patches
   - Easier dependency management
   - Centralized monitoring and logging

5. **Developer Velocity**
   - Faster feature development (import existing code)
   - No context switching between repos
   - Familiar patterns and tooling

### Trade-offs

1. **Deployment Coupling**
   - **Issue**: Optimizer releases coupled to main app stack releases
   - **Mitigation**: Use independent build/deploy pipelines per app (e.g., `deploy-optimizer.sh`)
   - **Impact**: Low - optimizer evolves slower than main app, less frequent releases acceptable

2. **Monorepo Complexity**
   - **Issue**: Larger codebase, potential for unintended dependencies
   - **Mitigation**: Strict workspace package boundaries, ESLint rules for import paths
   - **Impact**: Low - established monorepo patterns in place

3. **Shared Database**
   - **Issue**: Schema migrations affect both apps
   - **Mitigation**: Namespace optimizer tables (`eval_opt_*`), separate migration files
   - **Impact**: Low - optimizer tables independent, no foreign keys to main app tables

4. **User Confusion**
   - **Issue**: Users may not understand difference between main app and optimizer
   - **Mitigation**: Clear naming ("Business Analyst Workbench"), separate URLs, onboarding docs
   - **Impact**: Low - target users are analysts, not end users

## Alternatives Considered

### Alternative 1: Separate Repository (`eval-optimizer-stack/`)

**Approach**: Create standalone repository with its own infrastructure

**Pros**:
- ✅ Fully independent deployment lifecycle
- ✅ Clear separation of concerns
- ✅ No coupling to main app releases

**Cons**:
- ❌ Duplicate authentication setup (Cognito pool, NextAuth config)
- ❌ Duplicate API client code (or package publishing overhead)
- ❌ Duplicate UI components (or shared component library publishing)
- ❌ Separate database or complex multi-tenant setup
- ❌ Additional infrastructure cost (separate API Gateway, load balancer)
- ❌ User identity fragmentation (separate login or complex SSO)
- ❌ Higher maintenance burden (two repos to patch)

**Why Rejected**: High duplication cost and infrastructure complexity outweigh deployment independence benefits. Prototype evidence showed Option A is viable with minimal coupling.

### Alternative 2: Toolkit Utility (`cora-dev-toolkit/tools/eval-optimizer/`)

**Approach**: Build as development tooling in the CORA toolkit repository

**Pros**:
- ✅ Lives with other dev tooling
- ✅ Independent from any specific project

**Cons**:
- ❌ Not production-ready (toolkit is for development/templates)
- ❌ No persistent data storage (toolkit shouldn't have production DB)
- ❌ User access issues (analysts need web UI, not CLI tool)
- ❌ Scalability limitations (dev tooling not designed for 1000+ samples)
- ❌ Wrong abstraction (this is a production companion app, not a dev utility)

**Why Rejected**: Fundamental mismatch - toolkit is for development/scaffolding, not production applications. Optimizer requires persistent data, web UI, and production scalability.

### Alternative 3: Admin Feature in Main App

**Approach**: Build optimizer as admin pages within main CORA app

**Pros**:
- ✅ Fully integrated, no separate deployment
- ✅ Shared navigation and layout

**Cons**:
- ❌ Different user persona (analysts vs. end users)
- ❌ Different workflows (iterative optimization vs. one-time evaluation)
- ❌ UI complexity (main app already dense, optimizer has distinct needs)
- ❌ Feature bloat (main app cluttered with analyst-only features)

**Why Rejected**: Optimizer serves a distinct user persona with workflows that don't fit the main app's UX. Standalone companion app provides clearer separation and better UX for each audience.

### Alternative 4: Module-Eval Admin Feature

**Approach**: Build optimizer as admin pages within module-eval itself (`/admin/sys/eval/optimizer`)

**Pros**:
- ✅ Simpler architecture, natural fit with eval admin pages
- ✅ Shares eval's data model (doc types, criteria sets)
- ✅ Same technical dependencies (ai, kb, ws modules)

**Cons**:
- ❌ **Monetization Constraint**: Cannot sell as separate paid feature
- ❌ Adds significant UI complexity to module-eval
- ❌ Couples advanced tooling to core evaluation functionality

**Why Rejected**: While architecturally simpler, this approach **prevents monetization** of the optimizer as a paid feature. Keeping optimizer as a separate app enables a **paid add-on model** for the CORA open source project:
- **Open Source Core**: module-eval (evaluation execution) remains free
- **Paid Enhancement**: eval-optimizer (prompt optimization tooling) becomes paid add-on
- **Business Model**: Investment in optimizer development can be monetized while keeping core CORA functionality open source

This mirrors successful open source monetization strategies (e.g., GitLab core vs. enterprise features).

## Implementation Notes

### Database Schema

Optimizer tables use `eval_opt_*` prefix for clear namespacing:

```sql
-- Core optimizer tables
CREATE TABLE eval_optimization_projects (...);
CREATE TABLE eval_opt_project_members (...);
CREATE TABLE eval_opt_document_groups (...);
CREATE TABLE eval_opt_truth_keys (...);
CREATE TABLE eval_prompt_versions (...);
CREATE TABLE eval_opt_runs (...);
CREATE TABLE eval_opt_run_results (...);
```

No foreign keys to main app tables except:
- `user_profiles.user_id` (for ownership/membership)
- `eval_criteria_sets.id`, `eval_criteria_items.id` (for truth key validation)
- `kb_docs.id` (for document references)

### Access Control

Uses CORA standard role model (ADR-019):
- **Owner**: Create/delete projects, deploy to production
- **Admin**: Run optimizations, edit prompts, upload samples
- **User**: View results, provide feedback

Implemented via `eval_opt_project_members` table with role-based RLS policies.

### Deployment Workflow

**Production Deployment** of optimized prompts:
1. Owner approves optimized configuration in Eval Optimizer
2. Configuration deployed to `eval_cfg_org_prompts` or `eval_cfg_sys_prompts` (module-eval tables)
3. Domain mapping links document types to optimized prompts
4. Module-eval resolution logic picks correct prompt per document type

See ConOps Section 9 for detailed deployment workflow.

## Sprint 2 Addendum: System-Level Configuration Architecture

**Date**: February 5, 2026  
**Context**: During Sprint 2 planning, a critical inefficiency was identified in the original architecture.

### Problem Identified

The original design assumed optimization projects would reference **org-level** doc types and criteria sets (`eval_doc_types`, `eval_cfg_org`). This creates significant inefficiencies:

1. **Duplicate Manual Evaluation Work**: Business analysts would need to manually evaluate sample documents and create truth sets **for every org** separately
2. **Slow Org Onboarding**: Each new organization must configure doc types and criteria sets from scratch, even if using standard frameworks (e.g., NIST for IT security policies)
3. **No Shared Learning**: Optimization work done for one org doesn't benefit other orgs using the same doc type + criteria set combination

### Architectural Decision

**Promote doc type + criteria set configurations to system-level shared resources.**

**Rationale:**

1. **Truth Set Development is System-Level Work**
   - Example: "IT Security Policies + NIST criteria" should be optimized **once** at the system level
   - All orgs using that combination inherit the optimized prompt configuration
   - BAs create truth sets once, benefit all orgs
   
2. **Faster Org Onboarding**
   - New orgs "adopt" pre-configured doc type + criteria set combinations
   - Inherit pre-optimized prompts (already tuned to 80%+ accuracy)
   - Org admin workflow: "Enable IT Security Policies (NIST criteria)" → Done
   
3. **Centralized Quality Control**
   - System admins maintain authoritative doc types and criteria sets
   - Updates propagate to orgs (with opt-in)
   - Consistent evaluation standards across platform

### Implementation Changes

**New System-Level Tables:**

```sql
-- System-level doc types (authoritative)
CREATE TABLE eval_sys_doc_types (...);

-- System-level criteria sets (authoritative)
CREATE TABLE eval_sys_criteria_sets (...);
CREATE TABLE eval_sys_criteria_items (...);

-- Org adoption/inheritance
CREATE TABLE eval_org_adopted_configs (
    org_id UUID REFERENCES organizations(id),
    sys_doc_type_id UUID REFERENCES eval_sys_doc_types(id),
    sys_criteria_set_id UUID REFERENCES eval_sys_criteria_sets(id),
    is_customized BOOLEAN DEFAULT false,
    ...
);
```

**Updated Optimization Projects:**

```sql
-- Projects now reference SYSTEM-LEVEL configs
CREATE TABLE eval_optimization_projects (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    
    -- Reference system-level configurations
    sys_doc_type_id UUID REFERENCES eval_sys_doc_types(id),
    sys_criteria_set_id UUID REFERENCES eval_sys_criteria_sets(id),
    criteria_set_version INTEGER,
    
    -- Projects are system-level (not org-specific)
    created_by UUID REFERENCES user_profiles(user_id),
    ...
);
```

**BA Task Management Dashboard:**

New feature enabling BAs to see which doc type + criteria set combinations need work:

```
+------------------------------------------------------------------+
| Doc Type + Criteria Set Coverage Dashboard                       |
+------------------------------------------------------------------+
| Combination                          | Samples | Accuracy | Status|
|--------------------------------------|---------|----------|-------|
| IT Security Policies + NIST          | 25      | 85%      | ✅ Ready |
| Land Appraisals + Uniform Standards  | 12      | 72%      | ⚠️ Needs work |
| FOIA Redaction + Privacy Act         | 5       | 60%      | 🔴 Needs samples |
| Proposals + Federal Acquisition Reg  | 0       | -        | 📋 No truth set  |
+------------------------------------------------------------------+
```

### Benefits

1. ✅ **Efficiency**: BAs create truth sets once, not per-org
2. ✅ **Faster Onboarding**: Orgs inherit pre-configured, pre-optimized settings
3. ✅ **Quality**: Centralized optimization benefits entire platform
4. ✅ **Visibility**: Dashboard shows which combinations need work

### Trade-offs

1. ⚠️ **System Admin Privilege Required**: Creating doc types + criteria sets now system-level operation
2. ⚠️ **Reduced Org Flexibility**: Orgs must adopt system-level configs (but can customize if needed)
3. ✅ **Net Positive**: Major efficiency gain outweighs flexibility trade-off

### Impact on ADR-021 Deployment Decision

This change **reinforces** the Option A deployment decision:

- System-level configuration requires shared database → Already have it (Option A)
- Unified identity across orgs → Already have it (same Cognito pool)
- Centralized quality control → Easier with monorepo (single codebase)

No changes needed to deployment architecture; this is a **data model enhancement** compatible with the Option A design.

---

## Strategic Business Rationale

**Key Decision Factor**: Separate app architecture enables **paid feature monetization**.

### Open Source + Paid Add-On Model

**Structure:**
- **Open Source Core**: `module-eval` (evaluation execution)
  - Core evaluation processing pipeline
  - Basic prompt configuration
  - Available in CORA open source distribution
  
- **Paid Enhancement**: `module-eval-studio` (Evaluation Studio)
  - Eval configuration design (rubrics, response structures)
  - Sample-driven prompt optimization
  - Truth key management
  - Quality metrics and A/B testing
  - Sold as add-on to CORA deployments

### Benefits

1. **Monetization of Investment**
   - Development cost of studio/optimizer can be recovered through sales
   - Sustainable funding for continued innovation
   
2. **Value Alignment**
   - Organizations needing advanced optimization pay for it
   - Small deployments get core functionality for free
   
3. **Clear Feature Boundaries**
   - Core evaluation: Open source, free
   - Advanced studio: Paid, premium
   
4. **Architectural Flexibility**
   - Paid app can evolve independently
   - Can add enterprise features (SSO, audit logs, etc.)
   - Can offer SaaS version (hosted optimizer service)

### Precedents

Similar to successful open source monetization models:
- **GitLab**: Core Git hosting (open source) + advanced CI/CD (paid)
- **Elastic**: Elasticsearch (open source) + Kibana enterprise features (paid)
- **MongoDB**: Database (open source) + Atlas/Ops Manager (paid)

This architectural decision **enables business sustainability** while keeping core CORA functionality freely available.

---

## Sprint 4 Addendum: Module Naming & Premium Tier Convention

**Date**: February 8, 2026
**Context**: Rebranding from "Eval Optimizer" to "Eval Studio" to reflect broader "designer" functionality (rubrics, response structures).

### Naming Decisions

1. **Module Name**: `module-eval-studio`
   - Public Name: "Evaluation Studio"
   - Directory: `packages/module-eval-studio` (formerly `module-eval-opt`)
   - Purpose: Designer workbench for evaluation configuration (rubrics, truth sets, prompts)

2. **Premium Module Naming Convention**
   - Pattern: `module-{core}-studio`
   - Examples: 
     - `module-eval-studio` (extends `module-eval`)
     - `module-kb-studio` (extends `module-kb`)
     - `module-chat-studio` (extends `module-chat`)
   - Suffix `-studio` denotes premium/paid workbench functionality

3. **Table Naming Convention**
   - Pattern: `{module}_opt_{entity}`
   - Meaning: `opt` = "optional" (premium/paid tier)
   - Rationale: Avoids database migrations when rebranding; clearly indicates optional dependency
   - Examples: `eval_opt_truth_keys`, `eval_opt_runs`

4. **Integration**
   - Studio modules depend on their core module
   - Core modules NEVER depend on studio modules
   - Studio modules implement the same 2-layer auth pattern (Admin + Resource)

---

## Success Criteria


- [x] ✅ Prototype validates shared authentication (Cognito/NextAuth)
- [x] ✅ Prototype validates API integration (access, ws, kb, eval)
- [x] ✅ Zero code duplication achieved (imports from workspace packages)
- [x] ✅ System-level configuration architecture defined (Sprint 2)
- [ ] Sprint 2 implementation follows this architecture
- [ ] Production deployment confirms deployment independence
- [ ] Optimized prompts successfully improve eval accuracy (measured)

## References

- [Eval Optimization Context](../../memory-bank/context-eval-optimization.md)
- [Eval Optimization Sprint 1 Plan](../plans/plan_eval-optimization-s1.md)
- [Eval Optimization ConOps](../specifications/spec_eval-optimization-conops.md)
- [ADR-004: NextAuth API Client Pattern](./ADR-004-NEXTAUTH-API-CLIENT-PATTERN.md)
- [ADR-007: CORA Auth Shell Standard](./ADR-007-CORA-AUTH-SHELL-STANDARD.md)
- [ADR-019: Auth Standardization](./ADR-019-AUTH-STANDARDIZATION.md)

---

**Last Updated**: February 5, 2026 7:48 AM  
**Sprint 1 Phase 4**: ✅ Complete  
**Sprint 2 Addendum**: System-level configuration architecture added
