# Voice Module - Technical Specification

**Module Name:** module-voice  
**Version:** 1.0  
**Status:** Draft  
**Created:** January 16, 2026

**Parent Specification:** [MODULE-VOICE-SPEC.md](./MODULE-VOICE-SPEC.md)

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [Core Module Integrations](#4-core-module-integrations)
5. [External Service Integrations](#5-external-service-integrations)
6. [Backend Implementation Patterns](#6-backend-implementation-patterns)
7. [Infrastructure Requirements](#7-infrastructure-requirements)
8. [Testing Requirements](#8-testing-requirements)

---

## 1. Data Model

### 1.1 Entity: voice_sessions

**Purpose:** Tracks voice interview sessions with Daily.co room details and lifecycle state.

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| candidate_name | VARCHAR(255) | No | NULL | - | Interview candidate name |
| candidate_email | VARCHAR(255) | No | NULL | - | Interview candidate email |
| interview_type | VARCHAR(100) | Yes | - | NOT NULL | Type of interview (e.g., technical, behavioral) |
| config_id | UUID | No | NULL | FK to voice_configs(id) | Associated interview configuration |
| status | VARCHAR(50) | Yes | 'pending' | CHECK constraint | Session lifecycle status |
| daily_room_url | TEXT | No | NULL | - | Daily.co room URL |
| daily_room_name | VARCHAR(255) | No | NULL | - | Daily.co room name |
| daily_room_token | TEXT | No | NULL | - | Daily.co participant token |
| ecs_task_arn | TEXT | No | NULL | - | ECS task ARN for Pipecat bot |
| session_metadata | JSONB | No | '{}' | - | Additional session metadata |
| started_at | TIMESTAMPTZ | No | NULL | - | When interview started |
| completed_at | TIMESTAMPTZ | No | NULL | - | When interview completed |
| duration_seconds | INTEGER | No | NULL | - | Total interview duration |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Status Values

| Status | Description | Transitions To |
|--------|-------------|----------------|
| pending | Session created, Daily.co room not yet ready | ready, failed, cancelled |
| ready | Daily.co room created, waiting for participant | active, cancelled |
| active | Interview in progress | completed, failed, cancelled |
| completed | Interview finished successfully | - |
| failed | Error occurred during session | - |
| cancelled | Session cancelled by user | - |

#### Relationships

```
voice_sessions
├── belongs_to: org (org_id → org.id)
├── belongs_to: auth.users (created_by → auth.users.id)
├── belongs_to: voice_configs (config_id → voice_configs.id)
├── has_many: voice_transcripts (via session_id FK)
└── has_one: voice_analytics (via session_id FK)
```

#### Validation Rules

**Field Validation:**
- `interview_type`: Required, 1-100 characters
- `status`: Must be one of: pending, ready, active, completed, failed, cancelled
- `org_id`: User must be member of organization
- `candidate_email`: If provided, must be valid email format
- `duration_seconds`: If provided, must be non-negative

**Business Rules:**
1. Status can only transition forward (pending → ready → active → completed/failed)
2. `started_at` is set when status changes to `active`
3. `completed_at` and `duration_seconds` are set when status changes to `completed`
4. Daily.co room token expires after 24 hours
5. ECS task ARN is set when bot is started

---

### 1.2 Entity: voice_transcripts

**Purpose:** Stores interview transcripts with database and S3 storage for archival.

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| session_id | UUID | Yes | - | FK to voice_sessions(id) | Parent session |
| transcript_text | TEXT | No | NULL | - | Full transcript text |
| transcript_s3_url | TEXT | No | NULL | - | S3 URL for archived transcript |
| candidate_name | VARCHAR(255) | No | NULL | - | Denormalized from session |
| interview_type | VARCHAR(100) | No | NULL | - | Denormalized from session |
| summary | TEXT | No | NULL | - | AI-generated summary |
| word_count | INTEGER | No | NULL | - | Total word count |
| speaker_segments | JSONB | No | '[]' | - | Array of speaker segments |
| metadata | JSONB | No | '{}' | - | Additional metadata |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Speaker Segments Schema

```json
{
  "speaker_segments": [
    {
      "speaker": "bot",
      "text": "Hello, welcome to your interview.",
      "start_time": 0.0,
      "end_time": 2.5,
      "confidence": 0.98
    },
    {
      "speaker": "candidate",
      "text": "Thank you, I'm excited to be here.",
      "start_time": 3.0,
      "end_time": 5.2,
      "confidence": 0.95
    }
  ]
}
```

#### Relationships

```
voice_transcripts
├── belongs_to: org (org_id → org.id)
├── belongs_to: voice_sessions (session_id → voice_sessions.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── has_one: voice_analytics (via transcript_id FK)
```

#### Validation Rules

**Field Validation:**
- `session_id`: Required, must exist in voice_sessions
- `transcript_s3_url`: If provided, must be valid S3 URL

**Business Rules:**
1. Created when interview completes or is archived
2. S3 URL populated when archived to cold storage
3. Denormalized fields copied from session at creation time

---

### 1.3 Entity: voice_configs

**Purpose:** JSON-based Pipecat interview configurations per organization.

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| name | VARCHAR(255) | Yes | - | NOT NULL | Configuration name |
| interview_type | VARCHAR(100) | Yes | - | NOT NULL | Type of interview |
| description | TEXT | No | NULL | - | Configuration description |
| config_json | JSONB | Yes | - | NOT NULL | Pipecat configuration |
| is_active | BOOLEAN | Yes | true | - | Whether config is active |
| version | INTEGER | Yes | 1 | - | Configuration version |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Config JSON Schema

```json
{
  "config_json": {
    "bot_name": "Interview Assistant",
    "system_prompt": "You are conducting a technical interview...",
    "initial_message": "Hello! I'm your interview assistant today.",
    "voice": {
      "provider": "cartesia",
      "voice_id": "en-US-Neural2-A",
      "speed": 1.0
    },
    "transcription": {
      "provider": "deepgram",
      "language": "en-US",
      "model": "nova-2"
    },
    "llm": {
      "provider": "openai",
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 500
    },
    "interview": {
      "max_duration_minutes": 30,
      "questions": [
        {
          "id": "q1",
          "text": "Tell me about your experience with...",
          "type": "open",
          "follow_up_enabled": true
        }
      ],
      "scoring_rubric": {
        "criteria": ["communication", "technical_depth", "problem_solving"]
      }
    }
  }
}
```

#### Relationships

```
voice_configs
├── belongs_to: org (org_id → org.id)
├── belongs_to: auth.users (created_by → auth.users.id)
└── has_many: voice_sessions (via config_id FK)
```

#### Validation Rules

**Field Validation:**
- `name`: Required, 1-255 characters, unique per organization
- `interview_type`: Required, 1-100 characters
- `config_json`: Required, must be valid JSON matching schema

**Business Rules:**
1. Unique name per organization
2. Version incremented on each update
3. Only active configs can be used for new sessions

---

### 1.4 Entity: voice_credentials

**Purpose:** Voice-specific AI service credentials (Daily.co, Deepgram, Cartesia). OpenAI credentials are managed by module-ai.

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| service_name | VARCHAR(50) | Yes | - | CHECK constraint | Service: daily, deepgram, cartesia |
| credentials_secret_arn | TEXT | Yes | - | NOT NULL | AWS Secrets Manager ARN |
| config_metadata | JSONB | No | '{}' | - | Service-specific configuration |
| is_active | BOOLEAN | Yes | true | - | Whether credential is active |
| last_validated_at | TIMESTAMPTZ | No | NULL | - | Last successful validation |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |
| updated_by | UUID | No | NULL | FK to auth.users(id) | Last updater user ID |

#### Service Names

| Service | Purpose | Config Metadata |
|---------|---------|-----------------|
| daily | WebRTC rooms | `{"region": "us-west-2", "max_participants": 2}` |
| deepgram | Speech-to-text | `{"model": "nova-2", "language": "en-US"}` |
| cartesia | Text-to-speech | `{"voice_id": "...", "speed": 1.0}` |

#### Relationships

```
voice_credentials
├── belongs_to: org (org_id → org.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

#### Validation Rules

**Field Validation:**
- `service_name`: Must be one of: daily, deepgram, cartesia
- `credentials_secret_arn`: Required, valid AWS Secrets Manager ARN format
- One credential per service per organization (UNIQUE constraint)

**Business Rules:**
1. Actual credentials stored in AWS Secrets Manager, not database
2. Only active credentials are used
3. `last_validated_at` updated when credentials are verified

---

### 1.5 Entity: voice_analytics

**Purpose:** AI-generated interview analysis, scores, and recommendations.

#### Fields

| Field Name | Type | Required | Default | Constraints | Description |
|------------|------|----------|---------|-------------|-------------|
| id | UUID | Yes | gen_random_uuid() | PRIMARY KEY | Unique identifier |
| org_id | UUID | Yes | - | FK to org(id) | Organization (multi-tenant) |
| session_id | UUID | Yes | - | FK to voice_sessions(id) | Parent session |
| transcript_id | UUID | No | NULL | FK to voice_transcripts(id) | Associated transcript |
| overall_score | NUMERIC(5,2) | No | NULL | CHECK (0-100) | Overall interview score |
| category_scores | JSONB | No | '{}' | - | Scores by category |
| strengths | TEXT[] | No | '{}' | - | Identified strengths |
| weaknesses | TEXT[] | No | '{}' | - | Areas for improvement |
| recommendations | TEXT[] | No | '{}' | - | Recommendations |
| key_moments | JSONB | No | '[]' | - | Notable interview moments |
| detailed_analysis | JSONB | No | '{}' | - | Full AI analysis |
| model_used | VARCHAR(100) | No | NULL | - | AI model used for analysis |
| processing_time_ms | INTEGER | No | NULL | - | Analysis processing time |
| created_at | TIMESTAMPTZ | Yes | NOW() | - | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | - | Last update timestamp |
| created_by | UUID | Yes | - | FK to auth.users(id) | Creator user ID |

#### Category Scores Schema

```json
{
  "category_scores": {
    "communication": {
      "score": 85,
      "weight": 0.25,
      "feedback": "Clear and articulate responses"
    },
    "technical_depth": {
      "score": 72,
      "weight": 0.35,
      "feedback": "Good understanding, could go deeper"
    },
    "problem_solving": {
      "score": 90,
      "weight": 0.25,
      "feedback": "Excellent analytical approach"
    },
    "cultural_fit": {
      "score": 88,
      "weight": 0.15,
      "feedback": "Strong alignment with values"
    }
  }
}
```

#### Key Moments Schema

```json
{
  "key_moments": [
    {
      "timestamp": 145.5,
      "type": "strength",
      "description": "Excellent explanation of system design",
      "quote": "I would approach this by..."
    },
    {
      "timestamp": 320.2,
      "type": "concern",
      "description": "Hesitation on scalability question",
      "quote": "I'm not entirely sure..."
    }
  ]
}
```

#### Relationships

```
voice_analytics
├── belongs_to: org (org_id → org.id)
├── belongs_to: voice_sessions (session_id → voice_sessions.id)
├── belongs_to: voice_transcripts (transcript_id → voice_transcripts.id)
└── belongs_to: auth.users (created_by → auth.users.id)
```

#### Validation Rules

**Field Validation:**
- `session_id`: Required, must exist in voice_sessions
- `overall_score`: If provided, must be 0-100

**Business Rules:**
1. Generated after transcript processing completes
2. One analytics record per session
3. AI-driven analysis using OpenAI via module-ai

---

## 2. Database Schema

### 2.1 Migration: `001_voice_sessions.sql`

```sql
-- ========================================
-- Voice Module - Sessions Table
-- Created: January 16, 2026
-- ========================================

-- Drop if exists for idempotency
DROP TABLE IF EXISTS public.voice_sessions CASCADE;

-- Table: voice_sessions
CREATE TABLE public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255),
    candidate_email VARCHAR(255),
    interview_type VARCHAR(100) NOT NULL,
    config_id UUID REFERENCES public.voice_configs(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    daily_room_url TEXT,
    daily_room_name VARCHAR(255),
    daily_room_token TEXT,
    ecs_task_arn TEXT,
    session_metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT voice_sessions_status_check CHECK (
        status IN ('pending', 'ready', 'active', 'completed', 'failed', 'cancelled')
    ),
    CONSTRAINT voice_sessions_duration_check CHECK (
        duration_seconds IS NULL OR duration_seconds >= 0
    )
);

-- Indexes
CREATE INDEX idx_voice_sessions_org_id ON public.voice_sessions(org_id);
CREATE INDEX idx_voice_sessions_status ON public.voice_sessions(status);
CREATE INDEX idx_voice_sessions_created_at ON public.voice_sessions(created_at DESC);
CREATE INDEX idx_voice_sessions_config_id ON public.voice_sessions(config_id);
CREATE INDEX idx_voice_sessions_interview_type ON public.voice_sessions(interview_type);

-- Enable RLS
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_sessions_select_policy" ON public.voice_sessions
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_sessions_insert_policy" ON public.voice_sessions
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_sessions_update_policy" ON public.voice_sessions
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_sessions_delete_policy" ON public.voice_sessions
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_sessions_updated_at
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_sessions IS 'Voice interview sessions with Daily.co room details';
COMMENT ON COLUMN public.voice_sessions.org_id IS 'Organization ID for multi-tenancy';
COMMENT ON COLUMN public.voice_sessions.status IS 'Session lifecycle: pending, ready, active, completed, failed, cancelled';
COMMENT ON COLUMN public.voice_sessions.daily_room_token IS 'Daily.co participant token (expires after 24h)';
```

### 2.2 Migration: `002_voice_transcripts.sql`

```sql
-- ========================================
-- Voice Module - Transcripts Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_transcripts CASCADE;

CREATE TABLE public.voice_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_text TEXT,
    transcript_s3_url TEXT,
    candidate_name VARCHAR(255),
    interview_type VARCHAR(100),
    summary TEXT,
    word_count INTEGER,
    speaker_segments JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_voice_transcripts_org_id ON public.voice_transcripts(org_id);
CREATE INDEX idx_voice_transcripts_session_id ON public.voice_transcripts(session_id);
CREATE INDEX idx_voice_transcripts_created_at ON public.voice_transcripts(created_at DESC);

-- Enable RLS
ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_transcripts_select_policy" ON public.voice_transcripts
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_transcripts_insert_policy" ON public.voice_transcripts
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_transcripts_update_policy" ON public.voice_transcripts
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_transcripts_delete_policy" ON public.voice_transcripts
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_transcripts_updated_at
    BEFORE UPDATE ON public.voice_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_transcripts IS 'Interview transcripts with S3 archival';
COMMENT ON COLUMN public.voice_transcripts.speaker_segments IS 'JSON array of speaker segments with timestamps';
```

### 2.3 Migration: `003_voice_configs.sql`

```sql
-- ========================================
-- Voice Module - Configs Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_configs CASCADE;

CREATE TABLE public.voice_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    interview_type VARCHAR(100) NOT NULL,
    description TEXT,
    config_json JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- Unique name per org
    CONSTRAINT voice_configs_name_org_unique UNIQUE (org_id, name)
);

-- Indexes
CREATE INDEX idx_voice_configs_org_id ON public.voice_configs(org_id);
CREATE INDEX idx_voice_configs_is_active ON public.voice_configs(is_active);
CREATE INDEX idx_voice_configs_interview_type ON public.voice_configs(interview_type);

-- Enable RLS
ALTER TABLE public.voice_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_configs_select_policy" ON public.voice_configs
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_configs_insert_policy" ON public.voice_configs
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_configs_update_policy" ON public.voice_configs
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_configs_delete_policy" ON public.voice_configs
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_configs_updated_at
    BEFORE UPDATE ON public.voice_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_configs IS 'Pipecat interview configurations per organization';
COMMENT ON COLUMN public.voice_configs.config_json IS 'Full Pipecat configuration JSON';
```

### 2.4 Migration: `004_voice_credentials.sql`

```sql
-- ========================================
-- Voice Module - Credentials Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_credentials CASCADE;

CREATE TABLE public.voice_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL,
    credentials_secret_arn TEXT NOT NULL,
    config_metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    -- One credential per service per org
    CONSTRAINT voice_credentials_service_org_unique UNIQUE (org_id, service_name),
    CONSTRAINT voice_credentials_service_check CHECK (
        service_name IN ('daily', 'deepgram', 'cartesia')
    )
);

-- Indexes
CREATE INDEX idx_voice_credentials_org_id ON public.voice_credentials(org_id);
CREATE INDEX idx_voice_credentials_service ON public.voice_credentials(service_name);
CREATE INDEX idx_voice_credentials_is_active ON public.voice_credentials(is_active);

-- Enable RLS
ALTER TABLE public.voice_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin-only access)
CREATE POLICY "voice_credentials_select_policy" ON public.voice_credentials
    FOR SELECT USING (can_admin_org(org_id));

CREATE POLICY "voice_credentials_insert_policy" ON public.voice_credentials
    FOR INSERT WITH CHECK (can_admin_org(org_id));

CREATE POLICY "voice_credentials_update_policy" ON public.voice_credentials
    FOR UPDATE USING (can_admin_org(org_id))
    WITH CHECK (can_admin_org(org_id));

CREATE POLICY "voice_credentials_delete_policy" ON public.voice_credentials
    FOR DELETE USING (can_admin_org(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_credentials_updated_at
    BEFORE UPDATE ON public.voice_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_credentials IS 'Voice service credentials (Daily, Deepgram, Cartesia)';
COMMENT ON COLUMN public.voice_credentials.credentials_secret_arn IS 'AWS Secrets Manager ARN for actual credentials';
```

### 2.5 Migration: `005_voice_analytics.sql`

```sql
-- ========================================
-- Voice Module - Analytics Table
-- Created: January 16, 2026
-- ========================================

DROP TABLE IF EXISTS public.voice_analytics CASCADE;

CREATE TABLE public.voice_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES public.voice_transcripts(id) ON DELETE SET NULL,
    overall_score NUMERIC(5,2),
    category_scores JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    recommendations TEXT[] NOT NULL DEFAULT '{}',
    key_moments JSONB NOT NULL DEFAULT '[]',
    detailed_analysis JSONB NOT NULL DEFAULT '{}',
    model_used VARCHAR(100),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- One analytics per session
    CONSTRAINT voice_analytics_session_unique UNIQUE (session_id),
    CONSTRAINT voice_analytics_score_check CHECK (
        overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)
    )
);

-- Indexes
CREATE INDEX idx_voice_analytics_org_id ON public.voice_analytics(org_id);
CREATE INDEX idx_voice_analytics_session_id ON public.voice_analytics(session_id);
CREATE INDEX idx_voice_analytics_transcript_id ON public.voice_analytics(transcript_id);
CREATE INDEX idx_voice_analytics_overall_score ON public.voice_analytics(overall_score DESC);

-- Enable RLS
ALTER TABLE public.voice_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "voice_analytics_select_policy" ON public.voice_analytics
    FOR SELECT USING (can_access_org_data(org_id));

CREATE POLICY "voice_analytics_insert_policy" ON public.voice_analytics
    FOR INSERT WITH CHECK (can_access_org_data(org_id));

CREATE POLICY "voice_analytics_update_policy" ON public.voice_analytics
    FOR UPDATE USING (can_modify_org_data(org_id))
    WITH CHECK (can_modify_org_data(org_id));

CREATE POLICY "voice_analytics_delete_policy" ON public.voice_analytics
    FOR DELETE USING (can_modify_org_data(org_id));

-- Updated at trigger
CREATE TRIGGER update_voice_analytics_updated_at
    BEFORE UPDATE ON public.voice_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.voice_analytics IS 'AI-generated interview analysis and scoring';
COMMENT ON COLUMN public.voice_analytics.category_scores IS 'JSON object with scores per evaluation category';
```

### 2.6 Migration: `006_voice_rpc_functions.sql`

```sql
-- ========================================
-- Voice Module - RPC Functions
-- Created: January 16, 2026
-- ========================================

-- Function: Get session with related data
CREATE OR REPLACE FUNCTION get_voice_session_details(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'session', row_to_json(s),
        'config', row_to_json(c),
        'transcript', row_to_json(t),
        'analytics', row_to_json(a)
    )
    INTO v_result
    FROM public.voice_sessions s
    LEFT JOIN public.voice_configs c ON s.config_id = c.id
    LEFT JOIN public.voice_transcripts t ON t.session_id = s.id
    LEFT JOIN public.voice_analytics a ON a.session_id = s.id
    WHERE s.id = p_session_id;
    
    RETURN v_result;
END;
$$;

-- Function: Get org voice statistics
CREATE OR REPLACE FUNCTION get_org_voice_stats(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_sessions', COUNT(*),
        'completed_sessions', COUNT(*) FILTER (WHERE status = 'completed'),
        'avg_duration_seconds', ROUND(AVG(duration_seconds) FILTER (WHERE status = 'completed')),
        'avg_score', ROUND(AVG(a.overall_score)::numeric, 1),
        'sessions_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))
    )
    INTO v_result
    FROM public.voice_sessions s
    LEFT JOIN public.voice_analytics a ON a.session_id = s.id
    WHERE s.org_id = p_org_id;
    
    RETURN v_result;
END;
$$;

-- Function: Update session status with validation
CREATE OR REPLACE FUNCTION update_voice_session_status(
    p_session_id UUID,
    p_new_status VARCHAR(50),
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status VARCHAR(50);
    v_valid_transitions JSONB := '{
        "pending": ["ready", "failed", "cancelled"],
        "ready": ["active", "cancelled"],
        "active": ["completed", "failed", "cancelled"]
    }'::jsonb;
BEGIN
    -- Get current status
    SELECT status INTO v_current_status
    FROM public.voice_sessions
    WHERE id = p_session_id;
    
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    
    -- Check if transition is valid
    IF NOT (v_valid_transitions->v_current_status ? p_new_status) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', v_current_status, p_new_status;
    END IF;
    
    -- Update status
    UPDATE public.voice_sessions
    SET 
        status = p_new_status,
        updated_by = p_user_id,
        updated_at = NOW(),
        started_at = CASE WHEN p_new_status = 'active' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_new_status IN ('completed', 'failed', 'cancelled') THEN NOW() ELSE completed_at END
    WHERE id = p_session_id;
    
    RETURN TRUE;
END;
$$;
```

---

## 3. API Endpoints

### Base Path: `/api/voice/`

### 3.1 Sessions Endpoints

#### List Sessions

```
GET /api/voice/sessions?orgId={uuid}
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| orgId | UUID | Yes | - | Organization ID |
| status | string | No | - | Filter by status |
| interviewType | string | No | - | Filter by interview type |
| limit | integer | No | 100 | Max results (1-1000) |
| offset | integer | No | 0 | Pagination offset |
| sortBy | string | No | created_at | Sort field |
| sortOrder | string | No | desc | Sort order |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orgId": "uuid",
      "candidateName": "John Doe",
      "candidateEmail": "john@example.com",
      "interviewType": "technical",
      "status": "completed",
      "dailyRoomUrl": "https://example.daily.co/room-123",
      "startedAt": "2026-01-16T14:00:00Z",
      "completedAt": "2026-01-16T14:30:00Z",
      "durationSeconds": 1800,
      "createdAt": "2026-01-16T13:55:00Z",
      "createdBy": "uuid"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Single Session

```
GET /api/voice/sessions/{id}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orgId": "uuid",
    "candidateName": "John Doe",
    "candidateEmail": "john@example.com",
    "interviewType": "technical",
    "configId": "uuid",
    "status": "ready",
    "dailyRoomUrl": "https://example.daily.co/room-123",
    "dailyRoomName": "room-123",
    "dailyRoomToken": "eyJ...",
    "sessionMetadata": {},
    "startedAt": null,
    "completedAt": null,
    "durationSeconds": null,
    "createdAt": "2026-01-16T13:55:00Z",
    "updatedAt": "2026-01-16T13:56:00Z",
    "createdBy": "uuid"
  }
}
```

#### Create Session

```
POST /api/voice/sessions
```

**Request Body:**

```json
{
  "orgId": "uuid",
  "candidateName": "John Doe",
  "candidateEmail": "john@example.com",
  "interviewType": "technical",
  "configId": "uuid"
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orgId": "uuid",
    "candidateName": "John Doe",
    "interviewType": "technical",
    "status": "pending",
    "createdAt": "2026-01-16T13:55:00Z"
  }
}
```

#### Start Session (Bot)

```
POST /api/voice/sessions/{id}/start
```

**Purpose:** Creates Daily.co room and starts ECS Pipecat bot

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ready",
    "dailyRoomUrl": "https://example.daily.co/room-123",
    "dailyRoomToken": "eyJ...",
    "ecsTaskArn": "arn:aws:ecs:..."
  }
}
```

#### Update Session

```
PUT /api/voice/sessions/{id}
```

**Request Body:**

```json
{
  "candidateName": "Jane Doe",
  "status": "completed"
}
```

#### Delete Session

```
DELETE /api/voice/sessions/{id}
```

---

### 3.2 Configs Endpoints

#### List Configs

```
GET /api/voice/configs?orgId={uuid}
```

#### Get Config

```
GET /api/voice/configs/{id}
```

#### Create Config

```
POST /api/voice/configs
```

**Request Body:**

```json
{
  "orgId": "uuid",
  "name": "Technical Interview v1",
  "interviewType": "technical",
  "description": "Standard technical interview template",
  "configJson": {
    "bot_name": "Interview Assistant",
    "system_prompt": "...",
    "initial_message": "...",
    "voice": { "provider": "cartesia", "voice_id": "..." },
    "transcription": { "provider": "deepgram", "model": "nova-2" },
    "llm": { "provider": "openai", "model": "gpt-4" },
    "interview": { "max_duration_minutes": 30, "questions": [] }
  }
}
```

#### Update Config

```
PUT /api/voice/configs/{id}
```

#### Delete Config

```
DELETE /api/voice/configs/{id}
```

---

### 3.3 Credentials Endpoints

#### List Credentials

```
GET /api/voice/credentials?orgId={uuid}
```

**Note:** Only returns metadata, not actual secrets.

#### Get Credential

```
GET /api/voice/credentials/{id}
```

#### Create/Update Credential

```
POST /api/voice/credentials
```

**Request Body:**

```json
{
  "orgId": "uuid",
  "serviceName": "daily",
  "apiKey": "sk-...",
  "configMetadata": {
    "region": "us-west-2"
  }
}
```

**Note:** `apiKey` is stored in AWS Secrets Manager; only ARN is stored in DB.

#### Delete Credential

```
DELETE /api/voice/credentials/{id}
```

#### Validate Credential

```
POST /api/voice/credentials/{id}/validate
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "lastValidatedAt": "2026-01-16T15:00:00Z"
  }
}
```

---

### 3.4 Transcripts Endpoints

#### List Transcripts

```
GET /api/voice/transcripts?orgId={uuid}
```

#### Get Transcript

```
GET /api/voice/transcripts/{id}
```

#### Delete Transcript

```
DELETE /api/voice/transcripts/{id}
```

---

### 3.5 Analytics Endpoints

#### Get Analytics by Session

```
GET /api/voice/analytics/{sessionId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "sessionId": "uuid",
    "overallScore": 82.5,
    "categoryScores": {
      "communication": { "score": 85, "weight": 0.25 },
      "technical_depth": { "score": 72, "weight": 0.35 }
    },
    "strengths": ["Clear communication", "Strong problem-solving"],
    "weaknesses": ["Could provide more detail"],
    "recommendations": ["Consider follow-up technical assessment"],
    "keyMoments": [
      {
        "timestamp": 145.5,
        "type": "strength",
        "description": "Excellent system design explanation"
      }
    ],
    "createdAt": "2026-01-16T14:35:00Z"
  }
}
```

---

## 4. Core Module Integrations

### 4.1 module-access Integration

**Authentication:**

```python
"""
Voice Sessions Lambda - Session CRUD Operations

Routes - Sessions:
- GET /api/voice/sessions - List sessions for organization
- GET /api/voice/sessions/{id} - Get session by ID
- POST /api/voice/sessions - Create new session
- PUT /api/voice/sessions/{id} - Update session
- DELETE /api/voice/sessions/{id} - Delete session
- POST /api/voice/sessions/{id}/start - Start bot for session
"""

