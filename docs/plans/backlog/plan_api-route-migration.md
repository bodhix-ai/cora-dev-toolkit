# Migration Plan: API Route Standards Compliance

**Status:** Draft  
**Created:** January 25, 2026  
**Priority:** P1 (Critical for admin standardization, S3 implementation)  
**Related:** [ADR-018b](../../arch%20decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md), [standard_ADMIN-API-ROUTES.md](../../standards/standard_ADMIN-API-ROUTES.md)

---

## Executive Summary

This plan migrates **86 non-compliant API routes** and addresses **90 warnings** to comply with the CORA Admin API Routes Standard (ADR-018b). Routes are grouped by module and violation type to minimize changes and risk.

**Key Principle:** Touch each module only once during migration, prioritizing admin routes for current development needs.

**Current Compliance:** 17 compliant routes (11%) out of 157 total routes scanned.

---

## Validator Whitelist (Temporary - January 25, 2026)

The following routes are **whitelisted in the Admin Route validator** (`validation/admin-route-validator/validate_routes.py`) until their migration phases complete. This allows new modules to pass validation while deferring legacy module migrations.

### Admin Routes - Missing Scope (Priority 1 - 20 errors)

**Phase 1: module-ai Admin Routes**
- `/admin/ai/config` → `admin/sys/ai/config` or `/admin/org/ai/config`
- `/admin/ai/models` → `/admin/sys/ai/models` or `/admin/org/ai/models`
- `/admin/ai/rag-config` → `/admin/sys/ai/rag-config`
- `/admin/ai/providers` → `/admin/sys/ai/providers`
- `/admin/ai/providers/test` → `/admin/sys/ai/providers/test`
- `/admin/ai/providers/models` → `/admin/sys/ai/providers/models`

**Phase 2: module-access Admin Routes**
- `/admin/idp-config` → `/admin/sys/access/idp-config`
- `/admin/users` → `/admin/sys/access/users`
- `/admin/idp-config/{providerType}` → `/admin/sys/access/idp-config/{providerType}`
- `/admin/idp-config/{providerType}/activate` → `/admin/sys/access/idp-config/{providerType}/activate`

**Phase 3: module-kb Admin Routes (Wrong Pattern)**
- `/admin/org/kbs` → `/admin/org/kb/bases` (14 routes total)
- `/admin/sys/kbs` → `/admin/sys/kb/bases` (10 routes total)

### Data API Routes - Using `/api/` Prefix (Priority 2 - 12 errors)

**Phase 4: module-voice API Prefix Removal**
- `/api/voice/sessions` → `/voice/sessions`
- `/api/voice/sessions/{id}` → `/voice/sessions/{id}`
- `/api/voice/sessions/{id}/start` → `/voice/sessions/{id}/start`
- `/api/voice/configs` → `/voice/configs`
- `/api/voice/configs/{id}` → `/voice/configs/{id}`
- `/api/voice/transcripts` → `/voice/transcripts`
- `/api/voice/transcripts/{id}` → `/voice/transcripts/{id}`
- `/api/voice/analytics` → `/voice/analytics`
- `/api/voice/analytics/{id}` → `/voice/analytics/{id}`
- `/api/voice/credentials` → `/voice/credentials`
- `/api/voice/credentials/{id}` → `/voice/credentials/{id}`
- `/api/voice/sessions/{id}/kbs` → `/voice/sessions/{id}/kbs`

**Phase 5: module-template API Prefix Removal**
- `/api/{module}/{entities}` → `/{module}/{entities}`
- `/api/{module}/{entities}/{id}` → `/{module}/{entities}/{id}`

### Data API Routes - Non-Standard Module Names (Priority 3 - 90 warnings)

**Phase 6: Workspace Route Standardization (Deferred)**
- `/workspaces/{workspaceId}/...` → `/ws/{wsId}/...` (14 routes)

**Phase 7: Organization Route Evaluation (Deferred)**
- `/orgs/{orgId}/...` → Needs architectural decision (8 routes)
  - Options: Keep as-is (intentional), move to `/access/orgs/{orgId}/...`, or standardize differently

