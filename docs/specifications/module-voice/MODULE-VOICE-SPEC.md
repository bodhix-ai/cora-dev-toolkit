# Voice Module Specification

**Module Name:** module-voice  
**Entity:** Voice Sessions, Transcripts, Configs, Credentials, Analytics  
**Complexity:** Complex  
**Estimated Time:** 32-40 hours  
**Status:** Draft  
**Created:** January 16, 2026

---

## 1. Overview

### Purpose

The Voice module provides AI-powered voice interview capabilities for CORA-compliant applications. It enables organizations to conduct automated voice interviews using Daily.co WebRTC rooms, real-time transcription via Deepgram, text-to-speech via Cartesia, and ECS-based Pipecat bot orchestration.

### Scope

**In Scope:**
- Voice interview session management (create, start, monitor, complete)
- Daily.co WebRTC room creation and management
- Real-time transcription via WebSocket streaming
- ECS/Fargate Pipecat bot orchestration
- Interview configuration management (Pipecat templates)
- Voice-specific credential management (Daily.co, Deepgram, Cartesia)
- Transcript storage (database + S3 archival)
- AI-generated interview analytics and scoring
- Standby bot pool for reduced cold start latency

**Out of Scope:**
- OpenAI credential management (handled by module-ai)
- User authentication (handled by module-access)
- Billing/subscription management
- Video recording/playback
- Multi-language support (future enhancement)

### Source Reference

**Legacy Code:**
- Repository: `~/code/sts/career/sts-career-stack/packages/ai-interview-module/`
- Key files:
  - `lambdas/configs/lambda_function.py` - Configuration CRUD
  - `lambdas/credentials/lambda_function.py` - Credentials management
  - `lambdas/sessions/lambda_function.py` - Session CRUD
  - `lambdas/transcripts/lambda_function.py` - Transcript management
  - `lambdas/voice-session/lambda_function.py` - Bot orchestration
  - `lambdas/websocket/*` - Real-time transcript streaming

**Infrastructure:**
- Repository: `~/code/sts/career/sts-career-infra/terraform/`

---

## 2. Complexity Assessment

### Score Breakdown

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 2 | 5 entities (sessions, transcripts, configs, credentials, analytics) |
| AI Integration | 2 | Multiple AI services: OpenAI (LLM), Deepgram (STT), Cartesia (TTS), Daily.co (WebRTC) |
| Functional Dependencies | 1 | module-access, module-ai |
| Legacy Code Complexity | 2 | ~1500+ lines, ECS orchestration, WebSocket infrastructure |
| Business Logic | 1 | State machine (pending→ready→active→completed), business hours logic |
| **Total** | **8** | **Complex (32-40 hours)** |

### Classification: Complex

**Time Estimate:** 32-40 hours (12-16 sessions)

**Estimated Spec Size:**
- Technical Spec: ~2500 lines
- User UX Spec: ~1500 lines
- Admin UX Spec: ~1000 lines

---

## 3. Subordinate Specifications

This module specification is divided into separate documents for clarity and maintainability:

### 3.1 Technical Specification

**File:** `MODULE-VOICE-TECHNICAL-SPEC.md`

**Contains:**
- Data model & entity definitions (5 entities)
- Database schema & migrations
- API endpoints (request/response schemas)
- Core module integrations (access, ai, mgmt)
- External service integrations (Daily.co, ECS, SQS, S3)
- Backend implementation patterns
- Infrastructure requirements (Lambda, ECS, SQS)
- Backend testing requirements

**Status:** Draft

### 3.2 User UX Specification

**File:** `MODULE-VOICE-USER-UX-SPEC.md`

**Contains:**
- User personas & use cases
- User journey maps
- Page-by-page UI specifications (Interview list, session view, transcript viewer)
- Component library usage
- Real-time transcript streaming UI
- Mobile responsiveness requirements
- Accessibility requirements (WCAG 2.1 AA)
- Frontend testing requirements (user flows)

**Status:** Draft

### 3.3 Admin UX Specification

**File:** `MODULE-VOICE-ADMIN-UX-SPEC.md`

**Contains:**
- Admin personas & use cases
- Admin configuration flows
- Platform admin UI design (voice credentials, bot pool config)
- Organization admin UI design (interview configs)
- Monitoring & analytics interfaces
- Admin card design & integration
- Admin testing requirements