import json
from typing import Dict, Any
import access_common as access

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler - routes to specific handlers"""
    print(json.dumps(event, default=str))
    
    try:
        # Extract user from JWT token
        user_info = access.get_user_from_event(event)
        user_id = access.get_supabase_user_id_from_external_uid(user_info['user_id'])
        
        # Route to handlers
        http_method = event.get('httpMethod')
        path_params = event.get('pathParameters') or {}
        resource = event.get('resource', '')
        
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list(event, user_id)
        elif http_method == 'GET' and path_params.get('id'):
            return handle_get(event, user_id, path_params['id'])
        elif http_method == 'POST' and '/start' in resource:
            return handle_start(event, user_id, path_params['id'])
        elif http_method == 'POST':
            return handle_create(event, user_id)
        elif http_method == 'PUT':
            return handle_update(event, user_id, path_params['id'])
        elif http_method == 'DELETE':
            return handle_delete(event, user_id, path_params['id'])
        else:
            return access.bad_request_response('Invalid method')
    
    except access.ValidationError as e:
        return access.bad_request_response(str(e))
    except access.ForbiddenError as e:
        return access.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        return access.internal_error_response('Internal error')
```

**Authorization & Database Operations:**

```python
def handle_list(event, user_id):
    """GET /api/voice/sessions - List sessions for org"""
    query_params = event.get('queryStringParameters', {}) or {}
    
    # Extract and validate org_id
    org_id = query_params.get('orgId')
    if not org_id:
        raise access.ValidationError('orgId required')
    org_id = access.validate_uuid(org_id, 'orgId')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Build filters
    filters = {'org_id': org_id}
    if query_params.get('status'):
        filters['status'] = query_params['status']
    if query_params.get('interviewType'):
        filters['interview_type'] = query_params['interviewType']
    
    # Pagination
    limit = min(int(query_params.get('limit', 100)), 1000)
    offset = int(query_params.get('offset', 0))
    
    # Query sessions
    sessions = access.find_many(
        table='voice_sessions',
        filters=filters,
        select='*',
        order_by='created_at DESC',
        limit=limit,
        offset=offset
    )
    
    # Format response (snake_case to camelCase)
    return access.success_response({
        'data': access.format_records(sessions),
        'pagination': {
            'limit': limit,
            'offset': offset,
            'hasMore': len(sessions) == limit
        }
    })
```

### 4.2 module-ai Integration

**OpenAI Credentials for Interview LLM:**

```python
import ai_common as ai

def get_openai_config(org_id: str) -> Dict[str, Any]:
    """Get OpenAI configuration from module-ai"""
    # Get org's AI configuration
    ai_config = ai.get_org_ai_config(org_id)
    
    # Get OpenAI credentials
    openai_credentials = ai.get_provider_credentials(org_id, 'openai')
    
    return {
        'api_key': openai_credentials['api_key'],
        'model': ai_config.get('default_model', 'gpt-4'),
        'org_id': openai_credentials.get('organization_id')
    }

def generate_analytics(org_id: str, transcript: str, config: Dict) -> Dict:
    """Generate interview analytics using OpenAI via module-ai"""
    openai_config = get_openai_config(org_id)
    
    # Call AI model through module-ai
    response = ai.call_model(
        org_id=org_id,
        provider='openai',
        model=openai_config['model'],
        messages=[
            {
                'role': 'system',
                'content': 'You are an interview analyst. Analyze the transcript and provide scoring.'
            },
            {
                'role': 'user',
                'content': f'Analyze this interview transcript:\n\n{transcript}'
            }
        ],
        temperature=0.3,
        max_tokens=2000
    )
    
    # Log usage for billing
    ai.log_model_usage(
        org_id=org_id,
        model=openai_config['model'],
        tokens_used=response['usage']['total_tokens'],
        cost=response['cost']
    )
    
    return parse_analytics_response(response['content'])
```

### 4.3 module-mgmt Integration

**Health Check:**

```python
def handle_health_check():
    """Health check endpoint for module-mgmt monitoring"""
    checks = {
        'database': check_database(),
        'daily_co': check_daily_co_api(),
        'ecs': check_ecs_cluster(),
        'sqs': check_sqs_queue()
    }
    
    all_healthy = all(c == 'ok' for c in checks.values())
    
    return {
        'module': 'module-voice',
        'status': 'healthy' if all_healthy else 'degraded',
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }
```

---

## 5. External Service Integrations

### 5.1 Daily.co Integration

**Room Creation:**

```python
import requests
import os

DAILY_API_BASE = 'https://api.daily.co/v1'

def get_daily_api_key(org_id: str) -> str:
    """Get Daily.co API key from AWS Secrets Manager"""
    # First check org-specific credentials
    credential = access.find_one(
        table='voice_credentials',
        filters={'org_id': org_id, 'service_name': 'daily', 'is_active': True}
    )
    
    if credential:
        return get_secret_value(credential['credentials_secret_arn'])
    
    # Fall back to platform default
    return get_secret_value(os.environ['DAILY_API_KEY_SECRET_ARN'])

def create_daily_room(org_id: str, session_id: str, config: Dict) -> Dict:
    """Create a Daily.co room for the interview session"""
    api_key = get_daily_api_key(org_id)
    
    room_name = f"voice-{session_id[:8]}"
    
    response = requests.post(
        f'{DAILY_API_BASE}/rooms',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'name': room_name,
            'privacy': 'private',
            'properties': {
                'exp': int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
                'max_participants': 2,
                'enable_recording': False,
                'enable_chat': False,
                'start_audio_off': False,
                'start_video_off': True
            }
        }
    )
    
    if response.status_code != 200:
        raise Exception(f'Failed to create Daily room: {response.text}')
    
    room_data = response.json()
    return {
        'room_url': room_data['url'],
        'room_name': room_data['name']
    }

def create_meeting_token(org_id: str, room_name: str, is_bot: bool = False) -> str:
    """Create a meeting token for room access"""
    api_key = get_daily_api_key(org_id)
    
    response = requests.post(
        f'{DAILY_API_BASE}/meeting-tokens',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'properties': {
                'room_name': room_name,
                'is_owner': is_bot,
                'exp': int((datetime.utcnow() + timedelta(hours=2)).timestamp()),
                'user_name': 'Pipecat Bot' if is_bot else 'Candidate'
            }
        }
    )
    
    if response.status_code != 200:
        raise Exception(f'Failed to create meeting token: {response.text}')
    
    return response.json()['token']
```

### 5.2 ECS/Fargate Integration

**Task Runner:**

```python
import boto3

ecs_client = boto3.client('ecs')

def start_pipecat_bot(
    session_id: str,
    room_url: str,
    room_token: str,
    config: Dict,
    openai_config: Dict
) -> str:
    """Start Pipecat bot as ECS Fargate task"""
    
    cluster_name = os.environ['ECS_CLUSTER_NAME']
    task_definition = os.environ['ECS_TASK_DEFINITION_ARN']
    subnets = os.environ['ECS_SUBNETS'].split(',')
    security_groups = os.environ['ECS_SECURITY_GROUPS'].split(',')
    
    response = ecs_client.run_task(
        cluster=cluster_name,
        taskDefinition=task_definition,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': subnets,
                'securityGroups': security_groups,
                'assignPublicIp': 'ENABLED'
            }
        },
        overrides={
            'containerOverrides': [
                {
                    'name': 'pipecat-bot',
                    'environment': [
                        {'name': 'SESSION_ID', 'value': session_id},
                        {'name': 'DAILY_ROOM_URL', 'value': room_url},
                        {'name': 'DAILY_ROOM_TOKEN', 'value': room_token},
                        {'name': 'BOT_CONFIG', 'value': json.dumps(config)},
                        {'name': 'OPENAI_API_KEY', 'value': openai_config['api_key']},
                        {'name': 'OPENAI_MODEL', 'value': openai_config['model']},
                        {'name': 'WEBSOCKET_URL', 'value': os.environ['WEBSOCKET_API_URL']}
                    ]
                }
            ]
        },
        tags=[
            {'key': 'SessionId', 'value': session_id},
            {'key': 'Module', 'value': 'voice'}
        ]
    )
    
    if not response['tasks']:
        raise Exception(f"Failed to start ECS task: {response.get('failures', [])}")
    
    task_arn = response['tasks'][0]['taskArn']
    return task_arn
```

### 5.3 SQS Standby Pool

**Standby Bot Pool Management:**

```python
import boto3

sqs_client = boto3.client('sqs')

STANDBY_QUEUE_URL = os.environ.get('STANDBY_SQS_QUEUE_URL')

def request_standby_bot(session_id: str, config: Dict) -> bool:
    """Request a bot from the standby pool"""
    try:
        # Check if within business hours
        if not is_business_hours():
            return False
        
        # Send message to standby pool queue
        sqs_client.send_message(
            QueueUrl=STANDBY_QUEUE_URL,
            MessageBody=json.dumps({
                'session_id': session_id,
                'config': config,
                'requested_at': datetime.utcnow().isoformat()
            }),
            MessageAttributes={
                'MessageType': {
                    'DataType': 'String',
                    'StringValue': 'BOT_REQUEST'
                }
            }
        )
        return True
    except Exception as e:
        print(f"Failed to request standby bot: {e}")
        return False

def is_business_hours() -> bool:
    """Check if current time is within business hours"""
    start_hour = int(os.environ.get('BUSINESS_HOURS_START', '09').split(':')[0])
    end_hour = int(os.environ.get('BUSINESS_HOURS_END', '17').split(':')[0])
    
    current_hour = datetime.utcnow().hour
    return start_hour <= current_hour < end_hour
```

### 5.4 S3 Transcript Storage

**Transcript Archival:**

```python
import boto3

s3_client = boto3.client('s3')

TRANSCRIPT_BUCKET = os.environ.get('TRANSCRIPT_S3_BUCKET')

def archive_transcript(
    org_id: str,
    session_id: str,
    transcript: Dict
) -> str:
    """Archive transcript to S3"""
    
    # Generate S3 key with partitioning
    date_prefix = datetime.utcnow().strftime('%Y/%m/%d')
    s3_key = f"transcripts/{org_id}/{date_prefix}/{session_id}.json"
    
    # Upload transcript
    s3_client.put_object(
        Bucket=TRANSCRIPT_BUCKET,
        Key=s3_key,
        Body=json.dumps(transcript, default=str),
        ContentType='application/json',
        Metadata={
            'org_id': org_id,
            'session_id': session_id
        }
    )
    
    s3_url = f"s3://{TRANSCRIPT_BUCKET}/{s3_key}"
    return s3_url

def get_transcript_from_s3(s3_url: str) -> Dict:
    """Retrieve transcript from S3"""
    # Parse S3 URL
    bucket, key = parse_s3_url(s3_url)
    
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read().decode('utf-8')
    
    return json.loads(content)
```

---

## 6. Backend Implementation Patterns

### 6.1 Lambda Handler Structure

**File:** `backend/lambdas/voice-sessions/lambda_function.py`

```python
"""
Voice Sessions Lambda - Session CRUD Operations