**Phase 8: Chat Route Evaluation (Deferred)**
- `/chats/{chatId}/...` → Needs architectural decision (8 routes)
  - Options: Keep as-is, move to `/chat/...`, or standardize differently

---

## Migration Phases

### Phase 0: Standards Foundation ✅ COMPLETE

**Duration:** 8 hours  
**Status:** ✅ Complete (January 25, 2026)

| Task | Status |
|------|--------|
| Create ADR-018b (API Gateway Route Standards) | ✅ Complete |
| Create standard_ADMIN-API-ROUTES.md | ✅ Complete |
| Develop admin-route-validator | ✅ Complete |
| Integrate validator with cora-validate.py | ✅ Complete |
| Run baseline validation | ✅ Complete |
| Create migration plan (this document) | ✅ Complete |

---

### Phase 1: module-ai Admin Routes ⚠️ HIGH PRIORITY

**Status:** ⏳ Pending  
**Risk Level:** ⚠️ HIGH - Admin panel dependency  
**Duration:** 2-3 hours  
**Files Impact:** `module-ai/infrastructure/outputs.tf`, `module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

**Rationale:** Admin standardization is active focus. Module-ai admin routes need scope prefix to match new admin architecture.

#### Routes to Migrate (6 routes)

| Current Route | New Route | Scope Decision |
|--------------|-----------|----------------|
| `/admin/ai/config` | `/admin/sys/ai/config` | System-level config |
| `/admin/ai/models` | `/admin/sys/ai/models` | System-level models |
| `/admin/ai/rag-config` | `/admin/sys/ai/rag-config` | System-level RAG |
| `/admin/ai/providers` | `/admin/sys/ai/providers` | System-level providers |
| `/admin/ai/providers/test` | `/admin/sys/ai/providers/test` | System-level test |
| `/admin/ai/providers/models` | `/admin/sys/ai/providers/models` | System-level models |

**Architecture Decision:** All module-ai admin routes are system-level (global configuration). No org-level or workspace-level overrides needed at this time.

#### Migration Steps

**1. Update Terraform Routes**

File: `templates/_modules-core/module-ai/infrastructure/outputs.tf`

```hcl
# BEFORE:
{
  method = "GET"
  path   = "/admin/ai/config"
  lambda = module.ai_config_lambda.arn
},

# AFTER:
{
  method = "GET"
  path   = "/admin/sys/ai/config"
  lambda = module.ai_config_lambda.arn
},
```

**2. Update Lambda Docstrings**

File: `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

```python
# BEFORE:
"""
AI Configuration Handler

Routes - Admin:
- GET /admin/ai/config - Get AI configuration
- POST /admin/ai/config - Update AI configuration
"""

# AFTER:
"""
AI Configuration Handler

Routes - System Admin:
- GET /admin/sys/ai/config - Get AI system configuration
- POST /admin/sys/ai/config - Update AI system configuration
"""
```

**3. Update Lambda Route Handlers**

File: `templates/_modules-core/module-ai/backend/lambdas/ai-config-handler/lambda_function.py`

```python
# BEFORE:
if path == '/admin/ai/config' and method == 'GET':
    return get_config(event, context)

# AFTER:
if path == '/admin/sys/ai/config' and method == 'GET':
    return get_config(event, context)
```

**4. Update Frontend API Clients**

File: `templates/_modules-core/module-ai/frontend/lib/api.ts`

```typescript
// BEFORE:
async getAdminConfig(): Promise<AIConfig> {
  const response = await client.get('/admin/ai/config');
  return response.data;
}

// AFTER:
async getSysAdminConfig(): Promise<AIConfig> {
  const response = await client.get('/admin/sys/ai/config');
  return response.data;
}
```

**5. Update Admin Page Components**

File: `templates/_project-stack-template/apps/web/app/admin/sys/ai/page.tsx`

```typescript
// BEFORE:
const config = await fetch('/admin/ai/config');

// AFTER:
const config = await fetch('/admin/sys/ai/config');
```

#### Testing Checklist

- [ ] Run validator: `python cora-validate.py project templates/ --validators admin_routes`
- [ ] Test sys admin AI config page loads
- [ ] Test AI provider configuration save/load
- [ ] Test model selection functionality
- [ ] Test RAG configuration updates
- [ ] Verify authorization (sys_admin role required)

