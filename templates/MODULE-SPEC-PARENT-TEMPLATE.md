# {MODULE_NAME} Module Specification

**Module Name:** {module-name}  
**Entity:** {entity-name}  
**Complexity:** [Simple | Medium | Complex]  
**Estimated Time:** [8 | 16-24 | 32-40] hours  
**Status:** [Draft | Approved | In Progress | Complete]  
**Created:** {date}

---

## 1. Overview

### Purpose

[What problem does this module solve? What business need does it address?]

### Scope

**In Scope:**
- [Feature 1]
- [Feature 2]
- [Feature 3]

**Out of Scope:**
- [What this module does NOT do]
- [Deferred features]

### Source Reference

**Legacy Code (if applicable):**
- Repository: {path/to/legacy/repo}
- Key files:
  - `{path/to/lambda1.py}` - [Description]
  - `{path/to/lambda2.py}` - [Description]
  - `{path/to/schema.sql}` - [Description]

**Use Cases (if applicable):**
- Document: `{path/to/requirements.md}`
- Epic: `{JIRA-123}` - [Epic name]

---

## 2. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | [0-2] | [1 entity = 0, 2-3 = 1, 4+ = 2] |
| AI Integration | [0-2] | [None = 0, Basic = 1, Advanced = 2] |
| Functional Dependencies | [0-2] | [Count of dependencies beyond core] |
| Legacy Code Complexity | [0-2] | [< 500 lines = 0, 500-1000 = 1, 1000+ = 2] |
| Business Logic | [0-1] | [State machines, workflows = 1] |
| **Total** | **[0-9]** | **≤2 = Simple, 3-5 = Medium, 6+ = Complex** |

### Classification: [Simple | Medium | Complex]

**Time Estimate:** [8 | 16-24 | 32-40] hours

**Estimated Spec Size:**
- Technical Spec: [800-1200 lines for Simple, 1200-2000 for Medium, 2000-4000 for Complex]
- User UX Spec: [400-600 lines for Simple, 600-1000 for Medium, 1000-2000 for Complex]
- Admin UX Spec: [300-500 lines for Simple, 500-800 for Medium, 800-1500 for Complex]

---

## 3. Subordinate Specifications

This module specification is divided into separate documents for clarity and maintainability:

### 3.1 Technical Specification

**File:** `MODULE-{MODULE_NAME}-TECHNICAL-SPEC.md`

**Contains:**
- Data model & entity definitions
- Database schema & migrations
- API endpoints (request/response schemas)
- Core module integrations (access, ai, mgmt)
- Functional module dependencies
- Backend implementation patterns
- Infrastructure requirements
- Backend testing requirements

**Status:** [Draft | Approved | In Progress | Complete]

### 3.2 User UX Specification

**File:** `MODULE-{MODULE_NAME}-USER-UX-SPEC.md`

**Contains:**
- User personas & use cases
- User journey maps
- Page-by-page UI specifications
- Component library usage
- User interaction patterns
- Mobile responsiveness requirements
- Accessibility requirements (WCAG 2.1 AA)
- Frontend testing requirements (user flows)

**Status:** [Draft | Approved | In Progress | Complete]

### 3.3 Admin UX Specification

**File:** `MODULE-{MODULE_NAME}-ADMIN-UX-SPEC.md`

**Contains:**
- Admin personas & use cases
- Admin configuration flows
- Platform admin UI design (module config page)
- Organization admin UI design (module management)
- Monitoring & analytics interfaces
- Admin card design & integration
- Admin testing requirements

**Status:** [Draft | Approved | In Progress | Complete]

---

## 4. High-Level Architecture

### 4.1 Entity Summary

| Entity | Purpose | Relationships |
|--------|---------|---------------|
| {entity_name} | [Brief purpose] | belongs_to: org, has_many: {related} |
| [additional entities] | [Brief purpose] | [Key relationships] |

### 4.2 Integration Points

**Core Modules:**
- ✅ module-access - Authentication, authorization, database operations
- [✅/❌] module-ai - AI model integration [if applicable]
- ✅ module-mgmt - Health checks, admin card registration

**Functional Modules:**
- [✅/❌] module-{name} - [Integration purpose]

**External Systems:**
- [List any external APIs or services]

### 4.3 Foreign Key Convention

**Primary Key:** `ws_id` (for workspace), `{entity}_id` (for other entities)

**Example:**
```
workspace.id → referenced as ws_id in other tables
chat_room.ws_id → REFERENCES workspace.id
knowledge_base.ws_id → REFERENCES workspace.id
```

---

## 5. Implementation Phases

### Phase 1: Discovery & Analysis ✅ COMPLETE
- [x] Source code analyzed
- [x] Entities identified
- [x] API endpoints mapped
- [x] Dependencies identified
- [x] Complexity assessed
- [x] Specification documents created

**Time Spent:** {X hours}

### Phase 2: Design Approval ⏳ IN PROGRESS
- [ ] Technical specification reviewed
- [ ] User UX specification reviewed
- [ ] Admin UX specification reviewed
- [ ] Dependencies validated
- [ ] Integration approach approved
- [ ] All specifications approved