Routes - Sessions:
- GET /api/voice/sessions - List sessions for organization
- GET /api/voice/sessions/{id} - Get session by ID
- POST /api/voice/sessions - Create new session
- PUT /api/voice/sessions/{id} - Update session
- DELETE /api/voice/sessions/{id} - Delete session
- POST /api/voice/sessions/{id}/start - Start bot for session
"""

import json
from typing import Dict, Any
from datetime import datetime
import access_common as access
import ai_common as ai

# External service helpers
from daily_helper import create_daily_room, create_meeting_token
from ecs_helper import start_pipecat_bot
from sqs_helper import request_standby_bot


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Main Lambda handler - routes to specific handlers"""
    print(json.dumps(event, default=str))
    
    try:
        user_info = access.get_user_from_event(event)
        user_id = access.get_supabase_user_id_from_external_uid(user_info['user_id'])
        
        http_method = event.get('httpMethod')
        path_params = event.get('pathParameters') or {}
        resource = event.get('resource', '')
        
        # Route based on method and path
        if http_method == 'GET' and not path_params.get('id'):
            return handle_list(event, user_id)
        elif http_method == 'GET' and path_params.get('id'):
            return handle_get(event, user_id, path_params['id'])
        elif http_method == 'POST' and '/start' in resource:
            return handle_start(event, user_id, path_params['id'])
        elif http_method == 'POST':
            return handle_create(event, user_id)
        elif http_method == 'PUT':
            return handle_update(event, user_id, path_params['id'])
        elif http_method == 'DELETE':
            return handle_delete(event, user_id, path_params['id'])
        else:
            return access.bad_request_response('Invalid method')
    
    except access.ValidationError as e:
        return access.bad_request_response(str(e))
    except access.ForbiddenError as e:
        return access.forbidden_response(str(e))
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return access.internal_error_response('Internal error')