**Status:** Draft

---

## 4. High-Level Architecture

### 4.1 Entity Summary

| Entity | Purpose | Relationships |
|--------|---------|---------------|
| voice_sessions | Track interview sessions with Daily.co room details | belongs_to: org, has_many: voice_transcripts, voice_analytics |
| voice_transcripts | Store interview transcripts with S3 backup | belongs_to: voice_sessions |
| voice_configs | JSON-based Pipecat interview configurations | belongs_to: org |
| voice_credentials | Voice-specific service credentials (Daily/Deepgram/Cartesia) | belongs_to: org |
| voice_analytics | AI-generated interview analysis and scores | belongs_to: voice_sessions, voice_transcripts |

### 4.2 Integration Points

**Core Modules:**
- ✅ module-access - Authentication, authorization, database operations
- ✅ module-ai - OpenAI credentials for interview LLM
- ✅ module-mgmt - Health checks, admin card registration

**Functional Modules:**
- None - module-voice is self-contained

**External Systems:**
- Daily.co - WebRTC video room API
- ECS/Fargate - Pipecat bot container runtime
- SQS - Standby bot pool messaging
- S3 - Transcript archival storage
- AWS Secrets Manager - Credential storage

### 4.3 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Interview List  │  Session View  │  Transcript  │  Config Mgmt │
│  (SessionCard)   │  (Daily.co     │  (Viewer,    │  (ConfigForm,│
│                  │   iframe)      │   LivePanel) │   ConfigList)│
└────────┬─────────┴───────┬────────┴──────┬───────┴──────┬───────┘
         │                 │               │              │
         ▼                 ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (HTTP)                          │
├─────────────────────────────────────────────────────────────────┤
│  voice-sessions  │  voice-transcripts  │  voice-configs  │ ...  │
└────────┬─────────┴─────────┬───────────┴────────┬────────┴──────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Lambda Functions                          │
│  (access_common layer + voice-specific logic)                   │
└────────┬─────────────────────┬──────────────────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌──────────────────┐
│    Supabase     │   │    Daily.co     │   │   ECS/Fargate    │
│   (PostgreSQL)  │   │   (WebRTC)      │   │   (Pipecat Bot)  │
└─────────────────┘   └─────────────────┘   └────────┬─────────┘
                                                      │
                                            ┌─────────▼─────────┐
                                            │  WebSocket (WSS)  │
                                            │  Transcript Stream│
                                            └───────────────────┘
```

### 4.4 Session State Machine

```
┌─────────┐
│ pending │ ──── Session created, room not ready
└────┬────┘
     │ Daily.co room created
     ▼
┌─────────┐
│  ready  │ ──── Room ready, waiting for participant
└────┬────┘
     │ User joins + bot started
     ▼
┌─────────┐
│ active  │ ──── Interview in progress
└────┬────┘
     │
     ├──── Interview completed ──▶ ┌───────────┐
     │                             │ completed │
     ├──── Error occurred ───────▶ └───────────┘
     │                             ┌────────┐
     │                             │ failed │
     └──── User cancelled ───────▶ └────────┘
                                   ┌───────────┐
                                   │ cancelled │
                                   └───────────┘
