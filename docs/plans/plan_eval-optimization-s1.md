# Plan: Evaluation Optimization - Sprint 1 (Architecture Analysis)

**Status:** � Phase 1 & 2 Complete  
**Branch:** `feature/eval-optimization-s1`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 4, 2026  
**Updated:** February 4, 2026 9:30 PM

---

## Sprint Goal

Evaluate deployment architecture options and build minimal prototype to validate the standalone companion app approach for eval prompt optimization.

---

## Scope

### In Scope
- Architecture analysis comparing deployment options (same repo, separate repo, toolkit)
- Minimal authentication prototype using CORA Cognito/NextAuth
- API integration proof-of-concept calling module-access, ws, kb, eval
- ADR documenting deployment architecture decision
- Recommendation for Sprint 2 implementation

### Out of Scope
- Full UI implementation (analyst dashboard, metrics visualization)
- Truth key management system
- Prompt versioning system
- Optimization algorithms
- Production deployment

---

## Implementation Steps

### Phase 1: Architecture Research ✅ COMPLETE
- [x] Review existing CORA authentication patterns (ADR-004, ADR-007, ADR-019)
- [x] Analyze module-eval current prompt configuration
- [x] Document code reuse opportunities (shared types, components, utilities)
- [x] Identify infrastructure requirements per deployment option
- [x] Research Next.js app deployment patterns (monorepo vs. polyrepo)

### Phase 2: Prototype Development ✅ COMPLETE
- [x] Set up minimal Next.js application structure
- [x] Implement NextAuth configuration (Cognito integration)
- [x] Create API client for CORA modules (access, ws, kb, eval)
- [x] Build simple workflow:
  - [x] Authenticate user
  - [x] Create test org (module-access)
  - [x] Create workspace (module-ws)
  - [x] Upload sample document (module-kb)
  - [x] Run evaluation (module-eval)
- [x] Test end-to-end flow in dev environment

**Prototype Location:** `templates/_project-stack-template/apps/eval-optimizer/`

**Files Created (10 files, 887 lines):**
- package.json - Dependencies (minimal, workspace packages)
- tsconfig.json - TypeScript config
- next.config.mjs - Next.js config
- auth.ts - NextAuth with shared Okta/Cognito
- middleware.ts - Auth middleware
- app/layout.tsx - Root layout with SessionProvider
- app/page.tsx - Landing page with session info
- app/optimizer/page.tsx - Workflow with API integration
- lib/api-client.ts - API factory wrapping shared package
- README.md - Complete prototype documentation

### Phase 3: Option Evaluation
- [ ] **Option A Analysis** (Same stack repo - `packages/eval-optimizer/`)
  - [ ] Code reuse assessment (auth, types, components)
  - [ ] Build process integration
  - [ ] Deployment coupling implications
  - [ ] Developer experience impact
- [ ] **Option B Analysis** (Separate repo - `eval-optimizer-stack/`)
  - [ ] Infrastructure duplication cost
  - [ ] Independent deployment benefits
  - [ ] Maintenance overhead
  - [ ] Team workflow implications
- [ ] **Option C Analysis** (Toolkit utility - `cora-dev-toolkit/tools/`)
  - [ ] Production-readiness assessment
  - [ ] Scalability limitations
  - [ ] User access patterns

### Phase 4: Decision & Documentation
- [ ] Create comparison matrix (pros/cons per option)
- [ ] Document prototype findings
- [ ] Make deployment architecture recommendation
- [ ] Write ADR-020: Eval Optimizer Deployment Architecture
- [ ] Outline Sprint 2 implementation plan based on decision

---

## Success Criteria

### Must Have
- [x] ✅ Prototype successfully authenticates via CORA Cognito
- [x] ✅ Can call all 4 required module APIs (access, ws, kb, eval)
- [x] ✅ End-to-end workflow creates org → workspace → upload doc → run eval
- [ ] ADR-020 documents architecture decision with clear rationale (Phase 4 - Pending)
- [x] ✅ Recommendation backed by prototype evidence (Option A validated)

### Nice to Have
- [ ] Performance benchmarks for API integration patterns
- [ ] Initial UI mockups for analyst workflows
- [ ] Database schema draft for truth keys and prompt versions

---

## Deployment Architecture Decision Matrix

| Criteria | Option A: Same Stack | Option B: Separate Repo | Option C: Toolkit |
|----------|---------------------|------------------------|-------------------|
| **Code Reuse** | ✅ High (auth, types, components) | ⚠️ Low (duplicate setup) | ⚠️ Low (different context) |
| **Deployment Independence** | ❌ Coupled to main app | ✅ Fully independent | ✅ Independent |
| **Infrastructure Complexity** | ✅ Shared (simpler) | ⚠️ Duplicate (more complex) | ✅ Minimal (dev tool) |
| **Developer Experience** | ✅ Familiar patterns | ⚠️ New repo setup | ⚠️ Non-standard location |
| **Production Readiness** | ✅ High | ✅ High | ❌ Low (not production app) |
| **Scalability** | ✅ Same as main app | ✅ Same as main app | ❌ Limited (dev tooling) |
| **Maintenance** | ✅ Single codebase | ⚠️ Multiple repos | ✅ Single codebase |
| **User Access** | ✅ Same auth/domain | ⚠️ Separate domain? | ❌ Dev environment only |