#### Post-Migration

- [ ] Remove from whitelist in `validation/admin-route-validator/validate_routes.py`
- [ ] Update API documentation
- [ ] Notify frontend team of API changes

---

### Phase 2: module-access Admin Routes ⚠️ HIGH PRIORITY

**Status:** ⏳ Pending  
**Risk Level:** ⚠️ HIGH - Auth admin panel dependency  
**Duration:** 2-3 hours  
**Files Impact:** `module-access/infrastructure/outputs.tf`, `module-access/backend/lambdas/idp-config/lambda_function.py`

**Rationale:** Identity provider configuration is system-level admin functionality. Integrates with admin standardization.

#### Routes to Migrate (4 routes)

| Current Route | New Route | Scope Decision |
|--------------|-----------|----------------|
| `/admin/idp-config` | `/admin/sys/access/idp-config` | System-level IDP |
| `/admin/users` | `/admin/sys/access/users` | System-level users |
| `/admin/idp-config/{providerType}` | `/admin/sys/access/idp-config/{providerType}` | System-level IDP |
| `/admin/idp-config/{providerType}/activate` | `/admin/sys/access/idp-config/{providerType}/activate` | System-level IDP |

**Architecture Decision:** Identity provider configuration is system-wide (Cognito, SAML, etc.). User management is also system-level.

#### Migration Steps

**Follow same pattern as Phase 1:**
1. Update Terraform routes in `outputs.tf`
2. Update Lambda docstrings
3. Update Lambda route handlers
4. Update frontend API clients
5. Update admin page components

#### Testing Checklist

- [ ] Run validator on module-access
- [ ] Test sys admin IDP config page
- [ ] Test IDP activation flow
- [ ] Test user management page
- [ ] Verify sys_admin authorization

#### Post-Migration

- [ ] Remove from whitelist
- [ ] Update documentation
- [ ] Coordinate with Cognito/OIDC migration plan

---

### Phase 3: module-kb Admin Routes ⚠️ MEDIUM PRIORITY

**Status:** ⏳ Pending  
**Risk Level:** ⚠️ MEDIUM - KB admin functionality  
**Duration:** 3-4 hours  
**Files Impact:** `module-kb/infrastructure/outputs.tf`, `module-kb/backend/lambdas/kb-base/lambda_function.py`, `module-kb/backend/lambdas/kb-document/lambda_function.py`

**Rationale:** KB admin routes use wrong resource name (`kbs` instead of `kb`) and wrong pattern (should be module shortname).

#### Routes to Migrate (24 routes)

**Pattern Issue:** Routes use `/admin/org/kbs/{kbId}/...` instead of `/admin/org/kb/bases/{kbId}/...`

| Current Pattern | New Pattern | Count |
|----------------|-------------|-------|
| `/admin/org/kbs` | `/admin/org/kb/bases` | 8 routes |
| `/admin/sys/kbs` | `/admin/sys/kb/bases` | 8 routes |
| `/admin/org/kbs/{kbId}/documents` | `/admin/org/kb/bases/{kbId}/documents` | 4 routes |
| `/admin/sys/kbs/{kbId}/documents` | `/admin/sys/kb/bases/{kbId}/documents` | 4 routes |

**Architecture Decision:** 
- System admins manage all KB bases (global)
- Org admins manage org-specific KB bases
- Use `bases` as resource name (plural of `base`, not `kbs`)

#### Migration Steps

**1. Update Terraform Routes** (24 route definitions)

File: `templates/_modules-core/module-kb/infrastructure/outputs.tf`

```hcl
# BEFORE:
{
  method = "GET"
  path   = "/admin/org/kbs"
  lambda = module.kb_base_lambda.arn
},

# AFTER:
{
  method = "GET"
  path   = "/admin/org/kb/bases"
  lambda = module.kb_base_lambda.arn
},
```

**2. Update Lambda Docstrings**

File: `templates/_modules-core/module-kb/backend/lambdas/kb-base/lambda_function.py`