```

---

## 5. Implementation Phases

### Phase 1: Discovery & Analysis ✅ COMPLETE
- [x] Source code analyzed
- [x] Entities identified (5 entities)
- [x] API endpoints mapped (10+ endpoints)
- [x] Dependencies identified (Daily.co, ECS, module-access, module-ai)
- [x] Complexity assessed (Score: 8 - Complex)
- [x] Specification documents created

**Time Spent:** ~4 hours

### Phase 2: Design Approval ⏳ IN PROGRESS
- [ ] Technical specification reviewed
- [ ] User UX specification reviewed
- [ ] Admin UX specification reviewed
- [ ] Dependencies validated
- [ ] Integration approach approved
- [ ] All specifications approved

**Estimated:** 2-3 hours

### Phase 3: Implementation 🔄 NOT STARTED

**Backend Implementation:**
- [ ] Module scaffolding generated (`./scripts/create-cora-module.sh voice sessions`)
- [ ] Database schema written (6 migrations)
- [ ] Lambda handlers implemented (5-7 Lambdas)
- [ ] Daily.co integration helpers
- [ ] ECS task runner helpers
- [ ] WebSocket handlers for real-time transcripts
- [ ] Core module integration complete

**Frontend Implementation:**
- [ ] Types defined (`VoiceSession`, `VoiceTranscript`, `VoiceConfig`, etc.)
- [ ] API client created (factory pattern)
- [ ] Custom hooks implemented (`useVoiceSessions`, `useVoiceSession`, `useRealTimeTranscript`)
- [ ] User components created (SessionCard, SessionList, TranscriptViewer, LiveTranscriptPanel)
- [ ] Admin components created (ConfigForm, ConfigList, CredentialManager)
- [ ] Interview room component (Daily.co embed)
- [ ] Admin cards created

**Infrastructure:**
- [ ] Terraform variables defined
- [ ] Lambda resources defined (5-7 functions)
- [ ] ECS task definition
- [ ] SQS queue for bot pool
- [ ] S3 bucket for transcripts
- [ ] IAM roles/policies created
- [ ] CloudWatch alarms added

**Documentation:**
- [ ] Module README created
- [ ] Configuration guide created
- [ ] API reference documented
- [ ] Deployment guide for ECS/Pipecat

**Estimated:** 24-30 hours

### Phase 4: Validation & Deployment 🔄 NOT STARTED
- [ ] API compliance check passed
- [ ] Frontend compliance check passed
- [ ] Dependency validation passed
- [ ] Schema validation passed
- [ ] Configuration validated
- [ ] Module registered
- [ ] Database deployed
- [ ] Infrastructure deployed
- [ ] ECS tasks operational
- [ ] End-to-end interview test passed

**Estimated:** 6-8 hours

---

## 6. Configuration Requirements

### Required Configuration

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| DAILY_API_KEY | string | Yes | - | Daily.co API key |
| DEEPGRAM_API_KEY | string | Yes | - | Deepgram STT API key |
| CARTESIA_API_KEY | string | Yes | - | Cartesia TTS API key |
| ECS_CLUSTER_NAME | string | Yes | - | ECS cluster for Pipecat bots |
| ECS_TASK_DEFINITION | string | Yes | - | Pipecat bot task definition ARN |
| TRANSCRIPT_BUCKET | string | Yes | - | S3 bucket for transcript storage |
| STANDBY_POOL_SIZE | number | No | 2 | Number of standby bots during business hours |
| BUSINESS_HOURS_START | string | No | "09:00" | Business hours start (UTC) |
| BUSINESS_HOURS_END | string | No | "17:00" | Business hours end (UTC) |

### Environment Variables

```bash
# Lambda environment variables
VOICE_ENABLED=true
DAILY_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
DEEPGRAM_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
CARTESIA_API_KEY_SECRET_ARN=arn:aws:secretsmanager:...
ECS_CLUSTER_NAME=cora-pipecat-cluster
ECS_TASK_DEFINITION_ARN=arn:aws:ecs:...
TRANSCRIPT_S3_BUCKET=cora-voice-transcripts
STANDBY_SQS_QUEUE_URL=https://sqs...
```

### Secrets

| Secret | Storage | Usage |
|--------|---------|-------|
| daily_api_key | AWS Secrets Manager | Daily.co API authentication |
| deepgram_api_key | AWS Secrets Manager | Deepgram STT authentication |
| cartesia_api_key | AWS Secrets Manager | Cartesia TTS authentication |

---

## 7. Migration Notes

### Legacy Code Mapping

| Legacy Component | New Component | Changes |
|------------------|---------------|---------|
| `lambdas/configs/lambda_function.py` | `backend/lambdas/voice-configs/lambda_function.py` | Use access_common layer |
| `lambdas/credentials/lambda_function.py` | `backend/lambdas/voice-credentials/lambda_function.py` | Filter to voice services only |
| `lambdas/sessions/lambda_function.py` | `backend/lambdas/voice-sessions/lambda_function.py` | Use access_common layer |
| `lambdas/transcripts/lambda_function.py` | `backend/lambdas/voice-transcripts/lambda_function.py` | Use access_common layer |
| `lambdas/voice-session/lambda_function.py` | `backend/lambdas/voice-session/lambda_function.py` | Core logic unchanged |
| `lambdas/websocket/*` | `backend/lambdas/voice-websocket/lambda_function.py` | Consolidate handlers |
| `interview_session` table | `voice_sessions` table | Rename, add RLS |
| `interview_transcript` table | `voice_transcripts` table | Rename, add RLS |
| `interview_config` table | `voice_configs` table | Rename, add RLS |
| `interview_ai_credentials` table | `voice_credentials` table | Filter to voice services |
| `interview_analytics` table | `voice_analytics` table | Rename, add RLS |

### Data Migration Strategy

1. Create new tables with CORA naming conventions
2. Migrate existing data with column mapping
3. Update foreign key references
4. Apply RLS policies
5. Deprecate legacy tables

### Breaking Changes

- [ ] API path changed: `/api/interview/*` → `/api/voice/*`
- [ ] Table names changed: `interview_*` → `voice_*`
- [ ] Authentication changed: API key → NextAuth JWT
- [ ] Response format changed: flat → `{success, data}` wrapper
- [ ] OpenAI credentials moved to module-ai

---

## 8. Success Criteria

### Functional Requirements
- [ ] Users can create voice interview sessions
- [ ] Sessions create Daily.co rooms with participant tokens
- [ ] ECS Pipecat bot starts and connects to room
- [ ] Real-time transcription streams via WebSocket
- [ ] Transcripts stored in database and S3
- [ ] Analytics generated after interview completion
- [ ] Org admins can manage interview configurations
- [ ] Platform admins can manage voice credentials
- [ ] Standby bot pool reduces cold start latency

### Non-Functional Requirements
- [ ] Session creation < 2 seconds
- [ ] Bot start (with standby) < 5 seconds
- [ ] Transcript streaming latency < 500ms
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
| ECS cold start latency | High | Medium | Implement standby bot pool with SQS |
| Daily.co API rate limits | Medium | Low | Add retry logic with exponential backoff |
| WebSocket connection stability | Medium | Medium | Implement reconnection logic, heartbeat |
| Pipecat bot crashes | High | Low | Add health monitoring, auto-restart |
| Transcript S3 costs | Low | Low | Implement lifecycle policies, compression |
| Multi-tenant credential isolation | High | Low | Use AWS Secrets Manager with proper IAM |

### Dependencies Risks

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Daily.co | Service outage | Implement graceful degradation, status monitoring |
| Deepgram | STT quality issues | Allow fallback configuration |
| ECS/Fargate | Container availability | Use multiple AZs, standby pool |
| module-access | Breaking changes | Pin version, integration tests |
| module-ai | API changes | Use stable interface, version checks |

---

## 10. Related Documentation

**CORA Standards:**
- [CORA Module Development Process](../../guides/guide_CORA-MODULE-DEVELOPMENT-PROCESS.md)
- [Module Dependencies Standard](../../standards/standard_MODULE-DEPENDENCIES.md)
- [Module Registration Standard](../../standards/standard_MODULE-REGISTRATION.md)
- [CORA Frontend Standard](../../standards/standard_CORA-FRONTEND.md)
- [Admin Card Pattern](../../standards/standard_ADMIN-CARD-PATTERN.md)
- [Lambda Route Docstring Standard](../../standards/standard_LAMBDA-ROUTE-DOCSTRING.md)

**This Module:**
- [Technical Specification](./MODULE-VOICE-TECHNICAL-SPEC.md)
- [User UX Specification](./MODULE-VOICE-USER-UX-SPEC.md)
- [Admin UX Specification](./MODULE-VOICE-ADMIN-UX-SPEC.md)

**Implementation Plan:**
- [Module Voice Implementation Plan](../../plans/plan_module-voice-implementation.md)

---

## 11. Approval Sign-Off

### Technical Review

**Reviewer:** [Pending]  
**Date:** [Pending]  
**Status:** Pending  
**Comments:** [Pending]

### UX Review

**Reviewer:** [Pending]  
**Date:** [Pending]  
**Status:** Pending  
**Comments:** [Pending]

### Final Approval

**Approver:** [Pending]  
**Date:** [Pending]  
**Status:** Pending  
**Comments:** [Pending]

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026  
**Author:** AI (Claude)  
**Specification Type:** Parent (references subordinate specs)