def handle_create(event: Dict, user_id: str) -> Dict:
    """POST /api/voice/sessions - Create new session"""
    body = json.loads(event.get('body', '{}'))
    
    # Validate required fields
    org_id = body.get('org_id') or body.get('orgId')
    if not org_id:
        raise access.ValidationError('org_id required')
    org_id = access.validate_uuid(org_id, 'org_id')
    
    interview_type = body.get('interview_type') or body.get('interviewType')
    if not interview_type:
        raise access.ValidationError('interview_type required')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': org_id, 'person_id': user_id, 'active': True}
    )
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Validate config_id if provided
    config_id = body.get('config_id') or body.get('configId')
    if config_id:
        config_id = access.validate_uuid(config_id, 'config_id')
        config = access.find_one(
            table='voice_configs',
            filters={'id': config_id, 'org_id': org_id, 'is_active': True}
        )
        if not config:
            return access.not_found_response('Config not found')
    
    # Create session
    session_data = {
        'org_id': org_id,
        'interview_type': interview_type,
        'candidate_name': body.get('candidate_name') or body.get('candidateName'),
        'candidate_email': body.get('candidate_email') or body.get('candidateEmail'),
        'config_id': config_id,
        'status': 'pending',
        'session_metadata': body.get('session_metadata') or body.get('sessionMetadata') or {},
        'created_by': user_id
    }
    
    new_session = access.insert_one(table='voice_sessions', data=session_data)
    
    return access.created_response(access.format_record(new_session))


