# CORA Standards Index

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Purpose:** Single source of truth for CORA standards organization and naming conventions

---

## Naming Convention

All standards follow this naming pattern:

```
{NN}_{type}_{category}_{NAME}.md
```

Where:
- `NN` = Two-digit number for alphabetical grouping
- `type` = `index` (meta) or `std` (standard)
- `category` = Layer/domain identifier (see ranges below)
- `NAME` = Descriptive name in UPPER-CASE with hyphens

### Number Ranges

| Range | Category | Description |
|-------|----------|-------------|
| `00` | Index/Meta | This file, navigation documents |
| `01-09` | 4-Tier Architecture | Technical standards by tier |
| `10-19` | CORA Architecture | Modular architecture principles |
| `20-29` | Process | Team workflows, sprints, reviews |
| `30-39` | Operations | Infrastructure, DevOps, security |

### Tier Categories (01-09)

| Prefix | Tier | Description |
|--------|------|-------------|
| `01_std_front_` | Frontend | React hooks, TypeScript, Next.js |
| `02_std_api_` | API Gateway | Routes, response format, HTTP |
| `03_std_back_` | Backend | Lambda, org-common, Python |
| `04_std_data_` | Database | RPC functions, table naming, RLS |
| `05_std_quality_` | Quality | Cross-cutting code quality |

### Other Categories

| Prefix | Category | Description |
|--------|----------|-------------|
| `10_std_cora_` | CORA | Modular architecture principles |
| `20_std_process_` | Process | Sprint management, workflows |
| `30_std_infra_` | Infrastructure | Terraform, AWS, deployment |
| `31_std_devops_` | DevOps | Git, branching, CI/CD |
| `32_std_security_` | Security | Security standards |

---

## Standards by Tier

### 01 - Frontend Standards

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `01_std_front_AUTH.md` | ADR-019a | api-tracer | Frontend authorization patterns |

### 02 - API Standards

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `02_std_api_ROUTES.md` | ADR-018b | api-tracer | Route naming standards |
| `02_std_api_RESPONSE.md` | - | api-tracer | Response format (camelCase) |

### 03 - Backend Standards

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `03_std_back_AUTH.md` | ADR-019b | api-tracer | Backend authorization patterns |
| `03_std_back_ORG-COMMON.md` | - | api-tracer | org-common function usage |

### 04 - Data Standards

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `04_std_data_TABLE-NAMING.md` | ADR-011 | db-naming | Table naming conventions |
| `04_std_data_RPC-FUNCTIONS.md` | ADR-019 | rpc-function | RPC function standards |

### 05 - Quality Standards

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `05_std_quality_ROLE-NAMING.md` | - | role-naming | sys_role/sysRole consistency |

### 10 - CORA Architecture

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `10_std_cora_MODULE-ARCH.md` | ADR-013 | - | Core module criteria |

### 30 - Infrastructure

| File | ADR | Validator | Description |
|------|-----|-----------|-------------|
| `30_std_infra_LAMBDA-DEPLOY.md` | - | - | Lambda deployment patterns |

---

## Validator Mapping

This table maps api-tracer validation checks to their authoritative standards:

### Auth Lifecycle Checks (ADR-019)

| Check ID | Standard | Layer | Description |
|----------|----------|-------|-------------|
| `front.useRole` | 01_std_front_AUTH | Frontend | useRole() hook in admin pages |
| `front.useOrgContext` | 01_std_front_AUTH | Frontend | useOrganizationContext() |
| `front.loadingState` | 01_std_front_AUTH | Frontend | Check isLoading before role |
| `back.externalUidConversion` | 03_std_back_AUTH | Backend | External UID → Supabase UUID |
| `back.centralizedRouterAuth` | 03_std_back_AUTH | Backend | Auth at router, not handlers |
| `back.checkSysAdmin` | 03_std_back_AUTH | Backend | check_sys_admin() usage |
| `back.checkOrgAdmin` | 03_std_back_AUTH | Backend | check_org_admin() usage |
| `back.checkWsAdmin` | 03_std_back_AUTH | Backend | check_ws_admin() usage |
| `back.getOrgContext` | 03_std_back_AUTH | Backend | get_org_context_from_event() |

### Code Quality Checks

| Check ID | Standard | Layer | Description |
|----------|----------|-------|-------------|
| `api.camelCaseResponse` | 02_std_api_RESPONSE | API | Response keys in camelCase |
| `api.routeNaming` | 02_std_api_ROUTES | API | ADR-018b route patterns |
| `back.orgCommonSignatures` | 03_std_back_ORG-COMMON | Backend | Valid function signatures |
| `data.rpcExists` | 04_std_data_RPC-FUNCTIONS | Data | RPC functions exist |
| `quality.roleNaming` | 05_std_quality_ROLE-NAMING | All | Role naming consistency |

---

## ADR Cross-Reference

| ADR | Standards | Description |
|-----|-----------|-------------|
| ADR-011 | 04_std_data_TABLE-NAMING | Table naming conventions |
| ADR-018b | 02_std_api_ROUTES | API Gateway route standards |
| ADR-019 | 01_std_front_AUTH, 03_std_back_AUTH, 04_std_data_RPC-FUNCTIONS | Full auth lifecycle |
| ADR-019a | 01_std_front_AUTH | Frontend auth patterns |
| ADR-019b | 03_std_back_AUTH | Backend auth patterns |

---

## Migration from Old Naming

| Old Name | New Name |
|----------|----------|
| `standard_LAMBDA-AUTHORIZATION.md` | `03_std_back_AUTH.md` |
| `standard_API-PATTERNS.md` | `02_std_api_RESPONSE.md` |
| `standard_CORA-FRONTEND.md` | `01_std_front_AUTH.md` |

---

**Maintained by:** CORA Development Team  
**Related:** [ADR-019](../arch%20decisions/ADR-019-AUTH-STANDARDIZATION.md)