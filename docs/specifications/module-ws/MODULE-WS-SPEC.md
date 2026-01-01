# Workspace Module Specification (Parent)

**Module Name:** module-ws  
**Entity:** workspace  
**Complexity:** Simple  
**Estimated Time:** 8 hours  
**Status:** Draft  
**Created:** December 31, 2025  
**Last Updated:** December 31, 2025

---

## Document Overview

This is the **parent specification** for module-ws. It provides an executive summary and references the detailed subordinate specifications.

### Subordinate Specifications

| Specification | Purpose | Est. Size |
|---------------|---------|-----------|
| [MODULE-WS-TECHNICAL-SPEC.md](./MODULE-WS-TECHNICAL-SPEC.md) | Data model, API, database, backend | ~1000 lines |
| [MODULE-WS-USER-UX-SPEC.md](./MODULE-WS-USER-UX-SPEC.md) | User personas, UI design, accessibility | ~600 lines |
| [MODULE-WS-ADMIN-UX-SPEC.md](./MODULE-WS-ADMIN-UX-SPEC.md) | Admin personas, admin UI, configuration | ~550 lines |

---

## 1. Executive Summary

### Purpose

The Workspace Module provides a collaborative environment container that enables teams to organize and share resources within an organization. Workspaces serve as the foundational organizational unit where other modules (chat, knowledge bases, workflows) can associate their functionality, enabling team-based collaboration with granular access control.

### Problem Solved

- Teams need isolated containers to organize work within an organization
- Resources (chats, knowledge bases, workflows) need a shared context
- Users need to control who can access and collaborate on specific work areas
- Organizations need visibility into active workspaces and their members

### Key Capabilities

1. **Workspace CRUD** - Create, read, update, soft delete workspaces
2. **Member Management** - Role-based access (owner, admin, user)
3. **Favorites** - Per-user workspace favorites for quick access
4. **Metadata** - Tags, color, icon, status for organization
5. **Multi-Tenant** - Organization-scoped isolation
6. **Soft Delete** - Retention period before permanent deletion

---

## 2. Scope

### In Scope

- Create, read, update, soft delete workspaces
- Workspace member management with role-based access (ws_owner, ws_admin, ws_user)
- Per-user workspace favorites for quick access
- Workspace metadata (tags, color, icon, status)
- Multi-tenant isolation (organization-scoped)
- Advanced filtering and sorting (by favorites, activity, name)
- Soft deletion with retention period
- Integration points for future modules (ws_id foreign key)

### Out of Scope

- Chat functionality (handled by module-chat)
- Knowledge base functionality (handled by module-kb)
- Workflow orchestration (handled by module-wf)
- Workspace templates or duplication
- Workspace analytics or reporting (deferred to module-mgmt)
- Cross-organization workspace sharing
- Workspace versioning or history

---

## 3. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 1 | 3 entities (workspace, ws_member, ws_favorite) |
| AI Integration | 0 | No AI features required |
| Functional Dependencies | 0 | Only core modules (access, mgmt) |
| Legacy Code Complexity | 1 | ~600 lines across handlers |
| Business Logic | 0 | Standard CRUD + member management |
| **Total** | **2** | **Simple complexity** |

### Classification: Simple

**Time Estimate:** 8 hours

### Specification Size Estimates

| Specification | Estimated Lines | Actual Lines |
|---------------|-----------------|--------------|
| Parent (this doc) | 200-300 | ~250 |
| Technical Spec | 800-1200 | ~1000 |
| User UX Spec | 400-800 | ~600 |
| Admin UX Spec | 300-600 | ~550 |
| **Total** | **1700-2900** | **~2400** |

---

## 4. Source Reference

### Legacy Code

- **Repository:** `/Users/aaron/code/policy/legacy/pm-app-stack`
- **Key Files:**
  - `services/api/handlers/projects.py` - Main API handlers (18 endpoints)
  - `services/api/handlers/chat_project_association.py` - Chat integration example
  - `scripts/database/functions/enhance-projects-endpoint.sql` - Enhanced listing with favorites
  - `scripts/migrations/*project*.sql` - Various migration files for RLS and relationships

### Migration Notes

- "Projects" in legacy code will become "Workspaces" in CORA
- Table name: `projects` → `workspaces`
- Foreign key: `project_id` → `ws_id`
- Role column: `role` → `ws_role` (standardized naming pattern)

---

## 5. Dependencies

### Core Module Dependencies (Required)

| Module | Version | Purpose |
|--------|---------|---------|
| module-access | ^1.0.0 | Authentication, authorization, database operations |
| module-mgmt | ^1.0.0 | Module registration, health monitoring, admin cards |

### Functional Module Dependencies

None - module-ws is a foundational module that other modules depend on.

### Dependent Modules (Future)

| Module | Integration |
|--------|-------------|
| module-chat | `chat_session.ws_id` → `workspace.id` |
| module-kb | `kb_base.ws_id` → `workspace.id` |
| module-wf | `workflow.ws_id` → `workspace.id` |