def handle_start(event: Dict, user_id: str, session_id: str) -> Dict:
    """POST /api/voice/sessions/{id}/start - Start bot for session"""
    session_id = access.validate_uuid(session_id, 'id')
    
    # Get session
    session = access.find_one(
        table='voice_sessions',
        filters={'id': session_id}
    )
    if not session:
        return access.not_found_response('Session not found')
    
    # Verify org membership
    membership = access.find_one(
        table='org_members',
        filters={'org_id': session['org_id'], 'person_id': user_id, 'active': True}
    )
    if not membership:
        return access.forbidden_response('No access to organization')
    
    # Check status
    if session['status'] not in ['pending', 'ready']:
        return access.bad_request_response(f"Cannot start session in status: {session['status']}")
    
    # Get config
    config = {}
    if session['config_id']:
        config_record = access.find_one(
            table='voice_configs',
            filters={'id': session['config_id']}
        )
        if config_record:
            config = config_record['config_json']
    
    # Create Daily.co room
    room_data = create_daily_room(session['org_id'], session_id, config)
    
    # Create tokens
    bot_token = create_meeting_token(session['org_id'], room_data['room_name'], is_bot=True)
    participant_token = create_meeting_token(session['org_id'], room_data['room_name'], is_bot=False)
    
    # Get OpenAI config from module-ai
    openai_config = ai.get_provider_credentials(session['org_id'], 'openai')
    
    # Start ECS bot (or request from standby pool)
    if not request_standby_bot(session_id, config):
        task_arn = start_pipecat_bot(
            session_id=session_id,
            room_url=room_data['room_url'],
            room_token=bot_token,
            config=config,
            openai_config=openai_config
        )
    else:
        task_arn = 'standby-pool'
    
    # Update session
    updated_session = access.update_one(
        table='voice_sessions',
        filters={'id': session_id},
        data={
            'status': 'ready',
            'daily_room_url': room_data['room_url'],
            'daily_room_name': room_data['room_name'],
            'daily_room_token': participant_token,
            'ecs_task_arn': task_arn,
            'updated_by': user_id
        }
    )
    
    return access.success_response(access.format_record(updated_session))