```python
# BEFORE:
"""
KB Base Handler

Routes - Org Admin:
- GET /admin/org/kbs - List org KB bases
- POST /admin/org/kbs - Create KB base
"""

# AFTER:
"""
KB Base Handler

Routes - Org Admin:
- GET /admin/org/kb/bases - List org KB bases
- POST /admin/org/kb/bases - Create KB base
"""
```

**3. Update All Lambda Route Handlers** (across 2 Lambda files)

#### Testing Checklist

- [ ] Run validator on module-kb
- [ ] Test org admin KB management page
- [ ] Test sys admin KB management page
- [ ] Test KB base creation
- [ ] Test document upload to KB base
- [ ] Test org assignment to KB base

#### Post-Migration

- [ ] Remove 24 routes from whitelist
- [ ] Update KB admin documentation

---

### Phase 4: module-voice API Prefix Removal ⚠️ MEDIUM PRIORITY

**Status:** ⏳ Pending  
**Risk Level:** ⚠️ MEDIUM - Voice functionality  
**Duration:** 2-3 hours  
**Files Impact:** `module-voice/infrastructure/outputs.tf`, multiple Lambda files

**Rationale:** Module-voice incorrectly uses `/api/voice/...` instead of `/voice/...` pattern. The `/api/` prefix is not part of the CORA standard.

#### Routes to Migrate (12 routes)

| Current Route | New Route |
|--------------|-----------|
| `/api/voice/sessions` | `/voice/sessions` |
| `/api/voice/sessions/{id}` | `/voice/sessions/{id}` |
| `/api/voice/sessions/{id}/start` | `/voice/sessions/{id}/start` |
| `/api/voice/configs` | `/voice/configs` |
| `/api/voice/configs/{id}` | `/voice/configs/{id}` |
| `/api/voice/transcripts` | `/voice/transcripts` |
| `/api/voice/transcripts/{id}` | `/voice/transcripts/{id}` |
| `/api/voice/analytics` | `/voice/analytics` |
| `/api/voice/analytics/{id}` | `/voice/analytics/{id}` |
| `/api/voice/credentials` | `/voice/credentials` |
| `/api/voice/credentials/{id}` | `/voice/credentials/{id}` |
| `/api/voice/sessions/{id}/kbs` | `/voice/sessions/{id}/kbs` |

#### Migration Steps

**1. Update Terraform Routes** (12 route definitions)

File: `templates/_modules-functional/module-voice/infrastructure/outputs.tf`

```hcl
# BEFORE:
{
  method = "GET"
  path   = "/api/voice/sessions"
  lambda = module.voice_sessions_lambda.arn
},

# AFTER:
{
  method = "GET"
  path   = "/voice/sessions"
  lambda = module.voice_sessions_lambda.arn
},
```

**2. Update Lambda Docstrings** (6 Lambda files)

**3. Update Lambda Route Handlers** (6 Lambda files)

**4. Update Frontend API Clients**

File: `templates/_modules-functional/module-voice/frontend/lib/api.ts`

```typescript
// BEFORE:
async getSessions(): Promise<VoiceSession[]> {
  const response = await client.get('/api/voice/sessions');
  return response.data;
}

// AFTER:
async getSessions(): Promise<VoiceSession[]> {
  const response = await client.get('/voice/sessions');
  return response.data;
}
```

#### Testing Checklist

- [ ] Run validator on module-voice
- [ ] Test voice session creation
- [ ] Test voice config management
- [ ] Test transcript retrieval
- [ ] Test analytics display
- [ ] Test credentials generation

#### Post-Migration

- [ ] Remove 12 routes from whitelist
- [ ] Update voice API documentation

---

### Phase 5: module-template API Prefix Removal ✅ LOW PRIORITY

**Status:** ⏳ Pending  
**Risk Level:** ✅ LOW - Template only  
**Duration:** 30 minutes  
**Files Impact:** `templates/_module-template/infrastructure/outputs.tf`, `templates/_module-template/backend/lambdas/entity/lambda_function.py`

**Rationale:** Template uses `/api/` prefix. Fix to prevent propagation to new modules.

#### Routes to Migrate (2 routes)