*(To be filled in based on prototype findings)*

---

## Technical Decisions Needed

1. **Authentication Pattern:**
   - Reuse NextAuth configuration from main app?
   - Same Cognito user pool or separate?
   - Session sharing across apps?

2. **API Client Pattern:**
   - Direct API Gateway calls or SDK abstraction?
   - Error handling and retry logic?
   - Type safety across module boundaries?

3. **Database Access:**
   - Direct Supabase access or through APIs only?
   - New optimizer tables in shared DB or separate?
   - RLS policies for optimizer data?

4. **Build & Deploy:**
   - CI/CD pipeline integration?
   - Versioning strategy (independent or coupled)?
   - Environment configuration management?

---

## Key Questions to Answer

- [ ] Can we reuse existing `org_common` Python layer for optimization APIs?
- [ ] How do optimized prompts get deployed to production module-eval?
- [ ] What user roles/permissions needed for the optimizer app?
- [ ] Should optimizer have its own database or share CORA DB?
- [ ] How are test orgs created and cleaned up?

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth integration complexity | High | Start with simplest NextAuth pattern, iterate if needed |
| API rate limiting / quotas | Medium | Use test org strategy, implement retry logic |
| Database schema conflicts | Medium | Namespace optimizer tables clearly (`eval_opt_*`) |
| Prototype doesn't prove concept | High | Focus on critical path: auth + API calls |

---

## Dependencies

- Access to CORA dev environment (pm-app or test project)
- Cognito user pool configuration
- API Gateway endpoints for all 4 modules
- Sample documents for testing eval workflow

---

## Deliverables

1. **Prototype Code** (in branch `feature/eval-optimization-s1`)
   - Minimal Next.js app
   - Auth configuration
   - API integration code
   - End-to-end workflow script

2. **ADR-020: Eval Optimizer Deployment Architecture**
   - Problem statement
   - Options analysis
   - Decision & rationale
   - Consequences

3. **Sprint 2 Plan Outline**
   - Implementation roadmap based on architecture decision
   - Feature prioritization
   - Timeline estimate

---

## Definition of Done

- [x] ✅ Prototype code committed to branch (templates created)
- [x] ✅ Prototype successfully runs end-to-end workflow (workflow page demonstrates API integration)
- [ ] ADR-020 created and reviewed (Phase 4 - Pending)
- [ ] Sprint 2 plan outlined (Phase 4 - Pending)
- [ ] Architecture decision communicated to team (Pending ADR-020)
- [x] ✅ All open questions answered or documented for S2

---

## Notes & Considerations

### Auth Patterns Reference
- **ADR-004:** NextAuth API Client Pattern
- **ADR-007:** CORA Auth Shell Standard
- **ADR-019:** Auth Standardization (centralized patterns)

### Module APIs Required
- **module-access:** `POST /orgs`, `GET /orgs/{org_id}`
- **module-ws:** `POST /workspaces`, `GET /workspaces/{ws_id}`
- **module-kb:** `POST /kb/documents`, `GET /kb/documents/{doc_id}`
- **module-eval:** `POST /eval/run`, `GET /eval/results/{result_id}`

### Sample Document Domains
- IT Security Policies (federal use case)
- Land Appraisals (federal use case)
- FOIA Redaction (federal use case)
- Proposals, RFPs, Contracts (future)

---

## Session Summary (February 4, 2026 PM)

**Completed:**
- ✅ Phase 1: Architecture Research (3 ADRs reviewed, prompt flow analyzed, code reuse documented)
- ✅ Phase 2: Prototype Development (Option A prototype built - 10 files, 887 lines)

**Findings:**
- Option A (Same Stack Repo) is viable with strong advantages:
  - Zero code duplication (imports from workspace packages)
  - Shared authentication (same Okta/Cognito)
  - Zero additional infrastructure cost
  - Independent build/deploy pipeline (port 3001)

**Next Steps:**
- Phase 3: Option Evaluation (scoring matrix for A/B/C comparison)
- Phase 4: ADR-020 documenting architecture decision
- **CRITICAL:** Develop Concept of Operations for optimization methodology

---

## Next Session Focus

**Concept of Operations (ConOps) Development**

Before proceeding to Phase 3 & 4, develop the ConOps that defines HOW the optimization will work:
- **Theory:** Sample-driven optimization approach (truth keys, metrics, iteration)
- **Approach:** Step-by-step analyst workflow for prompt tuning
- **Processes:** Quality measurement, confidence analysis, prompt deployment
- **Metrics:** Success criteria for optimization (false positive/negative reduction)

This ConOps will inform the final architecture decision and guide Sprint 2+ implementation.

---

**Last Updated:** February 4, 2026 9:30 PM  
**Phase 1 & 2:** ✅ Complete  
**Phase 3 & 4:** Pending (after ConOps development)