```

### 6.2 WebSocket Handler

**File:** `backend/lambdas/voice-websocket/lambda_function.py`

```python
"""
Voice WebSocket Lambda - Real-time Transcript Streaming

Routes - WebSocket:
- $connect - Client connects to WebSocket
- $disconnect - Client disconnects from WebSocket
- transcript - Receive transcript segment from bot
- subscribe - Client subscribes to session updates
"""

import json
import os
import boto3
from typing import Dict, Any

dynamodb = boto3.resource('dynamodb')
connections_table = dynamodb.Table(os.environ['CONNECTIONS_TABLE'])
api_gateway = boto3.client('apigatewaymanagementapi',
    endpoint_url=os.environ['WEBSOCKET_API_ENDPOINT']
)


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Handle WebSocket events"""
    route_key = event.get('requestContext', {}).get('routeKey')
    connection_id = event.get('requestContext', {}).get('connectionId')
    
    if route_key == '$connect':
        return handle_connect(connection_id, event)
    elif route_key == '$disconnect':
        return handle_disconnect(connection_id)
    elif route_key == 'subscribe':
        return handle_subscribe(connection_id, event)
    elif route_key == 'transcript':
        return handle_transcript(connection_id, event)
    else:
        return {'statusCode': 400, 'body': 'Unknown route'}


def handle_connect(connection_id: str, event: Dict) -> Dict:
    """Handle new WebSocket connection"""
    # Store connection
    connections_table.put_item(Item={
        'connection_id': connection_id,
        'connected_at': datetime.utcnow().isoformat(),
        'session_id': None  # Set when subscribed
    })
    return {'statusCode': 200}


def handle_disconnect(connection_id: str) -> Dict:
    """Handle WebSocket disconnection"""
    connections_table.delete_item(Key={'connection_id': connection_id})
    return {'statusCode': 200}


def handle_subscribe(connection_id: str, event: Dict) -> Dict:
    """Handle subscription to session updates"""
    body = json.loads(event.get('body', '{}'))
    session_id = body.get('session_id')
    
    if not session_id:
        return {'statusCode': 400, 'body': 'session_id required'}
    
    # Update connection with session_id
    connections_table.update_item(
        Key={'connection_id': connection_id},
        UpdateExpression='SET session_id = :sid',
        ExpressionAttributeValues={':sid': session_id}
    )
    
    return {'statusCode': 200}


def handle_transcript(connection_id: str, event: Dict) -> Dict:
    """Handle incoming transcript segment from bot"""
    body = json.loads(event.get('body', '{}'))
    session_id = body.get('session_id')
    segment = body.get('segment')
    
    if not session_id or not segment:
        return {'statusCode': 400, 'body': 'Missing required fields'}
    
    # Find all connections subscribed to this session
    response = connections_table.scan(
        FilterExpression='session_id = :sid',
        ExpressionAttributeValues={':sid': session_id}
    )
    
    # Broadcast to all connected clients
    for item in response.get('Items', []):
        try:
            api_gateway.post_to_connection(
                ConnectionId=item['connection_id'],
                Data=json.dumps({
                    'type': 'transcript_segment',
                    'session_id': session_id,
                    'segment': segment
                })
            )
        except api_gateway.exceptions.GoneException:
            # Connection no longer valid
            connections_table.delete_item(Key={'connection_id': item['connection_id']})
    
    return {'statusCode': 200}
```

---

## 7. Infrastructure Requirements

### 7.1 Terraform Variables

**File:** `infrastructure/variables.tf`

```hcl
# Module enablement
variable "module_voice_enabled" {
  description = "Enable voice module"
  type        = bool
  default     = true
}

# Lambda configuration
variable "module_voice_lambda_timeout" {
  description = "Lambda function timeout for voice module"
  type        = number
  default     = 30
}

variable "module_voice_lambda_memory" {
  description = "Lambda function memory for voice module"
  type        = number
  default     = 512
}

# ECS configuration
variable "ecs_cluster_name" {
  description = "ECS cluster name for Pipecat bots"
  type        = string
}

variable "ecs_task_definition_arn" {
  description = "ECS task definition ARN for Pipecat bot"
  type        = string
}

variable "ecs_subnets" {
  description = "Subnets for ECS tasks"
  type        = list(string)
}

variable "ecs_security_groups" {
  description = "Security groups for ECS tasks"
  type        = list(string)
}

# S3 configuration
variable "transcript_s3_bucket" {
  description = "S3 bucket for transcript storage"
  type        = string
}

# SQS configuration
variable "standby_pool_size" {
  description = "Number of standby bots during business hours"
  type        = number
  default     = 2
}

# Secrets
variable "daily_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Daily.co API key"
  type        = string
}

variable "deepgram_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Deepgram API key"
  type        = string
}

variable "cartesia_api_key_secret_arn" {
  description = "AWS Secrets Manager ARN for Cartesia API key"
  type        = string
}
```

### 7.2 Lambda Resources

**File:** `infrastructure/main.tf`

```hcl
# Voice Sessions Lambda
resource "aws_lambda_function" "voice_sessions" {
  count = var.module_voice_enabled ? 1 : 0
  
  function_name = "${var.project_name}-${var.environment}-voice-sessions"
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = var.module_voice_lambda_timeout
  memory_size   = var.module_voice_lambda_memory
  
  filename         = "${path.module}/../dist/voice-sessions.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/voice-sessions.zip")
  
  role = aws_iam_role.voice_lambda_role[0].arn
  
  layers = [
    var.access_common_layer_arn,
    var.ai_common_layer_arn
  ]
  
  environment {
    variables = {
      SUPABASE_URL                = var.supabase_url
      SUPABASE_KEY                = var.supabase_service_key
      ENVIRONMENT                 = var.environment
      ECS_CLUSTER_NAME            = var.ecs_cluster_name
      ECS_TASK_DEFINITION_ARN     = var.ecs_task_definition_arn
      ECS_SUBNETS                 = join(",", var.ecs_subnets)
      ECS_SECURITY_GROUPS         = join(",", var.ecs_security_groups)
      DAILY_API_KEY_SECRET_ARN    = var.daily_api_key_secret_arn
      TRANSCRIPT_S3_BUCKET        = var.transcript_s3_bucket
      STANDBY_SQS_QUEUE_URL       = aws_sqs_queue.standby_pool[0].url
      WEBSOCKET_API_URL           = aws_apigatewayv2_stage.websocket[0].invoke_url
    }
  }
  
  lifecycle {
    create_before_destroy = true
  }
  
  tags = {
    Module      = "voice"
    Environment = var.environment
  }
}

# Additional Lambdas: voice-configs, voice-credentials, voice-transcripts, voice-websocket
# (Similar structure for each)
```

### 7.3 SQS Queue

```hcl
# Standby Bot Pool Queue
resource "aws_sqs_queue" "standby_pool" {
  count = var.module_voice_enabled ? 1 : 0
  
  name                       = "${var.project_name}-${var.environment}-voice-standby-pool"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 3600
  
  tags = {
    Module      = "voice"
    Environment = var.environment
  }
}
```

### 7.4 S3 Bucket

```hcl
# Transcript Storage Bucket
resource "aws_s3_bucket" "transcripts" {
  count = var.module_voice_enabled ? 1 : 0
  
  bucket = "${var.project_name}-${var.environment}-voice-transcripts"
  
  tags = {
    Module      = "voice"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "transcripts" {
  count  = var.module_voice_enabled ? 1 : 0
  bucket = aws_s3_bucket.transcripts[0].id
  
  rule {
    id     = "archive-old-transcripts"
    status = "Enabled"
    
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
    
    expiration {
      days = 365
    }
  }
}
```

### 7.5 IAM Role

```hcl
resource "aws_iam_role" "voice_lambda_role" {
  count = var.module_voice_enabled ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-voice-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "voice_lambda_policy" {
  count = var.module_voice_enabled ? 1 : 0
  
  name = "${var.project_name}-${var.environment}-voice-lambda-policy"
  role = aws_iam_role.voice_lambda_role[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          var.daily_api_key_secret_arn,
          var.deepgram_api_key_secret_arn,
          var.cartesia_api_key_secret_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask",
          "ecs:StopTask",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = var.ecs_task_role_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.transcripts[0].arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage"
        ]
        Resource = aws_sqs_queue.standby_pool[0].arn
      }
    ]
  })
}
```

---

## 8. Testing Requirements

### 8.1 Unit Tests

```python
# tests/test_voice_sessions_lambda.py

import pytest
import json
from unittest.mock import patch, MagicMock
from lambda_function import lambda_handler, handle_create, handle_start


class TestVoiceSessionsLambda:
    
    @patch('lambda_function.access')
    def test_list_sessions_success(self, mock_access):
        """Test successful GET /api/voice/sessions"""
        mock_access.get_user_from_event.return_value = {'user_id': 'test-user'}
        mock_access.get_supabase_user_id_from_external_uid.return_value = 'supabase-user-id'
        mock_access.find_one.return_value = {'org_id': 'test-org', 'active': True}
        mock_access.find_many.return_value = [
            {'id': 'session-1', 'status': 'completed'}
        ]
        mock_access.success_response.return_value = {
            'statusCode': 200,
            'body': json.dumps({'success': True})
        }
        
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {'orgId': 'test-org-uuid'},
            'pathParameters': None
        }
        
        response = lambda_handler(event, {})
        assert response['statusCode'] == 200
    
    @patch('lambda_function.access')
    def test_list_sessions_missing_org_id(self, mock_access):
        """Test missing orgId parameter (400 error)"""
        mock_access.get_user_from_event.return_value = {'user_id': 'test-user'}
        mock_access.get_supabase_user_id_from_external_uid.return_value = 'supabase-user-id'
        mock_access.ValidationError = Exception
        mock_access.bad_request_response.return_value = {
            'statusCode': 400,
            'body': json.dumps({'success': False, 'error': 'orgId required'})
        }
        
        event = {
            'httpMethod': 'GET',
            'queryStringParameters': {},
            'pathParameters': None
        }
        
        response = lambda_handler(event, {})
        assert response['statusCode'] == 400
    
    @patch('lambda_function.access')
    @patch('lambda_function.create_daily_room')
    @patch('lambda_function.start_pipecat_bot')
    def test_start_session_success(self, mock_start_bot, mock_create_room, mock_access):
        """Test successful POST /api/voice/sessions/{id}/start"""
        mock_access.get_user_from_event.return_value = {'user_id': 'test-user'}
        mock_access.find_one.side_effect = [
            {'id': 'session-1', 'status': 'pending', 'org_id': 'test-org', 'config_id': None},
            {'org_id': 'test-org', 'active': True}
        ]
        mock_create_room.return_value = {
            'room_url': 'https://example.daily.co/room',
            'room_name': 'room-123'
        }
        mock_start_bot.return_value = 'arn:aws:ecs:task:123'
        
        event = {
            'httpMethod': 'POST',
            'resource': '/api/voice/sessions/{id}/start',
            'pathParameters': {'id': 'session-uuid'}
        }
        
        response = lambda_handler(event, {})
        assert mock_create_room.called
        assert mock_start_bot.called


class TestDailyIntegration:
    
    @patch('daily_helper.requests')
    def test_create_daily_room(self, mock_requests):
        """Test Daily.co room creation"""
        from daily_helper import create_daily_room
        
        mock_requests.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'url': 'https://test.daily.co/room', 'name': 'room-123'}
        )
        
        result = create_daily_room('org-id', 'session-id', {})
        
        assert result['room_url'] == 'https://test.daily.co/room'
        assert result['room_name'] == 'room-123'
```

### 8.2 Integration Tests

```python
# tests/test_voice_integration.py

import pytest

class TestVoiceIntegration:
    
    def test_full_session_workflow(self, test_client, test_org):
        """Test complete session workflow: create → start → complete"""
        # 1. Create session
        create_response = test_client.post('/api/voice/sessions', json={
            'org_id': test_org.id,
            'interview_type': 'technical',
            'candidate_name': 'Test Candidate'
        })
        assert create_response.status_code == 201
        session = create_response.json()['data']
        assert session['status'] == 'pending'
        
        # 2. Start session
        start_response = test_client.post(f'/api/voice/sessions/{session["id"]}/start')
        assert start_response.status_code == 200
        session = start_response.json()['data']
        assert session['status'] == 'ready'
        assert session['dailyRoomUrl'] is not None
        
        # 3. Complete session (simulate)
        update_response = test_client.put(f'/api/voice/sessions/{session["id"]}', json={
            'status': 'completed'
        })
        assert update_response.status_code == 200
        session = update_response.json()['data']
        assert session['status'] == 'completed'
    
    def test_config_creation_and_usage(self, test_client, test_org):
        """Test config creation and session using config"""
        # 1. Create config
        config_response = test_client.post('/api/voice/configs', json={
            'org_id': test_org.id,
            'name': 'Test Config',
            'interview_type': 'technical',
            'config_json': {
                'bot_name': 'Test Bot',
                'system_prompt': 'You are a test interviewer'
            }
        })
        assert config_response.status_code == 201
        config = config_response.json()['data']
        
        # 2. Create session with config
        session_response = test_client.post('/api/voice/sessions', json={
            'org_id': test_org.id,
            'interview_type': 'technical',
            'config_id': config['id']
        })
        assert session_response.status_code == 201
        session = session_response.json()['data']
        assert session['configId'] == config['id']
```

### 8.3 Test Coverage Requirements

| Area | Target Coverage |
|------|-----------------|
| Lambda Handlers | ≥80% |
| Database Operations | ≥90% |
| External Service Helpers | ≥70% |
| Critical Paths (create, start, complete) | 100% |

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026  
**Author:** AI (Claude)  
**Specification Type:** Technical