**Estimated:** {X hours}

### Phase 3: Implementation 🔄 NOT STARTED

**Backend Implementation:**
- [ ] Module scaffolding generated
- [ ] Database schema written
- [ ] Lambda handlers implemented
- [ ] Common layer created (if needed)
- [ ] Core module integration complete
- [ ] Functional module integration complete (if applicable)

**Frontend Implementation:**
- [ ] API client created
- [ ] Custom hooks implemented
- [ ] User components created
- [ ] Admin components created (if applicable)
- [ ] Types defined
- [ ] Admin card created (if applicable)

**Infrastructure:**
- [ ] Terraform variables defined
- [ ] Lambda resources defined
- [ ] IAM roles/policies created
- [ ] CloudWatch alarms added

**Documentation:**
- [ ] Module README created
- [ ] Configuration guide created
- [ ] API reference documented

**Estimated:** {X hours}

### Phase 4: Validation & Deployment 🔄 NOT STARTED
- [ ] API compliance check passed
- [ ] Frontend compliance check passed
- [ ] Dependency validation passed
- [ ] Schema validation passed
- [ ] Configuration validated
- [ ] Module registered
- [ ] Database deployed
- [ ] Infrastructure deployed
- [ ] Smoke tests passed

**Estimated:** {X hours}

---

## 6. Configuration Requirements

### Required Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| [param1] | string | Yes | - | [Description] |
| [param2] | number | No | 100 | [Description] |

### Environment Variables

```bash
# Lambda environment variables
{MODULE}_FEATURE_ENABLED=true
{MODULE}_CONFIG_PARAM={value}
```

### Secrets

| Secret | Storage | Usage |
|--------|---------|-------|
| [secret_name] | AWS Secrets Manager | [What it's used for] |

---

## 7. Migration Notes (if applicable)

### Legacy Code Mapping

| Legacy Component | New Component | Changes |
|------------------|---------------|---------|
| `legacy/handler.py` | `backend/lambdas/{entity}/lambda_function.py` | Converted to CORA patterns |
| `legacy/table.sql` | `db/schema/001-{entity}-table.sql` | Added RLS, standardized schema |

### Data Migration Strategy

[Brief overview - details in technical spec]

### Breaking Changes

- [ ] API path changed: `/old` → `/api/{module}/{entities}`
- [ ] Field renamed: `old_field` → `new_field`
- [ ] Authentication changed: API key → NextAuth JWT
- [ ] Response format changed: flat → `{success, data}` wrapper

---

## 8. Success Criteria

### Functional Requirements
- [ ] All CRUD operations work correctly
- [ ] Multi-tenancy enforced (org_id filtering)
- [ ] Permissions enforced via RLS
- [ ] API responses follow CORA standard format
- [ ] [Add module-specific requirements]

### Non-Functional Requirements
- [ ] API response time < 500ms (p95)
- [ ] Database queries optimized with indexes
- [ ] Error handling covers all edge cases
- [ ] Logging includes trace IDs for debugging
- [ ] Accessibility meets WCAG 2.1 AA standards

### Validation Requirements
- [ ] API compliance: 100% pass
- [ ] Frontend compliance: 100% pass
- [ ] Schema validation: 100% pass
- [ ] Dependency validation: 100% pass
- [ ] Import validation: 100% pass

---

## 9. Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| [Risk 1] | [High/Med/Low] | [High/Med/Low] | [Mitigation strategy] |
| [Risk 2] | [High/Med/Low] | [High/Med/Low] | [Mitigation strategy] |

### Dependencies Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| module-{name} | [What could go wrong] | [How to handle it] |

---

## 10. Related Documentation

**CORA Standards:**
- [CORA Module Development Process](../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../standards/standard_MODULE-REGISTRATION.md)
- [CORA Frontend Standard](../standards/standard_CORA-FRONTEND.md)
- [Admin Card Pattern](../standards/standard_ADMIN-CARD-PATTERN.md)

**This Module:**
- [Technical Specification](./MODULE-{MODULE_NAME}-TECHNICAL-SPEC.md)
- [User UX Specification](./MODULE-{MODULE_NAME}-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-{MODULE_NAME}-ADMIN-UX-SPEC.md)

---

## 11. Approval Sign-Off

### Technical Review

**Reviewer:** [Name]  
**Date:** [YYYY-MM-DD]  
**Status:** [Approved | Needs Changes | Rejected]  
**Comments:** [Feedback]

### UX Review

**Reviewer:** [Name]  
**Date:** [YYYY-MM-DD]  
**Status:** [Approved | Needs Changes | Rejected]  
**Comments:** [Feedback]

### Final Approval

**Approver:** [Name]  
**Date:** [YYYY-MM-DD]  
**Status:** [Approved | Rejected]  
**Comments:** [Final decision]

---

**Document Version:** 1.0  
**Last Updated:** {date}  
**Author:** [Name/AI]  
**Specification Type:** Parent (references subordinate specs)