| Current Route | New Route |
|--------------|-----------|
| `/api/{module}/{entities}` | `/{module}/{entities}` |
| `/api/{module}/{entities}/{id}` | `/{module}/{entities}/{id}` |

#### Migration Steps

**1. Update Template Terraform**

File: `templates/_module-template/infrastructure/outputs.tf`

```hcl
# BEFORE:
{
  method = "GET"
  path   = "/api/{module}/{entities}"
  lambda = module.entity_lambda.arn
},

# AFTER:
{
  method = "GET"
  path   = "/{module}/{entities}"
  lambda = module.entity_lambda.arn
},
```

**2. Update Template Lambda**

File: `templates/_module-template/backend/lambdas/entity/lambda_function.py`

```python
# BEFORE:
"""
Routes - Data API:
- GET /api/{module}/{entities} - List entities
"""

# AFTER:
"""
Routes - Data API:
- GET /{module}/{entities} - List entities
"""
```

#### Testing Checklist

- [ ] Run validator on module-template
- [ ] Verify template documentation updated

#### Post-Migration

- [ ] Remove from whitelist
- [ ] Note in module creation guide

---

### Phase 6: Workspace Route Standardization (Deferred - Low Priority)

**Status:** ⏳ Deferred  
**Risk Level:** ✅ LOW - Warnings only, intentional design  
**Duration:** TBD (requires architectural decision)  
**Files Impact:** Multiple modules

**Rationale:** Routes use `/workspaces/{workspaceId}/...` instead of `/ws/{wsId}/...`. This may be **intentional** for clarity in data API routes.

#### Routes to Evaluate (14 warnings)

Examples:
- `/workspaces/{workspaceId}/chats`
- `/workspaces/{workspaceId}/kb`
- `/workspaces/{workspaceId}/eval`

**Architectural Decision Needed:**

**Option A: Keep as-is (Recommended)**
- Data API routes can use full names for clarity
- `/workspaces/` is more explicit than `/ws/`
- Only admin routes require module shortnames
- **Verdict:** Intentional, no change needed

**Option B: Standardize to `/ws/{wsId}/`**
- Consistent with admin route pattern
- Shorter URLs
- Requires coordination across modules
- **Verdict:** Breaking change, high effort, low value

**Recommendation:** Mark as intentional, update validator to allow `/workspaces/` in data API routes as an exception.

---

### Phase 7: Organization Route Evaluation (Deferred - Low Priority)

**Status:** ⏳ Deferred  
**Risk Level:** ✅ LOW - Warnings only, intentional design  
**Duration:** TBD  

**Rationale:** Routes use `/orgs/{orgId}/...` which may be intentional for clarity.

#### Routes to Evaluate (8 warnings)

Examples:
- `/orgs/{orgId}/members`
- `/orgs/{orgId}/invites`
- `/orgs/{orgId}/email-domains`

**Architectural Decision:** Same as Phase 6 - likely intentional, keep as-is.

---

### Phase 8: Chat Route Evaluation (Deferred - Low Priority)

**Status:** ⏳ Deferred  
**Risk Level:** ✅ LOW - Warnings only  
**Duration:** TBD  

**Rationale:** Routes use `/chats/{chatId}/...` (plural) instead of `/chat/{chatId}/...`.

#### Routes to Evaluate (8 warnings)

Examples:
- `/chats/{chatId}/kb`
- `/chats/{chatId}/messages`

**Architectural Decision:** Evaluate if `/chats/` (plural) is intentional REST pattern or should be `/chat/` (module name).

---

## Implementation Strategy

### Option A: Phased Implementation (Recommended)

Execute Phases 1-5 sequentially based on priority.

**Timeline:**
- **Phase 1 (module-ai):** Week 1 (2-3 hours) - ⚠️ HIGH PRIORITY
- **Phase 2 (module-access):** Week 1 (2-3 hours) - ⚠️ HIGH PRIORITY
- **Phase 3 (module-kb):** Week 2 (3-4 hours) - ⚠️ MEDIUM PRIORITY
- **Phase 4 (module-voice):** Week 2 (2-3 hours) - ⚠️ MEDIUM PRIORITY
- **Phase 5 (module-template):** Week 2 (30 min) - ✅ LOW PRIORITY
- **Total:** 2 weeks for critical routes

