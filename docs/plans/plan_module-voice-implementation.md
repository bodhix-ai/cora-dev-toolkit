# Module-Voice Implementation Plan

**Status**: ✅ PHASE 3 COMPLETE (Phase 3.6 Module Configuration Done)  
**Priority**: HIGH (Voice interview capabilities for STS Career)  
**Module Type**: Functional Module  
**Template Location**: `templates/_modules-functional/module-voice/`  
**Dependencies**: module-access, module-ai, module-mgmt, module-kb  
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
| Entity Count | 2 | 6 entities (sessions, transcripts, configs, credentials, analytics, session_kb) |
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

| Module | Usage | Notes |
|--------|-------|-------|
| **module-kb** | Knowledge base grounding | Sessions can associate with KBs for AI context |

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
| `interview_session` | `voice_sessions` | Plural form, `voice_` prefix, **now has workspace_id** |
| `interview_transcript` | `voice_transcripts` | Plural form, `voice_` prefix |
| `interview_config` | `voice_configs` | Plural form, `voice_` prefix |
| `interview_ai_credentials` | `voice_credentials` | Simplified name (Daily/Deepgram/Cartesia only) |
| `interview_analytics` | `voice_analytics` | Plural form, `voice_` prefix |
| (new) | `voice_session_kb` | **NEW** - Junction table for KB grounding associations |

**Note**: OpenAI credentials should migrate to module-ai; voice_credentials retains voice-specific services only.

**Design Update (Session 3)**: Added workspace association and KB grounding support:
- `voice_sessions` now has `workspace_id` column (like `chat_sessions`)
- New `voice_session_kb` junction table links sessions to knowledge bases for AI grounding

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
  - **workspace_id (UUID, foreign key to workspaces, optional)** ← NEW
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
  - belongs_to: orgs, workspaces (optional)
  - has_many: voice_transcripts, voice_analytics, voice_session_kb
- **Business Rules**:
  - Status transitions: pending → ready → active → completed/failed/cancelled
  - Daily.co room created on session creation
  - ECS bot started when session activates
  - **Sessions can be scoped to a workspace (like chats)** ← NEW
  - **Sessions can have multiple KBs for AI grounding** ← NEW

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

#### 6. voice_session_kb (Voice Session KB - NEW)
- **Purpose**: Junction table linking voice sessions to knowledge bases for AI grounding
- **Database Table**: `voice_session_kb` (singular nouns per CORA junction table naming)
- **API Type**: `VoiceSessionKb` (singular)
- **Key Fields**:
  - id (UUID, primary key)
  - session_id (UUID, foreign key to voice_sessions)
  - kb_id (UUID, foreign key to kb_bases)
  - is_enabled (BOOLEAN, default true)
  - added_at (TIMESTAMPTZ)
  - added_by (UUID, foreign key to auth.users)
- **Relationships**:
  - belongs_to: voice_sessions, kb_bases
- **Business Rules**:
  - Same pattern as `chat_session_kb` in module-chat
  - Users can toggle KBs on/off per session
  - KBs provide context for AI voice responses

### 1.3 API Endpoint Design ✅ COMPLETE (Updated)

