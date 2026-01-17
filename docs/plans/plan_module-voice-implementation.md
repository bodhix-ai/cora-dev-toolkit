# Module-Voice Implementation Plan

**Status**: 🔄 IN PROGRESS (Phase 1 - Discovery)  
**Priority**: HIGH (Voice interview capabilities for STS Career)  
**Module Type**: Functional Module  
**Template Location**: `templates/_modules-functional/module-voice/`  
**Dependencies**: module-access, module-ai, module-mgmt  
**Estimated Duration**: 12-16 sessions (~36-48 hours)  
**Complexity**: COMPLEX (Score: 8)

---

## Executive Summary

Implement a CORA-compliant Voice module derived from the legacy `ai-interview-module` in `sts-career-stack`. This module provides AI-powered voice interview capabilities with Daily.co WebRTC rooms, real-time transcription, and ECS-based Pipecat bot orchestration.

---

## Source Material

**Legacy Location**: `~/code/sts/career/sts-career-stack/packages/ai-interview-module/`

**Key Components to Migrate**:
- 7 Lambda functions: configs, credentials, sessions, transcripts, voice-preview, voice-session, websocket/*
- 5 Database tables: interview_session, interview_transcript, interview_config, interview_ai_credentials, interview_analytics
- Frontend: ConfigForm, ConfigList, InterviewList, SessionCard, TranscriptViewer, LiveTranscriptPanel
- Infrastructure: Daily.co rooms, ECS/Fargate for Pipecat bot, SQS standby pool, S3 transcript storage

**Infrastructure Location**: `~/code/sts/career/sts-career-infra/terraform/`

---

## Complexity Assessment

| Factor | Score | Reasoning |
|--------|-------|-----------|
| Entity Count | 2 | 5 entities (sessions, transcripts, configs, credentials, analytics) |
| AI Integration | 2 | Multiple AI services: OpenAI, Deepgram, Cartesia, Daily.co |
| Functional Dependencies | 1 | module-access, module-ai |
| Legacy Code Complexity | 2 | ~1500+ lines, ECS orchestration, WebSocket infrastructure |
| Business Logic | 1 | State machine (pending→ready→active→completed), business hours logic |
| **Total** | **8** | **Complex (32-40 hours)** |

---

## CORA Module Dependencies

### Core Module Dependencies (Required)

| Module | Usage | Legacy Adaptation |
|--------|-------|-------------------|
| **module-access** | Authentication, user/org context, DB operations | Replace `org_common` with `access_common` layer |
| **module-ai** | AI provider management (OpenAI for LLM) | Use module-ai for OpenAI credentials |
| **module-mgmt** | Health checks, module registration | Add module registration & admin card |

### Functional Module Dependencies

None - module-voice is self-contained.

### External Service Dependencies (Unchanged)

| Service | Purpose | Notes |
|---------|---------|-------|
| **Daily.co** | WebRTC video rooms | Direct API integration |
| **ECS/Fargate** | Pipecat bot runtime | Container orchestration |
| **SQS** | Standby bot pool | Business hours optimization |
| **S3** | Transcript archival | Document storage |
| **AWS Secrets Manager** | Credential storage | Voice-specific services |

---

## Database Table Mapping

| Legacy Table | New CORA Table | Naming Notes |
|--------------|----------------|--------------|
| `interview_session` | `voice_sessions` | Plural form, `voice_` prefix |
| `interview_transcript` | `voice_transcripts` | Plural form, `voice_` prefix |
| `interview_config` | `voice_configs` | Plural form, `voice_` prefix |
| `interview_ai_credentials` | `voice_credentials` | Simplified name (Daily/Deepgram/Cartesia only) |
| `interview_analytics` | `voice_analytics` | Plural form, `voice_` prefix |

**Note**: OpenAI credentials should migrate to module-ai; voice_credentials retains voice-specific services only.

---

## Lambda Function Mapping

| Legacy Lambda | New Lambda | Changes |
|---------------|------------|---------|
| `configs` | `voice-configs` | Use `access_common` layer |
| `credentials` | `voice-credentials` | Filter to voice-specific services |
| `sessions` | `voice-sessions` | Use `access_common` layer |
| `transcripts` | `voice-transcripts` | Use `access_common` layer |
| `voice-preview` | `voice-preview` | Minimal changes |
| `voice-session` | `voice-session` | Core logic unchanged, CORA patterns |
| `websocket/*` | `voice-websocket/*` | Include in module |

---

## Phase 0: Prerequisites

**Duration**: N/A (Assumed complete for CORA projects)

### System Prerequisites

- [x] Module registration system ready
- [x] Core modules available (module-access, module-ai, module-mgmt)
- [x] Development environment configured

### Input Prerequisites

- [x] Legacy codebase identified (`~/code/sts/career/sts-career-stack/packages/ai-interview-module/`)
- [x] Access to source code repository
- [x] Understanding of business requirements

### Tools & Templates

- [x] `cora-dev-toolkit` cloned and updated
- [x] `scripts/create-cora-module.sh` available
- [x] `templates/_module-template/` exists
- [x] `docs/standards/` documentation reviewed

---

## Phase 1: Discovery & Analysis ✅ IN PROGRESS

**Duration**: 2 sessions (~6 hours)  
**Status**: 🔄 Analysis complete, specifications pending

### 1.1 Source Analysis ✅ COMPLETE

- [x] Identify all Lambda functions (7 found)
- [x] Extract database tables and columns (5 tables)
- [x] Map HTTP endpoints to handlers
- [x] Identify business logic patterns (state machine, ECS orchestration)
- [x] List external dependencies (Daily.co, ECS, SQS, S3)
- [x] Find data relationships

### 1.2 Entities Identified ✅ COMPLETE

#### 1. voice_sessions (Voice Session)
- **Purpose**: Tracks voice interview sessions with Daily.co room details
- **Database Table**: `voice_sessions` (plural)
- **API Type**: `VoiceSession` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to orgs)
  - candidate_name (VARCHAR, optional)
  - candidate_email (VARCHAR, optional)
  - interview_type (VARCHAR, required)
  - status (VARCHAR, enum: pending/ready/active/completed/failed/cancelled)
  - daily_room_url (TEXT)
  - daily_room_name (VARCHAR)
  - daily_room_token (TEXT)
  - session_metadata (JSONB)
  - started_at, completed_at, duration_seconds
  - created_at, updated_at, created_by, updated_by
- **Relationships**:
  - belongs_to: orgs
  - has_many: voice_transcripts, voice_analytics
- **Business Rules**:
  - Status transitions: pending → ready → active → completed/failed/cancelled
  - Daily.co room created on session creation
  - ECS bot started when session activates

#### 2. voice_transcripts (Voice Transcript)
- **Purpose**: Stores interview transcripts with database and S3 storage
- **Database Table**: `voice_transcripts` (plural)
- **API Type**: `VoiceTranscript` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to orgs)
  - session_id (UUID, foreign key to voice_sessions)
  - transcript_text (TEXT)
  - transcript_s3_url (TEXT, optional)
  - candidate_name (VARCHAR, denormalized)
  - interview_type (VARCHAR, denormalized)
  - summary (TEXT, AI-generated)
  - metadata (JSONB)
  - created_at, updated_at, created_by, updated_by
- **Relationships**:
  - belongs_to: voice_sessions
- **Business Rules**:
  - Created when interview completes
  - S3 URL for backup/archival

#### 3. voice_configs (Voice Configuration)
- **Purpose**: JSON-based interview configurations per organization
- **Database Table**: `voice_configs` (plural)
- **API Type**: `VoiceConfig` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to orgs)
  - name (VARCHAR, required)
  - interview_type (VARCHAR, required)
  - description (TEXT)
  - config_json (JSONB, required) - Pipecat configuration
  - is_active (BOOLEAN)
  - created_at, updated_at, created_by, updated_by
- **Relationships**:
  - belongs_to: orgs
- **Business Rules**:
  - Unique name per organization
  - config_json contains full Pipecat interview configuration

#### 4. voice_credentials (Voice AI Credentials)
- **Purpose**: Voice-specific AI service credentials (Daily.co, Deepgram, Cartesia)
- **Database Table**: `voice_credentials` (plural)
- **API Type**: `VoiceCredential` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to orgs)
  - service_name (VARCHAR: daily/deepgram/cartesia)
  - credentials_secret_arn (TEXT, AWS Secrets Manager ARN)
  - config_metadata (JSONB)
  - is_active (BOOLEAN)
  - created_at, updated_at, created_by, updated_by
- **Relationships**:
  - belongs_to: orgs
- **Business Rules**:
  - One credential per service per org (UNIQUE constraint)
  - Actual credentials stored in AWS Secrets Manager
  - OpenAI credentials managed via module-ai instead

#### 5. voice_analytics (Voice Analytics)
- **Purpose**: AI-generated interview analysis, scores, and recommendations
- **Database Table**: `voice_analytics` (plural)
- **API Type**: `VoiceAnalytics` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - org_id (UUID, foreign key to orgs)
  - session_id (UUID, foreign key to voice_sessions)
  - transcript_id (UUID, foreign key to voice_transcripts)
  - score (NUMERIC, 0-100)
  - strengths (TEXT[])
  - weaknesses (TEXT[])
  - recommendations (TEXT[])
  - detailed_analysis (JSONB)
  - created_at, updated_at, created_by
- **Relationships**:
  - belongs_to: voice_sessions, voice_transcripts
- **Business Rules**:
  - Generated after transcript processing
  - AI-driven analysis

### 1.3 API Endpoint Design ✅ COMPLETE

**Endpoint Structure**:
```
/api/voice/sessions            - Session CRUD
/api/voice/sessions/{id}       - Session by ID
/api/voice/sessions/{id}/start - Start bot for session
/api/voice/configs             - Config CRUD
/api/voice/configs/{id}        - Config by ID
/api/voice/credentials         - Credentials CRUD
/api/voice/credentials/{id}    - Credential by ID
/api/voice/transcripts         - Transcript list
/api/voice/transcripts/{id}    - Transcript by ID
/api/voice/analytics/{id}      - Analytics by session
```

### 1.4 CORA Integration Analysis ✅ COMPLETE

**module-access Integration (Heavy)**:
- Replace `org_common` imports with `access_common`
- Use `get_user_from_event()`, `get_supabase_user_id_from_external_uid()`
- Use `find_one()`, `find_many()`, `insert_one()`, `update_one()`
- Use standard response functions

**module-ai Integration (Medium)**:
- OpenAI credentials via `ai.get_org_ai_config(org_id)`
- Voice-specific services (Daily/Deepgram/Cartesia) remain in voice_credentials

**module-mgmt Integration (Light)**:
- Health check endpoint
- Module registration

### 1.5 Module Specification Documents 🔄 PENDING

**Location**: `docs/specifications/module-voice/`

- [ ] Create specification directory structure
- [ ] Write `MODULE-VOICE-SPEC.md` (parent specification)
- [ ] Write `MODULE-VOICE-TECHNICAL-SPEC.md`
- [ ] Write `MODULE-VOICE-USER-UX-SPEC.md`
- [ ] Write `MODULE-VOICE-ADMIN-UX-SPEC.md`

**Deliverables**:
- 4 specification documents (~4000+ lines total)

---

## Phase 2: Design Approval

**Duration**: 1 session (~2-3 hours)  
**Status**: 🔵 PENDING (awaiting Phase 1 completion)

### 2.1 Specification Review

- [ ] Technical specification reviewed
- [ ] User UX specification reviewed
- [ ] Admin UX specification reviewed
- [ ] Dependencies validated
- [ ] Integration approach approved

### 2.2 Approval Checklist

- [ ] Module purpose clear
- [ ] Entities well-defined
- [ ] API design appropriate
- [ ] Scope appropriate
- [ ] Core dependencies included (access, ai, mgmt)
- [ ] No circular dependencies
- [ ] ECS/Daily.co integration approach clear
- [ ] Database schema appropriate
- [ ] Time estimate realistic

---

## Phase 3: Implementation

**Duration**: 8-10 sessions (~24-30 hours)  
**Status**: 🔵 PENDING

### 3.1 Module Scaffolding (Session 1)

- [ ] Run `./scripts/create-cora-module.sh voice sessions`
- [ ] Update `module.json` with dependencies
- [ ] Configure module.config.yaml

### 3.2 Database Schema (Sessions 2-3)

**Files to create in `db/schema/`**:

- [ ] `001-voice-sessions.sql` - Session table + indexes + RLS
- [ ] `002-voice-transcripts.sql` - Transcript table + indexes + RLS
- [ ] `003-voice-configs.sql` - Config table + indexes + RLS
- [ ] `004-voice-credentials.sql` - Credentials table + indexes + RLS
- [ ] `005-voice-analytics.sql` - Analytics table + indexes + RLS
- [ ] `006-voice-rpc-functions.sql` - Shared RPC functions

### 3.3 Backend Implementation (Sessions 4-6)

**Lambda Functions**:

- [ ] `backend/lambdas/voice-sessions/lambda_function.py`
  - POST /api/voice/sessions - Create session
  - GET /api/voice/sessions - List sessions
  - GET /api/voice/sessions/{id} - Get session
  - PUT /api/voice/sessions/{id} - Update session
  - DELETE /api/voice/sessions/{id} - Delete session
  - POST /api/voice/sessions/{id}/start - Start bot

- [ ] `backend/lambdas/voice-configs/lambda_function.py`
  - CRUD operations for interview configurations

- [ ] `backend/lambdas/voice-credentials/lambda_function.py`
  - CRUD operations for voice service credentials

- [ ] `backend/lambdas/voice-transcripts/lambda_function.py`
  - List, get, delete transcripts

- [ ] `backend/lambdas/voice-websocket/lambda_function.py`
  - WebSocket handlers for real-time transcript streaming

**Daily.co Integration**:
- [ ] Room creation helper
- [ ] Token generation helper
- [ ] Room cleanup helper

**ECS/Fargate Integration**:
- [ ] ECS task definition
- [ ] Task runner helper
- [ ] Standby pool (SQS) integration

### 3.4 Frontend Implementation (Sessions 7-8)

**Types**:
- [ ] `frontend/types/index.ts` - VoiceSession, VoiceConfig, VoiceTranscript, etc.

**API Client**:
- [ ] `frontend/lib/api.ts` - API functions with factory pattern

**Hooks**:
- [ ] `frontend/hooks/useVoiceSessions.ts`
- [ ] `frontend/hooks/useVoiceConfigs.ts`
- [ ] `frontend/hooks/useVoiceTranscripts.ts`
- [ ] `frontend/hooks/useVoiceSession.ts` (single session with Daily.co)
- [ ] `frontend/hooks/useRealTimeTranscript.ts` (WebSocket)

**Components**:
- [ ] `frontend/components/sessions/` - SessionCard, SessionList
- [ ] `frontend/components/configs/` - ConfigForm, ConfigList
- [ ] `frontend/components/transcripts/` - TranscriptViewer, LiveTranscriptPanel
- [ ] `frontend/components/interview/` - InterviewRoom (Daily.co embed)

### 3.5 Infrastructure (Session 9)

**Terraform files in `infrastructure/`**:

- [ ] `versions.tf` - Terraform >= 1.5.0
- [ ] `variables.tf` - Required variables
- [ ] `main.tf` - Lambda, IAM, S3, SQS, ECS resources
- [ ] `outputs.tf` - API routes for APIGW integration
- [ ] `README.md` - Infrastructure documentation

**Critical Resources**:
- Lambda functions (5+)
- S3 bucket for transcripts
- SQS queue for bot pool
- ECS cluster/task definition (if creating new)
- IAM roles with Daily.co/ECS permissions

### 3.6 Module Configuration (Session 10)

- [ ] `module.config.yaml` with navigation and admin card
- [ ] Admin page routes
- [ ] User page routes
- [ ] Icon integration

---

## Phase 4: Validation & Deployment

**Duration**: 2 sessions (~6-8 hours)  
**Status**: 🔵 PENDING

### 4.1 Compliance Checks

- [ ] API response validator: 0 violations
- [ ] Frontend compliance validator: 0 violations
- [ ] Structure validator: 0 violations
- [ ] Database naming validator: 0 violations

### 4.2 Integration Testing

- [ ] Create test project with module-voice
- [ ] Deploy infrastructure
- [ ] Test session creation
- [ ] Test Daily.co room creation
- [ ] Test ECS bot startup
- [ ] Test real-time transcription
- [ ] Test transcript storage
- [ ] Test analytics generation

### 4.3 Documentation

- [ ] Module README.md
- [ ] Configuration guide
- [ ] API reference
- [ ] Deployment guide

---

## Success Criteria

### Functional Requirements

- [ ] Users can create voice interview sessions
- [ ] Sessions create Daily.co rooms with tokens
- [ ] ECS Pipecat bot starts and connects to room
- [ ] Real-time transcription works via WebSocket
- [ ] Transcripts stored in database and S3
- [ ] Analytics generated after interview completion
- [ ] Org admins can manage interview configurations
- [ ] Platform admins can manage voice credentials

### Technical Requirements

- [ ] All Lambda functions have CORA-compliant route docstrings
- [ ] Database schema follows CORA naming conventions (plural tables)
- [ ] API responses use camelCase
- [ ] RLS policies enforce multi-tenant access control
- [ ] Terraform uses `source_code_hash` for code change detection
- [ ] Lambda runtime is Python 3.11
- [ ] org_id comes from query parameters

### Validation Requirements

- [ ] API response validator: 0 violations
- [ ] Frontend compliance validator: 0 violations
- [ ] Structure validator: 0 violations
- [ ] All tests passing in test project

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ECS cold start latency | HIGH | Implement standby bot pool with SQS |
| Daily.co API rate limits | MEDIUM | Add retry logic with exponential backoff |
| WebSocket connection stability | MEDIUM | Implement reconnection logic, heartbeat |
| Pipecat bot crashes | HIGH | Add health monitoring, auto-restart |
| Transcript S3 costs | LOW | Implement lifecycle policies, compression |
| Multi-tenant credential isolation | HIGH | Use AWS Secrets Manager with proper IAM |

---

## Open Questions

1. **Standby Pool Scope**: Should standby bot pool be per-org or platform-wide?
   - **Decision**: Start platform-wide, add org-level if needed

2. **Transcript Retention**: How long to keep transcripts?
   - **Decision**: 90 days default, configurable per org

3. **ECS vs Lambda**: Should Pipecat bot run in ECS or Lambda container?
   - **Decision**: Keep ECS (proven pattern from legacy)

4. **WebSocket Infrastructure**: Part of module-voice or separate module?
   - **Decision**: Include in module-voice (voice-specific)

---

## Integration Patterns

### Integration with module-ai

**OpenAI Credentials**:
```python
import ai_common as ai

# Get org's AI config for OpenAI (LLM for interview)
ai_config = ai.get_org_ai_config(org_id)
openai_key = ai.get_provider_credentials(org_id, 'openai')
```

### Integration with module-access

**User/Org Context**:
```python
import access_common as access

# Extract user from event
user_info = access.get_user_from_event(event)
user_id = access.get_supabase_user_id_from_external_uid(user_info['user_id'])

# Verify org membership
membership = access.find_one('org_members', {'org_id': org_id, 'user_id': user_id, 'active': True})
```

### External Service Integration

**Daily.co Room Creation**:
```python
import requests

def create_daily_room(session_id, config):
    response = requests.post(
        'https://api.daily.co/v1/rooms',
        headers={'Authorization': f'Bearer {daily_api_key}'},
        json={'properties': {...}}
    )
    return response.json()
```

**ECS Task Launch**:
```python
import boto3

def start_ecs_task(room_url, session_id, config):
    ecs = boto3.client('ecs')
    response = ecs.run_task(
        cluster=cluster_name,
        taskDefinition=task_definition,
        launchType='FARGATE',
        overrides={'containerOverrides': [...]}
    )
    return response['tasks'][0]['taskArn']
```

---

## Navigation Integration

**Left Navigation for Voice**:
- All users get "Voice Interviews" link in left navigation
- Clicking navigates to `/voice` (interview list)
- Individual interviews accessible via `/voice/sessions/[id]`

**Left Nav Structure**:
```
Main Navigation
├── Dashboard
├── Workspaces
├── Voice Interviews ← NEW (module-voice)
└── Settings
```

**Admin Navigation**:
- Org Admin: "Voice Settings" → `/admin/org/voice`
- Platform Admin: "Voice Configuration" → `/admin/sys/voice`

---

## Next Steps

1. **Immediate**: Generate 4 specification documents
2. **Phase 2**: Human review and approval of specifications
3. **Phase 3**: Begin implementation following approved specs
4. **Phase 4**: Validation and deployment to test environment

---

**Status**: 🔄 IN PROGRESS (Phase 1 - Specifications pending)  
**Last Updated**: January 16, 2026  
**Branch**: `module-voice-dev`  
**Next Review**: After specification documents are generated