**Pros:**
- ✅ Lower risk - test each phase before next
- ✅ Admin routes fixed first (aligns with current focus)
- ✅ Easier rollback per phase
- ✅ Can integrate with ongoing admin standardization work

**Cons:**
- ⚠️ Multiple deployments
- ⚠️ Coordination needed with frontend team

---

### Option B: Module-by-Module (Alternative)

Migrate all routes for one module at a time.

**Timeline:**
- All module-ai routes: 2-3 hours
- All module-access routes: 2-3 hours
- All module-kb routes: 3-4 hours
- All module-voice routes: 2-3 hours

**Pros:**
- ✅ Touch each module only once
- ✅ Simpler coordination

**Cons:**
- ⚠️ Doesn't prioritize admin routes
- ⚠️ Delays admin panel fixes

---

## Risk Mitigation

### Pre-Migration Checklist

- [ ] Backup API Gateway configuration
- [ ] Test migrations in dev environment
- [ ] Create rollback Terraform for each phase
- [ ] Update all API documentation
- [ ] Notify frontend team of breaking changes
- [ ] Coordinate with admin standardization team

### During Migration

- [ ] Deploy Terraform changes during low-traffic window
- [ ] Monitor API Gateway error logs
- [ ] Test critical admin flows immediately
- [ ] Keep old routes active temporarily (if possible)

### Post-Migration

- [ ] Run validator against templates
- [ ] Execute API integration tests
- [ ] Monitor production for 24 hours
- [ ] Remove old routes after 1 week

---

## Integration with Ongoing Work

### Admin Standardization (Current Focus)

**Phases 1-2** directly support admin standardization:
- Module-ai admin routes → Match new sys admin pattern
- Module-access admin routes → Match new sys admin pattern

**Coordination:**
- Schedule with admin standardization sprint
- Test with new admin UI components
- Ensure `/admin/sys/{module}/{resource}` pattern works

### WS Plugin Architecture S3

**Phase 3** (module-kb admin routes) may integrate with S3:
- New config override tables will need admin routes
- Example: `/admin/org/kb/modules` for org-level KB config
- Coordinate route patterns with S3 design

---

## Success Metrics

- [ ] All admin routes have scope prefix (sys/org/ws)
- [ ] All admin routes use correct module shortname
- [ ] No `/api/` prefix in data routes
- [ ] Validator passes with 0 errors (warnings acceptable)
- [ ] Frontend admin pages work with new routes
- [ ] API documentation updated
- [ ] No production incidents during migration
- [ ] Rollback not required

---

## Appendix: Module Impact Summary

| Module | Errors | Warnings | Priority | Duration | Status |
|--------|--------|----------|----------|----------|--------|
| module-ai | 6 | 4 | P1 (High) | 2-3h | Phase 1 |
| module-access | 4 | 10 | P1 (High) | 2-3h | Phase 2 |
| module-kb | 24 | 18 | P2 (Med) | 3-4h | Phase 3 |
| module-voice | 12 | 12 | P2 (Med) | 2-3h | Phase 4 |
| module-template | 2 | 2 | P3 (Low) | 30min | Phase 5 |
| module-eval | 0 | 14 | P3 (Low) | TBD | Phase 6 |
| module-chat | 0 | 8 | P3 (Low) | TBD | Phase 8 |
| **Total** | **86** | **90** | - | **10-15h** | - |

**Key Insight:** Admin routes (Phases 1-3) account for 34 errors (40% of all errors) and directly support current admin standardization work. Prioritize these first.

---

**Status:** Planning  
**Next Steps:** 
1. Review and approve plan
2. Integrate Phase 1-2 with admin standardization sprint
3. Schedule Phase 3 with S3 implementation
4. Defer Phases 6-8 (architectural decisions needed)

**Cross-Reference:**
- [Admin Standardization Context](../../memory-bank/context-admin-standardization.md)
- [WS Plugin S3 Plan](../plan_ws-plugin-arch-s3.md)
- [ADR-018b API Gateway Route Standards](../../arch%20decisions/ADR-018b-API-GATEWAY-ROUTE-STANDARDS.md)