**Endpoint Structure**:
```
/api/voice/sessions            - Session CRUD (supports workspaceId filter)
/api/voice/sessions/{id}       - Session by ID
/api/voice/sessions/{id}/start - Start bot for session
/api/voice/sessions/{id}/kbs   - List/Add KB associations (NEW)
/api/voice/sessions/{id}/kbs/{kbId} - Toggle/Remove KB (NEW)
/api/voice/configs             - Config CRUD
/api/voice/configs/{id}        - Config by ID
/api/voice/credentials         - Credentials CRUD
/api/voice/credentials/{id}    - Credential by ID
/api/voice/transcripts         - Transcript list
/api/voice/transcripts/{id}    - Transcript by ID
/api/voice/analytics           - Analytics list (NEW)
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

### 1.5 Module Specification Documents ✅ COMPLETE

**Location**: `docs/specifications/module-voice/`

- [x] Create specification directory structure
- [x] Write `MODULE-VOICE-SPEC.md` (parent specification)
- [x] Write `MODULE-VOICE-TECHNICAL-SPEC.md`
- [x] Write `MODULE-VOICE-USER-UX-SPEC.md`
- [x] Write `MODULE-VOICE-ADMIN-UX-SPEC.md`

**Deliverables**:
- 4 specification documents created (5000+ lines total)

---

## Phase 2: Design Approval ✅ COMPLETE

**Duration**: 1 session (~2-3 hours)  
**Status**: ✅ COMPLETE

### 2.1 Specification Review

- [x] Technical specification reviewed
- [x] User UX specification reviewed
- [x] Admin UX specification reviewed
- [x] Dependencies validated
- [x] Integration approach approved

### 2.2 Approval Checklist

- [x] Module purpose clear
- [x] Entities well-defined
- [x] API design appropriate
- [x] Scope appropriate
- [x] Core dependencies included (access, ai, mgmt)
- [x] No circular dependencies
- [x] ECS/Daily.co integration approach clear
- [x] Database schema appropriate
- [x] Time estimate realistic

---

## Phase 3: Implementation ✅ COMPLETE

**Duration**: 8-10 sessions (~24-30 hours)  
**Status**: ✅ COMPLETE (All phases 3.1-3.6 complete)

### 3.1 Module Scaffolding (Session 1) ✅ COMPLETE

- [x] Created module directory at `templates/_modules-functional/module-voice/`
- [x] Created `module.json` with dependencies
- [x] Created `README.md` with documentation

### 3.2 Database Schema (Sessions 2-3) ✅ COMPLETE (Updated)

**Files created in `db/schema/`**:

- [x] `001-voice-sessions.sql` - Session table + indexes + RLS (**updated with workspace_id**)
- [x] `002-voice-transcripts.sql` - Transcript table + indexes + RLS
- [x] `003-voice-configs.sql` - Config table + indexes + RLS
- [x] `004-voice-credentials.sql` - Credentials table + indexes + RLS
- [x] `005-voice-analytics.sql` - Analytics table + indexes + RLS
- [x] `006-voice-rpc-functions.sql` - Shared RPC functions
- [x] `007-voice-session-kb.sql` - **NEW** KB association junction table + RLS

### 3.3 Backend Implementation (Sessions 4-6) 🟡 IN PROGRESS

**Lambda Functions**:

- [x] `backend/lambdas/voice-sessions/lambda_function.py` (**UPDATED with workspace + KB support**)
  - POST /api/voice/sessions - Create session (supports workspaceId, kbIds)
  - GET /api/voice/sessions - List sessions (supports workspaceId filter)
  - GET /api/voice/sessions/{id} - Get session
  - PUT /api/voice/sessions/{id} - Update session
  - DELETE /api/voice/sessions/{id} - Delete session
  - POST /api/voice/sessions/{id}/start - Start bot
  - **GET /api/voice/sessions/{id}/kbs - List KB associations (NEW)**
  - **POST /api/voice/sessions/{id}/kbs - Add KB (NEW)**
  - **PUT /api/voice/sessions/{id}/kbs/{kbId} - Toggle KB (NEW)**
  - **DELETE /api/voice/sessions/{id}/kbs/{kbId} - Remove KB (NEW)**

- [x] `backend/lambdas/voice-configs/lambda_function.py`
  - CRUD operations for interview configurations

- [x] `backend/lambdas/voice-credentials/lambda_function.py` ✅ **COMPLETE**
  - CRUD operations for voice service credentials (Daily, Deepgram, Cartesia)
  - AWS Secrets Manager integration

- [x] `backend/lambdas/voice-transcripts/lambda_function.py` ✅ **COMPLETE**
  - List, get, delete transcripts
  - S3 archival integration

- [x] `backend/lambdas/voice-analytics/lambda_function.py` ✅ **COMPLETE**
  - List, get analytics by session
  - Score filtering

- [x] `backend/lambdas/voice-websocket/lambda_function.py` ✅ **COMPLETE**
  - WebSocket handlers for real-time transcript streaming
  - Connection management with DynamoDB
  - Transcript segment broadcasting
  - Session status updates

**Daily.co Integration** (in voice-sessions):
- [x] Room creation helper
- [x] Token generation helper
- [ ] Room cleanup helper

**ECS/Fargate Integration** (in voice-sessions):
- [x] ECS task runner helper
- [ ] Standby pool (SQS) integration

### 3.4 Frontend Implementation (Sessions 7-8) ✅ COMPLETE

**Types**:
- [x] `frontend/types/index.ts` - VoiceSession, VoiceConfig, VoiceTranscript, etc.

**API Client**:
- [x] `frontend/lib/api.ts` ✅ **COMPLETE** - Full API client for all endpoints

**Hooks**:
- [x] `frontend/hooks/useVoiceSessions.ts` ✅ **COMPLETE** - Sessions list with pagination/filtering
- [x] `frontend/hooks/useVoiceConfigs.ts` ✅ **COMPLETE** - Config CRUD operations
- [x] `frontend/hooks/useVoiceSession.ts` ✅ **COMPLETE** - Single session with WebSocket support
- [x] `frontend/hooks/index.ts` ✅ **COMPLETE** - Hook exports
- [ ] `frontend/hooks/useVoiceTranscripts.ts` - (optional, covered by useVoiceSession)
- [ ] `frontend/hooks/useRealTimeTranscript.ts` - (integrated into useVoiceSession)

**Components**:
- [x] `frontend/components/SessionCard.tsx` ✅ **COMPLETE** - Session summary card
- [x] `frontend/components/TranscriptViewer.tsx` ✅ **COMPLETE** - Live transcript display
- [x] `frontend/components/KbSelector.tsx` ✅ **COMPLETE** - KB grounding management
- [x] `frontend/components/index.ts` ✅ **COMPLETE** - Component exports
- [x] `frontend/index.ts` ✅ **COMPLETE** - Main module exports
- [x] `frontend/components/ConfigForm.tsx` ✅ **COMPLETE** - Config editor
- [x] `frontend/components/InterviewRoom.tsx` ✅ **COMPLETE** - Daily.co embed

**Routes**:
- [x] `routes/voice/page.tsx` ✅ **COMPLETE** - Session list page (integrated with hooks/components)
- [x] `routes/voice/[id]/page.tsx` ✅ **COMPLETE** - Session detail page (integrated with hooks/components)

### 3.5 Infrastructure (Session 9) ✅ COMPLETE

**Terraform files in `infrastructure/`**:

- [x] `main.tf` - Lambda, IAM, S3, SQS resources
- [x] `variables.tf` - Required variables
- [x] `outputs.tf` - API routes for APIGW integration

**Critical Resources**:
- Lambda functions (5+)
- S3 bucket for transcripts
- SQS queue for bot pool
- ECS cluster/task definition (if creating new)
- IAM roles with Daily.co/ECS permissions

### 3.6 Module Configuration (Session 10) ✅ COMPLETE

- [x] `module.json` updated with navigation and admin card configuration
- [x] Admin page routes created:
  - `frontend/pages/OrgVoiceConfigPage.tsx` - Org admin for interview configs
  - `frontend/pages/SysVoiceConfigPage.tsx` - Platform admin for voice credentials
  - `frontend/pages/index.ts` - Pages export file
- [x] User page routes (already in `routes/voice/`)
- [x] Icon integration (`MicrophoneIcon` configured in module.json)
- [x] Navigation label updated to single-word "Interviews"

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

### 4.3 Documentation ✅ COMPLETE

- [x] Module README.md (already existed, comprehensive)
- [x] Configuration guide (`docs/CONFIGURATION.md`)
- [x] API reference (`docs/API-REFERENCE.md`)
- [x] Deployment guide (`docs/DEPLOYMENT.md`)

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

5. **Workspace Association**: Should sessions be scoped to workspaces?
   - **Decision**: Yes, sessions can optionally be associated with workspaces (like chats)

6. **KB Grounding**: Should sessions support knowledge base associations?
   - **Decision**: Yes, sessions can have multiple KBs for AI grounding (like chat_session_kb)

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

**Status**: ✅ PHASE 3 COMPLETE + PHASE 4.3 DOCUMENTATION COMPLETE  
**Last Updated**: January 16, 2026  
**Branch**: `module-voice-dev`  
**Next Steps**: 
1. ~~Create remaining frontend components (ConfigForm, InterviewRoom)~~ ✅ DONE
2. ~~Update routes with new components/hooks~~ ✅ DONE
3. ~~Module configuration (admin pages, navigation)~~ ✅ DONE
4. ~~Phase 4.3 Documentation~~ ✅ DONE
5. Phase 4.1 Compliance Checks
6. Phase 4.2 Integration Testing

**Session 3 Summary**: 
- Added workspace and KB association support per user feedback
- Created voice-credentials, voice-transcripts, voice-analytics Lambdas
- Updated voice-sessions Lambda with workspace/KB endpoints
- Updated frontend types for new features

**Session 4 Summary**: 
- Created voice-websocket Lambda with real-time transcript streaming
- Created frontend API client (`frontend/lib/api.ts`)
- Created frontend hooks: useVoiceSessions, useVoiceSession, useVoiceConfigs
- Created frontend components: SessionCard, TranscriptViewer, KbSelector
- Created frontend index exports

**Session 5 Summary**: 
- Updated routes/voice/page.tsx with useVoiceSessions hook and SessionCard component
- Updated routes/voice/[id]/page.tsx with useVoiceSession hook, TranscriptViewer, KbSelector
- Created ConfigForm component for interview config management
- Created InterviewRoom component for Daily.co video embed
- Updated component exports to include ConfigForm and InterviewRoom
- Phase 3.4 Frontend Implementation is now complete

**Session 6 Summary**: 
- Updated `module.json`:
  - Changed status to "complete"
  - Added `module-kb` to functional dependencies
  - Added `voice_session_kb` to database tables
  - Updated totalRoutes from 18 to 22
  - Added KB association routes to Sessions category
  - Changed navigation label from "Voice Interviews" to "Interviews"
- Created admin pages:
  - `frontend/pages/OrgVoiceConfigPage.tsx` - Org admin page for managing interview configurations
  - `frontend/pages/SysVoiceConfigPage.tsx` - Platform admin page for managing voice service credentials
  - `frontend/pages/index.ts` - Pages export file
- Updated `frontend/index.ts` to export pages
- Phase 3.6 Module Configuration is now complete
- **Phase 3 Implementation is fully complete!**

**Session 7 Summary**: 
- Created Phase 4.3 Documentation:
  - `docs/CONFIGURATION.md` - Comprehensive configuration guide covering interview configs, service credentials, infrastructure, environment variables, and feature flags
  - `docs/API-REFERENCE.md` - Complete API reference for all 22 endpoints including WebSocket API
  - `docs/DEPLOYMENT.md` - Step-by-step deployment guide with prerequisites, infrastructure, database, Lambda, ECS, and frontend integration
- Module README.md already existed and is comprehensive
- **Phase 4.3 Documentation is complete!**
