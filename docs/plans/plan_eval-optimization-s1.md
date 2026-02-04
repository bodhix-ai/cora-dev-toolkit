# Plan: Evaluation Optimization - Sprint 1 (Architecture Analysis)

**Status:** 🟡 IN PROGRESS  
**Branch:** `feature/eval-optimization-s1`  
**Context:** [memory-bank/context-eval-optimization.md](../../memory-bank/context-eval-optimization.md)  
**Created:** February 4, 2026

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

### Phase 1: Architecture Research
- [ ] Review existing CORA authentication patterns (ADR-004, ADR-007, ADR-019)
- [ ] Analyze module-eval current prompt configuration
- [ ] Document code reuse opportunities (shared types, components, utilities)
- [ ] Identify infrastructure requirements per deployment option
- [ ] Research Next.js app deployment patterns (monorepo vs. polyrepo)

### Phase 2: Prototype Development
- [ ] Set up minimal Next.js application structure
- [ ] Implement NextAuth configuration (Cognito integration)
- [ ] Create API client for CORA modules (access, ws, kb, eval)
- [ ] Build simple workflow:
  - [ ] Authenticate user
  - [ ] Create test org (module-access)
  - [ ] Create workspace (module-ws)
  - [ ] Upload sample document (module-kb)
  - [ ] Run evaluation (module-eval)
- [ ] Test end-to-end flow in dev environment

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
- [ ] Prototype successfully authenticates via CORA Cognito
- [ ] Can call all 4 required module APIs (access, ws, kb, eval)
- [ ] End-to-end workflow creates org → workspace → upload doc → run eval
- [ ] ADR-020 documents architecture decision with clear rationale
- [ ] Recommendation backed by prototype evidence

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

- [ ] Prototype code committed to branch
- [ ] Prototype successfully runs end-to-end workflow
- [ ] ADR-020 created and reviewed
- [ ] Sprint 2 plan outlined
- [ ] Architecture decision communicated to team
- [ ] All open questions answered or documented for S2

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

**Last Updated:** February 4, 2026  
**Next Review:** After prototype completion