---

## 6. Entities Summary

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| workspace | Primary container | id, org_id, name, description, color, icon, tags, status |
| ws_member | Membership & roles | ws_id, user_id, ws_role (ws_owner/ws_admin/ws_user) |
| ws_config | Platform configuration | nav_label_singular, nav_label_plural, feature flags |
| ws_favorite | User favorites | ws_id, user_id, created_at |

*See [Technical Spec](./MODULE-WS-TECHNICAL-SPEC.md) for complete data model.*

---

## 7. API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/ws/workspaces` | GET | List workspaces with filtering |
| `/api/ws/workspaces` | POST | Create workspace |
| `/api/ws/workspaces/{id}` | GET | Get single workspace |
| `/api/ws/workspaces/{id}` | PUT | Update workspace |
| `/api/ws/workspaces/{id}` | DELETE | Soft delete workspace |
| `/api/ws/workspaces/{id}/restore` | POST | Restore soft-deleted workspace |
| `/api/ws/workspaces/{id}/members` | GET/POST | List/add members |
| `/api/ws/workspaces/{id}/members/{mid}` | PUT/DELETE | Update/remove member |
| `/api/ws/workspaces/{id}/favorite` | POST | Toggle favorite |
| `/api/ws/favorites` | GET | List user's favorites |

*See [Technical Spec](./MODULE-WS-TECHNICAL-SPEC.md) for complete API documentation.*

---

## 8. Implementation Phases

### Phase 1: Discovery & Analysis ✅ COMPLETE

- [x] Source code analyzed (projects.py, 600+ lines)
- [x] Entities identified (workspace, ws_member, ws_favorite, ws_config)
- [x] API endpoints mapped (12 endpoints)
- [x] Dependencies identified (module-access, module-mgmt)
- [x] Complexity assessed (Simple, 8 hours)
- [x] User design decisions gathered
- [x] Specification document created
- [x] Specification split into parent + subordinate specs

### Phase 2: Design Approval ✅ COMPLETE

- [x] Human reviewed parent specification
- [x] Human reviewed technical specification
- [x] Human reviewed user UX specification
- [x] Human reviewed admin UX specification
- [x] Dependencies validated
- [x] Integration approach approved
- [x] All specifications approved

### Phase 3: Implementation ⏳ PENDING

**Backend:**
- [ ] Module scaffolding generated
- [ ] Lambda handlers implemented (workspace, member, favorite)
- [ ] Core module integration complete (module-access)
- [ ] Database RPC functions implemented

**Database:**
- [ ] Schema SQL written (001_create_workspace_tables.sql)
- [ ] Helper functions created (002_workspace_helper_functions.sql)
- [ ] Cleanup job created (003_workspace_cleanup_job.sql)
- [ ] RLS policies created
- [ ] Indexes added
- [ ] Migration tested

**Frontend:**
- [ ] API client created (api.ts)
- [ ] Custom hooks implemented (useWorkspaces, useWorkspaceMembers)
- [ ] Components created (List, Card, Detail, Form, MemberList, Dialogs)
- [ ] Types defined (index.ts)
- [ ] Admin card created (adminCard.tsx)

**Infrastructure:**
- [ ] Terraform variables defined
- [ ] Lambda resources defined
- [ ] IAM roles/policies created
- [ ] EventBridge rule for cleanup job

### Phase 4: Validation & Deployment ⏳ PENDING

- [ ] API compliance check passed
- [ ] Frontend compliance check passed
- [ ] Dependency validation passed
- [ ] Schema validation passed
- [ ] Configuration validated
- [ ] Module registered
- [ ] Database deployed
- [ ] Infrastructure deployed
- [ ] Smoke tests passed
- [ ] Retrospective completed

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Role naming | `ws_owner`, `ws_admin`, `ws_user` | Module-prefixed for clarity |
| Foreign key | `ws_id` | Consistent short naming |
| Soft delete | Yes with retention period | Data recovery capability |
| Config table | Single-row `ws_config` | Platform-level customization |
| Navigation labels | Configurable | "Workspace", "Audit", "Campaign", etc. |

---

## 10. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Member cascade complexity | Medium | Use database RPC functions |
| Retention cleanup timing | Low | EventBridge scheduled job |
| Navigation label changes | Low | Config cached with refresh |

---

## 11. Related Documentation

- [CORA Module Development Process](../../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../../standards/standard_MODULE-REGISTRATION.md)
- [Frontend Integration Standard](../../standards/standard_CORA-FRONTEND.md)

---

## 12. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Module Author | Cline AI Agent | Dec 31, 2025 | ✅ Complete |
| Technical Reviewer | Aaron | Dec 31, 2025 | ✅ Approved |
| UX Reviewer | Aaron | Dec 31, 2025 | ✅ Approved |
| Project Owner | Aaron | Dec 31, 2025 | ✅ Approved |

---

**Document Version:** 2.0 (Split Specification Format)  
**Status:** Draft  
**Last Updated:** December 31, 2025
